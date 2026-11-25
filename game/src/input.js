// input.js — keyboard and mouse: WASD/arrows to move, E/Space to use,
// click-to-move, click-an-object to walk there and use it, keys 1-8 to
// grab an ingredient, P pause, M mute, X to unbuild a plate.

import { W, H, LAYOUT, STATIONS, INGREDIENTS, SERVE, TRASH, PLATES, ingredientById, stationById } from './config.js';
import { placeInStation, takeFromStation, addToPlate, unbuildPlate, serveOrder, buyUpgrade, startDay, openShop, resetRun } from './world.js';
import { playSfx } from './audio.js';

export function crateRect(i) {
  const { x, y, w, h, gap, cols } = LAYOUT.crates;
  const col = i % cols, row = Math.floor(i / cols);
  return { x: x + col * (w + gap), y: y + row * (h + gap), w, h };
}

export function stationRect(s) {
  return { x: s.x, y: LAYOUT.stations.y, w: s.w, h: LAYOUT.stations.h };
}

function inside(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function center(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

// What the chef is standing next to, by screen position.
export function nearestInteractable(state, px, py) {
  const cands = [];
  INGREDIENTS.forEach((ing, i) => {
    const r = crateRect(i);
    cands.push({ kind: 'crate', id: ing.id, dist: Math.hypot(px - (r.x + r.w / 2), py - (r.y + r.h)), rect: r });
  });
  for (const s of STATIONS) {
    const r = stationRect(s);
    cands.push({ kind: 'station', id: s.id, dist: Math.hypot(px - (r.x + r.w / 2), py - (r.y + r.h)), rect: r });
  }
  PLATES.forEach((p, i) => {
    cands.push({ kind: 'plate', id: i, dist: Math.hypot(px - (p.x + p.w / 2), py - (p.y + p.h)), rect: p });
  });
  cands.push({ kind: 'serve', id: 'serve', dist: Math.hypot(px - (SERVE.x + SERVE.w / 2), py - (SERVE.y + SERVE.h)), rect: SERVE });
  cands.push({ kind: 'trash', id: 'trash', dist: Math.hypot(px - (TRASH.x + TRASH.w / 2), py - (TRASH.y + TRASH.h)), rect: TRASH });
  cands.sort((a, b) => a.dist - b.dist);
  return cands[0];
}

// Perform the use-action on whatever the chef is next to.
export function useNearest(state) {
  const chef = state.chef;
  const target = nearestInteractable(state, chef.x, chef.y + 20);
  if (!target || target.dist > 130) return false;
  return useTarget(state, target);
}

export function useTarget(state, target) {
  const chef = state.chef;
  if (target.kind === 'crate') {
    const ing = ingredientById(target.id);
    const cap = state.owned.has('pocket') ? 2 : 1;
    if (chef.carrying.length >= cap || chef.plate) return false;
    if (ing.station === null) {
      chef.carrying.push({ id: ing.id, burnt: false, cooked: true });
    } else {
      chef.carrying.push({ id: ing.id, burnt: false, cooked: false });
    }
    playSfx(state, 'pickup');
    return true;
  }
  if (target.kind === 'station') {
    const slots = state.stations[target.id];
    // First: pick up any finished dish.
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (slot && slot.done) {
        const cap = state.owned.has('pocket') ? 2 : 1;
        if (chef.carrying.length < cap && !chef.plate) {
          const got = takeFromStation(state, target.id, i);
          if (got) {
            chef.carrying.push({ id: got.id, burnt: got.burnt, cooked: !got.burnt });
            playSfx(state, got.burnt ? 'burnt' : 'pickup');
            return true;
          }
        }
      }
    }
    // Otherwise place a raw ingredient that belongs to this station.
    const idx = chef.carrying.findIndex((c) => {
      const ing = ingredientById(c.id);
      return !c.cooked && ing.station === target.id;
    });
    if (idx >= 0) {
      const item = chef.carrying.splice(idx, 1)[0];
      if (placeInStation(state, target.id, item.id)) {
        playSfx(state, target.id === 'chop' ? 'chop' : 'sizzle');
        return true;
      }
      chef.carrying.splice(idx, 0, item);
    }
    return false;
  }
  if (target.kind === 'plate') {
    const plate = state.plates[target.id];
    if (chef.plate) {
      // Put the carried plate down on an empty counter spot.
      if (plate.length === 0) {
        state.plates[target.id] = chef.plate;
        chef.plate = null;
        playSfx(state, 'place');
        return true;
      }
      return false;
    }
    if (chef.carrying.length > 0) {
      const item = chef.carrying[0];
      if (item.burnt) return false;
      if (!item.cooked && ingredientById(item.id).station) return false; // must cook first
      if (addToPlate(state, target.id, item.id)) {
        chef.carrying.shift();
        playSfx(state, 'place');
        return true;
      }
      return false;
    }
    // Empty hands: pick the whole plate up.
    if (plate.length > 0) {
      chef.plate = [...plate];
      state.plates[target.id] = [];
      playSfx(state, 'pickup');
      return true;
    }
    return false;
  }
  if (target.kind === 'serve') {
    if (!chef.plate) return false;
    const paid = serveOrder(state, chef.plate);
    if (paid > 0) {
      chef.plate = null;
      playSfx(state, 'serve');
      if (state.combo >= 3) playSfx(state, 'combo');
      return true;
    }
    state.message = 'No ticket wants that dish yet!';
    state.messageTimer = 1.6;
    playSfx(state, 'fail');
    return false;
  }
  if (target.kind === 'trash') {
    if (chef.plate) { chef.plate = null; playSfx(state, 'place'); return true; }
    if (chef.carrying.length > 0) { chef.carrying.shift(); playSfx(state, 'place'); return true; }
    return false;
  }
  return false;
}

// Take the last item off a carried plate back into the hand (unbuild).
export function unbuildCarriedPlate(state) {
  const chef = state.chef;
  if (!chef.plate || chef.plate.length === 0) return false;
  const cap = state.owned.has('pocket') ? 2 : 1;
  if (chef.carrying.length >= cap) return false;
  const id = chef.plate.pop();
  chef.carrying.push({ id, burnt: false, cooked: true });
  playSfx(state, 'pickup');
  return true;
}

export function attachInput(state, canvas, onFirstGesture) {
  const keys = new Set();
  let pendingUse = null;   // interactable to use once the chef arrives
  let clickTarget = null;

  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    const sx = W / r.width, sy = H / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }

  function buttonAt(x, y) {
    if (!state.ui || !state.ui.buttons) return null;
    return state.ui.buttons.find((b) => inside(b, x, y)) || null;
  }

  function objectAt(x, y) {
    for (let i = 0; i < INGREDIENTS.length; i++) {
      const r = crateRect(i);
      if (inside(r, x, y)) return { kind: 'crate', id: INGREDIENTS[i].id, rect: r };
    }
    for (const s of STATIONS) {
      const r = stationRect(s);
      if (inside(r, x, y)) return { kind: 'station', id: s.id, rect: r };
    }
    for (let i = 0; i < PLATES.length; i++) {
      if (inside(PLATES[i], x, y)) return { kind: 'plate', id: i, rect: PLATES[i] };
    }
    if (inside(SERVE, x, y)) return { kind: 'serve', id: 'serve', rect: SERVE };
    if (inside(TRASH, x, y)) return { kind: 'trash', id: 'trash', rect: TRASH };
    return null;
  }

  function handleButton(btn) {
    if (!btn) return false;
    if (btn.id === 'start') { startDay(state, 1); playSfx(state, 'round'); return true; }
    if (btn.id === 'shop') { openShop(state); return true; }
    if (btn.id === 'nextDay') { startDay(state, state.day + 1); playSfx(state, 'round'); return true; }
    if (btn.id === 'restart') { resetRun(state); state.screen = 'title'; return true; }
    if (btn.id === 'resume') { state.paused = false; state.screen = 'play'; return true; }
    if (btn.id.startsWith('buy:')) {
      const ok = buyUpgrade(state, btn.id.slice(4));
      playSfx(state, ok ? 'buy' : 'fail');
      return true;
    }
    return false;
  }

  canvas.addEventListener('mousedown', (e) => {
    onFirstGesture();
    const p = toGame(e);
    const btn = buttonAt(p.x, p.y);
    if (btn) { handleButton(btn); return; }
    if (state.screen !== 'play' || state.paused) return;
    const obj = objectAt(p.x, p.y);
    if (obj) {
      const c = center(obj.rect);
      const walkTo = { x: c.x, y: Math.min(obj.rect.y + obj.rect.h + 26, LAYOUT.walkway.y + LAYOUT.walkway.h - 10) };
      state.chef.tx = walkTo.x; state.chef.ty = walkTo.y;
      pendingUse = obj;
      clickTarget = walkTo;
    } else {
      const wy = Math.max(LAYOUT.walkway.y + 10, Math.min(LAYOUT.walkway.y + LAYOUT.walkway.h - 10, p.y));
      state.chef.tx = Math.max(20, Math.min(W - 20, p.x));
      state.chef.ty = wy;
      pendingUse = null;
      clickTarget = null;
    }
  });

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    onFirstGesture();
    if (k === 'm') { state.muted = !state.muted; return; }
    if (k === 'p' && state.screen === 'play') { state.paused = true; state.screen = 'pause'; return; }
    if (k === 'p' && state.screen === 'pause') { state.paused = false; state.screen = 'play'; return; }
    if (k === 'enter' && state.screen === 'title') { startDay(state, 1); playSfx(state, 'round'); return; }
    if (k === 'enter' && state.screen === 'dayEnd') { openShop(state); return; }
    if (k === 'enter' && (state.screen === 'win' || state.screen === 'lose')) { resetRun(state); state.screen = 'title'; return; }
    if (state.screen !== 'play' || state.paused) return;
    if (k === 'e' || k === ' ') { useNearest(state); return; }
    if (k === 'x') { unbuildCarriedPlate(state); return; }
    const ingIndex = INGREDIENTS.findIndex((g) => g.key === k);
    if (ingIndex >= 0) {
      const r = crateRect(ingIndex);
      const c = center(r);
      state.chef.tx = c.x;
      state.chef.ty = Math.min(r.y + r.h + 26, LAYOUT.walkway.y + LAYOUT.walkway.h - 10);
      pendingUse = { kind: 'crate', id: INGREDIENTS[ingIndex].id, rect: r };
      return;
    }
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // Called every frame: keyboard movement + arrival at a clicked object.
  function tick(state, dt) {
    if (state.screen !== 'play' || state.paused) return;
    const chef = state.chef;
    let mx = 0, my = 0;
    if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
    if (keys.has('d') || keys.has('arrowright')) mx += 1;
    if (keys.has('w') || keys.has('arrowup')) my -= 1;
    if (keys.has('s') || keys.has('arrowdown')) my += 1;
    if (mx !== 0 || my !== 0) {
      pendingUse = null;
      const len = Math.hypot(mx, my);
      const speed = (state.owned.has('shoes') ? 1.35 : 1) * 260;
      chef.tx = chef.x; chef.ty = chef.y;
      chef.x = Math.max(20, Math.min(W - 20, chef.x + (mx / len) * speed * dt));
      chef.y = Math.max(LAYOUT.walkway.y + 10, Math.min(LAYOUT.walkway.y + LAYOUT.walkway.h - 10, chef.y + (my / len) * speed * dt));
      chef.moving = true;
    }
    if (pendingUse) {
      const c = center(pendingUse.rect);
      const d = Math.hypot(chef.x - c.x, chef.y - (pendingUse.rect.y + pendingUse.rect.h));
      if (d < 120 || !chef.moving) {
        useTarget(state, pendingUse);
        pendingUse = null;
      }
    }
  }

  return { tick };
}
