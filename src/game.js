// GameState — all puzzle logic, no rendering

class GameState {
  constructor() {
    this.pieces = new Map();
    this.grid = [];
    this.goals = [];
    this.moveCount = 0;
    this.width = 0;
    this.height = 0;
    this.initialPieces = null;
    this.initialGoals = [];
    this.levelName = '';
  }

  loadLevel(json) {
    this.levelName = json.name || '';
    this.width = json.width;
    this.height = json.height;
    // Support both old single `goal` and new `goals` array
    if (json.goals) {
      this.goals = JSON.parse(JSON.stringify(json.goals));
    } else if (json.goal) {
      this.goals = [JSON.parse(JSON.stringify(json.goal))];
    } else {
      this.goals = [];
    }
    this.moveCount = 0;

    const targetIds = new Set(this.goals.map(g => g.pieceId));
    this.pieces = new Map();
    for (const p of json.pieces) {
      this.pieces.set(p.id, {
        id: p.id,
        cells: p.cells.map(c => [...c]),
        color: p.color,
        isTarget: targetIds.has(p.id),
        isStatic: !!p.isStatic,
      });
    }

    this.rebuildGrid();

    // Snapshot for reset
    this.initialGoals = JSON.parse(JSON.stringify(this.goals));
    this.initialPieces = new Map();
    for (const [id, p] of this.pieces) {
      this.initialPieces.set(id, {
        id: p.id,
        cells: p.cells.map(c => [...c]),
        color: p.color,
        isTarget: p.isTarget,
        isStatic: p.isStatic,
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

  // BFS: collect all pieces that will slide together when pieceId moves in dir.
  // Returns a Set of pieceIds, or null if a static piece is blocking.
  collectGroup(pieceId, dir) {
    const [dc, dr] = this._dirDelta(dir);
    const group = new Set([pieceId]);
    const queue = [pieceId];
    while (queue.length > 0) {
      const pid = queue.shift();
      for (const [col, row] of this.pieces.get(pid).cells) {
        const nc = col + dc, nr = row + dr;
        if (nc < 0 || nc >= this.width || nr < 0 || nr >= this.height) continue;
        const occ = this.grid[nr][nc];
        if (occ === null || group.has(occ)) continue;
        if (this.pieces.get(occ).isStatic) return null; // chain hits a static piece
        group.add(occ);
        queue.push(occ);
      }
    }
    return group;
  }

  maxMove(pieceId, dir) {
    const [dc, dr] = this._dirDelta(dir);
    const group = this.collectGroup(pieceId, dir);
    if (!group) return 0;

    // All cells occupied by the group
    const groupCells = new Set();
    for (const pid of group) {
      for (const [col, row] of this.pieces.get(pid).cells) {
        groupCells.add(`${col},${row}`);
      }
    }

    let minGap = Infinity;

    for (const pid of group) {
      const piece = this.pieces.get(pid);
      if (dc !== 0) {
        // Horizontal: per row, find the leading col within this piece
        const rowMap = new Map();
        for (const [col, row] of piece.cells) {
          if (!rowMap.has(row) || (dc < 0 ? col < rowMap.get(row) : col > rowMap.get(row))) {
            rowMap.set(row, col);
          }
        }
        for (const [row, leadCol] of rowMap) {
          // Skip if another group member is immediately ahead (not the true leading edge)
          if (groupCells.has(`${leadCol + dc},${row}`)) continue;
          let gap = 0, c = leadCol + dc;
          while (c >= 0 && c < this.width) {
            const occ = this.grid[row][c];
            if (occ !== null && !group.has(occ)) break;
            if (occ === null) gap++;
            c += dc;
          }
          minGap = Math.min(minGap, gap);
        }
      } else {
        // Vertical: per col, find the leading row within this piece
        const colMap = new Map();
        for (const [col, row] of piece.cells) {
          if (!colMap.has(col) || (dr < 0 ? row < colMap.get(col) : row > colMap.get(col))) {
            colMap.set(col, row);
          }
        }
        for (const [col, leadRow] of colMap) {
          if (groupCells.has(`${col},${leadRow + dr}`)) continue;
          let gap = 0, r = leadRow + dr;
          while (r >= 0 && r < this.height) {
            const occ = this.grid[r][col];
            if (occ !== null && !group.has(occ)) break;
            if (occ === null) gap++;
            r += dr;
          }
          minGap = Math.min(minGap, gap);
        }
      }
    }

    return minGap === Infinity ? 0 : minGap;
  }

  movePiece(pieceId, dir, steps) {
    if (steps === 0) return false;
    const [dc, dr] = this._dirDelta(dir);
    const group = this.collectGroup(pieceId, dir);
    if (!group) return false;
    for (const pid of group) {
      const piece = this.pieces.get(pid);
      piece.cells = piece.cells.map(([col, row]) => [col + dc * steps, row + dr * steps]);
    }
    this.rebuildGrid();
    this.moveCount++;
    return true;
  }

  checkWin() {
    if (this.goals.length === 0) return false;
    return this.goals.every(goal => {
      const piece = this.pieces.get(goal.pieceId);
      if (!piece) return false;
      if (piece.cells.length !== goal.cells.length) return false;
      const goalSet = new Set(goal.cells.map(([c, r]) => `${c},${r}`));
      return piece.cells.every(([c, r]) => goalSet.has(`${c},${r}`));
    });
  }

  reset() {
    this.goals = JSON.parse(JSON.stringify(this.initialGoals));
    this.pieces = new Map();
    for (const [id, p] of this.initialPieces) {
      this.pieces.set(id, {
        id: p.id,
        cells: p.cells.map(c => [...c]),
        color: p.color,
        isTarget: p.isTarget,
        isStatic: p.isStatic,
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
