// Level editor logic

const CELL = 80;

const PALETTE = [
  '#ffffff', '#aaaaaa', '#555555', '#000000',
  '#ff6b6b', '#ffa94d', '#ffd43b', '#a9e34b',
  '#4ecdc4', '#45b7d1', '#a29bfe', '#fd79a8',
];

const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;

// Sidebar controls
const inputName = document.getElementById('editor-name');
const inputWidth = document.getElementById('editor-width');
const inputHeight = document.getElementById('editor-height');
const btnApplySize = document.getElementById('btn-apply-size');
const colorPicker = document.getElementById('color-picker');
const pieceList = document.getElementById('piece-list');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import-file');
const importFile = document.getElementById('import-file-input');
const testLink = document.getElementById('test-link');
const btnClearAll = document.getElementById('btn-clear-all');
const selectBuiltin = document.getElementById('load-builtin');
const btnLoadBuiltin = document.getElementById('btn-load-builtin');

const COLORS = ['#4ecdc4','#45b7d1','#96ceb4','#a29bfe','#fd79a8','#55efc4','#ffeaa7','#dfe6e9','#e17055','#74b9ff','#00cec9','#6c5ce7','#b2bec3'];
let colorIdx = 0;

// Editor state
let editorWidth = 6;
let editorHeight = 6;
let pieces = new Map(); // id → {id, cells, color, isTarget}
let goalCells = []; // [[col,row], ...]
let goalPieceId = null; // which piece is the target
let selectedTool = 'paint'; // 'paint'|'select'|'erase'|'goal'
let selectedPieceId = null;
let pieceCounter = 0;
let isPointerDown = false;
let paintingPieceId = null; // piece being painted in current stroke
let selectDragStart = null; // {pieceId, startCol, startRow, origCells}

function nextId() {
  return 'p' + (++pieceCounter);
}

function nextColor() {
  const c = COLORS[colorIdx % COLORS.length];
  colorIdx++;
  return c;
}

// Canvas sizing
function resizeCanvas() {
  canvas.width = editorWidth * CELL * dpr;
  canvas.height = editorHeight * CELL * dpr;
  canvas.style.width = editorWidth * CELL + 'px';
  canvas.style.height = editorHeight * CELL + 'px';
  ctx.scale(dpr, dpr);
}

function render() {
  const W = editorWidth;
  const H = editorHeight;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W * CELL, H * CELL);

  // Grid cells
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      ctx.fillStyle = '#161b22';
      roundRect(ctx, c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4, 4);
      ctx.fill();
    }
  }

  // Goal cells
  const goalSet = new Set(goalCells.map(([c, r]) => `${c},${r}`));
  for (const [col, row] of goalCells) {
    const gColor = goalPieceId && pieces.has(goalPieceId) ? pieces.get(goalPieceId).color : '#ff6b6b';
    ctx.fillStyle = gColor;
    ctx.globalAlpha = 0.3;
    roundRect(ctx, col * CELL + 2, row * CELL + 2, CELL - 4, CELL - 4, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = gColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(col * CELL + 3, row * CELL + 3, CELL - 6, CELL - 6);
    ctx.setLineDash([]);
  }

  // Pieces
  for (const [id, piece] of pieces) {
    const cellSet = new Set(piece.cells.map(([c, r]) => `${c},${r}`));
    ctx.fillStyle = piece.color;

    for (const [col, row] of piece.cells) {
      roundRect(ctx, col * CELL + 1, row * CELL + 1, CELL - 2, CELL - 2, 6);
      ctx.fill();
    }

    // Bridges
    for (const [col, row] of piece.cells) {
      if (cellSet.has(`${col + 1},${row}`)) {
        ctx.fillRect(col * CELL + CELL - 6, row * CELL + 1, 12, CELL - 2);
      }
      if (cellSet.has(`${col},${row + 1}`)) {
        ctx.fillRect(col * CELL + 1, row * CELL + CELL - 6, CELL - 2, 12);
      }
    }

    // Static piece stripe overlay
    if (piece.isStatic) {
      const sc = document.createElement('canvas');
      sc.width = 8; sc.height = 8;
      const sctx = sc.getContext('2d');
      sctx.strokeStyle = 'rgba(0,0,0,0.25)';
      sctx.lineWidth = 2;
      sctx.beginPath(); sctx.moveTo(0, 8); sctx.lineTo(8, 0); sctx.stroke();
      sctx.beginPath(); sctx.moveTo(-4, 8); sctx.lineTo(4, 0); sctx.stroke();
      sctx.beginPath(); sctx.moveTo(4, 8); sctx.lineTo(12, 0); sctx.stroke();
      const pattern = ctx.createPattern(sc, 'repeat');
      ctx.fillStyle = pattern;
      for (const [col, row] of piece.cells) {
        roundRect(ctx, col * CELL + 1, row * CELL + 1, CELL - 2, CELL - 2, 6);
        ctx.fill();
      }
    }

    // Stroke outer edges
    ctx.save();
    ctx.strokeStyle = piece.isStatic ? 'rgba(255,255,255,0.35)' : darken(piece.color, 0.25);
    ctx.lineWidth = piece.isStatic ? 2 : 1.5;
    ctx.beginPath();
    for (const [col, row] of piece.cells) {
      const x = col * CELL, y = row * CELL;
      if (!cellSet.has(`${col},${row - 1}`)) { ctx.moveTo(x+1, y+1); ctx.lineTo(x+CELL-1, y+1); }
      if (!cellSet.has(`${col},${row + 1}`)) { ctx.moveTo(x+1, y+CELL-1); ctx.lineTo(x+CELL-1, y+CELL-1); }
      if (!cellSet.has(`${col - 1},${row}`)) { ctx.moveTo(x+1, y+1); ctx.lineTo(x+1, y+CELL-1); }
      if (!cellSet.has(`${col + 1},${row}`)) { ctx.moveTo(x+CELL-1, y+1); ctx.lineTo(x+CELL-1, y+CELL-1); }
    }
    ctx.stroke();
    ctx.restore();

    // Target indicator
    if (piece.isTarget) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cols = piece.cells.map(([c]) => c);
      const rows = piece.cells.map(([, r]) => r);
      const cx = (Math.min(...cols) + Math.max(...cols) + 1) / 2 * CELL;
      const cy = (Math.min(...rows) + Math.max(...rows) + 1) / 2 * CELL;
      ctx.fillText('★', cx, cy);
    }

    // Selection highlight
    if (id === selectedPieceId) {
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      for (const [col, row] of piece.cells) {
        ctx.strokeRect(col * CELL + 2, row * CELL + 2, CELL - 4, CELL - 4);
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function darken(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}

function buildGrid() {
  const grid = Array.from({ length: editorHeight }, () => Array(editorWidth).fill(null));
  for (const [id, piece] of pieces) {
    for (const [col, row] of piece.cells) {
      if (row >= 0 && row < editorHeight && col >= 0 && col < editorWidth) {
        grid[row][col] = id;
      }
    }
  }
  return grid;
}

function getCell(ev) {
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  return [Math.floor(x / CELL), Math.floor(y / CELL)];
}

function inBounds(col, row) {
  return col >= 0 && col < editorWidth && row >= 0 && row < editorHeight;
}

// Pointer handling
canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  canvas.setPointerCapture(ev.pointerId);
  isPointerDown = true;
  const [col, row] = getCell(ev);
  if (!inBounds(col, row)) return;

  const grid = buildGrid();
  const hitId = grid[row][col];

  if (selectedTool === 'paint') {
    if (hitId) {
      // Add to existing piece if same color, else select it
      paintingPieceId = hitId;
    } else {
      // Create new piece
      const id = nextId();
      const color = colorPicker.value || nextColor();
      pieces.set(id, { id, cells: [[col, row]], color, isTarget: false, isStatic: false });
      paintingPieceId = id;
      selectedPieceId = id;
      updatePieceList();
    }
    render();
  } else if (selectedTool === 'select') {
    if (hitId) {
      selectedPieceId = hitId;
      const piece = pieces.get(hitId);
      selectDragStart = {
        pieceId: hitId,
        startCol: col,
        startRow: row,
        origCells: piece.cells.map(c => [...c]),
      };
      updatePieceList();
    } else {
      selectedPieceId = null;
      updatePieceList();
    }
    render();
  } else if (selectedTool === 'erase') {
    if (hitId) {
      const piece = pieces.get(hitId);
      piece.cells = piece.cells.filter(([c, r]) => !(c === col && r === row));
      if (piece.cells.length === 0) {
        pieces.delete(hitId);
        if (selectedPieceId === hitId) selectedPieceId = null;
        if (goalPieceId === hitId) goalPieceId = null;
      }
      updatePieceList();
      render();
    }
  } else if (selectedTool === 'goal') {
    const key = `${col},${row}`;
    const idx = goalCells.findIndex(([c, r]) => c === col && r === row);
    if (idx >= 0) {
      goalCells.splice(idx, 1);
    } else {
      goalCells.push([col, row]);
    }
    render();
  }
});

canvas.addEventListener('pointermove', (ev) => {
  if (!isPointerDown) return;
  ev.preventDefault();
  const [col, row] = getCell(ev);
  if (!inBounds(col, row)) return;

  if (selectedTool === 'paint' && paintingPieceId) {
    const piece = pieces.get(paintingPieceId);
    if (!piece) return;
    const grid = buildGrid();
    const occupant = grid[row][col];
    if (occupant === null) {
      // Only add if adjacent to existing piece cells
      const cellSet = new Set(piece.cells.map(([c, r]) => `${c},${r}`));
      const adjacent = piece.cells.some(([c, r]) =>
        (Math.abs(c - col) === 1 && r === row) || (Math.abs(r - row) === 1 && c === col)
      );
      if (adjacent) {
        piece.cells.push([col, row]);
        render();
      }
    }
  } else if (selectedTool === 'select' && selectDragStart) {
    const dc = col - selectDragStart.startCol;
    const dr = row - selectDragStart.startRow;
    const piece = pieces.get(selectDragStart.pieceId);
    if (!piece) return;

    // Try to move piece
    const newCells = selectDragStart.origCells.map(([c, r]) => [c + dc, r + dr]);

    // Check bounds and no overlap with other pieces
    const grid = buildGrid();
    const canPlace = newCells.every(([c, r]) => {
      if (!inBounds(c, r)) return false;
      const occ = grid[r][c];
      return occ === null || occ === selectDragStart.pieceId;
    });

    if (canPlace) {
      piece.cells = newCells;
      render();
    }
  } else if (selectedTool === 'erase') {
    const grid = buildGrid();
    const hitId = grid[row][col];
    if (hitId) {
      const piece = pieces.get(hitId);
      piece.cells = piece.cells.filter(([c, r]) => !(c === col && r === row));
      if (piece.cells.length === 0) {
        pieces.delete(hitId);
        if (selectedPieceId === hitId) selectedPieceId = null;
        if (goalPieceId === hitId) goalPieceId = null;
        updatePieceList();
      }
      render();
    }
  }
});

canvas.addEventListener('pointerup', (ev) => {
  ev.preventDefault();
  isPointerDown = false;
  paintingPieceId = null;
  selectDragStart = null;
});

canvas.addEventListener('pointercancel', (ev) => {
  isPointerDown = false;
  paintingPieceId = null;
  selectDragStart = null;
});

// Tool buttons
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedTool = btn.dataset.tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Size controls
btnApplySize.addEventListener('click', () => {
  const w = Math.max(3, Math.min(12, parseInt(inputWidth.value) || 6));
  const h = Math.max(3, Math.min(12, parseInt(inputHeight.value) || 6));
  inputWidth.value = w;
  inputHeight.value = h;
  editorWidth = w;
  editorHeight = h;

  // Clamp pieces to new bounds
  for (const [id, piece] of pieces) {
    piece.cells = piece.cells.filter(([col, row]) => col < w && row < h);
    if (piece.cells.length === 0) pieces.delete(id);
  }
  // Clamp goal cells
  goalCells = goalCells.filter(([col, row]) => col < w && row < h);

  // Reset canvas transform before resize
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  resizeCanvas();
  updatePieceList();
  render();
});

// Clear all
btnClearAll.addEventListener('click', () => {
  pieces.clear();
  goalCells = [];
  goalPieceId = null;
  selectedPieceId = null;
  pieceCounter = 0;
  colorIdx = 0;
  updatePieceList();
  render();
});

function updatePieceList() {
  pieceList.innerHTML = '';
  for (const [id, piece] of pieces) {
    const item = document.createElement('div');
    item.className = 'piece-item' + (id === selectedPieceId ? ' selected' : '');

    const swatch = document.createElement('span');
    swatch.className = 'piece-swatch';
    swatch.style.background = piece.color;

    const label = document.createElement('span');
    label.className = 'piece-label';
    label.textContent = id + (piece.isTarget ? ' ★' : piece.isStatic ? ' ⬛' : '');

    const btnTarget = document.createElement('button');
    btnTarget.className = 'btn-target' + (piece.isTarget ? ' active' : '');
    btnTarget.textContent = piece.isTarget ? 'Target ✓' : 'Set Target';
    btnTarget.title = 'Set as target piece';
    btnTarget.addEventListener('click', () => {
      for (const p of pieces.values()) p.isTarget = false;
      piece.isTarget = true;
      piece.isStatic = false;
      goalPieceId = id;
      selectedPieceId = id;
      updatePieceList();
      render();
    });

    const btnStatic = document.createElement('button');
    btnStatic.className = 'btn-target' + (piece.isStatic ? ' active' : '');
    btnStatic.textContent = piece.isStatic ? 'Static ✓' : 'Static';
    btnStatic.title = 'Make piece unmovable';
    btnStatic.addEventListener('click', () => {
      piece.isStatic = !piece.isStatic;
      if (piece.isStatic) piece.isTarget = false;
      updatePieceList();
      render();
    });

    item.addEventListener('click', (e) => {
      if (e.target === btnTarget || e.target === btnStatic) return;
      selectedPieceId = id;
      updatePieceList();
      render();
    });

    item.appendChild(swatch);
    item.appendChild(label);
    item.appendChild(btnTarget);
    item.appendChild(btnStatic);
    pieceList.appendChild(item);
  }
}

// Validation
function validate() {
  const errors = [];

  if (pieces.size === 0) {
    errors.push('No pieces on board.');
    return errors;
  }

  const targetPieces = [...pieces.values()].filter(p => p.isTarget);
  if (targetPieces.length !== 1) {
    errors.push('Exactly one piece must be marked as the target.');
  }

  if (goalCells.length === 0) {
    errors.push('Goal area is empty. Use the Goal tool to mark goal cells.');
  }

  if (targetPieces.length === 1 && goalCells.length !== targetPieces[0].cells.length) {
    errors.push(`Goal cell count (${goalCells.length}) must match target piece cell count (${targetPieces[0].cells.length}).`);
  }

  // Check connectivity of each piece (BFS)
  for (const piece of pieces.values()) {
    if (!isConnected(piece.cells)) {
      errors.push(`Piece ${piece.id} is not a connected polyomino.`);
    }
  }

  // Check overlaps
  const seen = new Map();
  for (const piece of pieces.values()) {
    for (const [col, row] of piece.cells) {
      const key = `${col},${row}`;
      if (seen.has(key)) {
        errors.push(`Overlap at (${col},${row}) between ${seen.get(key)} and ${piece.id}.`);
      }
      seen.set(key, piece.id);
    }
  }

  return errors;
}

function isConnected(cells) {
  if (cells.length === 0) return true;
  const set = new Set(cells.map(([c, r]) => `${c},${r}`));
  const visited = new Set();
  const queue = [cells[0]];
  visited.add(`${cells[0][0]},${cells[0][1]}`);
  while (queue.length) {
    const [c, r] = queue.shift();
    for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const key = `${c+dc},${r+dr}`;
      if (set.has(key) && !visited.has(key)) {
        visited.add(key);
        queue.push([c+dc, r+dr]);
      }
    }
  }
  return visited.size === cells.length;
}

// Export
btnExport.addEventListener('click', () => {
  const errors = validate();
  if (errors.length > 0) {
    alert('Cannot export:\n\n' + errors.join('\n'));
    return;
  }

  const targetPiece = [...pieces.values()].find(p => p.isTarget);

  const json = {
    name: inputName.value || 'Custom Level',
    width: editorWidth,
    height: editorHeight,
    pieces: [...pieces.values()].map(p => ({
      id: p.id,
      cells: p.cells,
      color: p.color,
      isTarget: p.isTarget || undefined,
        isStatic: p.isStatic || undefined,
    })),
    goal: {
      pieceId: targetPiece.id,
      cells: goalCells,
    }
  };

  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (json.name.replace(/\s+/g, '_') || 'level') + '.json';
  a.click();
  URL.revokeObjectURL(url);
});

// Import
btnImport.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      loadFromJson(json);
    } catch {
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
  importFile.value = '';
});

function loadFromJson(json) {
  editorWidth = json.width || 6;
  editorHeight = json.height || 6;
  inputWidth.value = editorWidth;
  inputHeight.value = editorHeight;
  inputName.value = json.name || '';

  pieces.clear();
  pieceCounter = 0;
  for (const p of json.pieces || []) {
    pieces.set(p.id, {
      id: p.id,
      cells: p.cells.map(c => [...c]),
      color: p.color,
      isTarget: !!p.isTarget,
      isStatic: !!p.isStatic,
    });
    if (p.isTarget) goalPieceId = p.id;
  }

  goalCells = (json.goal?.cells || []).map(c => [...c]);
  goalPieceId = json.goal?.pieceId || null;
  selectedPieceId = null;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  resizeCanvas();
  updatePieceList();
  render();
}

// Test link
document.getElementById('btn-test').addEventListener('click', () => {
  const errors = validate();
  if (errors.length > 0) {
    alert('Fix these issues before testing:\n\n' + errors.join('\n'));
    return;
  }

  const targetPiece = [...pieces.values()].find(p => p.isTarget);
  const json = {
    name: inputName.value || 'Test Level',
    width: editorWidth,
    height: editorHeight,
    pieces: [...pieces.values()].map(p => ({
      id: p.id,
      cells: p.cells,
      color: p.color,
      isTarget: p.isTarget || undefined,
        isStatic: p.isStatic || undefined,
    })),
    goal: { pieceId: targetPiece.id, cells: goalCells }
  };

  const hash = btoa(JSON.stringify(json));
  window.open(`index.html#${hash}`, '_blank');
});

// Populate built-in level dropdown
BUILTIN_LEVELS.forEach((lvl, i) => {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = lvl.name || `Level ${i + 1}`;
  selectBuiltin.appendChild(opt);
});

btnLoadBuiltin.addEventListener('click', () => {
  const idx = parseInt(selectBuiltin.value);
  if (isNaN(idx)) return;
  loadFromJson(BUILTIN_LEVELS[idx]);
  selectBuiltin.value = '';
});

// Color swatches
const swatchContainer = document.getElementById('color-swatches');
PALETTE.forEach(hex => {
  const s = document.createElement('button');
  s.className = 'color-swatch' + (hex === colorPicker.value ? ' active' : '');
  s.style.background = hex;
  s.style.outline = hex === '#ffffff' ? '1px solid #444' : '';
  s.title = hex;
  s.addEventListener('click', () => {
    colorPicker.value = hex;
    document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active'));
    s.classList.add('active');
  });
  swatchContainer.appendChild(s);
});

// Keep swatches in sync when user picks a custom color
colorPicker.addEventListener('input', () => {
  document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active'));
});

// Init
resizeCanvas();
render();
