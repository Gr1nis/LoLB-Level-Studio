/**
 * LoLB Level Studio - AI Bridge & Hotkeys
 * Manages Server-Sent Events (SSE) live updates, AI Copilot solver, toast alerts, and keyboard shortcuts.
 */

let aiEventSource = null;
let toastTimeout = null;
let hotkeysInitialized = false;

/**
 * Updates the AI Live Bridge status pill in the header.
 */
function setAiStatus(connected) {
  const pill = document.getElementById('ai-status-pill');
  const text = document.getElementById('ai-status-text');

  if (text) {
    text.textContent = connected ? 'AI Live Bridge: Connected' : 'AI Bridge: Reconnecting...';
  }

  if (pill) {
    const dot = pill.querySelector('span');
    if (dot) {
      dot.className = `w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`;
    }
    pill.className = `flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs transition-all ${
      connected ? 'bg-slate-800/80 border-slate-700' : 'bg-amber-950/40 border-amber-800/60'
    }`;
  }
}

/**
 * Sets clean offline green status on static hosts like GitHub Pages without reconnect spam.
 */
function setAiOfflineStatus() {
  const pill = document.getElementById('ai-status-pill');
  const text = document.getElementById('ai-status-text');

  if (text) {
    text.textContent = 'AI Co-op: Offline (GitHub Pages)';
  }

  if (pill) {
    const dot = pill.querySelector('span');
    if (dot) {
      dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
    }
    pill.className = 'flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs transition-all bg-slate-800/80 border-slate-700';
  }
}

/**
 * Shows an animated toast notification with auto-hide.
 */
function showAiToast(title, desc, duration = 3000) {
  const toast = document.getElementById('ai-live-toast');
  const titleEl = document.getElementById('ai-toast-title');
  const descEl = document.getElementById('ai-toast-desc');
  if (!toast) return;

  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;

  toast.classList.remove('-translate-y-12', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('-translate-y-12', 'opacity-0');
  }, duration);
}

/**
 * Highlights a grid cell in BambooPost workspace.
 */
function highlightGridCell(x, y) {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) return;
  const gridContainer = document.getElementById('post-grid-container');
  if (!gridContainer) return;

  const index = y * level.gridWidth + x;
  const cell = gridContainer.children[index];
  if (!cell) return;

  cell.classList.add('ring-4', 'ring-amber-400', 'scale-110', 'z-10');
  setTimeout(() => {
    cell.classList.remove('ring-4', 'ring-amber-400', 'scale-110', 'z-10');
  }, 800);
}

/**
 * Highlights a shelf card in ShelfZen workspace.
 */
function highlightShelf(shelfId, shelfIndex) {
  const container = document.getElementById('shelves-container');
  if (!container) return;

  let target = null;
  if (shelfIndex !== undefined && container.children[shelfIndex]) {
    target = container.children[shelfIndex];
  } else if (shelfId) {
    target = Array.from(container.children).find(el => el.textContent.includes(shelfId));
  }

  if (target) {
    target.classList.add('ring-4', 'ring-amber-400', 'scale-[1.02]', 'transition-all');
    setTimeout(() => {
      target.classList.remove('ring-4', 'ring-amber-400', 'scale-[1.02]');
    }, 1000);
  }
}

/**
 * Handles incoming `ai_step` SSE events.
 */
function handleAiStep(data) {
  const title = data.title || 'AI Co-op Activity';
  const desc = data.desc || data.description || data.message || 'Размещение фигуры...';
  showAiToast(title, desc);

  if (Array.isArray(data.cells)) {
    data.cells.forEach(c => highlightGridCell(c.x, c.y));
  } else if (data.x !== undefined && data.y !== undefined) {
    highlightGridCell(data.x, data.y);
  }

  if (data.shelfId !== undefined || data.shelfIndex !== undefined) {
    highlightShelf(data.shelfId, data.shelfIndex);
  }
}

/**
 * Handles incoming `level_saved` SSE events.
 */
function handleLevelSaved(data) {
  const mode = data?.type === 'books' ? 'Полочный дзен' : 'Бамбуковая почта';
  showAiToast('Сохранено в Unity', `Уровни сохранены в StreamingAssets (${mode})`);
}

/**
 * Initializes SSE connection to `/api/sse` and sets up event listeners.
 */
function initAiBridge() {
  if (typeof EventSource === 'undefined') {
    console.warn('EventSource not supported in this browser.');
    setAiOfflineStatus();
    initHotkeys();
    return;
  }

  if (aiEventSource) {
    aiEventSource.close();
    aiEventSource = null;
  }

  try {
    aiEventSource = new EventSource('/api/sse');

    aiEventSource.onopen = () => setAiStatus(true);
    aiEventSource.addEventListener('connected', () => setAiStatus(true));
    aiEventSource.onerror = () => {
      // On static GitHub Pages, /api/sse fails. Close EventSource to avoid infinite reconnect loops and set green offline status.
      if (aiEventSource) {
        aiEventSource.close();
        aiEventSource = null;
      }
      setAiOfflineStatus();
    };

    aiEventSource.addEventListener('ai_step', (evt) => {
      try {
        const data = JSON.parse(evt.data);
        handleAiStep(data);
      } catch (err) {
        console.error('Error handling ai_step event:', err);
      }
    });

    aiEventSource.addEventListener('level_saved', (evt) => {
      try {
        const data = JSON.parse(evt.data);
        handleLevelSaved(data);
      } catch {
        handleLevelSaved(null);
      }
    });
  } catch (err) {
    console.warn('Failed to initialize AI Bridge EventSource:', err);
    if (aiEventSource) {
      aiEventSource.close();
      aiEventSource = null;
    }
    setAiOfflineStatus();
  }

  initHotkeys();
}

/**
 * Rotates the currently selected shape by 90 degrees.
 */
function rotateSelectedShape() {
  if (!window.StudioState) return;
  StudioState.currentRotation = (StudioState.currentRotation + 90) % 360;
  if (StudioState.selectedShapeForPlacement) {
    StudioState.selectedShapeForPlacement.rotation = StudioState.currentRotation;
  }
  showAiToast('Поворот фигуры', `Угол: ${StudioState.currentRotation}° (R / Пробел)`);
}

/**
 * Removes the selected or last shape from level tray.
 */
function removeSelectedOrLastShape() {
  if (!window.StudioState || StudioState.activeMode !== 'post') return;
  const level = StudioState.getCurrentLevel();
  if (level && Array.isArray(level.shapes) && level.shapes.length > 0) {
    if (typeof window.removeShapeFromLevel === 'function') {
      window.removeShapeFromLevel(level.shapes.length - 1);
      showAiToast('Фигура убрана', 'Последняя фигура удалена из подноса');
    }
  }
}

/**
 * Sets up global keyboard shortcuts.
 */
function initHotkeys() {
  if (hotkeysInitialized) return;
  hotkeysInitialized = true;

  window.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'r' || e.key === 'R' || e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      rotateSelectedShape();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeSelectedOrLastShape();
    }
  });
}

/**
 * Rotate cells clockwise by 90 degrees: (x, y) -> (y, -x), then normalize min x,y to 0.
 */
function rotateCells90(cells) {
  if (!cells || cells.length === 0) return [];
  const raw = cells.map(c => ({ x: c.y, y: -c.x }));
  const minX = Math.min(...raw.map(p => p.x));
  const minY = Math.min(...raw.map(p => p.y));
  return raw.map(p => ({ x: p.x - minX, y: p.y - minY }));
}

/**
 * Return all unique rotated variations (0, 90, 180, 270).
 */
function getUniqueRotations(cells) {
  const rotations = [];
  const seen = new Set();
  let current = cells;
  for (let r = 0; r < 4; r++) {
    const key = current
      .map(c => `${c.x},${c.y}`)
      .sort()
      .join('|');
    if (!seen.has(key)) {
      seen.add(key);
      rotations.push(current);
    }
    current = rotateCells90(current);
  }
  return rotations;
}

/**
 * Calculates BFS flood-fill density metrics matching solver.py and Unity logic.
 */
function calculateBfsDensityClient(gridW, gridH, blockedOrFilledSet) {
  const emptyCells = new Set();
  for (let x = 0; x < gridW; x++) {
    for (let y = 0; y < gridH; y++) {
      const k = `${x},${y}`;
      if (!blockedOrFilledSet.has(k)) {
        emptyCells.add(k);
      }
    }
  }

  const totalEmpty = emptyCells.size;
  if (totalEmpty === 0) {
    return {
      densityMultiplier: 1.0,
      densityPercent: 100,
      largestIsland: 0,
      totalEmpty: 0,
      islands: [],
      rewardCoins: 50
    };
  }

  const visited = new Set();
  const islands = [];

  for (const cellKey of emptyCells) {
    if (visited.has(cellKey)) continue;

    let islandSize = 0;
    const parts = cellKey.split(',').map(Number);
    const queue = [{ x: parts[0], y: parts[1] }];
    visited.add(cellKey);

    while (queue.length > 0) {
      const cur = queue.shift();
      islandSize++;

      const neighbors = [
        { x: cur.x + 1, y: cur.y },
        { x: cur.x - 1, y: cur.y },
        { x: cur.x, y: cur.y + 1 },
        { x: cur.x, y: cur.y - 1 }
      ];

      for (const n of neighbors) {
        const nk = `${n.x},${n.y}`;
        if (emptyCells.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(n);
        }
      }
    }

    islands.push(islandSize);
  }

  const largestIsland = islands.length > 0 ? Math.max(...islands) : 0;
  const islandCount = islands.length;
  let multiplier = islandCount === 0 ? 1.0 : Math.max(0.3, 1.0 - 0.15 * Math.max(0, islandCount - 1));
  multiplier = Math.max(0.0, Math.min(1.0, multiplier));
  const rewardCoins = 30 + Math.round(20 * multiplier);

  return {
    densityMultiplier: Math.round(multiplier * 1000) / 1000,
    densityPercent: Math.round(multiplier * 100),
    largestIsland,
    totalEmpty,
    islands,
    rewardCoins
  };
}

/**
 * Compact client-side recursive backtracking solver for BambooPost polyomino bin packing.
 * Allows Auto-packing directly in static GitHub Pages environment without Python backend.
 */
function solvePolyominoClient(gridW, gridH, shapes, blocked) {
  const w = gridW || 6;
  const h = gridH || 6;
  const blockedList = Array.isArray(blocked) ? blocked : [];
  const blockedSet = new Set(blockedList.map(b => `${b.x},${b.y}`));

  // Catalog lookup for shape cell definitions if not embedded
  const catalog = window.StudioState?.shapesCatalog || [];
  const catalogMap = new Map();
  for (const item of catalog) {
    if (item && item.id) catalogMap.set(item.id, item);
  }

  const preparedShapes = (shapes || []).map((s, index) => {
    const sid = s.shapeId || s.id;
    let cells = Array.isArray(s.cells) && s.cells.length > 0 ? s.cells : null;
    if (!cells && catalogMap.has(sid)) {
      cells = catalogMap.get(sid).cells;
    }
    if (!cells || cells.length === 0) {
      cells = [{ x: 0, y: 0 }];
    }
    return {
      origIndex: index,
      id: sid,
      rotations: getUniqueRotations(cells)
    };
  });

  // Capacity pruning: if total cells exceed available free cells, early exit
  let totalShapeCells = 0;
  for (const s of preparedShapes) {
    totalShapeCells += s.rotations[0].length;
  }
  const validBlockedCount = blockedList.filter(b => b.x >= 0 && b.x < w && b.y >= 0 && b.y < h).length;
  if (totalShapeCells + validBlockedCount > w * h) {
    return {
      solvable: false,
      gridWidth: w,
      gridHeight: h,
      placements: [],
      density: null
    };
  }

  // Sort shapes by cell count descending (heuristic for faster backtracking)
  const indexedShapes = [...preparedShapes];
  indexedShapes.sort((a, b) => b.rotations[0].length - a.rotations[0].length);

  // Initialize 2D grid
  const grid = Array.from({ length: w }, () => Array(h).fill(false));
  for (const b of blockedList) {
    if (b.x >= 0 && b.x < w && b.y >= 0 && b.y < h) {
      grid[b.x][b.y] = true;
    }
  }

  const placements = new Array(preparedShapes.length).fill(null);

  function canPlace(rotCells, ox, oy) {
    for (let i = 0; i < rotCells.length; i++) {
      const tx = ox + rotCells[i].x;
      const ty = oy + rotCells[i].y;
      if (tx < 0 || tx >= w || ty < 0 || ty >= h) return false;
      if (grid[tx][ty]) return false;
    }
    return true;
  }

  function placeShape(rotCells, ox, oy, val) {
    for (let i = 0; i < rotCells.length; i++) {
      grid[ox + rotCells[i].x][oy + rotCells[i].y] = val;
    }
  }

  let stepCount = 0;
  const MAX_STEPS = 120000;

  function backtrack(idx) {
    if (++stepCount > MAX_STEPS) return false;
    if (idx === indexedShapes.length) return true;

    const item = indexedShapes[idx];
    for (let rotIdx = 0; rotIdx < item.rotations.length; rotIdx++) {
      const rotCells = item.rotations[rotIdx];
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          if (canPlace(rotCells, x, y)) {
            placeShape(rotCells, x, y, true);
            placements[item.origIndex] = {
              shapeId: item.id,
              origin: { x, y },
              rotationIndex: rotIdx,
              placedCells: rotCells.map(c => ({ x: x + c.x, y: y + c.y }))
            };

            if (backtrack(idx + 1)) return true;

            placeShape(rotCells, x, y, false);
            placements[item.origIndex] = null;
          }
        }
      }
    }
    return false;
  }

  const solvable = backtrack(0);

  // Calculate density
  const filledSet = new Set(blockedSet);
  if (solvable) {
    for (const p of placements) {
      if (p && Array.isArray(p.placedCells)) {
        for (const c of p.placedCells) {
          filledSet.add(`${c.x},${c.y}`);
        }
      }
    }
  }

  const density = calculateBfsDensityClient(w, h, filledSet);

  return {
    solvable,
    gridWidth: w,
    gridHeight: h,
    placements: solvable ? placements : [],
    density
  };
}

/**
 * AI Solver: Pack all shapes on the current level grid automatically.
 */
async function runAiSolver() {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) {
    alert('Уровень не выбран.');
    return;
  }

  if (window.StudioState?.activeMode !== 'post') {
    alert('AI Солвер упаковки доступен в режиме "Бамбуковая почта".');
    return;
  }

  const shapesList = Array.isArray(level.shapes) ? level.shapes : [];
  if (shapesList.length === 0) {
    alert('Поднос пуст! Добавьте фигуры из каталога слева для авто-укладки.');
    return;
  }

  const btn = document.getElementById('btn-ai-solve');
  const originalBtnContent = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span><span>AI решает уровень...</span>';
  }

  try {
    let data = null;

    try {
      const res = await fetch('/api/ai/solve-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gridWidth: level.gridWidth || 6,
          gridHeight: level.gridHeight || 6,
          shapes: shapesList,
          blockedCells: level.blockedCells || []
        })
      });

      if (res.ok) {
        data = await res.json();
      } else if (res.status === 404 || res.status === 405) {
        // Fallback to client-side polyomino solver on static GitHub Pages
        data = solvePolyominoClient(
          level.gridWidth || 6,
          level.gridHeight || 6,
          shapesList,
          level.blockedCells || []
        );
      } else {
        throw new Error(`Ошибка сервера (${res.status})`);
      }
    } catch (fetchErr) {
      console.warn('AI solve-post API unavailable, running client solver:', fetchErr);
      data = solvePolyominoClient(
        level.gridWidth || 6,
        level.gridHeight || 6,
        shapesList,
        level.blockedCells || []
      );
    }

    if (!data || !data.solvable) {
      alert('Не удалось упаковать все выбранные фигуры. Попробуйте убрать одну фигуру или разблокировать ячейки.');
      showAiToast('Решение не найдено', 'Попробуйте изменить состав фигур или сетку');
      return;
    }

    // Success: Animate step-by-step placement
    if (typeof window.renderBambooPostWorkspace === 'function') {
      window.renderBambooPostWorkspace();
    }

    const gridContainer = document.getElementById('post-grid-container');
    const tray = document.getElementById('level-shapes-tray');
    const w = level.gridWidth || 6;

    for (let i = 0; i < data.placements.length; i++) {
      const placement = data.placements[i];
      const shapeInfo = window.StudioState?.shapesCatalog?.find(s => s.id === placement.shapeId) || {
        name: placement.shapeId,
        color: '#f59e0b'
      };

      showAiToast('AI Co-op Solver', `Укладываем ${shapeInfo.name || placement.shapeId} (${i + 1}/${data.placements.length})`);

      // Colorize placed cells
      if (gridContainer && Array.isArray(placement.placedCells)) {
        placement.placedCells.forEach(c => {
          const cellEl = gridContainer.children[c.y * w + c.x];
          if (cellEl) {
            cellEl.style.backgroundColor = shapeInfo.color || '#3b82f6';
            cellEl.style.borderColor = shapeInfo.color || '#3b82f6';
            cellEl.className = 'w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center cursor-pointer transition-all border select-none text-white font-bold shadow-lg scale-105 z-10';
            cellEl.innerHTML = `<span class="text-xs font-mono drop-shadow">${(shapeInfo.name || placement.shapeId)[0]}</span>`;
            setTimeout(() => cellEl.classList.remove('scale-105', 'z-10'), 250);
          }
        });
      }

      // Update tray item badge
      if (tray && tray.children[i]) {
        const trayCard = tray.children[i];
        trayCard.classList.add('border-emerald-500/80', 'bg-emerald-950/30');
        if (!trayCard.querySelector('.badge-placed')) {
          const badge = document.createElement('span');
          badge.className = 'badge-placed text-[10px] text-emerald-400 font-bold ml-1';
          badge.textContent = '✓';
          trayCard.appendChild(badge);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 220));
    }

    // Update Live Density HUD with solver results
    if (data.density) {
      const pill = document.getElementById('hud-density-pill');
      if (pill) pill.textContent = `${data.density.densityPercent}%`;

      const bar = document.getElementById('hud-density-bar');
      if (bar) bar.style.width = `${data.density.densityPercent}%`;

      const reward = document.getElementById('hud-coin-reward');
      if (reward) reward.innerHTML = `<span>${data.density.rewardCoins}</span><span>🪙</span>`;

      const islandsEl = document.getElementById('hud-empty-islands');
      if (islandsEl) islandsEl.textContent = String(data.density.islands?.length ?? 0);
    }

    level.lastSolution = data.placements;
    showAiToast('Успех!', `Уровень решен! Плотность: ${data.density?.densityPercent ?? 100}%`);
  } catch (err) {
    console.error('AI Solver error:', err);
    alert('Сетевая ошибка при обращении к AI Солверу.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnContent;
    }
  }
}

// Global exports
window.initAiBridge = initAiBridge;
window.runAiSolver = runAiSolver;
window.showAiToast = showAiToast;
window.rotateSelectedShape = rotateSelectedShape;
window.solvePolyominoClient = solvePolyominoClient;
