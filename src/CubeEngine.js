/**
 * CubeEngine.js
 *
 * Net layout (cross):
 *          [ UP  ]
 *  [LEFT] [FRONT] [RIGHT] [RIGHT_OF_RIGHT]
 *          [DOWN ]
 *
 * Face indices:
 *   0 = FRONT          (Green)
 *   1 = RIGHT          (White)
 *   2 = RIGHT_OF_RIGHT (Yellow)
 *   3 = LEFT           (Red)
 *   4 = UP             (Blue)
 *   5 = DOWN           (Orange)
 *
 * Tile layout within a face (row-major):
 *   [0][1][2]
 *   [3][4][5]
 *   [6][7][8]
 */

const COLOR_HEX = [
  0x009B48,  // 0 Green
  0xFFFFFF,  // 1 White
  0xFFD500,  // 2 Yellow
  0xC41E3A,  // 3 Red
  0x0046AD,  // 4 Blue
  0xFF5800,  // 5 Orange
];

const COLOR_NAMES = ['Green', 'White', 'Yellow', 'Red', 'Blue', 'Orange'];
const FACE_NAMES  = ['FRONT', 'RIGHT', 'RIGHT_OF_RIGHT', 'LEFT', 'UP', 'DOWN'];

// ─── Rotation helpers (ported directly from Python) ───────────────────────────

function rotateCW(face) {
  const t = [...face];
  face[2] = t[0]; face[5] = t[1]; face[8] = t[2];
  face[1] = t[3]; face[4] = t[4]; face[7] = t[5];
  face[0] = t[6]; face[3] = t[7]; face[6] = t[8];
}

function rotateCCW(face) {
  const t = [...face];
  face[6] = t[0]; face[3] = t[1]; face[0] = t[2];
  face[7] = t[3]; face[4] = t[4]; face[1] = t[5];
  face[8] = t[6]; face[5] = t[7]; face[2] = t[8];
}

function rotate180(face) {
  const t = [...face];
  face[8] = t[0]; face[7] = t[1]; face[6] = t[2];
  face[5] = t[3]; face[4] = t[4]; face[3] = t[5];
  face[2] = t[6]; face[1] = t[7]; face[0] = t[8];
}

function swapFaces(faces, a, b) {
  const tmp = [...faces[a]];
  for (let i = 0; i < 9; i++) faces[a][i] = faces[b][i];
  for (let i = 0; i < 9; i++) faces[b][i] = tmp[i];
}

// ─── CubeEngine ───────────────────────────────────────────────────────────────

class CubeEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.faces = [
      Array(9).fill(0), // FRONT           - Green
      Array(9).fill(1), // RIGHT           - White
      Array(9).fill(2), // RIGHT_OF_RIGHT  - Yellow
      Array(9).fill(3), // LEFT            - Red
      Array(9).fill(4), // UP              - Blue
      Array(9).fill(5), // DOWN            - Orange
    ];
    this.currentFace = 0;
    this.playerPos   = { row: 1, col: 1 };
    this.hubieColor  = 0; // will be set properly by loadDebugCube or randomize
    this.moveCount   = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DEVELOPMENT: fixed mixed cube — same every load
  //  Comment out when switching to deployment.
  // ═══════════════════════════════════════════════════════════════════════════
  loadDebugCube() {
    this.reset();
    this.faces = [
      [0, 1, 2, 3, 4, 5, 0, 1, 2],  // FRONT
      [3, 4, 5, 0, 1, 2, 3, 4, 5],  // RIGHT
      [1, 0, 3, 2, 5, 4, 1, 0, 3],  // RIGHT_OF_RIGHT
      [5, 2, 4, 1, 3, 0, 5, 2, 4],  // LEFT
      [2, 3, 1, 4, 0, 5, 2, 3, 1],  // UP
      [4, 5, 0, 3, 2, 1, 4, 5, 0],  // DOWN
    ];
    this.currentFace = 0;
    this.playerPos   = { row: 1, col: 1 };
    // Hubie starts with a random color different from the tile he's on
    const startTile = this.getTile(0, 1, 1);
    this.hubieColor  = this._pickDifferentColor(startTile);
    this.moveCount   = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DEPLOYMENT: randomize from solved cube
  //  Comment out during development.
  // ═══════════════════════════════════════════════════════════════════════════
  randomize() {
    this.reset();
    const pool = [];
    for (let c = 0; c < 6; c++)
      for (let k = 0; k < 9; k++)
        pool.push(c);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let idx = 0;
    for (let f = 0; f < 6; f++)
      for (let t = 0; t < 9; t++)
        this.faces[f][t] = pool[idx++];
    this.currentFace = 0;
    this.playerPos   = { row: 1, col: 1 };
    const startTile2 = this.getTile(0, 1, 1);
    this.hubieColor  = this._pickDifferentColor(startTile2);
    this.moveCount   = 0;
  }

  // ─── Helper: pick a random color different from the given color ─────────────

  _pickDifferentColor(excludeColor) {
    const options = [0, 1, 2, 3, 4, 5].filter(c => c !== excludeColor);
    return options[Math.floor(Math.random() * options.length)];
  }

  // ─── Current tile helper ─────────────────────────────────────────────────────

  // Always reads fresh from the current face at Hubie's position
  getCurrentTileColor() {
    return this.getTile(this.currentFace, this.playerPos.row, this.playerPos.col);
  }

  // ─── Tile access ──────────────────────────────────────────────────────────

  getTile(faceIdx, row, col) {
    return this.faces[faceIdx][row * 3 + col];
  }

  setTile(faceIdx, row, col, colorIdx) {
    this.faces[faceIdx][row * 3 + col] = colorIdx;
  }

  getCurrentFaceGrid() {
    return [...this.faces[this.currentFace]];
  }

  // ─── Move ─────────────────────────────────────────────────────────────────

  move(direction) {
    const { row, col } = this.playerPos;
    let newRow = row + (direction === 'DOWN'  ?  1 : direction === 'UP'    ? -1 : 0);
    let newCol = col + (direction === 'RIGHT' ?  1 : direction === 'LEFT'  ? -1 : 0);

    if (newRow >= 0 && newRow < 3 && newCol >= 0 && newCol < 3) {
      // Always read fresh from the actual face array
      const enteringColor = this.faces[this.currentFace][newRow * 3 + newCol];
      console.log(`MOVE ${direction}: hubieColor=${this.hubieColor}(${COLOR_NAMES[this.hubieColor]}) enteringTile=${enteringColor}(${COLOR_NAMES[enteringColor]}) sameColor=${enteringColor === this.hubieColor}`);
      // Block move if destination tile is same color as Hubie
      if (enteringColor === this.hubieColor) {
        console.log('>>> BLOCKED <<<');
        return { type: 'blocked' };
      }
      console.log('>>> ALLOWED <<<');
      // Hubie moves — his color does NOT change, tile colors do NOT change
      this.playerPos = { row: newRow, col: newCol };
      this.moveCount++;
      return { type: 'move', fromPos: { row, col }, toPos: { row: newRow, col: newCol } };
    } else {
      return this._handleTransition(direction, row, col);
    }
  }

  // ─── Swap (space bar) ───────────────────────────────────────────────────────

  swap() {
    const { row, col } = this.playerPos;
    // Always read directly from the face array — never use cached values
    const tileColor = this.faces[this.currentFace][row * 3 + col];
    console.log(`SWAP: Hubie(${this.hubieColor}) <-> tile(${tileColor}) at face=${this.currentFace} row=${row} col=${col}`);
    // Write Hubie's color onto the tile
    this.faces[this.currentFace][row * 3 + col] = this.hubieColor;
    // Hubie picks up the tile's old color
    this.hubieColor = tileColor;
    console.log(`SWAP done: Hubie is now ${this.hubieColor}`);
    return { type: 'swap', row, col, oldTileColor: tileColor, newTileColor: this.hubieColor };
  }

  // ─── Face transitions (ported exactly from Python) ────────────────────────

  _handleTransition(direction, row, col) {
    this._rotateCubeToFront();

    // ── PEEK: run transition on a deep copy to find the entry tile color ──────
    // This lets us block BEFORE mutating the real cube state.
    const facesCopy = this.faces.map(f => [...f]);

    let entryRow, entryCol;

    if (direction === 'UP') {
      rotateCW(facesCopy[3]);
      rotateCCW(facesCopy[1]);
      swapFaces(facesCopy, 0, 4);
      swapFaces(facesCopy, 4, 2);
      swapFaces(facesCopy, 2, 5);
      rotate180(facesCopy[4]);
      rotate180(facesCopy[2]);
      entryRow = 2; entryCol = col;
    }
    else if (direction === 'DOWN') {
      rotateCW(facesCopy[1]);
      rotateCCW(facesCopy[3]);
      swapFaces(facesCopy, 0, 5);
      swapFaces(facesCopy, 5, 4);
      swapFaces(facesCopy, 5, 2);
      rotate180(facesCopy[5]);
      rotate180(facesCopy[2]);
      entryRow = 0; entryCol = col;
    }
    else if (direction === 'LEFT') {
      rotateCCW(facesCopy[4]);
      rotateCW(facesCopy[5]);
      swapFaces(facesCopy, 0, 3);
      swapFaces(facesCopy, 3, 1);
      swapFaces(facesCopy, 3, 2);
      entryRow = row; entryCol = 2;
    }
    else if (direction === 'RIGHT') {
      rotateCW(facesCopy[4]);
      rotateCCW(facesCopy[5]);
      swapFaces(facesCopy, 0, 1);
      swapFaces(facesCopy, 2, 1);
      swapFaces(facesCopy, 2, 3);
      entryRow = row; entryCol = 0;
    }

    // Check entry tile color on the new face (after rotation)
    const entryTileColor = facesCopy[0][entryRow * 3 + entryCol];
    console.log(`TRANSITION ${direction}: Hubie=${this.hubieColor}(${COLOR_NAMES[this.hubieColor]}) entryTile=${entryTileColor}(${COLOR_NAMES[entryTileColor]})`);

    if (entryTileColor === this.hubieColor) {
      console.log('>>> TRANSITION BLOCKED — entry tile same color as Hubie <<<');
      return { type: 'blocked' };
    }

    // ── Safe to proceed — apply transition to real faces ──────────────────────
    if (direction === 'UP') {
      rotateCW(this.faces[3]);
      rotateCCW(this.faces[1]);
      swapFaces(this.faces, 0, 4);
      swapFaces(this.faces, 4, 2);
      swapFaces(this.faces, 2, 5);
      rotate180(this.faces[4]);
      rotate180(this.faces[2]);
    }
    else if (direction === 'DOWN') {
      rotateCW(this.faces[1]);
      rotateCCW(this.faces[3]);
      swapFaces(this.faces, 0, 5);
      swapFaces(this.faces, 5, 4);
      swapFaces(this.faces, 5, 2);
      rotate180(this.faces[5]);
      rotate180(this.faces[2]);
    }
    else if (direction === 'LEFT') {
      rotateCCW(this.faces[4]);
      rotateCW(this.faces[5]);
      swapFaces(this.faces, 0, 3);
      swapFaces(this.faces, 3, 1);
      swapFaces(this.faces, 3, 2);
    }
    else if (direction === 'RIGHT') {
      rotateCW(this.faces[4]);
      rotateCCW(this.faces[5]);
      swapFaces(this.faces, 0, 1);
      swapFaces(this.faces, 2, 1);
      swapFaces(this.faces, 2, 3);
    }

    this.currentFace = 0;
    this.playerPos   = { row: entryRow, col: entryCol };
    this.moveCount++;

    return {
      type: 'transition',
      direction,
      newFaceGrid: [...this.faces[0]],
      entryRow,
      entryCol,
      fromRow: row,
      fromCol: col,
    };
  }

  _rotateCubeToFront() {
    if (this.currentFace === 0) return;
    console.warn('currentFace was not 0 before transition — check logic');
  }

  // ─── Win check ────────────────────────────────────────────────────────────

  isSolved() {
    if (this.moveCount < 3) return false;
    return this.faces.every(face => face.every(c => c === face[0]));
  }

  // ─── Debug ────────────────────────────────────────────────────────────────

  debugPrint() {
    const rows = f => [
      `${f[0]}${f[1]}${f[2]}`,
      `${f[3]}${f[4]}${f[5]}`,
      `${f[6]}${f[7]}${f[8]}`,
    ];
    const [FR, RI, RR, LE, UP, DN] = this.faces.map(rows);
    const pad = '      ';
    console.log(`\n=== Cube State (move ${this.moveCount}) face: ${FACE_NAMES[this.currentFace]} ===`);
    UP.forEach(r => console.log(pad + r));
    for (let i = 0; i < 3; i++) console.log(`${LE[i]}  ${FR[i]}  ${RI[i]}  ${RR[i]}`);
    DN.forEach(r => console.log(pad + r));
    console.log(`Hubie @ row=${this.playerPos.row} col=${this.playerPos.col} color=${COLOR_NAMES[this.hubieColor]}`);
  }
}

window.CubeEngine  = CubeEngine;
window.COLOR_HEX   = COLOR_HEX;
window.COLOR_NAMES = COLOR_NAMES;
window.FACE_NAMES  = FACE_NAMES;
