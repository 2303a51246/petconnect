const User   = require('../models/User');
const crypto = require('crypto');

exports.getLogin  = (req, res) => res.render('auth/login',  { title:'Login' });
exports.getSignup = (req, res) => res.render('auth/signup', { title:'Create Account' });
exports.getForgot = (req, res) => res.render('auth/forgot', { title:'Forgot Password', resetLink: null });

exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { req.flash('error','Please fill all fields.'); return res.redirect('/login'); }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.matchPassword(password))) {
      req.flash('error','Wrong email or password.');
      return res.redirect('/login');
    }
    req.session.userId = user._id;
    req.session.role   = user.role;
    req.flash('success', `Welcome back, ${user.name}! 🐾`);
    const go = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(go);
  } catch(e) { req.flash('error','Login failed.'); res.redirect('/login'); }
};

exports.postSignup = async (req, res) => {
  try {
    const { name, email, password, confirm, phone, city, state } = req.body;
    if (!name || !email || !password) { req.flash('error','Please fill all required fields.'); return res.redirect('/signup'); }
    if (password !== confirm) { req.flash('error','Passwords do not match.'); return res.redirect('/signup'); }
    if (password.length < 6)  { req.flash('error','Password must be at least 6 characters.'); return res.redirect('/signup'); }
    if (await User.findOne({ email: email.toLowerCase() })) {
      req.flash('error','Email already registered. Please login.'); return res.redirect('/signup');
    }
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password, phone: phone||'', city: city||'', state: state||'' });
    req.session.userId = user._id;
    req.session.role   = user.role;
    req.flash('success', `Welcome to PetConnect, ${user.name}! 🐾`);
    res.redirect('/');
  } catch(e) { req.flash('error','Signup failed: '+e.message); res.redirect('/signup'); }
};

exports.postForgot = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) { req.flash('error','Please enter your email.'); return res.redirect('/forgot-password'); }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) { req.flash('error','No account found with that email.'); return res.redirect('/forgot-password'); }
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken   = token;
    user.resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();
    // In production you would email this link. Here we show it directly.
    const resetLink = `/reset-password/${token}`;
    return res.render('auth/forgot', {
      title: 'Forgot Password',
      resetLink,
      resetEmail: user.email
    });
  } catch(e) {
    console.error('Forgot password error:', e);
    req.flash('error','Something went wrong. Please try again.');
    res.redirect('/forgot-password');
  }
};

exports.getReset = async (req, res) => {
  try {
    const user = await User.findOne({ resetToken: req.params.token, resetExpires: { $gt: new Date() } });
    if (!user) { req.flash('error','Reset link is invalid or has expired. Please try again.'); return res.redirect('/forgot-password'); }
    res.render('auth/reset', { title:'Reset Password', token: req.params.token });
  } catch(e) { req.flash('error','Something went wrong.'); res.redirect('/forgot-password'); }
};

exports.postReset = async (req, res) => {
  try {
    const { password, confirm } = req.body;
    if (!password || password !== confirm) { req.flash('error','Passwords do not match.'); return res.redirect('back'); }
    if (password.length < 6) { req.flash('error','Password must be at least 6 characters.'); return res.redirect('back'); }
    const user = await User.findOne({ resetToken: req.params.token, resetExpires: { $gt: new Date() } });
    if (!user) { req.flash('error','Reset link expired. Please request a new one.'); return res.redirect('/forgot-password'); }
    user.password     = password;
    user.resetToken   = undefined;
    user.resetExpires = undefined;
    await user.save();
    req.flash('success','✅ Password reset successfully! Please login.');
    res.redirect('/login');
  } catch(e) { req.flash('error','Reset failed. Try again.'); res.redirect('/forgot-password'); }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
};
