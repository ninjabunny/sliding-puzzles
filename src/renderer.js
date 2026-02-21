// Canvas rendering for the sliding puzzle game

const MAX_CELL = 80;
const CORNER_R = 6;
const GAP = 2;

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.cellSize = MAX_CELL;
  }

  resize(width, height) {
    // Fit the board to the available viewport space
    const PAD = 16;
    const HUD_H = 140; // HUD bar + game-container padding + gap
    const availW = window.innerWidth - PAD * 2;
    const availH = window.innerHeight - HUD_H;
    this.cellSize = Math.min(MAX_CELL, Math.floor(Math.min(availW / width, availH / height)));

    const px = width * this.cellSize;
    const py = height * this.cellSize;
    this.canvas.width = px * this.dpr;
    this.canvas.height = py * this.dpr;
    this.canvas.style.width = px + 'px';
    this.canvas.style.height = py + 'px';
    this.ctx.scale(this.dpr, this.dpr);
    this.boardWidth = width;
    this.boardHeight = height;
  }

  cellToPixel(col, row) {
    return [col * this.cellSize, row * this.cellSize];
  }

  render(state, dragState) {
    const ctx = this.ctx;
    const C = this.cellSize;
    const W = this.boardWidth;
    const H = this.boardHeight;

    ctx.clearRect(0, 0, W * C, H * C);

    // Grid background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W * C, H * C);

    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        ctx.fillStyle = '#161b22';
        this._roundRect(ctx, c * C + GAP, r * C + GAP, C - GAP * 2, C - GAP * 2, 4);
        ctx.fill();
      }
    }

    // Goal area
    if (state.goal) {
      const targetPiece = state.pieces.get(state.goal.pieceId);
      const goalColor = targetPiece ? targetPiece.color : '#ff6b6b';
      ctx.save();
      ctx.globalAlpha = 0.25;
      for (const [col, row] of state.goal.cells) {
        const [x, y] = this.cellToPixel(col, row);
        ctx.fillStyle = goalColor;
        this._roundRect(ctx, x + GAP, y + GAP, C - GAP * 2, C - GAP * 2, 4);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = goalColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (const [col, row] of state.goal.cells) {
        const [x, y] = this.cellToPixel(col, row);
        ctx.strokeRect(x + GAP + 1, y + GAP + 1, C - GAP * 2 - 2, C - GAP * 2 - 2);
      }
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Draw all pieces except the dragged one
    const dragId = dragState ? dragState.pieceId : null;
    for (const [id, piece] of state.pieces) {
      if (id === dragId) continue;
      this._drawPiece(ctx, piece, 0, 0, false);
    }

    // Draw dragged piece on top with offset and shadow
    if (dragState) {
      const piece = state.pieces.get(dragState.pieceId);
      if (piece) {
        const [ox, oy] = dragState.dir === 'left' || dragState.dir === 'right'
          ? [dragState.pixelOffset, 0]
          : [0, dragState.pixelOffset];
        this._drawPiece(ctx, piece, ox, oy, true);
      }
    }
  }

  _drawPiece(ctx, piece, ox, oy, shadow) {
    const C = this.cellSize;
    const cellSet = new Set(piece.cells.map(([c, r]) => `${c},${r}`));
    const color = piece.color;

    if (shadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
    }

    ctx.fillStyle = color;

    for (const [col, row] of piece.cells) {
      this._roundRect(ctx, col * C + ox + 1, row * C + oy + 1, C - 2, C - 2, CORNER_R);
      ctx.fill();
    }

    // Horizontal bridges
    for (const [col, row] of piece.cells) {
      if (cellSet.has(`${col + 1},${row}`)) {
        ctx.fillRect(col * C + ox + C - CORNER_R, row * C + oy + 1, CORNER_R * 2, C - 2);
      }
    }

    // Vertical bridges
    for (const [col, row] of piece.cells) {
      if (cellSet.has(`${col},${row + 1}`)) {
        ctx.fillRect(col * C + ox + 1, row * C + oy + C - CORNER_R, C - 2, CORNER_R * 2);
      }
    }

    if (shadow) ctx.restore();

    // Stroke outer edges only
    ctx.save();
    ctx.strokeStyle = this._darken(color, 0.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const [col, row] of piece.cells) {
      const x = col * C + ox;
      const y = row * C + oy;
      if (!cellSet.has(`${col},${row - 1}`)) { ctx.moveTo(x + 1, y + 1);     ctx.lineTo(x + C - 1, y + 1); }
      if (!cellSet.has(`${col},${row + 1}`)) { ctx.moveTo(x + 1, y + C - 1); ctx.lineTo(x + C - 1, y + C - 1); }
      if (!cellSet.has(`${col - 1},${row}`)) { ctx.moveTo(x + 1, y + 1);     ctx.lineTo(x + 1, y + C - 1); }
      if (!cellSet.has(`${col + 1},${row}`)) { ctx.moveTo(x + C - 1, y + 1); ctx.lineTo(x + C - 1, y + C - 1); }
    }
    ctx.stroke();
    ctx.restore();

    // Target star
    if (piece.isTarget) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const fontSize = Math.max(10, Math.round(C * 0.2));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cols = piece.cells.map(([c]) => c);
      const rows = piece.cells.map(([, r]) => r);
      const cx = (Math.min(...cols) + Math.max(...cols) + 1) / 2 * C + ox;
      const cy = (Math.min(...rows) + Math.max(...rows) + 1) / 2 * C + oy;
      ctx.fillText('★', cx, cy);
      ctx.restore();
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
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

  _darken(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
    return `rgb(${r},${g},${b})`;
  }

  renderThumbnail(canvas, levelJson) {
    const dpr = window.devicePixelRatio || 1;
    const TCELL = 20;
    const W = levelJson.width;
    const H = levelJson.height;
    canvas.width = W * TCELL * dpr;
    canvas.height = H * TCELL * dpr;
    canvas.style.width = W * TCELL + 'px';
    canvas.style.height = H * TCELL + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, W * TCELL, H * TCELL);

    for (const p of levelJson.pieces) {
      ctx.fillStyle = p.color;
      for (const [col, row] of p.cells) {
        ctx.fillRect(col * TCELL + 1, row * TCELL + 1, TCELL - 2, TCELL - 2);
      }
    }

    const targetPiece = levelJson.pieces.find(p => p.isTarget);
    if (levelJson.goal && targetPiece) {
      ctx.fillStyle = targetPiece.color;
      ctx.globalAlpha = 0.3;
      for (const [col, row] of levelJson.goal.cells) {
        ctx.fillRect(col * TCELL + 1, row * TCELL + 1, TCELL - 2, TCELL - 2);
      }
      ctx.globalAlpha = 1;
    }
  }
}
