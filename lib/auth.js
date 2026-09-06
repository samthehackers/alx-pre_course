const { DEMO_ACCOUNT } = require('./config');

function attemptLogin(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return (
    normalizedEmail === DEMO_ACCOUNT.email.toLowerCase() && password === DEMO_ACCOUNT.password
  );
}

function login(req) {
  req.session.authenticated = true;
  req.session.user = { name: DEMO_ACCOUNT.name, email: DEMO_ACCOUNT.email };
}

function logout(req, callback) {
  req.session.destroy(callback);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    res.locals.user = req.session.user;
    return next();
  }
  return res.redirect(`/signin?next=${encodeURIComponent(req.originalUrl)}`);
}

function requireApiAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    res.locals.user = req.session.user;
    return next();
  }
  return res.status(401).json({ error: 'Not signed in.' });
}

function attachUser(req, res, next) {
  res.locals.isAuthenticated = Boolean(req.session && req.session.authenticated);
  res.locals.user = (req.session && req.session.user) || null;
  next();
}

module.exports = {
  DEMO_ACCOUNT,
  attemptLogin,
  login,
  logout,
  requireAuth,
  requireApiAuth,
  attachUser,
};
