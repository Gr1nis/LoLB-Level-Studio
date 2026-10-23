/**
 * LoLB Level Studio - Bamboo Post Mode (Interactive Box Grid & Packing)
 * Handles grid obstacle painting, shapes tray, live BFS density metrics, and catalog palette.
 */

function renderShapeMiniPreview(shape) {
  if (!shape.cells?.length) {
    return `<div class="w-7 h-7 rounded bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0"><span class="w-2.5 h-2.5 rounded-full" style="background:${shape.color || '#3b82f6'}"></span></div>`;
  }
  const maxX = Math.max(...shape.cells.map(c => c.x)), maxY = Math.max(...shape.cells.map(c => c.y));
  const cols = maxX + 1, rows = maxY + 1, filled = new Set(shape.cells.map(c => `${c.x},${c.y}`));
  let cells = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const bg = filled.has(`${x},${y}`) ? (shape.color || '#3b82f6') : 'transparent';
      cells += `<div style="width:7px;height:7px;background:${bg};border-radius:1px;"></div>`;
    }
  }
  return `<div style="display:grid;grid-template-columns:repeat(${cols},7px);gap:1.5px;" class="p-1.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0">${cells}</div>`;
}

function getEmptyIslands(level) {
  if (!level) return [];
  const w = level.gridWidth || 6, h = level.gridHeight || 6;
  const blocked = new Set((level.blockedCells || []).map(c => `${c.x},${c.y}`));
  const visited = new Set(), islands = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const key = `${x},${y}`;
      if (blocked.has(key) || visited.has(key)) continue;

      const island = [], queue = [{ x, y }];
      visited.add(key);
      while (queue.length > 0) {
        const cur = queue.shift();
        island.push(cur);
        const dirs = [{ x: cur.x + 1, y: cur.y }, { x: cur.x - 1, y: cur.y }, { x: cur.x, y: cur.y + 1 }, { x: cur.x, y: cur.y - 1 }];
        for (const d of dirs) {
          if (d.x >= 0 && d.x < w && d.y >= 0 && d.y < h) {
            const dk = `${d.x},${d.y}`;
            if (!blocked.has(dk) && !visited.has(dk)) {
              visited.add(dk);
              queue.push(d);
            }
          }
        }
      }
      islands.push(island);
    }
  }
  return islands;
}

function calculateLiveDensity() {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) return 1.0;

  const islands = getEmptyIslands(level);
  const count = islands.length;
  const densityMultiplier = count === 0 ? 1.0 : Math.max(0.3, 1.0 - 0.15 * Math.max(0, count - 1));
  const densityPercent = Math.round(densityMultiplier * 100);

  const pill = document.getElementById('hud-density-pill');
  if (pill) pill.textContent = `${densityPercent}%`;

  const bar = document.getElementById('hud-density-bar');
  if (bar) bar.style.width = `${densityPercent}%`;

  const reward = document.getElementById('hud-coin-reward');
  if (reward) reward.innerHTML = `<span>${30 + Math.round(20 * densityMultiplier)}</span><span>🪙</span>`;

  const islandsEl = document.getElementById('hud-empty-islands');
  if (islandsEl) islandsEl.textContent = String(count);

  return densityMultiplier;
}

function fillGapsWithObstacles() {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) return;
  const islands = getEmptyIslands(level);
  if (!Array.isArray(level.blockedCells)) level.blockedCells = [];
  const blocked = new Set(level.blockedCells.map(c => `${c.x},${c.y}`));

  islands.filter(isl => isl.length <= 2).forEach(isl => {
    isl.forEach(c => {
      const key = `${c.x},${c.y}`;
      if (!blocked.has(key)) {
        level.blockedCells.push({ x: c.x, y: c.y });
        blocked.add(key);
      }
    });
  });
  renderBambooPostWorkspace();
  if (window.showAiToast) window.showAiToast('Препятствия', 'Изолированные дыры превращены в кляксы');
}

function setGridSize(w, h) {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) return;
  level.gridWidth = w;
  level.gridHeight = h;
  if (Array.isArray(level.blockedCells)) level.blockedCells = level.blockedCells.filter(c => c.x < w && c.y < h);
  renderBambooPostWorkspace();
}

function clearGrid() {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) return;
  level.blockedCells = [];
  renderBambooPostWorkspace();
}

function removeShapeFromLevel(index) {
  const level = window.StudioState?.getCurrentLevel();
  if (!level || !Array.isArray(level.shapes)) return;
  level.shapes.splice(index, 1);
  renderBambooPostWorkspace();
}

function addShapeToCurrentLevel(shapeId) {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) return;
  if (!Array.isArray(level.shapes)) level.shapes = [];
  level.shapes.push({ shapeId });
  renderBambooPostWorkspace();
}

function renderShapesPalette() {
  const container = document.getElementById('palette-items');
  if (!container) return;
  const catalog = window.StudioState?.shapesCatalog || [];
  const search = document.getElementById('palette-search')?.value.toLowerCase().trim() || '';
  const filtered = catalog.filter(s => !search || (s.name && s.name.toLowerCase().includes(search)) || (s.id && s.id.toLowerCase().includes(search)) || (s.category && s.category.toLowerCase().includes(search)));

  const countEl = document.getElementById('palette-count');
  if (countEl) countEl.textContent = `${filtered.length} фигур`;

  container.innerHTML = '';
  if (filtered.length === 0) {
    container.innerHTML = '<div class="text-xs text-slate-500 italic p-4 text-center">Фигуры не найдены</div>';
    return;
  }

  filtered.forEach(shape => {
    const card = document.createElement('div');
    card.className = 'shape-card bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 flex items-center justify-between transition-all cursor-pointer';
    card.innerHTML = `
      <div class="flex items-center space-x-3 overflow-hidden">
        ${renderShapeMiniPreview(shape)}
        <div class="truncate">
          <div class="text-xs font-bold text-slate-200 truncate">${shape.name || shape.id}</div>
          <div class="text-[10px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
            <span class="w-2 h-2 rounded-full inline-block shrink-0" style="background-color: ${shape.color || '#3b82f6'};"></span>
            <span>${shape.category || `${shape.cells?.length || 0}-cell`}</span>
          </div>
        </div>
      </div>
      <button type="button" class="btn-add px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-semibold text-[11px] rounded-lg border border-slate-700/80 transition-all shrink-0 ml-2">+ В уровень</button>
    `;
    card.querySelector('.btn-add').onclick = (e) => { e.stopPropagation(); addShapeToCurrentLevel(shape.id); };
    card.onclick = () => addShapeToCurrentLevel(shape.id);
    container.appendChild(card);
  });
}

function renderBambooPostWorkspace() {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) return;

  // 1. Grid Size Buttons
  [5, 6, 7].forEach(sz => {
    const btn = document.getElementById(`btn-grid-${sz}${sz}`);
    if (!btn) return;
    const active = level.gridWidth === sz && level.gridHeight === sz;
    btn.className = `px-2.5 py-1 text-xs rounded-lg font-bold border transition-all ${active ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'border-slate-700 hover:bg-slate-800 text-slate-400'}`;
  });

  // 2. Interactive Box Grid
  const gridContainer = document.getElementById('post-grid-container');
  if (gridContainer) {
    gridContainer.innerHTML = '';
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = `repeat(${level.gridWidth}, minmax(0, 1fr))`;
    gridContainer.style.gap = '8px';
    gridContainer.style.width = 'fit-content';
    gridContainer.style.margin = '0 auto';

    const blockedMap = new Set((level.blockedCells || []).map(c => `${c.x},${c.y}`));
    const placedCellMap = new Map();
    if (Array.isArray(level.lastSolution)) {
      level.lastSolution.forEach((placement) => {
        if (!placement || !Array.isArray(placement.placedCells)) return;
        const shape = window.StudioState?.shapesCatalog?.find(s => s.id === placement.shapeId) || {
          name: placement.shapeId,
          color: '#3b82f6'
        };
        placement.placedCells.forEach(c => {
          placedCellMap.set(`${c.x},${c.y}`, { placement, shape });
        });
      });
    }

    for (let y = 0; y < level.gridHeight; y++) {
      for (let x = 0; x < level.gridWidth; x++) {
        const cell = document.createElement('div');
        const isBlocked = blockedMap.has(`${x},${y}`);
        const placed = placedCellMap.get(`${x},${y}`);

        if (isBlocked) {
          cell.className = 'w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center cursor-pointer transition-all border select-none bg-slate-950/90 border-red-900/60 text-red-500 shadow-inner';
          cell.innerHTML = '<span class="text-xl">🚫</span>';
        } else if (placed) {
          const color = placed.shape.color || '#3b82f6';
          const firstLetter = (placed.shape.name || placed.placement.shapeId || '?')[0].toUpperCase();
          cell.className = 'w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center cursor-pointer transition-all border select-none text-white font-bold shadow-lg';
          cell.style.backgroundColor = color;
          cell.style.borderColor = color;
          cell.innerHTML = `<span class="text-xs font-mono drop-shadow">${firstLetter}</span>`;
        } else {
          cell.className = 'w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center cursor-pointer transition-all border select-none bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-500 hover:border-amber-500/50';
          cell.innerHTML = `<span class="text-[10px] text-slate-600 font-mono">${x},${y}</span>`;
        }

        cell.onclick = () => {
          if (placed) {
            const pIdx = level.lastSolution.indexOf(placed.placement);
            if (pIdx >= 0) level.lastSolution.splice(pIdx, 1);
            renderBambooPostWorkspace();
            if (window.showAiToast) window.showAiToast('Фигура снята', 'Фигура удалена с сетки');
            return;
          }

          if (!Array.isArray(level.blockedCells)) level.blockedCells = [];
          const idx = level.blockedCells.findIndex(c => c.x === x && c.y === y);
          if (idx >= 0) level.blockedCells.splice(idx, 1);
          else level.blockedCells.push({ x, y });
          renderBambooPostWorkspace();
        };
        gridContainer.appendChild(cell);
      }
    }
  }

  // 3. Level Shapes Tray
  const tray = document.getElementById('level-shapes-tray');
  const countEl = document.getElementById('level-shapes-count');
  const shapesList = Array.isArray(level.shapes) ? level.shapes : [];
  if (countEl) countEl.textContent = `${shapesList.length} шт.`;
  if (tray) {
    tray.innerHTML = '';
    if (shapesList.length === 0) {
      tray.innerHTML = '<span class="text-xs text-slate-500 italic p-2">Поднос пуст. Добавьте фигуры из каталога слева.</span>';
    } else {
      shapesList.forEach((item, idx) => {
        const shape = window.StudioState?.shapesCatalog?.find(s => s.id === item.shapeId) || { name: item.shapeId, color: '#64748b' };
        const card = document.createElement('div');
        card.className = 'flex items-center space-x-2 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs shadow-sm hover:border-slate-600 transition-all';
        card.innerHTML = `
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${shape.color || '#3b82f6'};"></span>
          <span class="font-medium text-slate-200">${shape.name || item.shapeId}</span>
          <button type="button" class="btn-del text-slate-400 hover:text-red-400 ml-1 font-bold text-sm leading-none" title="Удалить">✕</button>
        `;
        card.querySelector('.btn-del').onclick = (e) => { e.stopPropagation(); removeShapeFromLevel(idx); };
        tray.appendChild(card);
      });
    }
  }

  // 4. Live Density Calculation
  calculateLiveDensity();
}

// Global exports
window.renderBambooPostWorkspace = renderBambooPostWorkspace;
window.setGridSize = setGridSize;
window.clearGrid = clearGrid;
window.renderShapesPalette = renderShapesPalette;
window.removeShapeFromLevel = removeShapeFromLevel;
window.calculateLiveDensity = calculateLiveDensity;
window.fillGapsWithObstacles = fillGapsWithObstacles;
window.filterPalette = renderShapesPalette;

// Central render hook
const prevRenderActiveWorkspace = window.renderActiveWorkspace;
window.renderActiveWorkspace = function () {
  if (typeof prevRenderActiveWorkspace === 'function') prevRenderActiveWorkspace();
  if (window.StudioState?.activeMode === 'post') {
    renderBambooPostWorkspace();
    renderShapesPalette();
  }
};
