/**
 * LoLB Level Studio - Shelf Zen Mode (Interactive Book Shelves & Rules)
 * Handles shelf management, slot-based book placements, static anchors, and validation rules.
 */

const BOOK_COLORS = [
  { id: 'blue', name: 'Синий', color: '#38bdf8' }, { id: 'red', name: 'Красный', color: '#f87171' },
  { id: 'orange', name: 'Оранжевый', color: '#fb923c' }, { id: 'black', name: 'Черный', color: '#64748b' }
];

const BOOK_SIZES = [
  { sizeIndex: 0, itemId: '6', heightPx: 160, name: 'XL (6)' }, { sizeIndex: 1, itemId: '5', heightPx: 135, name: 'L (5)' },
  { sizeIndex: 2, itemId: '4', heightPx: 110, name: 'M (4)' }, { sizeIndex: 3, itemId: '3', heightPx: 85, name: 'S (3)' },
  { sizeIndex: 4, itemId: '2', heightPx: 60, name: 'XS (2)' }
];

const getBookColor = (id) => BOOK_COLORS.find(c => id?.startsWith(c.id))?.color || '#38bdf8';
const getBookHeight = (itemId, spriteId) => {
  const byItem = BOOK_SIZES.find(s => s.itemId === String(itemId));
  if (byItem) return byItem.heightPx;
  const idx = spriteId ? parseInt(spriteId.replace(/\D/g, ''), 10) : NaN;
  return BOOK_SIZES.find(s => s.sizeIndex === idx)?.heightPx || 110;
};

function renderShelfZenWorkspace() {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) return;

  if (!Array.isArray(level.shelves)) {
    level.shelves = [{ shelfId: 'shelf_1', prefabId: 'shelf', position: { x: 0, y: 0 }, staticSlots: [], rules: ['TargetSlot'] }];
  }
  if (!Array.isArray(level.placements)) level.placements = [];

  const container = document.getElementById('shelves-container');
  if (!container) return;
  container.innerHTML = '';

  if (level.shelves.length === 0) {
    container.innerHTML = `<div class="text-center p-8 bg-slate-900/60 rounded-2xl border border-dashed border-slate-800">
      <p class="text-slate-400 text-xs mb-3">На этом уровне пока нет полок.</p>
      <button onclick="addShelf()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all">+ Добавить полку</button>
    </div>`;
    renderRulesInspector();
    validateShelfZen();
    return;
  }

  const activeIdx = Math.min(window.StudioState.activeShelfIndex || 0, level.shelves.length - 1);
  window.StudioState.activeShelfIndex = activeIdx;

  level.shelves.forEach((shelf, sIdx) => {
    const isActive = sIdx === activeIdx;
    const shelfPlacements = level.placements.filter(p => p.shelfId === shelf.shelfId);
    const maxSlot = shelfPlacements.length > 0 ? Math.max(...shelfPlacements.map(p => p.targetSlotIndex)) : 3;
    const slotCount = Math.max(4, maxSlot + 2);

    let slotsHtml = '';
    for (let slotIdx = 0; slotIdx < slotCount; slotIdx++) {
      const p = shelfPlacements.find(item => item.targetSlotIndex === slotIdx);
      const isStatic = Array.isArray(shelf.staticSlots) && shelf.staticSlots.some(s => s.index === slotIdx && s.isStatic !== false);
      if (p) {
        const h = getBookHeight(p.itemId, p.spriteId), c = getBookColor(p.spriteId);
        slotsHtml += `<div class="flex flex-col items-center justify-end w-16 min-h-[175px] shrink-0">
          <div class="flex items-center space-x-1 mb-1.5 text-[11px]">
            <button type="button" onclick="toggleStaticSlot('${shelf.shelfId}', ${slotIdx})" class="p-0.5 rounded text-xs transition-all hover:scale-110" title="${isStatic ? 'Разблокировать (якорь)' : 'Зафиксировать замок (сделать якорем)'}">${isStatic ? '🔒' : '🔓'}</button>
            <button type="button" onclick="removeBookPlacement('${shelf.shelfId}', ${slotIdx})" class="text-slate-400 hover:text-red-400 font-bold p-0.5 leading-none" title="Убрать книгу">✕</button>
          </div>
          <div onclick="onBookSlotClick('${shelf.shelfId}', ${slotIdx})" title="Кликните, чтобы выбрать или заменить эту книгу" class="w-14 rounded-t-lg rounded-b-sm flex flex-col items-center justify-between p-1.5 select-none shadow-md cursor-pointer hover:opacity-90 ${isStatic ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 text-slate-950 font-bold border-2 border-amber-200 ring-2 ring-amber-400/50 shadow-amber-500/30' : 'text-white border border-white/20'}" style="height:${h}px; ${isStatic ? '' : `background-color:${c};`}">
            <span class="text-[10px] opacity-75 font-mono">${isStatic ? '⚓' : `[${p.itemId}]`}</span>
            <span class="text-[11px] font-bold tracking-tight truncate max-w-full">${p.spriteId}</span>
            <span class="text-[9px] opacity-80">${h}px</span>
          </div>
          <span class="text-[10px] text-slate-500 font-mono mt-1">${slotIdx}</span>
        </div>`;
      } else {
        slotsHtml += `<div class="flex flex-col items-center justify-end w-16 min-h-[175px] shrink-0">
          <div onclick="onBookSlotClick('${shelf.shelfId}', ${slotIdx})" class="w-14 h-36 border-2 border-dashed border-slate-800 hover:border-amber-500/60 rounded-xl flex flex-col items-center justify-center p-1 bg-slate-950/40 hover:bg-slate-900/60 transition-all cursor-pointer group">
            <span class="text-[10px] text-slate-600 group-hover:text-amber-400 font-mono mb-2">Слот ${slotIdx}</span>
            <button type="button" class="px-1.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold text-[10px] rounded-md transition-all">+ Книга</button>
          </div>
          <span class="text-[10px] text-slate-600 font-mono mt-1">${slotIdx}</span>
        </div>`;
      }
    }

    const card = document.createElement('div');
    card.className = `bg-slate-900/90 rounded-2xl border transition-all shadow-lg overflow-hidden ${isActive ? 'border-amber-500/70 ring-1 ring-amber-500/40' : 'border-slate-800 hover:border-slate-700'}`;
    card.innerHTML = `
      <div onclick="selectActiveShelf(${sIdx})" class="p-3 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 cursor-pointer">
        <div class="flex items-center space-x-2.5">
          <span class="w-2.5 h-2.5 rounded-full ${isActive ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}"></span>
          <span class="text-xs font-bold text-slate-200">Полка: <span class="text-amber-400">${shelf.shelfId}</span></span>
          ${isActive ? '<span class="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold border border-amber-500/30">Активна</span>' : ''}
        </div>
        <div class="flex items-center space-x-3 text-xs" onclick="event.stopPropagation()">
          <div class="flex items-center space-x-1.5">
            <label class="text-[11px] text-slate-400">Префаб:</label>
            <select onchange="updateShelfPrefab('${shelf.shelfId}', this.value)" class="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500">
              ${['shelf', 'upshelf', 'midshelf', 'downshelf'].map(p => `<option value="${p}" ${shelf.prefabId === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class="flex items-center space-x-1.5 text-slate-400">
            <span>X:</span><input type="number" step="0.5" value="${shelf.position?.x ?? 0}" onchange="updateShelfPos('${shelf.shelfId}', 'x', this.value)" class="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-xs">
            <span>Y:</span><input type="number" step="0.5" value="${shelf.position?.y ?? 0}" onchange="updateShelfPos('${shelf.shelfId}', 'y', this.value)" class="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-xs">
          </div>
          <button type="button" onclick="deleteShelf(${sIdx})" class="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-all text-xs font-bold" title="Удалить полку">✕</button>
        </div>
      </div>
      <div class="p-4 flex items-end justify-center space-x-4 min-h-[195px] overflow-x-auto">${slotsHtml}</div>
      <div class="w-full h-3 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-t-2 border-amber-700/60 rounded-b-xl shadow-inner"></div>`;
    container.appendChild(card);
  });

  renderRulesInspector();
  validateShelfZen();
}

function selectActiveShelf(index) {
  if (window.StudioState) window.StudioState.activeShelfIndex = index;
  renderShelfZenWorkspace();
}

function updateShelfPrefab(shelfId, prefabId) {
  const level = window.StudioState?.getCurrentLevel();
  const shelf = level?.shelves?.find(s => s.shelfId === shelfId);
  if (shelf) { shelf.prefabId = prefabId; renderShelfZenWorkspace(); }
}

function updateShelfPos(shelfId, axis, val) {
  const level = window.StudioState?.getCurrentLevel();
  const shelf = level?.shelves?.find(s => s.shelfId === shelfId);
  if (shelf) {
    if (!shelf.position) shelf.position = { x: 0, y: 0 };
    shelf.position[axis] = parseFloat(val) || 0;
  }
}

function addShelf() {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) return;
  if (!Array.isArray(level.shelves)) level.shelves = [];
  const nextNum = level.shelves.length + 1;
  level.shelves.push({
    shelfId: `shelf_${nextNum}`, prefabId: 'shelf',
    position: { x: 0, y: -(nextNum - 1) * 2 },
    staticSlots: [], rules: ['TargetSlot']
  });
  window.StudioState.activeShelfIndex = level.shelves.length - 1;
  renderShelfZenWorkspace();
}

function deleteShelf(index) {
  const level = window.StudioState?.getCurrentLevel();
  if (!level || !Array.isArray(level.shelves)) return;
  const shelf = level.shelves[index];
  if (!shelf) return;
  if (Array.isArray(level.placements)) level.placements = level.placements.filter(p => p.shelfId !== shelf.shelfId);
  level.shelves.splice(index, 1);
  if (window.StudioState.activeShelfIndex >= level.shelves.length) {
    window.StudioState.activeShelfIndex = Math.max(0, level.shelves.length - 1);
  }
  renderShelfZenWorkspace();
}

function toggleStaticSlot(shelfId, slotIndex) {
  const level = window.StudioState?.getCurrentLevel();
  const shelf = level?.shelves?.find(s => s.shelfId === shelfId);
  if (!shelf) return;
  if (!Array.isArray(shelf.staticSlots)) shelf.staticSlots = [];
  const idx = shelf.staticSlots.findIndex(s => s.index === slotIndex);
  if (idx >= 0) shelf.staticSlots.splice(idx, 1);
  else shelf.staticSlots.push({ index: slotIndex, isStatic: true });
  renderShelfZenWorkspace();
}

function onBookSlotClick(shelfId, slotIndex) {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) return;
  if (!Array.isArray(level.placements)) level.placements = [];

  const existing = level.placements.find(p => p.shelfId === shelfId && p.targetSlotIndex === slotIndex);
  const selected = window.StudioState?.selectedBookForPlacement;

  if (existing) {
    if (selected) {
      existing.itemId = String(selected.itemId || '6');
      existing.spriteId = selected.spriteId || 'blue0';
      renderShelfZenWorkspace();
      if (typeof window.showAiToast === 'function') {
        window.showAiToast('Книга заменена', `Слот ${slotIndex}: установлена ${existing.spriteId}.`);
      }
    } else {
      selectBookForPlacement(existing.spriteId, existing.itemId, false);
      if (typeof window.showAiToast === 'function') {
        window.showAiToast('Книга выбрана', `Выбрана ${existing.spriteId} с полки. Кликните по другому слоту для перемещения.`);
      }
    }
  } else {
    if (selected) {
      level.placements.push({
        itemId: String(selected.itemId || '6'),
        spriteId: selected.spriteId || 'blue0',
        shelfId,
        targetSlotIndex: slotIndex
      });
      renderShelfZenWorkspace();
      if (typeof window.showAiToast === 'function') {
        window.showAiToast('Книга добавлена', `Размещена ${selected.spriteId} в слот ${slotIndex}.`);
      }
    } else {
      level.placements.push({
        itemId: '6',
        spriteId: 'blue0',
        shelfId,
        targetSlotIndex: slotIndex
      });
      renderShelfZenWorkspace();
      if (typeof window.showAiToast === 'function') {
        window.showAiToast('Книга добавлена', 'Размещена blue0. Выберите книгу в каталоге слева для замены.');
      }
    }
  }
}

function addBookToSlot(shelfId, slotIndex, itemId, spriteId) {
  if (itemId !== undefined || spriteId !== undefined) {
    const level = window.StudioState?.getCurrentLevel();
    if (!level) return;
    if (!Array.isArray(level.placements)) level.placements = [];

    const finalItemId = String(itemId !== undefined ? itemId : '6');
    const finalSpriteId = spriteId !== undefined ? spriteId : 'blue0';

    const existing = level.placements.find(p => p.shelfId === shelfId && p.targetSlotIndex === slotIndex);
    if (existing) {
      existing.itemId = finalItemId;
      existing.spriteId = finalSpriteId;
    } else {
      level.placements.push({ itemId: finalItemId, spriteId: finalSpriteId, shelfId, targetSlotIndex: slotIndex });
    }
    renderShelfZenWorkspace();
    return;
  }
  onBookSlotClick(shelfId, slotIndex);
}

function clearAllShelves() {
  const level = window.StudioState?.getCurrentLevel();
  if (!level) return;
  level.placements = [];
  renderShelfZenWorkspace();
  validateShelfZen();
  if (typeof window.showAiToast === 'function') {
    window.showAiToast('Полки очищены', 'Все книги удалены с полок текущего уровня.');
  }
}

function removeBookPlacement(shelfId, slotIndex) {
  const level = window.StudioState?.getCurrentLevel();
  if (!level || !Array.isArray(level.placements)) return;
  level.placements = level.placements.filter(p => !(p.shelfId === shelfId && p.targetSlotIndex === slotIndex));
  renderShelfZenWorkspace();
}

function renderBooksPalette() {
  const container = document.getElementById('palette-items');
  if (!container) return;

  const titleEl = document.getElementById('palette-title');
  if (titleEl) titleEl.textContent = 'Каталог книг';
  const countEl = document.getElementById('palette-count');
  if (countEl) countEl.textContent = '20 книг';

  const search = (document.getElementById('palette-search')?.value || '').toLowerCase().trim();
  const allBooks = [];
  BOOK_COLORS.forEach(c => {
    BOOK_SIZES.forEach(s => {
      allBooks.push({ spriteId: `${c.id}${s.sizeIndex}`, itemId: s.itemId, colorHex: c.color, colorName: c.name, sizeName: s.name, heightPx: s.heightPx });
    });
  });

  const filtered = allBooks.filter(b => !search || b.spriteId.toLowerCase().includes(search) || b.colorName.toLowerCase().includes(search) || b.sizeName.toLowerCase().includes(search));
  if (filtered.length === 0) {
    container.innerHTML = '<div class="text-xs text-slate-500 italic p-4 text-center">Книги не найдены</div>';
    return;
  }

  const sel = window.StudioState?.selectedBookForPlacement;
  container.innerHTML = filtered.map(b => {
    const isSel = sel && sel.spriteId === b.spriteId;
    return `<div onclick="selectBookForPlacement('${b.spriteId}', '${b.itemId}')" class="shape-card border rounded-xl p-2.5 flex items-center justify-between transition-all cursor-pointer ${isSel ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/40' : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'}">
      <div class="flex items-center space-x-3 overflow-hidden">
        <div class="w-7 h-9 rounded bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
          <div class="w-3 rounded-sm transition-all" style="height:${Math.round(b.heightPx * 0.18)}px; background-color:${b.colorHex};"></div>
        </div>
        <div class="truncate">
          <div class="text-xs font-bold text-slate-200 truncate">${b.spriteId}</div>
          <div class="text-[10px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
            <span class="w-2 h-2 rounded-full inline-block shrink-0" style="background-color:${b.colorHex};"></span>
            <span>${b.colorName} · ${b.sizeName}</span>
          </div>
        </div>
      </div>
      <button type="button" class="px-2 py-1 ${isSel ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'} font-semibold text-[11px] rounded-lg transition-all shrink-0 ml-2">${isSel ? '✓ Выбрана' : 'Выбрать'}</button>
    </div>`;
  }).join('');
}

function selectBookForPlacement(spriteId, itemId, showToast = true) {
  if (!window.StudioState) window.StudioState = {};
  window.StudioState.selectedBookForPlacement = {
    spriteId, itemId, heightPx: getBookHeight(itemId, spriteId), colorHex: getBookColor(spriteId)
  };
  renderBooksPalette();
  if (showToast && typeof window.showAiToast === 'function') {
    window.showAiToast('Книга выбрана', `Выбрана ${spriteId} (высота ${window.StudioState.selectedBookForPlacement.heightPx}px). Кликните по слоту на полке.`);
  }
}

function renderRulesInspector() {
  const container = document.getElementById('rules-checkboxes');
  if (!container) return;

  const level = window.StudioState?.getCurrentLevel();
  if (!level || !Array.isArray(level.shelves) || level.shelves.length === 0) {
    container.innerHTML = '<div class="text-slate-500 text-xs italic">Нет полок на уровне</div>';
    return;
  }

  const activeIdx = Math.min(window.StudioState.activeShelfIndex || 0, level.shelves.length - 1);
  const shelf = level.shelves[activeIdx];
  if (!shelf) return;
  if (!Array.isArray(shelf.rules)) shelf.rules = [];

  const catalogRules = window.StudioState?.rulesCatalog?.rules || [
    { id: 'TargetSlot', name: 'Целевой слот (TargetSlot)', description: 'Книги расставляются по строгим слотам targetSlotIndex' },
    { id: 'ColorMatch', name: 'Один цвет на полке (ColorMatch)', description: 'Все книги на полке одного цвета' },
    { id: 'HeightDescending', name: 'Лесенка вниз (HeightDescending)', description: 'По убыванию высоты слева направо' },
    { id: 'HeightAscending', name: 'Лесенка вверх (HeightAscending)', description: 'По возрастанию высоты слева направо' },
    { id: 'HeightOrder', name: 'Любая лесенка (HeightOrder)', description: 'Монотонно убывают или возрастают' }
  ];

  let html = `<div class="mb-2 pb-2 border-b border-slate-800 flex items-center justify-between text-xs">
    <span class="text-slate-400">Полка: <strong class="text-amber-400">${shelf.shelfId}</strong></span>
    <span class="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">${shelf.rules.length} акт.</span>
  </div>`;

  catalogRules.forEach(r => {
    const isChecked = shelf.rules.includes(r.id);
    html += `<label class="flex items-start space-x-2.5 p-2 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-amber-500/10 border-amber-500/40 text-slate-100' : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'}">
      <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleShelfRule('${r.id}')" class="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer">
      <div class="flex-1">
        <div class="font-semibold text-xs text-slate-200">${r.name || r.id}</div>
        <div class="text-[10px] text-slate-400 mt-0.5 leading-tight">${r.description || ''}</div>
      </div>
    </label>`;
  });
  container.innerHTML = html;
}

function toggleShelfRule(ruleId) {
  const level = window.StudioState?.getCurrentLevel();
  const activeIdx = Math.min(window.StudioState?.activeShelfIndex || 0, (level?.shelves?.length || 1) - 1);
  const shelf = level?.shelves?.[activeIdx];
  if (!shelf) return;
  if (!Array.isArray(shelf.rules)) shelf.rules = [];
  const idx = shelf.rules.indexOf(ruleId);
  if (idx >= 0) shelf.rules.splice(idx, 1);
  else shelf.rules.push(ruleId);
  renderRulesInspector();
  renderShelfZenWorkspace();
  validateShelfZen();
}

function validateShelfZen() {
  const level = window.StudioState?.getCurrentLevel();
  const badge = document.getElementById('shelf-validation-badge');
  const details = document.getElementById('shelf-validation-details');

  if (!level) return;

  const shelves = Array.isArray(level.shelves) ? level.shelves : [];
  const placements = Array.isArray(level.placements) ? level.placements : [];

  let hasErrors = false;
  const shelfReports = [];

  shelves.forEach(shelf => {
    const shelfBooks = placements
      .filter(p => p.shelfId === shelf.shelfId)
      .sort((a, b) => a.targetSlotIndex - b.targetSlotIndex);

    const heights = shelfBooks.map(b => getBookHeight(b.itemId, b.spriteId));
    const rules = Array.isArray(shelf.rules) ? shelf.rules : [];
    const ruleResults = [];

    rules.forEach(ruleId => {
      let passed = true;
      if (ruleId === 'TargetSlot') {
        passed = true;
      } else if (ruleId === 'ColorMatch') {
        if (shelfBooks.length > 1) {
          const firstColor = getBookColor(shelfBooks[0].spriteId);
          passed = shelfBooks.every(b => getBookColor(b.spriteId) === firstColor);
        }
      } else if (ruleId === 'HeightDescending') {
        if (heights.length > 1) {
          for (let i = 0; i < heights.length - 1; i++) {
            if (heights[i] <= heights[i + 1]) {
              passed = false;
              break;
            }
          }
        }
      } else if (ruleId === 'HeightAscending') {
        if (heights.length > 1) {
          for (let i = 0; i < heights.length - 1; i++) {
            if (heights[i] >= heights[i + 1]) {
              passed = false;
              break;
            }
          }
        }
      } else if (ruleId === 'HeightOrder') {
        if (heights.length > 1) {
          let desc = true;
          let asc = true;
          for (let i = 0; i < heights.length - 1; i++) {
            if (heights[i] <= heights[i + 1]) desc = false;
            if (heights[i] >= heights[i + 1]) asc = false;
          }
          passed = desc || asc;
        }
      }

      if (!passed) hasErrors = true;
      ruleResults.push({ ruleId, passed });
    });

    shelfReports.push({
      shelfId: shelf.shelfId,
      bookCount: shelfBooks.length,
      rules: ruleResults
    });
  });

  if (badge) {
    if (hasErrors) {
      badge.className = 'text-amber-400 font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20';
      badge.textContent = '⚠️ Ошибка правил';
    } else {
      badge.className = 'text-emerald-400 font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20';
      badge.textContent = '✓ Все правила соблюдены';
    }
  }

  if (details) {
    let totalAnchors = 0;
    shelves.forEach(shelf => {
      if (Array.isArray(shelf.staticSlots)) {
        totalAnchors += shelf.staticSlots.filter(s => s.isStatic !== false).length;
      }
    });

    const getBooksCountLabel = (count) => {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return `${count} книга`;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} книги`;
      return `${count} книг`;
    };

    let detailsHtml = '';
    if (shelves.length === 0) {
      detailsHtml = '<div class="text-slate-500 text-xs italic">На этом уровне нет полок</div>';
    } else {
      detailsHtml = shelfReports.map(rep => {
        const rulesStr = rep.rules.length > 0
          ? rep.rules.map(r => `<span class="${r.passed ? 'text-emerald-400' : 'text-amber-400 font-bold'}">${r.ruleId} ${r.passed ? '✓' : '⚠️'}</span>`).join(', ')
          : '<span class="text-slate-500 italic">без правил</span>';

        return `<div class="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/60 last:border-0">
          <span class="text-slate-300">Полка <strong class="text-amber-400">${rep.shelfId}</strong> (${getBooksCountLabel(rep.bookCount)}):</span>
          <div class="space-x-1">${rulesStr}</div>
        </div>`;
      }).join('');
    }

    detailsHtml += `
      <div class="pt-2 mt-1 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Всего книг: <strong class="text-slate-200">${placements.length}</strong></span>
        <span class="flex items-center space-x-1"><span>Якорей 🔒:</span> <strong class="text-amber-400">${totalAnchors}</strong></span>
      </div>`;

    details.innerHTML = detailsHtml;
  }
}

// Global window exports
window.renderShelfZenWorkspace = renderShelfZenWorkspace;
window.addShelf = addShelf;
window.deleteShelf = deleteShelf;
window.toggleStaticSlot = toggleStaticSlot;
window.addBookToSlot = addBookToSlot;
window.onBookSlotClick = onBookSlotClick;
window.clearAllShelves = clearAllShelves;
window.removeBookPlacement = removeBookPlacement;
window.renderBooksPalette = renderBooksPalette;
window.renderRulesInspector = renderRulesInspector;
window.toggleShelfRule = toggleShelfRule;
window.selectActiveShelf = selectActiveShelf;
window.updateShelfPrefab = updateShelfPrefab;
window.updateShelfPos = updateShelfPos;
window.selectBookForPlacement = selectBookForPlacement;
window.validateShelfZen = validateShelfZen;

// Central render hooks
const prevRenderShelfZen = window.renderActiveWorkspace;
window.renderActiveWorkspace = function () {
  if (typeof prevRenderShelfZen === 'function') prevRenderShelfZen();
  if (window.StudioState?.activeMode === 'books') {
    renderShelfZenWorkspace();
    renderBooksPalette();
    renderRulesInspector();
    validateShelfZen();
  }
};

const prevFilterPalette = window.filterPalette;
window.filterPalette = function () {
  if (window.StudioState?.activeMode === 'books') {
    renderBooksPalette();
  } else if (typeof prevFilterPalette === 'function') {
    prevFilterPalette();
  }
};

