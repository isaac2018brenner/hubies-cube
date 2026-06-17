/**
 * GameScene.js
 *
 * Sprite sheets (each 960x96 = 10 frames of 96x96, drawn in WHITE, tinted by Phaser):
 *   hubie_idle.png        — single 96x96 frame, Hubie standing still
 *   hubie_up_start.png    — Hubie exiting upward from current tile
 *   hubie_up_end.png      — Hubie entering tile above from below
 *   hubie_down_start.png  — Hubie exiting downward from current tile
 *   hubie_down_end.png    — Hubie entering tile below from above
 *   hubie_left_start.png  — Hubie exiting leftward from current tile
 *   hubie_left_end.png    — Hubie entering tile to the left from the right
 *   hubie_right_start.png — Hubie exiting rightward from current tile
 *   hubie_right_end.png   — Hubie entering tile to the right from the left
 *
 * For each direction:
 *   - _start sprite plays on the FROM tile (Hubie disappearing)
 *   - _end sprite plays on the TO tile (Hubie appearing)
 *   - Both play simultaneously
 *   - Animation stops on last frame (Hubie stays visible until next move)
 *
 * DEVELOPMENT MODE: this.cube.loadDebugCube() — same mixed cube every load
 * DEPLOYMENT MODE:  this.cube.randomize()      — uncomment for production
 */

class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  preload() {
    const load = (key, file) => {
      this.load.spritesheet(key, `assets/${file}`, { frameWidth: 96, frameHeight: 96 });
    };

    load('hubie_idle',         'hubie_idle.png');
    load('hubie_up_start',     'hubie_up_start.png');
    load('hubie_up_end',       'hubie_up_end.png');
    load('hubie_down_start',   'hubie_down_start.png');
    load('hubie_down_end',     'hubie_down_end.png');
    load('hubie_left_start',   'hubie_left_start.png');
    load('hubie_left_end',     'hubie_left_end.png');
    load('hubie_right_start',  'hubie_right_start.png');
    load('hubie_right_end',    'hubie_right_end.png');
  }

  create() {
    this.cube = new CubeEngine();

    // ── DEVELOPMENT: fixed mixed cube — same every load ──
    this.cube.loadDebugCube();

    // ── DEPLOYMENT: random cube — comment out during dev ──
    // this.cube.randomize();

    this.TILE = 96;
    this.GAP  = 4;
    this.GRID = 3;
    this.isAnimating = false;

    const gridSize = this.GRID * this.TILE + (this.GRID - 1) * this.GAP;
    this.originX = (this.scale.width  - gridSize) / 2;
    this.originY = (this.scale.height - gridSize) / 2 - 20;

    // Face containers
    this.faceContainer     = this.add.container(0, 0);
    this.incomingContainer = this.add.container(0, 0);
    this.incomingContainer.setAlpha(0);

    this.tileGraphics = [];
    this._buildFace(this.faceContainer, this.cube.getCurrentFaceGrid());

    // Create animations for all 4 directions
    // frameRate controls speed — lower is slower
    const FR = 10;
    const dirs = ['up', 'down', 'left', 'right'];
    dirs.forEach(dir => {
      ['start', 'end'].forEach(part => {
        const key = `hubie_${dir}_${part}`;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: 9 }),
          frameRate: FR,
          repeat: 0,
        });
      });
    });

    // Two reusable sprites — one for exit, one for enter
    // We swap the texture depending on direction before playing
    this.hubieStart = this.add.sprite(0, 0, 'hubie_up_start').setVisible(false);
    this.hubieEnd   = this.add.sprite(0, 0, 'hubie_up_end').setVisible(false);

    // Idle Hubie — shows when standing still or after animation completes
    this.hubieIdle = this.add.sprite(0, 0, 'hubie_idle');
    this._applyHubieTint(this.hubieIdle);
    this._setHubieIdlePosition(this.hubieIdle);

    this._setupInput();
    this._buildDebugOverlay();
    this._updateDebugOverlay();

    // Expose cube to ui.js for hint system
    window.gameCube = this.cube;

    // Sound engine
    window.gameSound = new SoundEngine();
    window.gameSound.playLoad();

    // Face tracker
    this.faceTracker = new FaceTracker(this, this.cube);
  }

  // ─── Tile rendering ───────────────────────────────────────────────────────

  _buildFace(container, grid) {
    container.removeAll(true);
    const graphics = [];
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const g = this.add.graphics();
      this._drawTile(g, COLOR_HEX[grid[i]], this.TILE);
      g.x = this.originX + col * (this.TILE + this.GAP);
      g.y = this.originY + row * (this.TILE + this.GAP);
      container.add(g);
      graphics.push(g);
    }
    this.tileGraphics = graphics;
    return graphics;
  }

  _drawTile(g, hexColor, size) {
    g.clear();
    g.fillStyle(hexColor, 1);
    g.fillRect(0, 0, size, size);
    g.fillStyle(0x000000, 0.18);
    g.fillRect(0, size - 4, size, 4);
    g.fillRect(size - 4, 0, 4, size);
  }

  _refreshCurrentFace() {
    const grid = this.cube.getCurrentFaceGrid();
    this.tileGraphics.forEach((g, i) => {
      this._drawTile(g, COLOR_HEX[grid[i]], this.TILE);
    });
  }

  // ─── Hubie helpers ────────────────────────────────────────────────────────

  // Apply Hubie's current color as tint to any sprite (sprites are white in Aseprite)
  _applyHubieTint(sprite) {
    sprite.setTint(COLOR_HEX[this.cube.hubieColor]);
  }

  // Position a sprite on a tile using top-left origin
  _setHubieIdlePosition(sprite) {
    const { row, col } = this.cube.playerPos;
    sprite.x = this.originX + col * (this.TILE + this.GAP) + this.TILE / 2;
    sprite.y = this.originY + row * (this.TILE + this.GAP) + this.TILE / 2;
  }

  // Returns center screen coords for a tile (sprites use centered origin)
  _tileCenter(row, col) {
    return {
      x: this.originX + col * (this.TILE + this.GAP) + this.TILE / 2,
      y: this.originY + row * (this.TILE + this.GAP) + this.TILE / 2,
    };
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  _setupInput() {
    const keyMap = {
      [Phaser.Input.Keyboard.KeyCodes.UP]:    'UP',
      [Phaser.Input.Keyboard.KeyCodes.DOWN]:  'DOWN',
      [Phaser.Input.Keyboard.KeyCodes.LEFT]:  'LEFT',
      [Phaser.Input.Keyboard.KeyCodes.RIGHT]: 'RIGHT',
      [Phaser.Input.Keyboard.KeyCodes.W]:     'UP',
      [Phaser.Input.Keyboard.KeyCodes.S]:     'DOWN',
      [Phaser.Input.Keyboard.KeyCodes.A]:     'LEFT',
      [Phaser.Input.Keyboard.KeyCodes.D]:     'RIGHT',
    };
    // Resume audio context on first interaction (browser requirement)
    this.input.keyboard.on('keydown', () => window.gameSound && window.gameSound.resume(), { once: true });
    this.input.on('pointerdown', () => window.gameSound && window.gameSound.resume(), { once: true });

    this.input.keyboard.on('keydown', e => {
      if (this.isAnimating) return;
      if (keyMap[e.keyCode]) {
        this._handleMove(keyMap[e.keyCode]);
      } else if (e.keyCode === Phaser.Input.Keyboard.KeyCodes.SPACE) {
        this._handleSwap();
      }
    });

    // Joystick events from ui.js (phones in PWA mode)
    window.addEventListener('joystick', (e) => {
      if (this.isAnimating) return;
      if (e.detail === 'SWAP') {
        this._handleSwap();
      } else {
        this._handleMove(e.detail);
      }
    });

    let sx = 0, sy = 0;
    this.input.on('pointerdown', p => { sx = p.x; sy = p.y; });
    this.input.on('pointerup',   p => {
      if (this.isAnimating) return;
      const dx = p.x - sx, dy = p.y - sy;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      this._handleMove(
        Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'RIGHT' : 'LEFT')
          : (dy > 0 ? 'DOWN'  : 'UP')
      );
    });
  }

  // ─── Move handling ────────────────────────────────────────────────────────

  _handleMove(direction) {
    this.isAnimating = true;
    const fromPos = { ...this.cube.playerPos };

    const result = this.cube.move(direction);
    if (!result) { this.isAnimating = false; return; }

    this.cube.debugPrint();

    if (result.type === 'blocked') {
      console.log(`BLOCKED: Hubie(${COLOR_NAMES[this.cube.hubieColor]}) tried to enter same-color tile`);
      if (window.gameSound) window.gameSound.playBlocked();
      this.isAnimating = false;
      return;
    }

    if (result.type === 'move') {
      this._refreshCurrentFace();
      if (window.gameSound) window.gameSound.playMove(direction);
      this._playMoveAnimation(direction, fromPos, this.cube.playerPos, this.cube.hubieColor, this.cube.hubieColor);

    } else {
      // Face transition
      if (window.gameSound) window.gameSound.playFaceTransition();
      this._animateFaceTransition(direction, result);
    }

    this._updateDebugOverlay();
    if (this.faceTracker) this.faceTracker.update();

    if (this.cube.isSolved()) {
      this.time.delayedCall(500, () => this._showWin());
    }
  }

  // ─── Move animation (all 4 directions) ───────────────────────────────────

  _playMoveAnimation(direction, fromPos, toPos, colorExit, colorEnter) {
    const dir       = direction.toLowerCase();
    const tintExit  = COLOR_HEX[colorExit];   // Hubie's color as he leaves the tile
    const tintEnter = COLOR_HEX[colorEnter];  // Hubie's color after the swap (new color)

    // Hide idle
    this.hubieIdle.setVisible(false);

    // Set textures and tints — exit uses old color, enter uses new color
    this.hubieStart.setTexture(`hubie_${dir}_start`);
    this.hubieEnd.setTexture(`hubie_${dir}_end`);
    this.hubieStart.setTint(tintExit);
    this.hubieEnd.setTint(tintEnter);

    const fromCenter = this._tileCenter(fromPos.row, fromPos.col);
    const toCenter   = this._tileCenter(toPos.row,   toPos.col);

    this.hubieStart.setPosition(fromCenter.x, fromCenter.y).setVisible(true);
    this.hubieEnd.setPosition(toCenter.x,   toCenter.y).setVisible(true);

    // Play both simultaneously
    this.hubieStart.play(`hubie_${dir}_start`);
    this.hubieEnd.play(`hubie_${dir}_end`);

    // When end animation finishes — hide both, show idle on new position
    this.hubieEnd.once('animationcomplete', () => {
      this.hubieStart.setVisible(false);
      this.hubieEnd.setVisible(false);

      this._applyHubieTint(this.hubieIdle);
      this._setHubieIdlePosition(this.hubieIdle);
      this.hubieIdle.setVisible(true);

      this.isAnimating = false;
    });
  }

  // ─── Swap (space bar) ─────────────────────────────────────────────────────

  _handleSwap() {
    const result = this.cube.swap();
    if (!result) return;
    if (window.gameSound) window.gameSound.playSwap();
    this._refreshCurrentFace();
    this._applyHubieTint(this.hubieIdle);
    this._applyHubieTint(this.hubieStart);
    this._applyHubieTint(this.hubieEnd);
    this._updateDebugOverlay();
    if (this.faceTracker) this.faceTracker.update();
  }

  // ─── Face slide transition ────────────────────────────────────────────────

  _animateFaceTransition(direction, result) {
    const gridSize = this.GRID * this.TILE + (this.GRID - 1) * this.GAP;
    const DURATION = 400;
    const dir  = direction.toLowerCase();
    const tint = COLOR_HEX[this.cube.hubieColor];

    const off = {
      UP:    { outX: 0, outY:  gridSize + 40, inX: 0, inY: -(gridSize + 40) },
      DOWN:  { outX: 0, outY: -(gridSize + 40), inX: 0, inY:  gridSize + 40  },
      LEFT:  { outX:  gridSize + 40, outY: 0, inX: -(gridSize + 40), inY: 0  },
      RIGHT: { outX: -(gridSize + 40), outY: 0, inX:  gridSize + 40, inY: 0  },
    }[direction];

    // Build incoming face tiles
    this._buildFace(this.incomingContainer, result.newFaceGrid);
    this.incomingContainer.x = off.inX;
    this.incomingContainer.y = off.inY;
    this.incomingContainer.setAlpha(1);

    // Hide idle Hubie
    this.hubieIdle.setVisible(false);

    // EXIT: Hubie walks off the edge — plays on current face during slide
    const fromCenter = this._tileCenter(result.fromRow, result.fromCol);
    this.hubieStart.setTexture(`hubie_${dir}_start`);
    this.hubieStart.setTint(tint);
    this.hubieStart.setPosition(fromCenter.x, fromCenter.y);
    this.hubieStart.setVisible(true);
    this.hubieStart.play(`hubie_${dir}_start`);

    // Slide current face out
    this.tweens.add({
      targets: this.faceContainer,
      x: off.outX, y: off.outY, alpha: 0,
      duration: DURATION, ease: 'Quad.easeInOut',
    });

    // Slide new face in — on complete, play enter animation
    this.tweens.add({
      targets: this.incomingContainer,
      x: 0, y: 0,
      duration: DURATION, ease: 'Quad.easeInOut',
      onComplete: () => {
        // Swap containers
        this.faceContainer.removeAll(true);
        this.faceContainer.x = 0;
        this.faceContainer.y = 0;
        this.faceContainer.setAlpha(1);
        [...this.incomingContainer.list].forEach(child => {
          this.incomingContainer.remove(child, false);
          this.faceContainer.add(child);
        });
        this.tileGraphics = [...this.faceContainer.list];
        this.incomingContainer.setAlpha(0);

        // Hide exit sprite, play enter sprite on entry tile of new face
        this.hubieStart.setVisible(false);
        const entryCenter = this._tileCenter(result.entryRow, result.entryCol);
        this.hubieEnd.setTexture(`hubie_${dir}_end`);
        this.hubieEnd.setTint(tint);
        this.hubieEnd.setPosition(entryCenter.x, entryCenter.y);
        this.hubieEnd.setVisible(true);
        this.hubieEnd.play(`hubie_${dir}_end`);

        this.hubieEnd.once('animationcomplete', () => {
          this.hubieEnd.setVisible(false);
          this._applyHubieTint(this.hubieIdle);
          this._setHubieIdlePosition(this.hubieIdle);
          this.hubieIdle.setVisible(true);
          this.isAnimating = false;
        });
      }
    });
  }

  // ─── Debug overlay ────────────────────────────────────────────────────────

  _buildDebugOverlay() {
    const MINI = 14, MGAP = 2, FGAP = 8;
    const faceW  = 3 * MINI + 2 * MGAP;
    const totalW = 6 * faceW + 5 * FGAP;
    const startX = (this.scale.width - totalW) / 2;
    const startY = this.scale.height - 3 * MINI - 2 * MGAP - 28;

    this.debugGraphics = [];
    this.debugLabels   = [];

    for (let f = 0; f < 6; f++) {
      const fx = startX + f * (faceW + FGAP);
      this.debugLabels.push(
        this.add.text(fx + faceW / 2, startY - 12,
          FACE_NAMES[f].substring(0, 2),
          { fontSize: '9px', color: '#888899', fontFamily: 'Courier New' }
        ).setOrigin(0.5, 1)
      );
      const tiles = [];
      for (let t = 0; t < 9; t++) {
        const g = this.add.graphics();
        g.x = fx + (t % 3) * (MINI + MGAP);
        g.y = startY + Math.floor(t / 3) * (MINI + MGAP);
        tiles.push(g);
      }
      this.debugGraphics.push(tiles);
    }

    this.moveLabel = this.add.text(this.scale.width / 2, startY - 24,
      'Moves: 0', { fontSize: '11px', color: '#aaaacc', fontFamily: 'Courier New' }
    ).setOrigin(0.5);

    this.posLabel = this.add.text(this.scale.width / 2, startY - 38,
      '', { fontSize: '10px', color: '#666688', fontFamily: 'Courier New' }
    ).setOrigin(0.5);
  }

  _updateDebugOverlay() {
    const MINI = 14;
    for (let f = 0; f < 6; f++) {
      const face = this.cube.faces[f];
      for (let t = 0; t < 9; t++) {
        const g = this.debugGraphics[f][t];
        g.clear();
        g.fillStyle(COLOR_HEX[face[t]], 1);
        g.fillRect(0, 0, MINI, MINI);
        if (f === this.cube.currentFace) {
          g.lineStyle(2, 0xffffff, 0.8);
          g.strokeRect(0, 0, MINI, MINI);
          const { row, col } = this.cube.playerPos;
          if (Math.floor(t / 3) === row && t % 3 === col) {
            g.fillStyle(0x000000, 0.5);
            g.fillRect(3, 3, MINI - 6, MINI - 6);
          }
        }
      }
    }
    this.moveLabel.setText(
      `Moves: ${this.cube.moveCount}  |  Face: ${FACE_NAMES[this.cube.currentFace]}`
    );
    const { row, col } = this.cube.playerPos;
    this.posLabel.setText(
      `Hubie @ row:${row} col:${col}  color: ${COLOR_NAMES[this.cube.hubieColor]}`
    );
  }

  // ─── Win screen ───────────────────────────────────────────────────────────

  _showWin() {
    if (window.gameSound) window.gameSound.playWin();
    const w = this.scale.width, h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.75);
    this.add.text(w / 2, h / 2 - 30, 'SOLVED!', {
      fontSize: '48px', color: '#FFD500',
      fontFamily: 'Courier New', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(w / 2, h / 2 + 24, `Solved in ${this.cube.moveCount} moves`, {
      fontSize: '16px', color: '#aaaacc', fontFamily: 'Courier New'
    }).setOrigin(0.5);
    this.add.text(w / 2, h / 2 + 52, 'Tap to play again', {
      fontSize: '14px', color: '#666688', fontFamily: 'Courier New'
    }).setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.restart());
  }
}

window.GameScene = GameScene;
