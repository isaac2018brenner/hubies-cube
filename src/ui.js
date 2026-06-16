/**
 * ui.js
 * Handles:
 *   1. Device detection — desktop vs phone
 *   2. PWA install overlay — shown on phones not in standalone mode
 *   3. Joystick — shown only on phones in PWA standalone mode
 *   4. Hint system — button + popup with color suggestion
 */

(function () {

  // ── Device & PWA detection ─────────────────────────────────────────────────

  const isPhone = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || window.innerWidth <= 768;

  const isPWA = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true; // iOS Safari

  const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ── PWA overlay ────────────────────────────────────────────────────────────

  function showPWAOverlay() {
    const overlay = document.getElementById('pwa-overlay');
    const steps   = document.getElementById('pwa-steps');
    overlay.classList.add('visible');

    if (isIOS()) {
      steps.innerHTML = `
        <span>1.</span> Tap the <span>Share</span> button below ↓<br>
        <span>2.</span> Tap <span>"Add to Home Screen"</span><br>
        <span>3.</span> Open <span>Hubie's Cube</span> from your home screen
      `;
    } else {
      steps.innerHTML = `
        <span>1.</span> Tap the <span>⋮ menu</span> in your browser<br>
        <span>2.</span> Tap <span>"Add to Home Screen"</span> or <span>"Install App"</span><br>
        <span>3.</span> Open <span>Hubie's Cube</span> from your home screen
      `;
    }
  }

  // ── Joystick ───────────────────────────────────────────────────────────────

  function setupJoystick() {
    document.getElementById('joystick').classList.add('visible');
    document.getElementById('hint-btn').classList.add('visible');

    const map = {
      'jbtn-up':     'UP',
      'jbtn-down':   'DOWN',
      'jbtn-left':   'LEFT',
      'jbtn-right':  'RIGHT',
      'jbtn-center': 'SWAP',
    };

    Object.entries(map).forEach(([id, action]) => {
      const btn = document.getElementById(id);

      const fire = (e) => {
        e.preventDefault();
        // Dispatch custom event that GameScene listens to
        window.dispatchEvent(new CustomEvent('joystick', { detail: action }));
      };

      btn.addEventListener('touchstart', fire, { passive: false });
      btn.addEventListener('mousedown',  fire);
    });
  }

  // ── Desktop keyboard hint button ───────────────────────────────────────────

  function setupDesktopHint() {
    document.getElementById('hint-btn').classList.add('visible');
  }

  // ── Hint logic ────────────────────────────────────────────────────────────

  // Called by GameScene after each significant move
  // cube = CubeEngine instance
  window.getHint = function (cube) {
    // Count how many tiles of each color are on WRONG faces
    // "Wrong face" = not the face whose index matches that color
    // (face 0 = Green, face 1 = White, etc.)
    const clutter = [0, 0, 0, 0, 0, 0];

    for (let f = 0; f < 6; f++) {
      for (let t = 0; t < 9; t++) {
        const color = cube.faces[f][t];
        if (color !== f) {
          clutter[color]++; // this color is on a wrong face
        }
      }
    }

    // Find the color with the most clutter (most tiles on wrong faces)
    // That's the one most spread out — suggest fixing it first
    let maxClutter = -1;
    let suggestedColor = 0;
    for (let c = 0; c < 6; c++) {
      if (clutter[c] > maxClutter) {
        maxClutter = clutter[c];
        suggestedColor = c;
      }
    }

    const colorName = COLOR_NAMES[suggestedColor];
    const hex = '#' + COLOR_HEX[suggestedColor].toString(16).padStart(6, '0');

    return {
      color: suggestedColor,
      colorName,
      hex,
      clutter: maxClutter,
      message: `Try finishing <span style="color:${hex};font-weight:bold">${colorName}</span> first — it has the most tiles out of place.`,
    };
  };

  function setupHintButton(getGameCube) {
    const btn   = document.getElementById('hint-btn');
    const popup = document.getElementById('hint-popup');
    let lastMoveCount = -1;

    btn.addEventListener('click', () => {
      const cube = getGameCube();
      if (!cube) return;

      // Only recalculate hint if moves happened since last hint
      const hint = window.getHint(cube);
      popup.innerHTML = hint.message;
      popup.classList.add('visible');
      lastMoveCount = cube.moveCount;

      // Auto-hide after 4 seconds
      clearTimeout(popup._timer);
      popup._timer = setTimeout(() => popup.classList.remove('visible'), 4000);
    });

    // Hide popup when tapping elsewhere
    document.addEventListener('click', (e) => {
      if (e.target !== btn) popup.classList.remove('visible');
    });
  }

  // ── Boot ───────────────────────────────────────────────────────────────────

  window.addEventListener('load', () => {
    if (isPhone()) {
      if (isPWA()) {
        // Phone in PWA mode — show joystick
        setupJoystick();
      } else {
        // Phone in browser — block with overlay
        showPWAOverlay();
        return; // don't set up anything else
      }
    } else {
      // Desktop — keyboard only, just show hint button
      setupDesktopHint();
    }

    // Hook hint button to game cube
    // GameScene sets window.gameCube after create()
    setupHintButton(() => window.gameCube);
  });

})();
