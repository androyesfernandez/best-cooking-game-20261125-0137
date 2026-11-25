// render.js — every pixel the game draws: the kitchen, stations, food,
// tickets, seated customers, HUD and all screens. Canvas vector art only.

import { W, H, CONFIG, LAYOUT, STATIONS, INGREDIENTS, SERVE, TRASH, PLATES, ingredientById, stationById, comboMultiplier } from './config.js';
import { RECIPES, CUSTOMERS, UPGRADES, recipeById, customerByName } from './data.js';
import { plateMatchesOrder, slotCount } from './world.js';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', weight = 'bold', font = 'Arial') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function ring(ctx, x, y, r, frac, color, width = 6) {
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// --- Food: one vector icon per ingredient, raw and cooked -----------------

export function drawIngredient(ctx, id, x, y, size, kind = 'cooked') {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'burnt') {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.5); ctx.lineTo(s * 0.5, s * 0.5);
    ctx.moveTo(s * 0.5, -s * 0.5); ctx.lineTo(-s * 0.5, s * 0.5); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.55, s * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.25, -s * 0.7, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  const cooked = kind === 'cooked';
  if (id === 'bun') {
    ctx.fillStyle = cooked ? '#e8a94e' : '#f0c98a';
    ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.85, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cooked ? '#d18a2e' : '#ddab62';
    ctx.fillRect(-s * 0.85, -s * 0.1, s * 1.7, s * 0.45);
    ctx.fillStyle = '#fff3d6';
    for (const [dx, dy] of [[-0.4, -0.55], [0, -0.7], [0.4, -0.55], [-0.15, -0.35], [0.2, -0.4]]) {
      ctx.beginPath(); ctx.ellipse(dx * s, dy * s, s * 0.1, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'patty') {
    ctx.fillStyle = cooked ? '#6e3b1f' : '#d98a7a';
    roundRect(ctx, -s * 0.95, -s * 0.45, s * 1.9, s * 0.9, s * 0.4); ctx.fill();
    if (cooked) {
      ctx.strokeStyle = '#3d1f0e'; ctx.lineWidth = 2;
      for (const dx of [-0.5, 0, 0.5]) {
        ctx.beginPath(); ctx.moveTo(dx * s, -s * 0.4); ctx.lineTo(dx * s, s * 0.4); ctx.stroke();
      }
    }
  } else if (id === 'fish') {
    ctx.fillStyle = cooked ? '#e0a458' : '#7fb3d5';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.9, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.8, 0); ctx.lineTo(s * 1.35, -s * 0.45); ctx.lineTo(s * 1.35, s * 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(-s * 0.55, -s * 0.1, s * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = cooked ? '#8a5a1e' : '#4a7a9a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0.1 * s, 0, s * 0.45, -0.6, 0.9); ctx.stroke();
  } else if (id === 'potato') {
    if (cooked) {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.moveTo(-s * 0.8, -s * 0.1); ctx.lineTo(s * 0.8, -s * 0.1);
      ctx.lineTo(s * 0.6, s * 0.8); ctx.lineTo(-s * 0.6, s * 0.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f7dc6f';
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect((i * 0.32 - 0.09) * s, -s * 0.95, s * 0.18, s * 0.9);
      }
      ctx.fillStyle = '#fff'; ctx.font = `bold ${s * 0.5}px Arial`; ctx.textAlign = 'center';
      ctx.fillText('FRIES', 0, s * 0.45);
    } else {
      ctx.fillStyle = '#c98f4e';
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.85, s * 0.65, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a5a1e';
      for (const [dx, dy] of [[-0.3, -0.2], [0.25, 0.15], [0, -0.35]]) {
        ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.08, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (id === 'lettuce') {
    ctx.fillStyle = cooked ? '#2ecc71' : '#7ee2a0';
    for (const [dx, dy, r] of [[-0.45, 0.1, 0.5], [0.45, 0.1, 0.5], [0, -0.4, 0.55], [-0.2, 0.35, 0.45], [0.25, 0.35, 0.45]]) {
      ctx.beginPath(); ctx.arc(dx * s, dy * s, r * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = cooked ? '#1e8449' : '#4caf7d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, s * 0.5); ctx.stroke();
  } else if (id === 'tomato') {
    if (cooked) {
      ctx.fillStyle = '#e74c3c';
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.arc(0, 0, s * 0.85, a - 0.5, a + 0.5); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#f1948a';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#ec7063';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#27ae60';
      ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(-s * 0.35, -s * 0.45); ctx.lineTo(0, -s * 0.6);
      ctx.lineTo(s * 0.35, -s * 0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f9e79f';
      ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.3, s * 0.12, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = '#f7dc6f';
    ctx.beginPath(); ctx.moveTo(-s * 0.9, s * 0.6); ctx.lineTo(s * 0.9, -s * 0.6); ctx.lineTo(s * 0.9, s * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d4ac0d';
    for (const [dx, dy] of [[0.2, 0.25], [0.5, -0.05], [-0.3, 0.35]]) {
      ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.11, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'cake') {
    if (cooked) {
      ctx.fillStyle = '#f1948a';
      ctx.beginPath(); ctx.moveTo(-s * 0.8, s * 0.6); ctx.lineTo(s * 0.8, s * 0.6); ctx.lineTo(s * 0.8, -s * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(-s * 0.8, s * 0.1); ctx.lineTo(s * 0.8, s * 0.1); ctx.lineTo(s * 0.8, -s * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.35, s * 0.22, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#aed6f1';
      ctx.beginPath(); ctx.arc(0, s * 0.2, s * 0.8, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f5b7b1';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.05, s * 0.7, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(0, -s * 0.45, s * 0.18, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// --- Stations ---------------------------------------------------------------

export function drawStation(ctx, state, station, now) {
  const y = LAYOUT.stations.y, h = LAYOUT.stations.h;
  const x = station.x, w = station.w;
  ctx.save();
  ctx.fillStyle = station.color;
  roundRect(ctx, x, y, w, h, 12); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  roundRect(ctx, x, y + h - 26, w, 26, 12); ctx.fill();
  text(ctx, station.name, x + w / 2, y + 16, 17, '#fff', 'center');
  const slots = state.stations[station.id];
  const n = slots.length;
  for (let i = 0; i < n; i++) {
    const cx = x + (w * (i + 0.5)) / n;
    const cy = y + 62;
    const slot = slots[i];
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();
    if (slot) {
      const kind = slot.burnt ? 'burnt' : slot.done ? 'cooked' : 'raw';
      drawIngredient(ctx, slot.item, cx, cy, 44, kind);
      if (!slot.done) {
        ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 5; ctx.stroke();
        ring(ctx, cx, cy, 36, Math.min(1, slot.t / slot.dur), '#fff', 5);
      } else if (!slot.burnt) {
        const pulse = 1 + 0.12 * Math.sin(now * 6);
        ctx.save(); ctx.translate(cx + 22, cy - 24); ctx.scale(pulse, pulse);
        ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#7d6608'; ctx.lineWidth = 2; ctx.stroke();
        text(ctx, '!', 0, 1, 18, '#7d6608', 'center'); ctx.restore();
        // burn warning ring
        const burnFrac = 1 - slot.burnT / CONFIG.burnAfter;
        ring(ctx, cx, cy, 36, Math.max(0, burnFrac), burnFrac < 0.35 ? '#ff5b4d' : '#f1c40f', 4);
      } else {
        text(ctx, 'X', cx, cy - 34, 20, '#fff', 'center');
        text(ctx, 'BURNT', cx, cy + 40, 11, '#fff', 'center');
      }
    } else {
      text(ctx, '+', cx, cy, 22, 'rgba(255,255,255,0.55)', 'center');
    }
  }
  text(ctx, station.id === 'chop' ? 'prep here' : station.id === 'salad' ? 'fresh prep' : 'cooking', x + w / 2, y + h - 13, 11, 'rgba(255,255,255,0.85)', 'center');
  ctx.restore();
}

// --- Customers --------------------------------------------------------------

export function drawCustomer(ctx, state, cust, x, y, patienceFrac, now, dishName) {
  ctx.save();
  // patience ring above the head
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill();
  const col = patienceFrac < 0.2 ? '#ff5b4d' : patienceFrac < 0.45 ? '#f39c12' : '#2ecc71';
  ring(ctx, x, y, 34, Math.max(0, patienceFrac), col, 6);
  // head + shoulders
  ctx.fillStyle = '#f5cfa8';
  ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cust.color;
  ctx.beginPath(); ctx.arc(x, y - 6, 24, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(x - 8, y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 8, y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y + 6, 7, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.fillStyle = cust.color;
  roundRect(ctx, x - 30, y + 22, 60, 26, 10); ctx.fill();
  text(ctx, cust.name, x, y + 62, 16, '#fff', 'center');
  if (dishName) text(ctx, dishName, x, y + 82, 12, '#ffd98a', 'center');
  ctx.restore();
}

// --- Kitchen background -----------------------------------------------------

function drawKitchenBase(ctx, state, now) {
  // wall + floor
  ctx.fillStyle = '#8e3b2f'; ctx.fillRect(0, 0, W, 150);
  ctx.fillStyle = '#a84a3a'; ctx.fillRect(0, 140, W, 12);
  ctx.fillStyle = '#c98d5a';
  for (let ry = 0; ry < 4; ry++) {
    for (let rx = 0; rx < 16; rx++) {
      if ((rx + ry) % 2 === 0) { ctx.fillStyle = '#c98d5a'; } else { ctx.fillStyle = '#b87a45'; }
      ctx.fillRect(rx * 80, 366 + ry * 46, 80, 46);
    }
  }
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(0, 534, W, 10);
  // wall clock + menu strip were here: the wall band is covered by the
  // HUD and the ticket row, so they are deliberately not drawn.
  // Decor upgrades change the room. Fairy lights drape across the top
  // of the walkway floor; the painting hangs at the counter's left end.
  if (state.owned.has('painting')) {
    ctx.fillStyle = '#f7dc6f'; roundRect(ctx, 28, 566, 96, 58, 6); ctx.fill();
    ctx.strokeStyle = '#7d6608'; ctx.lineWidth = 4; ctx.stroke();
    drawIngredient(ctx, 'tomato', 76, 595, 46, 'cooked');
  }
  if (state.owned.has('lights')) {
    ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 370); ctx.quadraticCurveTo(640, 402, 1260, 370); ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const lx = 20 + t * 1240;
      const ly = 370 + Math.sin(t * Math.PI) * 26;
      const glow = 0.6 + 0.4 * Math.sin(now * 4 + i);
      ctx.fillStyle = `rgba(241,196,15,${glow})`;
      ctx.beginPath(); ctx.arc(lx, ly + 8, 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (state.owned.has('rug')) {
    ctx.fillStyle = '#c0392b'; roundRect(ctx, 420, 470, 440, 56, 10); ctx.fill();
    ctx.fillStyle = '#f1c40f'; roundRect(ctx, 440, 482, 400, 32, 8); ctx.fill();
    ctx.fillStyle = '#c0392b'; roundRect(ctx, 460, 492, 360, 12, 6); ctx.fill();
  }
  if (state.owned.has('basil')) {
    for (const bx of [200, 1060]) {
      ctx.fillStyle = '#b85c38'; roundRect(ctx, bx - 14, 520, 28, 22, 4); ctx.fill();
      ctx.fillStyle = '#27ae60';
      ctx.beginPath(); ctx.arc(bx, 505, 14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx - 10, 512, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + 10, 512, 10, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// --- HUD + tickets ----------------------------------------------------------

function drawHUD(ctx, state, now) {
  ctx.fillStyle = '#1b2a4a'; ctx.fillRect(0, 0, W, 56);
  ctx.fillStyle = '#f39c12'; ctx.fillRect(0, 56, W, 4);
  text(ctx, 'RUSH HOUR KITCHEN', 16, 20, 20, '#fff', 'left', 'bold', 'Georgia');
  text(ctx, `DAY ${state.day}/7`, 16, 42, 14, '#ffd98a');
  const mm = Math.floor(Math.max(0, state.timeLeft) / 60);
  const ss = Math.floor(Math.max(0, state.timeLeft) % 60);
  const timerCol = state.timeLeft < 30 ? '#ff5b4d' : '#fff';
  text(ctx, `${mm}:${String(ss).padStart(2, '0')}`, 330, 30, 34, timerCol, 'center');
  text(ctx, 'TIME', 330, 50, 10, '#9fb3d9', 'center');
  text(ctx, `SCORE ${state.score}`, 470, 30, 20, '#fff', 'center');
  text(ctx, `COINS ${state.coins}`, 640, 30, 20, '#f1c40f', 'center');
  // hearts
  let hx = 760;
  for (let i = 0; i < CONFIG.heartsMax; i++) {
    text(ctx, i < state.hearts ? '♥' : '♡', hx, 30, 22, i < state.hearts ? '#ff5b4d' : '#5a6b8c', 'center');
    hx += 26;
  }
  // stars
  let sx = 920;
  for (let i = 0; i < 3; i++) {
    text(ctx, i < state.starsToday ? '★' : '☆', sx, 30, 20, '#f1c40f', 'center');
    sx += 24;
  }
  text(ctx, `★ ${state.stars}/21`, 1000, 30, 16, '#f1c40f');
  // combo badge, pulsing orange, cap x5
  if (state.combo >= 2) {
    const pulse = 1 + 0.08 * Math.sin(now * 8);
    ctx.save();
    ctx.translate(1160, 28); ctx.scale(pulse, pulse);
    ctx.fillStyle = '#e67e22'; roundRect(ctx, -62, -20, 124, 40, 20); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    text(ctx, `COMBO x${state.combo}`, 0, 1, 18, '#fff', 'center');
    ctx.restore();
  } else {
    text(ctx, 'COMBO x1', 1160, 30, 16, '#9fb3d9', 'center');
  }
}

function drawTickets(ctx, state, now) {
  const { x, y, w, h, gap } = LAYOUT.tickets;
  state.orders.slice(0, 5).forEach((order, i) => {
    const tx = x + i * (w + gap);
    const frac = Math.max(0, order.patience / order.maxPatience);
    const urgent = order.patience < 5;
    const blink = urgent && Math.floor(now * 4) % 2 === 0;
    ctx.fillStyle = '#fffdf5';
    roundRect(ctx, tx, y, w, h, 10); ctx.fill();
    ctx.fillStyle = order.color; roundRect(ctx, tx, y, w, 22, 10); ctx.fill();
    ctx.fillRect(tx, y + 12, w, 10);
    text(ctx, order.customer, tx + 8, y + 12, 14, '#fff');
    text(ctx, `${order.price}c`, tx + w - 8, y + 12, 14, '#fff', 'right');
    const dishLabel = order.dish.length > 18 && order.favourite ? order.dish.slice(0, 17) + '…' : order.dish;
    text(ctx, dishLabel, tx + 8, y + 38, 14, '#222');
    if (order.favourite) text(ctx, '★ FAV', tx + w - 8, y + 38, 11, '#e67e22', 'right');
    const recipe = recipeById(order.recipe);
    recipe.items.forEach((id, k) => {
      const ing = ingredientById(id);
      drawIngredient(ctx, id, tx + 18 + k * 30, y + 58, 24, ing.station ? 'cooked' : 'raw');
    });
    // patience bar
    ctx.fillStyle = '#ddd'; roundRect(ctx, tx + 8, y + h - 12, w - 16, 7, 3); ctx.fill();
    ctx.fillStyle = frac < 0.2 ? '#ff5b4d' : frac < 0.45 ? '#f39c12' : '#2ecc71';
    if (frac > 0) { roundRect(ctx, tx + 8, y + h - 12, (w - 16) * frac, 7, 3); ctx.fill(); }
    if (blink) {
      ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 4;
      roundRect(ctx, tx - 1, y - 1, w + 2, h + 2, 10); ctx.stroke();
      text(ctx, '! URGENT', tx + w - 8, y + 58, 13, '#ff0000', 'right');
    } else if (urgent) {
      ctx.strokeStyle = '#ff5b4d'; ctx.lineWidth = 3;
      roundRect(ctx, tx - 1, y - 1, w + 2, h + 2, 10); ctx.stroke();
    }
  });
}

function drawCrates(ctx, state) {
  const { x, y, w, h, gap, cols } = LAYOUT.crates;
  INGREDIENTS.forEach((ing, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = x + col * (w + gap), cy = y + row * (h + gap);
    ctx.fillStyle = '#8a5a2b'; roundRect(ctx, cx, cy, w, h, 8); ctx.fill();
    ctx.fillStyle = '#b07a3f'; roundRect(ctx, cx + 4, cy + 4, w - 8, h - 8, 6); ctx.fill();
    drawIngredient(ctx, ing.id, cx + w / 2, cy + 32, 44, ing.station ? 'raw' : 'raw');
    text(ctx, ing.key, cx + 8, cy + 14, 13, '#fff');
    text(ctx, ing.name, cx + w / 2, cy + h - 12, 12, '#fff', 'center');
  });
}

function drawPlates(ctx, state, now) {
  PLATES.forEach((p, i) => {
    const plate = state.plates[i];
    const match = plateMatchesOrder(state, i);
    ctx.fillStyle = match ? '#d5f5e3' : '#fdf6e3';
    roundRect(ctx, p.x, p.y, p.w, p.h, 10); ctx.fill();
    ctx.strokeStyle = match ? '#27ae60' : '#c9a86a'; ctx.lineWidth = match ? 4 : 2;
    ctx.stroke();
    text(ctx, `PLATE ${i + 1}`, p.x + 10, p.y + 13, 12, '#8a6d3b');
    if (match) text(ctx, `✓ ${match.dish} — READY!`, p.x + p.w - 10, p.y + 13, 12, '#1e8449', 'right');
    // white plate ellipse
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + 46, 78, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; ctx.stroke();
    plate.forEach((id, k) => {
      const px = p.x + p.w / 2 + (k - (plate.length - 1) / 2) * 44;
      drawIngredient(ctx, id, px, p.y + 44, 34, 'cooked');
    });
    if (plate.length === 0) text(ctx, 'empty plate', p.x + p.w / 2, p.y + 46, 12, '#b0a080', 'center');
  });
  // trash bin
  ctx.fillStyle = '#5d6d7e'; roundRect(ctx, TRASH.x, TRASH.y, TRASH.w, TRASH.h, 10); ctx.fill();
  ctx.fillStyle = '#2c3e50'; roundRect(ctx, TRASH.x + 8, TRASH.y + 8, TRASH.w - 16, 16, 6); ctx.fill();
  text(ctx, 'BIN', TRASH.x + TRASH.w / 2, TRASH.y + 44, 16, '#fff', 'center');
  text(ctx, 'drop to trash', TRASH.x + TRASH.w / 2, TRASH.y + 62, 10, '#d5dbdb', 'center');
}

function drawServe(ctx, state, now) {
  const chefMatch = state.chef.plate !== null && state.orders.some((o) => {
    const r = recipeById(o.recipe);
    return r && state.chef.plate.length === r.items.length && [...state.chef.plate].sort().join() === [...r.items].sort().join();
  });
  // The window also glows when a finished plate on the counter matches a ticket.
  const glowing = chefMatch || plateMatchesOrder(state, 0) !== null || plateMatchesOrder(state, 1) !== null;
  const pulse = glowing ? 0.5 + 0.5 * Math.sin(now * 6) : 0;
  ctx.save();
  if (glowing) {
    ctx.shadowColor = '#2ecc71'; ctx.shadowBlur = 24 + pulse * 20;
  }
  ctx.fillStyle = glowing ? '#27ae60' : '#2e8b57';
  roundRect(ctx, SERVE.x, SERVE.y, SERVE.w, SERVE.h, 12); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; roundRect(ctx, SERVE.x, SERVE.y + SERVE.h - 26, SERVE.w, 26, 12); ctx.fill();
  text(ctx, 'SERVE WINDOW', SERVE.x + SERVE.w / 2, SERVE.y + 18, 17, '#fff', 'center');
  // bell
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath(); ctx.arc(SERVE.x + SERVE.w / 2, SERVE.y + 58, 20, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillRect(SERVE.x + SERVE.w / 2 - 24, SERVE.y + 58, 48, 6);
  ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.arc(SERVE.x + SERVE.w / 2, SERVE.y + 70, 5, 0, Math.PI * 2); ctx.fill();
  text(ctx, glowing ? 'SERVE IT!  ✓' : 'bring a finished plate', SERVE.x + SERVE.w / 2, SERVE.y + SERVE.h - 13, 12, glowing ? '#eaffea' : 'rgba(255,255,255,0.85)', 'center');
}

function drawChef(ctx, state, now) {
  const c = state.chef;
  const bob = c.moving ? Math.sin(now * 12) * 3 : 0;
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 26, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  // body / apron
  ctx.fillStyle = '#fff'; roundRect(ctx, -18, -6, 36, 34, 12); ctx.fill();
  ctx.fillStyle = '#3498db'; roundRect(ctx, -18, 8, 36, 20, 8); ctx.fill();
  // head + hat
  ctx.fillStyle = '#f5cfa8'; ctx.beginPath(); ctx.arc(0, -16, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-8, -28, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -28, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -30, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-14, -30, 28, 6);
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(-5, -17, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -17, 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, -11, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // carried items above the hat
  if (c.plate) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(0, -44, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
    c.plate.forEach((id, k) => {
      drawIngredient(ctx, id, (k - (c.plate.length - 1) / 2) * 16, -50, 16, 'cooked');
    });
  } else if (c.carrying.length > 0) {
    c.carrying.forEach((item, k) => {
      drawIngredient(ctx, item.id, (k - (c.carrying.length - 1) / 2) * 20, -44, 26, item.burnt ? 'burnt' : (ingredientById(item.id).station ? 'cooked' : 'raw'));
    });
  }
  ctx.restore();
}

function drawCounterCustomers(ctx, state, now) {
  const { y, h } = LAYOUT.counter;
  // counter band
  ctx.fillStyle = '#6e3b1f'; ctx.fillRect(0, y + 62, W, 26);
  ctx.fillStyle = '#8a5a2b'; ctx.fillRect(0, y + 62, W, 8);
  ctx.fillStyle = '#3d2b1f'; ctx.fillRect(0, y + 88, W, h - 88);
  // stools + seated regulars: show the first four live orders' customers,
  // or regulars waiting, so the bottom of the frame is never empty floor.
  const seated = [];
  for (const o of state.orders) {
    if (!seated.some((s) => s.name === o.customer)) seated.push({ name: o.customer, color: o.color, patience: o.patience / o.maxPatience, dish: o.dish });
    if (seated.length >= 4) break;
  }
  const waiting = CUSTOMERS.filter((c) => !seated.some((s) => s.name === c.name));
  let wi = 0;
  while (seated.length < 4) {
    const c = waiting[wi++ % waiting.length];
    seated.push({ name: c.name, color: c.color, patience: 1, dish: 'waiting…' });
  }
  const xs = [180, 500, 800, 1100];
  seated.forEach((s, i) => {
    const cust = customerByName(s.name);
    drawCustomer(ctx, state, cust, xs[i], y + 34, s.patience, now, s.dish);
  });
  text(ctx, 'REGULARS AT THE COUNTER — serve them before patience runs out', W / 2, y + h - 10, 13, '#d8c9a8', 'center');
}

// --- Screens ----------------------------------------------------------------

// Backdrop for the menu screens: the dressed kitchen only — no HUD, no
// tickets, no message toast — so no ghost text shows through the dimming.
function drawBackdrop(ctx, state, now) {
  drawKitchenBase(ctx, state, now);
  drawCrates(ctx, state);
  for (const s of STATIONS) drawStation(ctx, state, s, now);
  drawServe(ctx, state, now);
  drawPlates(ctx, state, now);
  drawCounterCustomers(ctx, state, now);
  drawChef(ctx, state, now);
}

function dimBackground(ctx, state, now) {
  ctx.save();
  ctx.globalAlpha = 0.35;
  drawBackdrop(ctx, state, now);
  ctx.restore();
  ctx.fillStyle = 'rgba(10,10,24,0.62)';
  ctx.fillRect(0, 0, W, H);
}

export function drawPlayScene(ctx, state, now) {
  drawKitchenBase(ctx, state, now);
  drawCrates(ctx, state);
  for (const s of STATIONS) drawStation(ctx, state, s, now);
  drawServe(ctx, state, now);
  drawPlates(ctx, state, now);
  drawCounterCustomers(ctx, state, now);
  drawChef(ctx, state, now);
  drawTickets(ctx, state, now);
  drawHUD(ctx, state, now);
  // message banner: a toast at the bottom, clear of stations and customers
  if (state.messageTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    roundRect(ctx, W / 2 - 260, 668, 520, 28, 14); ctx.fill();
    text(ctx, state.message, W / 2, 683, 15, '#fff', 'center');
  }
}

function drawTitle(ctx, state, now) {
  dimBackground(ctx, state, now);
  state.ui = { buttons: [] };
  ctx.fillStyle = '#fff';
  text(ctx, 'RUSH HOUR KITCHEN', W / 2, 150, 64, '#fff', 'center', 'bold', 'Georgia');
  text(ctx, CONFIG.tagline, W / 2, 200, 22, '#ffd98a', 'center', 'bold', 'Georgia');
  ctx.fillStyle = '#f39c12'; ctx.fillRect(W / 2 - 220, 222, 440, 3);
  text(ctx, CONFIG.countLine, W / 2, 252, 20, '#fff', 'center');
  const lines = [
    'WASD / arrows — move the chef · E / Space — grab, cook, plate, serve',
    'Keys 1–8 — grab an ingredient · Click a station to walk there and use it',
    'Cook every dish, build it on a plate, ring the bell at the SERVE WINDOW',
    'Serve fast to build a COMBO (max x5) — a burnt dish or a lost order resets it',
  ];
  lines.forEach((l, i) => text(ctx, l, W / 2, 300 + i * 30, 17, '#e8e8e8', 'center'));
  // START button
  const b = { id: 'start', x: W / 2 - 130, y: 440, w: 260, h: 64 };
  const pulse = 1 + 0.03 * Math.sin(now * 4);
  ctx.save(); ctx.translate(W / 2, 472); ctx.scale(pulse, pulse);
  ctx.fillStyle = '#e67e22'; roundRect(ctx, -130, -32, 260, 64, 32); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  text(ctx, '▶  START DAY 1', 0, 2, 26, '#fff', 'center');
  ctx.restore();
  state.ui.buttons.push(b);
  text(ctx, '7 days · 90 seconds each · 3 stars a day · finish Day 7 to win', W / 2, 540, 15, '#9fb3d9', 'center');
}

function drawShop(ctx, state, now) {
  dimBackground(ctx, state, now);
  state.ui = { buttons: [] };
  ctx.fillStyle = 'rgba(10,10,24,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fffdf5'; roundRect(ctx, 90, 40, 1100, 600, 16); ctx.fill();
  text(ctx, 'BETWEEN DAYS — THE SHOP', 640, 84, 32, '#1b2a4a', 'center', 'bold', 'Georgia');
  text(ctx, `Your coins: ${state.coins}   ·   Day ${state.day} done — ${state.servedToday} served, ${state.starsToday} stars`, 640, 118, 17, '#555', 'center');
  text(ctx, `Next: ${nextDayText(state)}`, 640, 146, 18, '#e67e22', 'center');
  const cw = 330, ch = 118, gx = 110, gy = 172;
  UPGRADES.forEach((up, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = gx + col * (cw + 15), y = gy + row * (ch + 12);
    const owned = state.owned.has(up.id);
    ctx.fillStyle = owned ? '#d5f5e3' : '#f4f1e8';
    roundRect(ctx, x, y, cw, ch, 10); ctx.fill();
    ctx.strokeStyle = owned ? '#27ae60' : '#c9bfa5'; ctx.lineWidth = 2; ctx.stroke();
    text(ctx, up.name, x + 14, y + 22, 19, '#1b2a4a');
    text(ctx, up.kind === 'tool' ? 'TOOL' : 'DECOR', x + cw - 14, y + 22, 12, up.kind === 'tool' ? '#2980b9' : '#8e44ad', 'right');
    text(ctx, up.effect, x + 14, y + 50, 14, '#555');
    if (owned) {
      ctx.fillStyle = '#27ae60'; roundRect(ctx, x + cw - 118, y + ch - 40, 104, 28, 14); ctx.fill();
      text(ctx, '✓ OWNED', x + cw - 66, y + ch - 25, 14, '#fff', 'center');
    } else {
      const afford = state.coins >= up.price;
      const b = { id: 'buy:' + up.id, x: x + cw - 118, y: y + ch - 40, w: 104, h: 28 };
      ctx.fillStyle = afford ? '#e67e22' : '#999'; roundRect(ctx, b.x, b.y, b.w, b.h, 14); ctx.fill();
      text(ctx, `BUY ${up.price}c`, b.x + b.w / 2, b.y + 15, 14, '#fff', 'center');
      state.ui.buttons.push(b);
    }
  });
  const b = { id: 'nextDay', x: W / 2 - 140, y: 580, w: 280, h: 52 };
  ctx.fillStyle = '#27ae60'; roundRect(ctx, b.x, b.y, b.w, b.h, 26); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  text(ctx, `▶  START DAY ${state.day + 1}`, W / 2, 607, 22, '#fff', 'center');
  state.ui.buttons.push(b);
}

function nextDayText(state) {
  const next = state.day + 1;
  const count = next <= 7 ? unlockedCount(next) : 12;
  return `Day ${next} — ${count} dishes on the menu`;
}

function unlockedCount(day) {
  return RECIPES.filter((r) => r.unlockDay <= day).length;
}

function drawDayEnd(ctx, state, now) {
  dimBackground(ctx, state, now);
  state.ui = { buttons: [] };
  ctx.fillStyle = 'rgba(10,10,24,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fffdf5'; roundRect(ctx, 340, 150, 600, 380, 16); ctx.fill();
  text(ctx, `DAY ${state.day} DONE!`, 640, 200, 36, '#1b2a4a', 'center', 'bold', 'Georgia');
  let stars = '';
  for (let i = 0; i < 3; i++) stars += i < state.starsToday ? '★' : '☆';
  text(ctx, stars, 640, 252, 44, '#f1c40f', 'center');
  text(ctx, `Served: ${state.servedToday}  ·  Lost: ${state.lostToday}  ·  Coins earned: ${state.dayCoins}`, 640, 310, 18, '#333', 'center');
  text(ctx, `Best combo: x${state.bestCombo} (max x5)  ·  Total stars: ${state.stars}/21`, 640, 344, 18, '#333', 'center');
  if (state.starsToday === 3) text(ctx, 'Perfect day! +1 heart', 640, 378, 18, '#27ae60', 'center');
  const b = { id: 'shop', x: 490, y: 420, w: 300, h: 56 };
  ctx.fillStyle = '#e67e22'; roundRect(ctx, b.x, b.y, b.w, b.h, 28); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  text(ctx, '▶  SHOP & NEXT DAY', 640, 449, 20, '#fff', 'center');
  state.ui.buttons.push(b);
}

function drawWin(ctx, state, now) {
  dimBackground(ctx, state, now);
  state.ui = { buttons: [] };
  ctx.fillStyle = 'rgba(10,10,24,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fffdf5'; roundRect(ctx, 300, 130, 680, 420, 16); ctx.fill();
  text(ctx, 'YOU DID IT, CHEF!', 640, 190, 40, '#1b2a4a', 'center', 'bold', 'Georgia');
  text(ctx, 'All 7 days of the lunch rush — served!', 640, 236, 19, '#555', 'center');
  text(ctx, `Score ${state.score}  ·  Coins ${state.coins}  ·  Dishes served ${state.servedTotal}`, 640, 290, 19, '#333', 'center');
  text(ctx, `Stars ${state.stars}/21  ·  Best combo x${state.bestCombo} (max x5)`, 640, 322, 19, '#333', 'center');
  const b = { id: 'restart', x: 490, y: 400, w: 300, h: 56 };
  ctx.fillStyle = '#27ae60'; roundRect(ctx, b.x, b.y, b.w, b.h, 28); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  text(ctx, '↻  PLAY AGAIN', 640, 429, 20, '#fff', 'center');
  state.ui.buttons.push(b);
}

function drawLose(ctx, state, now) {
  dimBackground(ctx, state, now);
  state.ui = { buttons: [] };
  ctx.fillStyle = 'rgba(40,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fffdf5'; roundRect(ctx, 300, 150, 680, 380, 16); ctx.fill();
  text(ctx, 'THE RUSH GOT YOU!', 640, 210, 38, '#c0392b', 'center', 'bold', 'Georgia');
  text(ctx, `Out of hearts on Day ${state.day}. The regulars went hungry.`, 640, 258, 18, '#555', 'center');
  text(ctx, `Score ${state.score}  ·  Dishes served ${state.servedTotal}  ·  Stars ${state.stars}/21`, 640, 306, 19, '#333', 'center');
  const b = { id: 'restart', x: 490, y: 380, w: 300, h: 56 };
  ctx.fillStyle = '#e67e22'; roundRect(ctx, b.x, b.y, b.w, b.h, 28); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  text(ctx, '↻  TRY AGAIN', 640, 409, 20, '#fff', 'center');
  state.ui.buttons.push(b);
}

function drawPause(ctx, state, now) {
  state.ui = { buttons: [{ id: 'resume', x: 490, y: 380, w: 300, h: 56 }] };
  ctx.fillStyle = 'rgba(10,10,24,0.6)'; ctx.fillRect(0, 0, W, H);
  text(ctx, 'PAUSED', 640, 300, 48, '#fff', 'center', 'bold', 'Georgia');
  text(ctx, 'P — resume · M — mute', 640, 350, 18, '#ddd', 'center');
  const b = state.ui.buttons[0];
  ctx.fillStyle = '#27ae60'; roundRect(ctx, b.x, b.y, b.w, b.h, 28); ctx.fill();
  text(ctx, '▶  RESUME', 640, 409, 20, '#fff', 'center');
}

// --- Main render ------------------------------------------------------------

export function render(state, ctx, now) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  if (state.screen === 'title') drawTitle(ctx, state, now);
  else if (state.screen === 'shop') drawShop(ctx, state, now);
  else if (state.screen === 'dayEnd') drawDayEnd(ctx, state, now);
  else if (state.screen === 'win') drawWin(ctx, state, now);
  else if (state.screen === 'lose') drawLose(ctx, state, now);
  else {
    drawPlayScene(ctx, state, now);
    if (state.screen === 'pause' || state.paused) drawPause(ctx, state, now);
  }
  // confetti + floaters on top
  for (const c of state.confetti) {
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size);
  }
  for (const f of state.floaters) {
    ctx.globalAlpha = 1 - f.t / 1.4;
    text(ctx, f.text, f.x, f.y - f.t * 40, 20, f.color, 'center');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (state.flash > 0) {
    ctx.fillStyle = state.flashColor;
    ctx.globalAlpha = state.flash * 0.5;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}
