/**
 * main.js
 * Phaser 3 game config with responsive Scale Manager.
 * Logical size is fixed; Phaser scales it to fit any screen.
 */

const config = {
  type: Phaser.AUTO,
  width: 400,
  height: 600,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 400,
    height: 600,
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
};

const game = new Phaser.Game(config);
