// config.js — tuning, layout and the single source of truth for every
// number the game prints (combo cap, burn time, day pacing, prices).
// RUSH HOUR KITCHEN: the lunch rush is on. Cook fast, plate faster, serve fastest.

export const W = 1280;
export const H = 720;

export const CONFIG = {
  title: 'RUSH HOUR KITCHEN',
  tagline: 'The lunch rush is on. Cook fast, plate faster, serve fastest.',
  countLine: '7 days · 12 recipes · 12 regulars · 9 upgrades · combos pay double',
  dayLength: 90,            // seconds per day
  days: 7,
  dayTargets: [5, 6, 7, 8, 9, 10, 11],       // orders to serve per day
  spawnInterval: [7.7, 7.0, 6.4, 5.8, 5.2, 4.8, 4.5], // seconds between orders
  patience: [38, 37, 35, 34, 32, 31, 30],    // seconds an order waits
  maxTickets: [3, 3, 4, 4, 4, 5, 5],          // concurrent tickets
  comboCap: 5,               // NEVER above x5
  comboWindow: 12,           // seconds between serves to keep the combo alive
  comboStep: 0.25,           // multiplier step: x1.25 .. x2.25
  burnAfter: 8,              // seconds a finished dish waits before it burns
  heartsStart: 3,
  heartsMax: 5,
  chefSpeed: 260,            // px per second
  interactRadius: 74,
  speedTipMax: 4,            // coins for a lightning serve
  favouriteTip: 0.25,        // +25% when serving a regular's favourite
};

// Layout of the 1280x720 kitchen. No logo board in the main area: the
// bottom of the frame is the customer counter with four seated regulars.
export const LAYOUT = {
  hud: { x: 0, y: 0, w: 1280, h: 56 },
  tickets: { x: 176, y: 62, w: 214, h: 76, gap: 8 },
  crates: { x: 14, y: 62, w: 76, h: 76, gap: 8, cols: 2 },
  stations: { y: 150, h: 118, gap: 10 },
  plates: { y: 282, h: 74 },
  walkway: { x: 14, y: 366, w: 1252, h: 168 },
  counter: { y: 544, h: 176 },
};

// The five named stations. Slots are cooking positions; a station's
// cookTime is the seconds a raw ingredient needs there.
export const STATIONS = [
  { id: 'grill',  name: 'GRILL',     color: '#e74c3c', slots: 2, x: 184, w: 172, cookTime: 6 },
  { id: 'fryer',  name: 'FRYER',     color: '#f39c12', slots: 2, x: 366, w: 172, cookTime: 6 },
  { id: 'salad',  name: 'SALAD BAR', color: '#27ae60', slots: 2, x: 548, w: 172, cookTime: 2 },
  { id: 'dessert',name: 'DESSERT',   color: '#9b59b6', slots: 1, x: 730, w: 150, cookTime: 7 },
  { id: 'chop',   name: 'CHOP BOARD',color: '#3498db', slots: 2, x: 890, w: 172, cookTime: 3 },
];

// The serve window (right of the stations) and the trash bin.
export const SERVE = { x: 1072, y: 150, w: 194, h: 118 };
export const TRASH = { x: 1140, y: 282, w: 126, h: 74 };
export const PLATES = [
  { x: 300, y: 282, w: 250, h: 74 },
  { x: 580, y: 282, w: 250, h: 74 },
];

// Eight ingredient crates down the left side, keys 1-8.
export const INGREDIENTS = [
  { id: 'bun',     name: 'Bun',     key: '1', station: null,     color: '#e8b25e', cookTime: 0 },
  { id: 'patty',   name: 'Patty',   key: '2', station: 'grill',  color: '#a8542f', cookTime: 6 },
  { id: 'fish',    name: 'Fish',    key: '3', station: 'grill',  color: '#7fb3d5', cookTime: 6 },
  { id: 'potato',  name: 'Potato',  key: '4', station: 'fryer',  color: '#f4d03f', cookTime: 6 },
  { id: 'lettuce', name: 'Lettuce', key: '5', station: 'salad',  color: '#58d68d', cookTime: 2 },
  { id: 'tomato',  name: 'Tomato',  key: '6', station: 'chop',   color: '#ec7063', cookTime: 3 },
  { id: 'cheese',  name: 'Cheese',  key: '7', station: 'salad',  color: '#f7dc6f', cookTime: 2 },
  { id: 'cake',    name: 'Cake',    key: '8', station: 'dessert',color: '#f1948a', cookTime: 7 },
];

export function ingredientById(id) {
  return INGREDIENTS.find((g) => g.id === id);
}

export function stationById(id) {
  return STATIONS.find((s) => s.id === id);
}

export function comboMultiplier(combo) {
  const c = Math.max(1, Math.min(CONFIG.comboCap, combo));
  return 1 + (c - 1) * CONFIG.comboStep;
}

export function dayConfig(day) {
  const i = Math.max(0, Math.min(CONFIG.days - 1, day - 1));
  return {
    target: CONFIG.dayTargets[i],
    spawn: CONFIG.spawnInterval[i],
    patience: CONFIG.patience[i],
    maxTickets: CONFIG.maxTickets[i],
  };
}
