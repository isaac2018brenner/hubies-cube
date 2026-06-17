/**
 * FaceTracker.js
 * Tracks which faces are solved and renders a row of small colored icons.
 * Each icon is a mini 3x3 grid in the face's color.
 * When a face is solved → icon appears with a tick animation.
 * When a face becomes unsolved again → icon is removed.
 */

class FaceTracker {
  constructor(scene, cube) {
    this.scene  = scene;
    this.cube   = cube;
    this.solved = [false, false, false, false, false, false];

    // Face colors matching CubeEngine indices
    this.faceColors = [
      0x009B48, // 0 Green  - FRONT
      0xFFFFFF, // 1 White  - RIGHT
      0xFFD500, // 2 Yellow - RIGHT_OF_RIGHT
      0xC41E3A, // 3 Red    - LEFT
      0x0046AD, // 4 Blue   - UP
      0xFF5800, // 5 Orange - DOWN
    ];

    this._buildUI();
  }

  _buildUI() {
    const ICON_SIZE = 22;
    const GAP       = 6;
    const TOTAL_W   = 6 * ICON_SIZE + 5 * GAP;
    const startX    = (this.scene.scale.width - TOTAL_W) / 2;
    const Y         = 14; // top of screen

    this.icons = [];

    for (let f = 0; f < 6; f++) {
      const x = startX + f * (ICON_SIZE + GAP);

      // Container for each face icon
      const container = this.scene.add.container(x, Y);

      // Background square
      const bg = this.scene.add.graphics();
      bg.fillStyle(this.faceColors[f], 0.25);
      bg.lineStyle(1, this.faceColors[f], 0.4);
      bg.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
      bg.strokeRect(0, 0, ICON_SIZE, ICON_SIZE);

      // Mini 3x3 grid inside (3 rows x 3 cols, 6px each with 1px gap)
      const grid = this.scene.add.graphics();
      const tSize = 5;
      const tGap  = 1;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          grid.fillStyle(this.faceColors[f], 0.3);
          grid.fillRect(
            3 + c * (tSize + tGap),
            3 + r * (tSize + tGap),
            tSize, tSize
          );
        }
      }

      // Checkmark overlay (hidden until solved)
      const check = this.scene.add.graphics();
      check.setVisible(false);
      check.lineStyle(3, 0xffffff, 1);
      // Draw a tick: bottom-left corner to mid-bottom, then up-right
      check.beginPath();
      check.moveTo(4, 13);
      check.lineTo(9, 18);
      check.lineTo(18, 6);
      check.strokePath();

      // Solved glow ring (hidden until solved)
      const glow = this.scene.add.graphics();
      glow.setVisible(false);
      glow.lineStyle(2, this.faceColors[f], 1);
      glow.strokeRect(-1, -1, ICON_SIZE + 2, ICON_SIZE + 2);

      container.add([bg, grid, check, glow]);
      container.setAlpha(0.4);

      this.icons.push({ container, bg, grid, check, glow, faceIdx: f });
    }
  }

  // Call this after every move/swap to update tracker
  update() {
    const sound = window.gameSound;

    for (let f = 0; f < 6; f++) {
      const face     = this.cube.faces[f];
      const isSolved = face.every(c => c === face[0]);
      const icon     = this.icons[f];

      if (isSolved && !this.solved[f]) {
        // Face just became solved
        this.solved[f] = true;
        this._animateSolved(icon);
        if (sound) sound.playFaceComplete();

      } else if (!isSolved && this.solved[f]) {
        // Face became unsolved again (e.g. after a swap)
        this.solved[f] = false;
        this._animateUnsolved(icon);
      }
    }
  }

  _animateSolved(icon) {
    // Brighten the icon, show checkmark, pulse
    icon.bg.clear();
    icon.bg.fillStyle(this.faceColors[icon.faceIdx], 0.9);
    icon.bg.fillRect(0, 0, 22, 22);

    // Refresh grid bright
    icon.grid.clear();
    const tSize = 5, tGap = 1;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        icon.grid.fillStyle(this.faceColors[icon.faceIdx], 1);
        icon.grid.fillRect(3 + c*(tSize+tGap), 3 + r*(tSize+tGap), tSize, tSize);
      }
    }

    icon.check.setVisible(true);
    icon.glow.setVisible(true);
    icon.container.setAlpha(1);

    // Scale pop animation
    icon.container.setScale(0.5);
    this.scene.tweens.add({
      targets: icon.container,
      scaleX: 1.2, scaleY: 1.2,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: icon.container,
          scaleX: 1, scaleY: 1,
          duration: 100,
        });
      }
    });
  }

  _animateUnsolved(icon) {
    // Fade back to dim
    icon.check.setVisible(false);
    icon.glow.setVisible(false);

    icon.bg.clear();
    icon.bg.fillStyle(this.faceColors[icon.faceIdx], 0.25);
    icon.bg.lineStyle(1, this.faceColors[icon.faceIdx], 0.4);
    icon.bg.fillRect(0, 0, 22, 22);
    icon.bg.strokeRect(0, 0, 22, 22);

    icon.grid.clear();
    const tSize = 5, tGap = 1;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        icon.grid.fillStyle(this.faceColors[icon.faceIdx], 0.3);
        icon.grid.fillRect(3 + c*(tSize+tGap), 3 + r*(tSize+tGap), tSize, tSize);
      }
    }

    this.scene.tweens.add({
      targets: icon.container,
      alpha: 0.4,
      duration: 200,
    });
  }

  allSolved() {
    return this.solved.every(Boolean);
  }
}

window.FaceTracker = FaceTracker;
