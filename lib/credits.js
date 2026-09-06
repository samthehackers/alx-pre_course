const store = require('./store');
const { PRODUCTS } = require('./config');

class InsufficientCreditsError extends Error {}

function summarize(data) {
  const purchased = { video: 0, voice: 0 };
  data.transactions.forEach((t) => {
    const key = t.description === PRODUCTS.video.description ? 'video' : 'voice';
    purchased[key] = store.round2(purchased[key] + t.amount);
  });

  const used = { video: 0, voice: 0 };
  data.usageSessions.forEach((s) => {
    used[s.feature] = store.round2(used[s.feature] + s.creditsConsumed);
  });

  const remaining = {
    video: store.round2(purchased.video - used.video),
    voice: store.round2(purchased.voice - used.voice),
  };

  return { purchased, used, remaining };
}

function getSummary() {
  return summarize(store.load());
}

function getTransactions() {
  return [...store.load().transactions].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  );
}

function getUsageSessions() {
  return [...store.load().usageSessions].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  );
}

function getRecentUsageSessions(limit = 10) {
  return getUsageSessions().slice(-limit).reverse();
}

function getRecentActivity(limit = 8) {
  const purchases = getTransactions().map((t) => ({
    type: 'purchase',
    date: t.date,
    id: t.id,
    feature: t.description === PRODUCTS.video.description ? 'video' : 'voice',
    label: t.description,
    amount: t.amount,
    referenceId: t.referenceId,
  }));
  const usage = getUsageSessions().map((s) => ({
    type: 'usage',
    date: s.date,
    id: s.id,
    feature: s.feature,
    label: `${PRODUCTS[s.feature].label} session`,
    amount: -s.creditsConsumed,
    durationSeconds: s.durationSeconds,
    referenceId: s.referenceId,
  }));
  return [...purchases, ...usage]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .slice(-limit)
    .reverse();
}

function purchaseCredits(productKey) {
  const { transaction } = store.addTransaction(productKey);
  return { transaction, summary: getSummary() };
}

/**
 * Records a real-time session, deducting from the feature's remaining
 * balance. Duration is capped to whatever the remaining balance can cover.
 */
function recordUsage(featureKey, durationSeconds) {
  if (!PRODUCTS[featureKey]) {
    throw new Error(`Unknown feature: ${featureKey}`);
  }
  const product = PRODUCTS[featureKey];
  const summary = getSummary();
  const remaining = summary.remaining[featureKey];

  if (remaining <= 0 || durationSeconds <= 0) {
    throw new InsufficientCreditsError('No remaining credits for this feature.');
  }

  const requestedCost = store.round2((durationSeconds / 60) * product.ratePerMinute);
  const creditsConsumed = Math.min(requestedCost, remaining);
  const billedSeconds = Math.round((creditsConsumed / product.ratePerMinute) * 60);

  const { session } = store.addUsageSession(featureKey, billedSeconds, creditsConsumed);
  return { session, summary: getSummary() };
}

module.exports = {
  InsufficientCreditsError,
  getSummary,
  getTransactions,
  getUsageSessions,
  getRecentUsageSessions,
  getRecentActivity,
  purchaseCredits,
  recordUsage,
};
