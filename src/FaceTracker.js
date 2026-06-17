/**
 * FaceTracker.js
 * 6 empty slots at the top of the screen.
 * When a face is solved — its color fills the slot.
 * When a face becomes unsolved again — the slot empties.
 */

class FaceTracker {
  constructor(scene, cube) {
    this.scene  = scene;
    this.cube   = cube;
    this.solved = [false, false, false, false, false, false];

    this.faceColors = [
      0x009B48, // 0 Green
      0xFFFFFF, // 1 White
      0xFFD500, // 2 Yellow
      0xC41E3A, // 3 Red
      0x0046AD, // 4 Blue
      0xFF5800, // 5 Orange
    ];

    this._buildUI();
  }

  _buildUI() {
    const SLOT  = 22;
    const GAP   = 6;
    const TOTAL = 6 * SLOT + 5 * GAP;
    const startX = (this.scene.scale.width - TOTAL) / 2;
    const Y = 12;

    this.slots = [];

    for (let f = 0; f < 6; f++) {
      const x = startX + f * (SLOT + GAP);
      const g = this.scene.add.graphics();
      g.x = x;
      g.y = Y;
      this._drawEmpty(g, SLOT);
      this.slots.push({ g, faceIdx: f, size: SLOT });
    }
  }

  _drawEmpty(g, size) {
    g.clear();
    // Empty slot — dark outline only
    g.lineStyle(1.5, 0x444466, 1);
    g.fillStyle(0x111122, 1);
    g.fillRect(0, 0, size, size);
    g.strokeRect(0, 0, size, size);
  }

  _drawFilled(g, color, size) {
    g.clear();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, size, size);
    // Subtle inner shadow
    g.fillStyle(0x000000, 0.15);
    g.fillRect(0, size - 3, size, 3);
    g.fillRect(size - 3, 0, 3, size);
  }

  update() {
    for (let f = 0; f < 6; f++) {
      const face     = this.cube.faces[f];
      const isSolved = face.every(c => c === face[0]);
      const slot     = this.slots[f];

      if (isSolved && !this.solved[f]) {
        // Just solved — fill with face color
        this.solved[f] = true;
        this._drawFilled(slot.g, this.faceColors[f], slot.size);
        // Pop animation
        slot.g.setScale(0.5);
        this.scene.tweens.add({
          targets: slot.g,
          scaleX: 1.15, scaleY: 1.15,
          duration: 120,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.scene.tweens.add({
              targets: slot.g,
              scaleX: 1, scaleY: 1,
              duration: 80,
            });
          }
        });
        if (window.gameSound) window.gameSound.playFaceComplete();

      } else if (!isSolved && this.solved[f]) {
        // Was solved, now broken — empty the slot
        this.solved[f] = false;
        this._drawEmpty(slot.g, slot.size);
      }
    }
  }

  allSolved() {
    return this.solved.every(Boolean);
  }
}

window.FaceTracker = FaceTracker;
