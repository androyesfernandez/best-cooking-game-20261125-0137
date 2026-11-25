// world.js — game state and rules: orders, cooking, plating, serving,
// days, the shop and the economy. Pure logic; render.js draws it.

import { CONFIG, STATIONS, INGREDIENTS, ingredientById, stationById, comboMultiplier, dayConfig } from './config.js';
import { RECIPES, CUSTOMERS, UPGRADES, unlockedRecipes, recipeById, customerByName } from './data.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0; a = (a + 1831565813) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newGame() {
  const state = {
    screen: 'title',           // title | play | pause | shop | dayEnd | win | lose
    day: 1,
    timeLeft: CONFIG.dayLength,
    score: 0,
    coins: 0,
    hearts: CONFIG.heartsStart,
    stars: 0,
    starsToday: 0,
    servedToday: 0,
    lostToday: 0,
    servedTotal: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    orders: [],                // live tickets
    nextOrderId: 1,
    spawnTimer: 2,
    chef: { x: 640, y: 450, tx: 640, ty: 450, carrying: [], plate: null, moving: false },
    stations: {},
    plates: [[], []],          // cooked items sitting on each plating counter
    floaters: [],              // floating "+coins" texts
    confetti: [],
    shake: 0,
    flash: 0,
    flashColor: '#e74c3c',
    owned: new Set(),
    dayCoins: 0,
    rng: mulberry32(20261125),
    elapsed: 0,
    muted: false,
    paused: false,
    lastCustomer: null,
    message: '',
    messageTimer: 0,
  };
  for (const s of STATIONS) {
    state.stations[s.id] = Array.from({ length: s.slots }, () => null);
  }
  return state;
}

export function chefSpeed(state) {
  return CONFIG.chefSpeed * (state.owned.has('shoes') ? 1.35 : 1);
}

export function carryCapacity(state) {
  return state.owned.has('pocket') ? 2 : 1;
}

export function cookDuration(state, stationId) {
  const base = stationById(stationId).cookTime;
  if (stationId === 'chop' || stationId === 'salad') {
    return base * (state.owned.has('knife') ? 0.6 : 1);
  }
  return base;
}

export function patienceBonus(state) {
  let bonus = 1;
  if (state.owned.has('basil')) bonus += 0.08;
  if (state.owned.has('rug')) bonus += 0.08;
  return bonus;
}

export function tipBonus(state) {
  let bonus = 1;
  if (state.owned.has('lights')) bonus += 0.05;
  if (state.owned.has('painting')) bonus += 0.05;
  return bonus;
}

// --- Orders ---------------------------------------------------------------

export function spawnOrder(state) {
  const cfg = dayConfig(state.day);
  if (state.orders.length >= cfg.maxTickets) return null;
  const menu = unlockedRecipes(state.day);
  const recipe = menu[Math.floor(state.rng() * menu.length)];
  let customer = CUSTOMERS[Math.floor(state.rng() * CUSTOMERS.length)];
  if (customer.name === state.lastCustomer) {
    customer = CUSTOMERS[(CUSTOMERS.indexOf(customer) + 3) % CUSTOMERS.length];
  }
  state.lastCustomer = customer.name;
  const patience = cfg.patience * customer.patienceMod * patienceBonus(state);
  const order = {
    id: state.nextOrderId++,
    customer: customer.name,
    color: customer.color,
    recipe: recipe.id,
    dish: recipe.name,
    price: recipe.price,
    patience,
    maxPatience: patience,
    quote: customer.quote,
    favourite: customer.favourite === recipe.id,
  };
  state.orders.push(order);
  return order;
}

export function expireOrder(state, order) {
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.hearts = Math.max(0, state.hearts - 1);
  state.lostToday += 1;
  state.combo = 0;
  state.comboTimer = 0;
  state.shake = 14;
  state.flash = 0.5;
  state.flashColor = '#e74c3c';
  state.message = `${order.customer}'s order walked out! -1 heart`;
  state.messageTimer = 2.2;
  if (state.hearts <= 0) {
    state.screen = 'lose';
  }
  return order;
}

function sameItems(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join(',');
  const sb = [...b].sort().join(',');
  return sa === sb;
}

// Serve a finished plate. Returns the coins earned, or 0 when no ticket matches.
export function serveOrder(state, plateItems) {
  const recipe = RECIPES.find((r) => sameItems(r.items, plateItems));
  if (!recipe) return 0;
  const order = state.orders.find((o) => o.recipe === recipe.id);
  if (!order) return 0;
  state.orders = state.orders.filter((o) => o.id !== order.id);
  const speedTip = Math.round((order.patience / order.maxPatience) * CONFIG.speedTipMax);
  let coins = recipe.price + speedTip;
  if (order.favourite) coins = Math.round(coins * (1 + CONFIG.favouriteTip));
  coins = Math.round(coins * tipBonus(state));
  const mult = comboMultiplier(state.combo + 1);
  const paid = Math.max(1, Math.round(coins * mult));
  state.combo = Math.min(CONFIG.comboCap, state.combo + 1);
  state.comboTimer = CONFIG.comboWindow;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.coins += paid;
  state.dayCoins += paid;
  state.score += paid * 10 + state.combo * 5;
  state.servedToday += 1;
  state.servedTotal += 1;
  state.floaters.push({ x: 1160, y: 210, text: `+${paid} coins`, t: 0, color: '#f1c40f' });
  if (order.favourite) {
    state.floaters.push({ x: 1160, y: 240, text: 'Favourite! +25% tip', t: 0, color: '#fd79a8' });
  }
  spawnConfetti(state, 1160, 210);
  return paid;
}

// --- Cooking --------------------------------------------------------------

export function placeInStation(state, stationId, ingredientId) {
  const slots = state.stations[stationId];
  const free = slots.findIndex((s) => s === null);
  if (free < 0) return false;
  slots[free] = {
    item: ingredientId, t: 0, dur: cookDuration(state, stationId),
    done: false, burnt: false, burnT: 0,
  };
  return true;
}

export function takeFromStation(state, stationId, slotIndex) {
  const slot = state.stations[stationId][slotIndex];
  if (!slot || !slot.done) return null;
  state.stations[stationId][slotIndex] = null;
  if (slot.burnt) {
    state.combo = 0;
    state.comboTimer = 0;
    state.message = 'Burnt! Bin it — combo lost.';
    state.messageTimer = 2;
    return { id: slot.item, burnt: true };
  }
  return { id: slot.item, burnt: false };
}

export function updateCooking(state, dt) {
  for (const s of STATIONS) {
    const slots = state.stations[s.id];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;
      if (!slot.done) {
        slot.t += dt;
        if (slot.t >= slot.dur) { slot.done = true; slot.burnT = 0; }
      } else if (!slot.burnt) {
        slot.burnT += dt;
        if (slot.burnT >= CONFIG.burnAfter) {
          slot.burnt = true;
          state.message = 'Something burnt on the ' + s.name + '!';
          state.messageTimer = 2;
        }
      }
    }
  }
}

// --- Plating ---------------------------------------------------------------

export function addToPlate(state, plateIndex, ingredientId) {
  const plate = state.plates[plateIndex];
  const longest = Math.max(...RECIPES.map((r) => r.items.length));
  if (plate.length >= longest) return false;
  plate.push(ingredientId);
  return true;
}

export function plateMatchesOrder(state, plateIndex) {
  const plate = state.plates[plateIndex];
  if (plate.length === 0) return null;
  const recipe = RECIPES.find((r) => sameItems(r.items, plate));
  if (!recipe) return null;
  return state.orders.find((o) => o.recipe === recipe.id) || null;
}

export function unbuildPlate(state, plateIndex) {
  const plate = state.plates[plateIndex];
  if (plate.length === 0) return null;
  return plate.pop();
}

// --- Days, stars, shop -----------------------------------------------------

export function awardStars(state) {
  const target = dayConfig(state.day).target;
  let stars = 0;
  if (state.servedToday >= target) stars = 3;
  else if (state.servedToday >= target - 2) stars = 2;
  else if (state.servedToday >= 1) stars = 1;
  state.starsToday = stars;
  state.stars += stars;
  if (stars === 3 && state.hearts < CONFIG.heartsMax) {
    state.hearts += 1;
    state.message = '3 stars! +1 heart';
    state.messageTimer = 2.5;
  }
  return stars;
}

export function startDay(state, day) {
  state.day = day;
  state.timeLeft = CONFIG.dayLength;
  state.servedToday = 0;
  state.lostToday = 0;
  state.dayCoins = 0;
  state.starsToday = 0;
  state.orders = [];
  state.spawnTimer = 1.2;
  state.combo = 0;
  state.comboTimer = 0;
  state.chef.x = 640; state.chef.y = 450;
  state.chef.tx = 640; state.chef.ty = 450;
  state.chef.carrying = []; state.chef.plate = null;
  state.plates = [[], []];
  for (const s of STATIONS) {
    state.stations[s.id] = Array.from({ length: slotCount(state, s.id) }, () => null);
  }
  state.screen = 'play';
  spawnOrder(state);
  spawnOrder(state);
}

export function slotCount(state, stationId) {
  let n = stationById(stationId).slots;
  if (stationId === 'chop' && state.owned.has('board')) n += 1;
  if (stationId === 'grill' && state.owned.has('burner')) n += 1;
  return n;
}

export function endDay(state) {
  awardStars(state);
  state.screen = 'dayEnd';
}

export function buyUpgrade(state, upgradeId) {
  const up = UPGRADES.find((u) => u.id === upgradeId);
  if (!up || state.owned.has(upgradeId)) return false;
  if (state.coins < up.price) return false;
  state.coins -= up.price;
  state.owned.add(upgradeId);
  if (up.id === 'board' || up.id === 'burner') {
    const stationId = up.id === 'board' ? 'chop' : 'grill';
    state.stations[stationId].push(null);
  }
  state.floaters.push({ x: 640, y: 360, text: `${up.name} bought!`, t: 0, color: '#2ecc71' });
  return true;
}

export function openShop(state) {
  state.screen = 'shop';
}

export function nextDayNumber(state) {
  return state.day + 1;
}

// --- Per-frame update ------------------------------------------------------

export function spawnConfetti(state, x, y) {
  for (let i = 0; i < 40; i++) {
    state.confetti.push({
      x, y,
      vx: (state.rng() - 0.5) * 320, vy: -80 - state.rng() * 220,
      t: 0, life: 0.9 + state.rng() * 0.6,
      color: ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#fd79a8'][i % 5],
      size: 4 + state.rng() * 5,
    });
  }
}

export function updateWorld(state, dt) {
  if (state.screen !== 'play' || state.paused) return;
  state.elapsed += dt;
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    endDay(state);
    return;
  }
  // Orders: spawn and patience.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnOrder(state);
    state.spawnTimer = dayConfig(state.day).spawn;
  }
  for (const order of [...state.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) expireOrder(state, order);
  }
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  updateCooking(state, dt);
  // Chef movement toward target.
  const chef = state.chef;
  const dx = chef.tx - chef.x, dy = chef.ty - chef.y;
  const dist = Math.hypot(dx, dy);
  const step = chefSpeed(state) * dt;
  if (dist > 4) {
    chef.x += (dx / dist) * Math.min(step, dist);
    chef.y += (dy / dist) * Math.min(step, dist);
    chef.moving = true;
  } else {
    chef.moving = false;
  }
  // Floaters, confetti, shake, flash, messages.
  for (const f of state.floaters) f.t += dt;
  state.floaters = state.floaters.filter((f) => f.t < 1.4);
  for (const c of state.confetti) { c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 520 * dt; }
  state.confetti = state.confetti.filter((c) => c.t < c.life);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.6);
  if (state.messageTimer > 0) state.messageTimer -= dt;
}

export function resetRun(state) {
  const fresh = newGame();
  Object.assign(state, fresh);
}
