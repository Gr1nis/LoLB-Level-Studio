/**
 * LoLB Level Studio - Central State & Data Management
 * Handles multi-mode switching (Post vs Books), catalog loading, level carousel, and disk persistence.
 */

var StudioState = window.StudioState = {
  activeMode: 'post', // 'post' or 'books'
  currentLevelIndex: 0,
  postLevels: [],
  bookLevels: [],
  shapesCatalog: [],
  rulesCatalog: {},
  activeShelfIndex: 0,
  selectedShapeForPlacement: null,
  currentRotation: 0, // 0, 90, 180, 270

  getCurrentLevel() {
    const list = this.activeMode === 'post' ? this.postLevels : this.bookLevels;
    return list[this.currentLevelIndex] || null;
  }
};

const createDefaultPostLevel = (id) => ({
  id,
  gridWidth: 6,
  gridHeight: 6,
  shapes: [],
  tutorialId: '',
  blockedCells: [],
  freeCells: [],
  chapter: id <= 10 ? 1 : id <= 20 ? 2 : 3
});

const createDefaultBookLevel = (id) => ({
  id,
  tutorialId: '',
  chapter: id <= 10 ? 1 : id <= 20 ? 2 : 3,
  shelves: [{ shelfId: 'shelf_1', prefabId: 'shelf', position: { x: 0, y: 0 }, staticSlots: [], rules: ['TargetSlot'] }],
  placements: []
});

function ensureMinLevels(list, factory, targetCount = 25) {
  const result = Array.isArray(list) ? [...list] : [];
  for (let i = result.length; i < targetCount; i++) result.push(factory(i + 1));
  return result;
}

async function fetchWithFallback(apiUrl, staticUrl, storageKey = null) {
  // 1. Try backend API first (when running on local server.py)
  try {
    const res = await fetch(apiUrl);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend API unavailable
  }

  // 2. Check localStorage if user previously edited and saved in browser
  if (storageKey) {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.warn(`Failed to read ${storageKey} from localStorage:`, e);
    }
  }

  // 3. Fallback to static JSON file (for GitHub Pages initial load)
  try {
    const staticRes = await fetch(staticUrl);
    if (staticRes.ok) {
      return await staticRes.json();
    }
  } catch (e) {
    console.warn(`Failed to fetch static JSON from ${staticUrl}:`, e);
  }

  return null;
}

async function loadAllData() {
  try {
    const [postRes, booksRes, shapesRes, rulesRes] = await Promise.all([
      fetchWithFallback('/api/levels/post', './data/post_levels.json', 'post_levels'),
      fetchWithFallback('/api/levels/books', './data/book_levels.json', 'book_levels'),
      fetchWithFallback('/api/catalog/shapes', './data/shapes_catalog.json', 'shapes_catalog'),
      fetchWithFallback('/api/catalog/rules', './data/rules_catalog.json', 'rules_catalog')
    ]);

    const rawPost = (postRes && postRes.levels) || (Array.isArray(postRes) ? postRes : []);
    const rawBooks = (booksRes && booksRes.levels) || (Array.isArray(booksRes) ? booksRes : []);

    StudioState.postLevels = ensureMinLevels(rawPost, createDefaultPostLevel, 25);
    StudioState.bookLevels = ensureMinLevels(rawBooks, createDefaultBookLevel, 25);
    StudioState.shapesCatalog = Array.isArray(shapesRes) ? shapesRes : [];
    StudioState.rulesCatalog = rulesRes && typeof rulesRes === 'object' ? rulesRes : {};

    renderLevelCarousel();
    selectLevel(StudioState.currentLevelIndex);
    return true;
  } catch (err) {
    console.error('Failed to load studio data:', err);
    return false;
  }
}

async function saveLevelsToDisk() {
  const isPost = StudioState.activeMode === 'post';
  const url = isPost ? '/api/levels/post' : '/api/levels/books';
  const filename = isPost ? 'post_levels.json' : 'book_levels.json';
  const key = isPost ? 'post_levels' : 'book_levels';
  const levels = isPost ? StudioState.postLevels : StudioState.bookLevels;

  function handleStaticFallback() {
    try {
      localStorage.setItem(key, JSON.stringify({ levels }));
    } catch (e) {
      console.warn(`Failed to save ${key} to localStorage:`, e);
    }

    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ levels }, null, 4));
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (window.showAiToast) {
      window.showAiToast('Сохранено (GitHub Pages)', 'Уровни сохранены в память браузера и скачан JSON для Unity!');
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levels })
    });

    if (res.status === 404 || res.status === 405) {
      handleStaticFallback();
      return;
    }

    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      alert('Ошибка при сохранении: ' + (result.error || `HTTP ${res.status}`));
      return;
    }

    if (window.showAiToast) {
      window.showAiToast('Сохранено в Unity', `Успешно сохранено ${levels.length} уровней!`);
    }
  } catch (err) {
    console.warn('Save network request failed, falling back to client-side save:', err);
    handleStaticFallback();
  }
}

async function reloadLevelsFromDisk() {
  await loadAllData();
}

function renderLevelCarousel() {
  const container = document.getElementById('level-carousel');
  if (!container) return;

  const levels = StudioState.activeMode === 'post' ? StudioState.postLevels : StudioState.bookLevels;
  const count = Math.max(25, levels.length);

  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    const isActive = i === StudioState.currentLevelIndex;
    btn.type = 'button';
    btn.textContent = String(i + 1);
    btn.title = `Уровень ${i + 1}`;
    btn.className = `px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
      isActive
        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
        : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
    }`;
    btn.onclick = () => selectLevel(i);
    container.appendChild(btn);
  }
}

function selectLevel(index) {
  StudioState.currentLevelIndex = index;
  renderLevelCarousel();

  const currentLevel = StudioState.getCurrentLevel();
  const badge = document.getElementById('inspector-level-badge');
  if (badge) badge.textContent = `Уровень ${index + 1}`;

  const tutInput = document.getElementById('level-tutorial-id');
  if (tutInput) tutInput.value = currentLevel?.tutorialId || '';

  const chapSelect = document.getElementById('level-chapter');
  if (chapSelect && currentLevel) {
    chapSelect.value = String(currentLevel.chapter || (index + 1 <= 10 ? 1 : index + 1 <= 20 ? 2 : 3));
  }

  window.renderActiveWorkspace?.();
}

function switchMode(mode) {
  StudioState.activeMode = mode;
  const isPost = mode === 'post';

  const tabPost = document.getElementById('tab-post');
  const tabBooks = document.getElementById('tab-books');
  if (tabPost && tabBooks) {
    const active = 'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2 bg-emerald-600 text-white shadow';
    const inactive = 'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2 text-slate-400 hover:text-slate-200';
    tabPost.className = isPost ? active : inactive;
    tabBooks.className = isPost ? inactive : active;
  }

  const postWs = document.getElementById('workspace-post');
  const booksWs = document.getElementById('workspace-books');
  if (postWs) {
    postWs.classList.toggle('hidden', !isPost);
    postWs.style.display = isPost ? 'flex' : 'none';
  }
  if (booksWs) {
    booksWs.classList.toggle('hidden', isPost);
    booksWs.style.display = isPost ? 'none' : 'flex';
  }

  const hudPost = document.getElementById('inspector-hud-post');
  const rulesBooks = document.getElementById('inspector-rules-books');
  const hudBooks = document.getElementById('inspector-hud-books');
  const aiPost = document.getElementById('inspector-ai-post');

  if (hudPost) {
    hudPost.classList.toggle('hidden', !isPost);
    hudPost.style.display = isPost ? 'block' : 'none';
  }
  if (rulesBooks) {
    rulesBooks.classList.toggle('hidden', isPost);
    rulesBooks.style.display = isPost ? 'none' : 'block';
  }
  if (hudBooks) {
    hudBooks.classList.toggle('hidden', isPost);
    hudBooks.style.display = isPost ? 'none' : 'block';
  }
  if (aiPost) {
    aiPost.classList.toggle('hidden', !isPost);
    aiPost.style.display = isPost ? 'block' : 'none';
  }

  const palTitle = document.getElementById('palette-title');
  if (palTitle) palTitle.textContent = isPost ? 'Каталог посылок' : 'Каталог книг';

  const searchInput = document.getElementById('palette-search');
  if (searchInput) searchInput.value = '';

  renderLevelCarousel();
  selectLevel(StudioState.currentLevelIndex);
}

function updateLevelMeta() {
  const current = StudioState.getCurrentLevel();
  if (!current) return;
  const tutInput = document.getElementById('level-tutorial-id');
  const chapSelect = document.getElementById('level-chapter');
  if (tutInput) current.tutorialId = tutInput.value.trim();
  if (chapSelect) current.chapter = parseInt(chapSelect.value, 10) || 1;
}


// Global exports
window.loadAllData = loadAllData;
window.saveLevelsToDisk = saveLevelsToDisk;
window.reloadLevelsFromDisk = reloadLevelsFromDisk;
window.renderLevelCarousel = renderLevelCarousel;
window.selectLevel = selectLevel;
window.switchMode = switchMode;
window.updateLevelMeta = updateLevelMeta;

