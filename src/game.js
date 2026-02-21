// GameState — all puzzle logic, no rendering

export class GameState {
  constructor() {
    this.pieces = new Map();
    this.grid = [];
    this.goal = null;
    this.moveCount = 0;
    this.width = 0;
    this.height = 0;
    this.initialPieces = null;
    this.levelName = '';
  }

  loadLevel(json) {
    this.levelName = json.name || '';
    this.width = json.width;
    this.height = json.height;
    this.goal = JSON.parse(JSON.stringify(json.goal));
    this.moveCount = 0;

    this.pieces = new Map();
    for (const p of json.pieces) {
      this.pieces.set(p.id, {
        id: p.id,
        cells: p.cells.map(c => [...c]),
        color: p.color,
        isTarget: !!p.isTarget,
      });
    }

    this.rebuildGrid();

    // Snapshot for reset
    this.initialPieces = new Map();
    for (const [id, p] of this.pieces) {
      this.initialPieces.set(id, {
        id: p.id,
        cells: p.cells.map(c => [...c]),
        color: p.color,
        isTarget: p.isTarget,
      });
    }
  }

  rebuildGrid() {
    this.grid = Array.from({ length: this.height }, () => Array(this.width).fill(null));
    for (const [id, piece] of this.pieces) {
      for (const [col, row] of piece.cells) {
        if (row >= 0 && row < this.height && col >= 0 && col < this.width) {
          this.grid[row][col] = id;
        }
      }
    }
  }

  // dir: 'left'|'right'|'up'|'down'
  _dirDelta(dir) {
    switch (dir) {
      case 'left':  return [-1,  0];
      case 'right': return [ 1,  0];
      case 'up':    return [ 0, -1];
      case 'down':  return [ 0,  1];
    }
  }

  canMove(pieceId, dir) {
    return this.maxMove(pieceId, dir) > 0;
  }

  maxMove(pieceId, dir) {
    const piece = this.pieces.get(pieceId);
    if (!piece) return 0;

    const [dc, dr] = this._dirDelta(dir);
    let minGap = Infinity;

    // For each unique row (vertical move) or col (horizontal move), find leading-edge cells
    if (dc !== 0) {
      // Horizontal: for each unique row, find the leading col
      const rowMap = new Map();
      for (const [col, row] of piece.cells) {
        if (!rowMap.has(row) || (dc < 0 ? col < rowMap.get(row) : col > rowMap.get(row))) {
          rowMap.set(row, col);
        }
      }
      for (const [row, leadCol] of rowMap) {
        let gap = 0;
        let c = leadCol + dc;
        while (c >= 0 && c < this.width) {
          const occupant = this.grid[row][c];
          if (occupant !== null && occupant !== pieceId) break;
          if (occupant === null) gap++;
          c += dc;
        }
        minGap = Math.min(minGap, gap);
      }
    } else {
      // Vertical: for each unique col, find the leading row
      const colMap = new Map();
      for (const [col, row] of piece.cells) {
        if (!colMap.has(col) || (dr < 0 ? row < colMap.get(col) : row > colMap.get(col))) {
          colMap.set(col, row);
        }
      }
      for (const [col, leadRow] of colMap) {
        let gap = 0;
        let r = leadRow + dr;
        while (r >= 0 && r < this.height) {
          const occupant = this.grid[r][col];
          if (occupant !== null && occupant !== pieceId) break;
          if (occupant === null) gap++;
          r += dr;
        }
        minGap = Math.min(minGap, gap);
      }
    }

    return minGap === Infinity ? 0 : minGap;
  }

  movePiece(pieceId, dir, steps) {
    if (steps === 0) return false;
    const piece = this.pieces.get(pieceId);
    if (!piece) return false;

    const [dc, dr] = this._dirDelta(dir);
    piece.cells = piece.cells.map(([col, row]) => [col + dc * steps, row + dr * steps]);
    this.rebuildGrid();
    this.moveCount++;
    return true;
  }

  checkWin() {
    const goalCells = new Set(this.goal.cells.map(([c, r]) => `${c},${r}`));
    const piece = this.pieces.get(this.goal.pieceId);
    if (!piece) return false;
    if (piece.cells.length !== this.goal.cells.length) return false;
    return piece.cells.every(([c, r]) => goalCells.has(`${c},${r}`));
  }

  reset() {
    this.pieces = new Map();
    for (const [id, p] of this.initialPieces) {
      this.pieces.set(id, {
        id: p.id,
        cells: p.cells.map(c => [...c]),
        color: p.color,
        isTarget: p.isTarget,
      });
    }
    this.rebuildGrid();
    this.moveCount = 0;
  }

  // Return piece id at grid position, or null
  pieceAt(col, row) {
    if (row < 0 || row >= this.height || col < 0 || col >= this.width) return null;
    return this.grid[row][col];
  }
}
