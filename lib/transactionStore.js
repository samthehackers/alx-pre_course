const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'transactions.json');

const PRODUCTS = {
  video: { description: 'Real-Time Video Credit', amount: 20.00 },
  voice: { description: 'Real-Time Voice Changer Credit', amount: 10.00 },
};

const SEED_START = new Date('2026-03-01T00:00:00Z');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function makeReferenceId(date) {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomInt(0, 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `REF-${stamp}-${suffix}`;
}

let sequence = 0;
function makeId(date) {
  sequence += 1;
  return `txn_${date.getTime()}_${sequence}`;
}

function buildTransaction(productKey, date) {
  const product = PRODUCTS[productKey];
  return {
    id: makeId(date),
    date: toDateOnly(date),
    description: product.description,
    amount: product.amount,
    status: 'Completed',
    referenceId: makeReferenceId(date),
  };
}

/**
 * Generates a chronological, naturally-spaced purchase history from
 * SEED_START through `endDate`, alternating between the two demo products.
 * Intervals vary (5-16 days) so purchases don't land on a rigid schedule.
 */
function generateSeedHistory(endDate) {
  const transactions = [];
  let cursor = new Date(SEED_START);
  const productKeys = Object.keys(PRODUCTS);
  let productIndex = 0;

  while (cursor <= endDate) {
    const productKey = productKeys[productIndex % productKeys.length];
    transactions.push(buildTransaction(productKey, new Date(cursor)));
    productIndex += 1;
    cursor = new Date(cursor.getTime() + randomInt(5, 16) * 24 * 60 * 60 * 1000);
  }

  return transactions;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const seeded = generateSeedHistory(new Date());
    fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2));
    return seeded;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function save(transactions) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(transactions, null, 2));
}

function getAll() {
  return load().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function addSimulatedPurchase(productKey) {
  if (!PRODUCTS[productKey]) {
    throw new Error(`Unknown product: ${productKey}`);
  }
  const transactions = load();
  const transaction = buildTransaction(productKey, new Date());
  transactions.push(transaction);
  save(transactions);
  return transaction;
}

module.exports = {
  PRODUCTS,
  getAll,
  addSimulatedPurchase,
};
