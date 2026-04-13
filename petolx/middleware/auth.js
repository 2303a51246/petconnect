const User = require('../models/User');

const loadUser = async (req, res, next) => {
  res.locals.currentUser = null;
  res.locals.isAdmin = false;
  if (req.session && req.session.userId) {
    try {
      const u = await User.findById(req.session.userId).select('-password');
      if (u) { res.locals.currentUser = u; res.locals.isAdmin = u.role === 'admin'; }
    } catch(e) {}
  }
  next();
};

const isAuth = (req, res, next) => {
  if (req.session && req.session.userId) return next();
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please login to continue.');
  res.redirect('/login');
};

const isAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') return next();
  req.flash('error', 'Admin access only.');
  res.redirect('/');
};

const noAuth = (req, res, next) => {
  if (req.session && req.session.userId) return res.redirect('/');
  next();
};

module.exports = { loadUser, isAuth, isAdmin, noAuth };
