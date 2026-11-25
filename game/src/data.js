// data.js — the game's content tables: 12 recipes, 12 named regulars,
// 9 shop upgrades. Every recipe is a different station combination;
// three recipes need the CHOP BOARD so no station is decoration.

// A recipe's items are ingredient ids. An item must be cooked at its
// ingredient's station before it counts (bun is ready as-is).
export const RECIPES = [
  { id: 'fries',     name: 'Golden Fries',      price: 8,  unlockDay: 1, items: ['potato'] },
  { id: 'salad',     name: 'Garden Salad',      price: 10, unlockDay: 1, items: ['lettuce', 'tomato'] },
  { id: 'cake',      name: 'Berry Cake',        price: 12, unlockDay: 1, items: ['cake'] },
  { id: 'cheesy',    name: 'Cheesy Fries',      price: 13, unlockDay: 1, items: ['potato', 'cheese'] },
  { id: 'burger',    name: 'Classic Burger',    price: 16, unlockDay: 2, items: ['bun', 'patty', 'lettuce'] },
  { id: 'fishburger',name: 'Fish Burger',       price: 17, unlockDay: 3, items: ['bun', 'fish', 'tomato'] },
  { id: 'stack',     name: 'Double Stack',      price: 20, unlockDay: 4, items: ['bun', 'patty', 'patty', 'cheese'] },
  { id: 'surf',      name: 'Surf Platter',      price: 22, unlockDay: 5, items: ['fish', 'potato', 'lettuce'] },
  { id: 'tart',      name: 'Tomato Tart',       price: 14, unlockDay: 6, items: ['tomato', 'cheese', 'bun'] },
  { id: 'special',   name: "Chef's Special",    price: 24, unlockDay: 7, items: ['patty', 'fish', 'tomato', 'cheese'] },
  { id: 'veggie',    name: 'Veggie Stack',      price: 15, unlockDay: 7, items: ['bun', 'lettuce', 'tomato', 'cheese'] },
  { id: 'deluxe',    name: 'Fish & Chips Deluxe', price: 21, unlockDay: 7, items: ['fish', 'potato', 'tomato'] },
];

export function unlockedRecipes(day) {
  return RECIPES.filter((r) => r.unlockDay <= day);
}

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}

// Twelve regulars. favourite is a recipe id (+25% tip when served it);
// patienceMod multiplies the ticket's patience; quote shows on the ticket.
export const CUSTOMERS = [
  { name: 'Mabel', color: '#e74c3c', favourite: 'burger',     patienceMod: 1.15, quote: 'Extra pickles, dear!' },
  { name: 'Theo',  color: '#3498db', favourite: 'fishburger', patienceMod: 1.0,  quote: 'Make it snappy!' },
  { name: 'Priya', color: '#9b59b6', favourite: 'salad',      patienceMod: 1.1,  quote: 'Light and fresh, please.' },
  { name: 'Gus',   color: '#e67e22', favourite: 'stack',      patienceMod: 0.95, quote: 'Double everything!' },
  { name: 'Nadia', color: '#1abc9c', favourite: 'cake',       patienceMod: 1.2,  quote: 'Something sweet, chef.' },
  { name: 'Felix', color: '#f1c40f', favourite: 'fries',      patienceMod: 0.9,  quote: 'Fries. Now. Please.' },
  { name: 'June',  color: '#fd79a8', favourite: 'veggie',     patienceMod: 1.1,  quote: 'No meat for me today.' },
  { name: 'Omar',  color: '#6c5ce7', favourite: 'special',    patienceMod: 0.9,  quote: 'Surprise me, chef!' },
  { name: 'Lila',  color: '#00b894', favourite: 'deluxe',     patienceMod: 1.05, quote: 'The deluxe, as always.' },
  { name: 'Marco', color: '#d63031', favourite: 'surf',       patienceMod: 1.0,  quote: 'From the sea, pronto!' },
  { name: 'Suki',  color: '#e84393', favourite: 'tart',       patienceMod: 1.15, quote: 'That tart smells divine.' },
  { name: 'Hank',  color: '#636e72', favourite: 'cheesy',     patienceMod: 1.0,  quote: 'Cheese. Lots of cheese.' },
];

export function customerByName(name) {
  return CUSTOMERS.find((c) => c.name === name);
}

// Nine upgrades for the between-day shop: five tools, four decor items.
// Decor visibly dresses the kitchen AND pays a patience/tip bonus.
export const UPGRADES = [
  { id: 'knife',   name: 'Sharp Knife',     kind: 'tool',  price: 50, effect: 'Chop + prep 40% faster' },
  { id: 'shoes',   name: 'Fast Shoes',      kind: 'tool',  price: 60, effect: 'Chef runs 35% faster' },
  { id: 'board',   name: 'Second Board',    kind: 'tool',  price: 70, effect: '+1 CHOP BOARD slot' },
  { id: 'burner',  name: 'Third Burner',    kind: 'tool',  price: 70, effect: '+1 GRILL slot' },
  { id: 'pocket',  name: 'Apron Pocket',    kind: 'tool',  price: 80, effect: 'Carry 2 items at once' },
  { id: 'lights',  name: 'Fairy Lights',    kind: 'decor', price: 40, effect: 'Warm glow · +5% tips' },
  { id: 'basil',   name: 'Potted Basil',    kind: 'decor', price: 45, effect: 'Fresh herbs · +8% patience' },
  { id: 'rug',     name: 'Cozy Rug',        kind: 'decor', price: 50, effect: 'Soft floor · +8% patience' },
  { id: 'painting',name: 'Tomato Painting', kind: 'decor', price: 55, effect: 'Art on the wall · +5% tips' },
];

export function upgradeById(id) {
  return UPGRADES.find((u) => u.id === id);
}
