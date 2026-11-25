// main.js — bootstrap and game loop: canvas scaling, screen flow,
// the per-frame update + render, and the deterministic ?shot= scenes.

import { W, H, CONFIG } from './config.js';
import { newGame, updateWorld, resetRun } from './world.js';
import { render } from './render.js';
import { attachInput } from './input.js';
import { ensureAudio, startMusic, playSfx } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const shotMode = shot === 'cover' || shot === 'rush' || shot === 'title' || shot === 'shop';

let state = newGame();
if (shotMode) {
  stageShot(state, shot);
}

function resizeCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const input = attachInput(state, canvas, () => {
  ensureAudio(state);
  startMusic(state);
});

let last = performance.now();
let alarmTimer = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const animNow = now / 1000;
  if (shotMode) {
    // Staged screenshot: the world clock is frozen, only the pulse animates.
    render(state, ctx, animNow);
  } else {
    input.tick(state, dt);
    updateWorld(state, dt);
    // Day 7 finished: the run is won.
    if (state.screen === 'dayEnd' && state.day >= CONFIG.days) {
      state.screen = 'win';
    }
    // Urgent-order alarm beep under 5 s of patience.
    if (state.screen === 'play' && !state.paused) {
      const urgent = state.orders.some((o) => o.patience < 5);
      alarmTimer -= dt;
      if (urgent && alarmTimer <= 0) {
        playSfx(state, 'alarm');
        alarmTimer = 1;
      }
    }
    render(state, ctx, animNow);
    if (status) {
      status.textContent = `Day ${state.day} of 7, ${Math.ceil(state.timeLeft)} seconds left, ` +
        `score ${state.score}, ${state.coins} coins, ${state.hearts} hearts, combo x${state.combo}.`;
    }
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
