// Entry point — wires modules, starts render loop.

import state from './state.js';
import { initRenderer, render } from './renderer.js';
import { initInput } from './input.js';
import { initLogin, initLogout, refreshStats, refreshInventory, renderContextMenu } from './ui.js';
import { loadNames } from './names.js';
import './net.js'; // registers all message handlers as side-effect

const canvas = document.getElementById('game-canvas');

initRenderer(canvas);
initInput(canvas);
initLogin();
initLogout();
loadNames();

// ---- Render loop ----

let frameCount = 0;
let lastFpsTime = performance.now();

function loop() {
    render();
    renderContextMenu();

    // Update UI panels every 10 frames (~6 times/sec at 60fps)
    frameCount++;
    if (frameCount % 10 === 0) {
        refreshStats();
        refreshInventory();
    }

    // FPS counter
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
        state.fps = frameCount;
        frameCount = 0;
        lastFpsTime = now;
    }

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
