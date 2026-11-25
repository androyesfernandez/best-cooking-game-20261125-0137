// shots.js — deterministic staging for the four screenshots (?shot=).
// Each stage builds its scene from the real world state (real orders,
// real cooking slots, real plates) with a fixed seed, so every shot is
// a genuine render of the game's own code.

import { CONFIG } from './config.js';
import { newGame, spawnConfetti } from './world.js';
import { customerByName } from './data.js';

function makeOrder(state, id, customerName, recipeId, dish, price, patience, maxPatience, favourite) {
  const c = customerByName(customerName);
  return {
    id, customer: customerName, color: c.color, recipe: recipeId, dish,
    price, patience, maxPatience, quote: c.quote, favourite,
  };
}

function slot(item, t, dur, done = false, burnt = false) {
  return { item, t, dur, done, burnt, burnT: done && !burnt ? 2 : 0 };
}

function dressKitchen(state) {
  state.owned.add('lights');
  state.owned.add('basil');
  state.owned.add('rug');
  state.owned.add('painting');
}

// DAY 7/7 mid-game, ~45 s left: 5 named tickets (1 urgent), 3 stations
// cooking + 1 dish done, 2 plates mid-assembly, serve window glowing,
// 4 seated regulars, full HUD with combo x4.
export function stageCover(state) {
  dressKitchen(state);
  state.screen = 'play';
  state.day = 7;
  state.timeLeft = 45;
  state.score = 2840;
  state.coins = 96;
  state.hearts = 3;
  state.stars = 14;
  state.starsToday = 2;
  state.combo = 4;
  state.comboTimer = 8;
  state.bestCombo = 4;
  state.servedToday = 9;
  state.orders = [
    makeOrder(state, 1, 'Mabel', 'burger', 'Classic Burger', 16, 4, 38, true),
    makeOrder(state, 2, 'Theo', 'fishburger', 'Fish Burger', 17, 22, 37, false),
    makeOrder(state, 3, 'Priya', 'salad', 'Garden Salad', 10, 28, 37, true),
    makeOrder(state, 4, 'Gus', 'stack', 'Double Stack', 20, 31, 36, false),
    makeOrder(state, 5, 'Nadia', 'cheesy', 'Cheesy Fries', 13, 34, 38, false),
  ];
  state.stations = {
    grill: [slot('patty', 3.6, 6), slot('fish', 6, 6, true)],
    fryer: [slot('potato', 2.4, 6), null],
    salad: [slot('lettuce', 2, 2, true), slot('cheese', 1.4, 2)],
    dessert: [slot('cake', 3.5, 7)],
    chop: [slot('tomato', 0.9, 3), null],
  };
  state.plates = [['bun', 'patty', 'lettuce'], ['bun', 'fish']];
  state.chef.x = 640; state.chef.y = 470;
  state.chef.tx = 640; state.chef.ty = 470;
  state.chef.carrying = [];
  state.chef.plate = null;
  state.floaters = [{ x: 1150, y: 430, text: '+20 coins', t: 0.3, color: '#f1c40f' }];
  spawnConfetti(state, 1150, 430);
  return state;
}

// DAY 7, 15 s left: 2 urgent red tickets, a BURNT patty on the grill,
// 1 heart left, red timer, combo x5, different plates. Visibly not cover.
export function stageRush(state) {
  dressKitchen(state);
  state.screen = 'play';
  state.day = 7;
  state.timeLeft = 15;
  state.score = 3120;
  state.coins = 121;
  state.hearts = 1;
  state.stars = 14;
  state.starsToday = 2;
  state.combo = 5;
  state.comboTimer = 9;
  state.bestCombo = 5;
  state.servedToday = 10;
  state.orders = [
    makeOrder(state, 1, 'Mabel', 'burger', 'Classic Burger', 16, 3, 38, true),
    makeOrder(state, 2, 'Omar', 'special', "Chef's Special", 24, 4, 34, true),
    makeOrder(state, 3, 'Lila', 'deluxe', 'Fish & Chips Deluxe', 21, 12, 34, true),
    makeOrder(state, 4, 'Marco', 'surf', 'Surf Platter', 22, 18, 34, false),
    makeOrder(state, 5, 'Suki', 'tart', 'Tomato Tart', 14, 26, 38, true),
  ];
  state.stations = {
    grill: [slot('patty', 6, 6, true, true), slot('fish', 4, 6)],
    fryer: [slot('potato', 6, 6, true), null],
    salad: [slot('lettuce', 1, 2), null],
    dessert: [slot('cake', 7, 7, true)],
    chop: [slot('tomato', 2, 3), null],
  };
  state.plates = [['fish', 'potato'], ['bun', 'patty', 'cheese']];
  state.chef.x = 900; state.chef.y = 470;
  state.chef.tx = 900; state.chef.ty = 470;
  state.chef.carrying = [];
  state.chef.plate = null;
  state.message = 'Something burnt on the GRILL! Bin it!';
  state.messageTimer = 2;
  state.flash = 0.12;
  state.flashColor = '#e74c3c';
  return state;
}

// Title over a dressed kitchen, darkened, no watermark, no zero-stats line.
export function stageTitle(state) {
  dressKitchen(state);
  state.screen = 'title';
  state.day = 1;
  state.timeLeft = 90;
  state.score = 0;
  state.coins = 0;
  state.hearts = 3;
  state.stars = 0;
  state.combo = 0;
  state.orders = [
    makeOrder(state, 1, 'Mabel', 'burger', 'Classic Burger', 16, 30, 38, true),
    makeOrder(state, 2, 'Theo', 'fries', 'Golden Fries', 8, 24, 37, false),
    makeOrder(state, 3, 'Priya', 'salad', 'Garden Salad', 10, 33, 37, true),
  ];
  state.stations = {
    grill: [slot('patty', 3, 6), null],
    fryer: [slot('potato', 4, 6), null],
    salad: [slot('lettuce', 2, 2, true), null],
    dessert: [null],
    chop: [slot('tomato', 1.5, 3), null],
  };
  state.plates = [['bun', 'patty'], []];
  state.chef.x = 640; state.chef.y = 470;
  return state;
}

// Between-day shop: all 9 upgrades, 2 owned, coins shown, next day line.
export function stageShop(state) {
  dressKitchen(state);
  state.screen = 'shop';
  state.day = 5;
  state.timeLeft = 0;
  state.coins = 137;
  state.servedToday = 8;
  state.starsToday = 3;
  state.stars = 11;
  state.hearts = 4;
  state.score = 1980;
  state.owned = new Set(['knife', 'lights']);
  state.orders = [];
  return state;
}

export function stageShot(state, shot) {
  if (shot === 'cover') return stageCover(state);
  if (shot === 'rush') return stageRush(state);
  if (shot === 'title') return stageTitle(state);
  if (shot === 'shop') return stageShop(state);
  return state;
}

export function freshStagedState(shot) {
  const state = newGame();
  return stageShot(state, shot);
}
