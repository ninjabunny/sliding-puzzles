# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Project

No build step or package manager. Open files directly in a browser or serve with any static HTTP server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

- `index.html` — the game
- `editor.html` — the level editor

## Architecture

### Script loading order

Scripts are loaded with `defer` and share globals via `window` (no ES modules). Order matters:

**Game page** (`index.html`): `levels.js` → `game.js` → `renderer.js` → `input.js` → `main.js`

**Editor page** (`editor.html`): `levels.js` → `editor.js`

### Module responsibilities

- **`src/levels.js`** — declares the global `BUILTIN_LEVELS` array; the only place to add/edit built-in levels
- **`src/game.js`** — `GameState` class: pure puzzle logic (no rendering). Manages pieces as a `Map<id, piece>` and a 2D grid array. Key methods: `loadLevel()`, `collectGroup()` (BFS for linked-piece sliding), `maxMove()`, `movePiece()`, `checkWin()`, `reset()`
- **`src/renderer.js`** — `Renderer` class: all canvas drawing. Handles DPR scaling, piece bridging (fills gaps between adjacent cells of the same piece), goal overlays, static-piece stripe patterns, and thumbnail generation for the level select screen
- **`src/input.js`** — `InputHandler` class: Pointer Events state machine (IDLE → PRESSING → DRAGGING → IDLE). Constrains drag to a single axis once direction is determined; snaps to nearest cell on release
- **`src/main.js`** — game page orchestration: wires `GameState`, `Renderer`, and `InputHandler` together; handles level select, import via file picker, and URL-hash test levels from the editor
- **`src/editor.js`** — standalone editor script (no class). Tools: paint, select, erase, goal. Validates levels (connectivity, no overlaps, goal cell count matches piece cell count) before export/test. "Test in Game" encodes the level as base64 JSON in `index.html#<hash>`

### Level JSON format

```json
{
  "name": "My Level",
  "width": 5,
  "height": 4,
  "pieces": [
    { "id": "p1", "cells": [[col, row], ...], "color": "#ff6b6b", "isTarget": true },
    { "id": "p2", "cells": [[col, row], ...], "color": "#ffffff", "isStatic": true }
  ],
  "goals": [
    { "pieceId": "p1", "cells": [[col, row], ...] }
  ]
}
```

- Coordinates are `[col, row]` (x first, y second), 0-indexed from the top-left
- `isTarget` pieces have their positions checked against `goals` for the win condition
- `isStatic` pieces cannot move and block group chains (a chain hitting a static piece returns `null` from `collectGroup()`)
- The legacy single `goal` object is still supported alongside `goals` arrays
- A goal's `cells` array must have the same length as the target piece's `cells` array

### Piece sliding mechanics

`collectGroup(pieceId, dir)` does a BFS from the dragged piece: if any adjacent cell in the move direction is occupied by another non-static piece, that piece joins the group and is also checked. The whole group moves together. `maxMove()` finds the minimum gap to any wall or non-group piece across all leading edges in the group.
