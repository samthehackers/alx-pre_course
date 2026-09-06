const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const credits = require('./lib/credits');
const auth = require('./lib/auth');
const { PRODUCTS } = require('./lib/config');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.locals.formatMoney = (n) => `$${Number(n).toFixed(2)}`;

app.locals.formatDate = (isoDate) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

app.locals.formatDateTime = (isoTimestamp) => {
  const date = new Date(isoTimestamp);
  const datePart = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
  return `${datePart} • ${timePart}`;
};

app.locals.formatDuration = (seconds) => {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const minutes = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${minutes}m` : `${minutes}m ${rem}s`;
};

app.locals.pct = (used, purchased) => {
  if (!purchased) return 0;
  return Math.min(100, Math.round((used / purchased) * 100));
};

app.locals.product = (key) => PRODUCTS[key];

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cookieSession({
    name: 'folklore.sid',
    keys: ['folklore-demo-session-secret'],
    maxAge: 1000 * 60 * 60 * 24,
  })
);
app.use(auth.attachUser);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('landing');
});

app.get('/signin', (req, res) => {
  if (req.session.authenticated) return res.redirect('/dashboard');
  res.render('signin', {
    error: null,
    email: '',
    next: req.query.next || '/dashboard',
  });
});

app.post('/signin', (req, res) => {
  const { email, password, next } = req.body;
  if (auth.attemptLogin(email, password)) {
    auth.login(req);
    return res.redirect(next && next.startsWith('/') ? next : '/dashboard');
  }
  res.status(401).render('signin', {
    error: 'Incorrect email or password.',
    email,
    next: next || '/dashboard',
  });
});

app.get('/signup', (req, res) => {
  if (req.session.authenticated) return res.redirect('/dashboard');
  res.render('signup', {
    next: req.query.next || '/dashboard',
  });
});

app.post('/signout', (req, res) => {
  auth.logout(req, () => res.redirect('/'));
});

app.get('/dashboard', auth.requireAuth, (req, res) => {
  res.render('dashboard', {
    user: res.locals.user,
    summary: credits.getSummary(),
    usageSessions: credits.getUsageSessions(),
    activity: credits.getRecentActivity(6),
  });
});

app.get('/usage', auth.requireAuth, (req, res) => {
  res.render('usage', {
    user: res.locals.user,
    summary: credits.getSummary(),
    sessions: credits.getRecentUsageSessions(20),
  });
});

app.get('/credits', auth.requireAuth, (req, res) => {
  res.render('credits', {
    user: res.locals.user,
    summary: credits.getSummary(),
  });
});

app.get('/billing', auth.requireAuth, (req, res) => {
  res.render('billing', {
    user: res.locals.user,
    summary: credits.getSummary(),
    recentTransactions: credits.getTransactions().slice(-5).reverse(),
  });
});

app.get('/transactions', auth.requireAuth, (req, res) => {
  res.render('transactions', {
    user: res.locals.user,
    transactions: credits.getTransactions(),
  });
});

app.get('/account', auth.requireAuth, (req, res) => {
  res.render('account', {
    user: res.locals.user,
    summary: credits.getSummary(),
    usageSessions: credits.getUsageSessions(),
    transactionCount: credits.getTransactions().length,
  });
});

app.post('/api/credits/purchase', auth.requireApiAuth, (req, res) => {
  const { product } = req.body || {};
  if (!PRODUCTS[product]) {
    return res.status(400).json({ error: `product must be one of: ${Object.keys(PRODUCTS).join(', ')}` });
  }
  const result = credits.purchaseCredits(product);
  res.status(201).json(result);
});

app.get('/video', auth.requireAuth, (req, res) => {
  const summary = credits.getSummary();
  res.render('video', {
    user: res.locals.user,
    remaining: summary.remaining.video,
    rate: PRODUCTS.video.ratePerMinute,
  });
});

app.get('/voice-changer', auth.requireAuth, (req, res) => {
  const summary = credits.getSummary();
  res.render('voice', {
    user: res.locals.user,
    remaining: summary.remaining.voice,
    rate: PRODUCTS.voice.ratePerMinute,
  });
});

app.post('/api/usage/record', auth.requireApiAuth, (req, res) => {
  const { feature, durationSeconds } = req.body || {};
  if (!PRODUCTS[feature]) {
    return res.status(400).json({ error: `feature must be one of: ${Object.keys(PRODUCTS).join(', ')}` });
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return res.status(400).json({ error: 'durationSeconds must be a positive number' });
  }
  try {
    const result = credits.recordUsage(feature, durationSeconds);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof credits.InsufficientCreditsError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Folklore listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
