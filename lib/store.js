const fs = require('fs');
const path = require('path');
const { PRODUCTS } = require('./config');

// Vercel's deployed filesystem is read-only except /tmp, which is wiped
// between (and sometimes during) invocations — so data there is expected
// to be ephemeral, not a bug.
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'folklore-data') : path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'app-data.json');

const SEED_START = new Date('2026-03-01T00:00:00Z');
const REQUIRED_DATE = '2026-06-27';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Gives a seeded historical record a plausible time-of-day (business
 * hours) instead of always landing on midnight.
 */
function withRandomTimeOfDay(date) {
  const withTime = new Date(date);
  withTime.setUTCHours(randomInt(8, 21), randomInt(0, 59), 0, 0);
  return withTime;
}

let sequence = 0;
function nextSequence() {
  sequence += 1;
  return sequence;
}

function makeReferenceId(prefix, date) {
  const stamp = toDateOnly(date).replace(/-/g, '');
  const suffix = randomInt(0, 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `${prefix}-${stamp}-${suffix}`;
}

function buildTransaction(productKey, date, occurredAt) {
  const product = PRODUCTS[productKey];
  return {
    id: `txn_${date.getTime()}_${nextSequence()}`,
    date: toDateOnly(date),
    occurredAt: (occurredAt || date).toISOString(),
    description: product.description,
    amount: product.amount,
    status: 'Completed',
    referenceId: makeReferenceId('REF', date),
  };
}

/**
 * Naturally-spaced purchase history from SEED_START through endDate,
 * alternating products with varied (5-16 day) intervals, then guaranteeing
 * the two required June 27, 2026 transactions are present.
 */
function generateSeedTransactions(endDate) {
  const transactions = [];
  let cursor = new Date(SEED_START);
  const productKeys = Object.keys(PRODUCTS);
  let productIndex = 0;

  while (cursor <= endDate) {
    const productKey = productKeys[productIndex % productKeys.length];
    const day = new Date(cursor);
    transactions.push(buildTransaction(productKey, day, withRandomTimeOfDay(day)));
    productIndex += 1;
    cursor = new Date(cursor.getTime() + randomInt(5, 16) * 24 * 60 * 60 * 1000);
  }

  const requiredDate = new Date(`${REQUIRED_DATE}T00:00:00Z`);
  productKeys.forEach((productKey) => {
    const hasIt = transactions.some(
      (t) => t.date === REQUIRED_DATE && t.description === PRODUCTS[productKey].description
    );
    if (!hasIt) {
      transactions.push(buildTransaction(productKey, requiredDate, withRandomTimeOfDay(requiredDate)));
    }
  });

  return transactions.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * Seeds usage sessions interleaved between purchases, keeping cumulative
 * usage per feature comfortably under cumulative purchases at every point
 * in time (so remaining balances are always positive and realistic).
 */
function generateSeedUsage(transactions) {
  const sessions = [];
  const purchasedRunning = { video: 0, voice: 0 };
  const usedRunning = { video: 0, voice: 0 };
  const now = new Date();
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 0; i < sorted.length; i += 1) {
    const txn = sorted[i];
    const feature = txn.description === PRODUCTS.video.description ? 'video' : 'voice';
    purchasedRunning[feature] += txn.amount;

    const txnDate = new Date(`${txn.date}T00:00:00Z`);
    const nextDateStr = sorted[i + 1] ? sorted[i + 1].date : toDateOnly(now);
    const nextDate = new Date(`${nextDateStr}T00:00:00Z`);
    const gapDays = Math.max(1, Math.round((nextDate - txnDate) / (24 * 60 * 60 * 1000)));

    const sessionCount = randomInt(0, 2);
    for (let s = 0; s < sessionCount; s += 1) {
      const featureKey = Math.random() < 0.5 ? 'video' : 'voice';
      const product = PRODUCTS[featureKey];
      const headroom = purchasedRunning[featureKey] * 0.7 - usedRunning[featureKey];
      if (headroom < 0.5) continue;

      const maxMinutes = headroom / product.ratePerMinute;
      const minutes = Math.min(maxMinutes, randomInt(1, 8));
      if (minutes < 0.5) continue;

      const dayOffset = randomInt(0, gapDays - 1 < 0 ? 0 : gapDays - 1);
      const sessionDate = new Date(txnDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      if (sessionDate > now) continue;

      const creditsConsumed = round2(minutes * product.ratePerMinute);
      usedRunning[featureKey] = round2(usedRunning[featureKey] + creditsConsumed);

      sessions.push({
        id: `usage_${sessionDate.getTime()}_${nextSequence()}`,
        feature: featureKey,
        date: toDateOnly(sessionDate),
        occurredAt: withRandomTimeOfDay(sessionDate).toISOString(),
        durationSeconds: Math.round(minutes * 60),
        creditsConsumed,
        referenceId: makeReferenceId('USG', sessionDate),
      });
    }
  }

  return sessions.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function seedInitialData() {
  const transactions = generateSeedTransactions(new Date());
  const usageSessions = generateSeedUsage(transactions);
  return { transactions, usageSessions };
}

/**
 * Backfills occurredAt onto any record written by an older version of the
 * seed logic, so a pre-existing data file never renders as "Invalid Date"
 * instead of a real timestamp.
 */
function migrate(data) {
  let changed = false;
  [data.transactions, data.usageSessions].forEach((records) => {
    records.forEach((record) => {
      if (!record.occurredAt) {
        record.occurredAt = withRandomTimeOfDay(new Date(`${record.date}T00:00:00Z`)).toISOString();
        changed = true;
      }
    });
  });
  return changed;
}

function load() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const seeded = seedInitialData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seeded, null, 2));
    return seeded;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);
  if (migrate(data)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }
  return data;
}

function save(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function addTransaction(productKey) {
  if (!PRODUCTS[productKey]) {
    throw new Error(`Unknown product: ${productKey}`);
  }
  const data = load();
  const transaction = buildTransaction(productKey, new Date());
  data.transactions.push(transaction);
  save(data);
  return { transaction, data };
}

function addUsageSession(featureKey, durationSeconds, creditsConsumed) {
  if (!PRODUCTS[featureKey]) {
    throw new Error(`Unknown feature: ${featureKey}`);
  }
  const data = load();
  const now = new Date();
  const session = {
    id: `usage_${now.getTime()}_${nextSequence()}`,
    feature: featureKey,
    date: toDateOnly(now),
    occurredAt: now.toISOString(),
    durationSeconds,
    creditsConsumed: round2(creditsConsumed),
    referenceId: makeReferenceId('USG', now),
  };
  data.usageSessions.push(session);
  save(data);
  return { session, data };
}

module.exports = {
  load,
  save,
  addTransaction,
  addUsageSession,
  round2,
  toDateOnly,
};
