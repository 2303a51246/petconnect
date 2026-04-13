const User    = require('../models/User');
const Listing = require('../models/Listing');
const Message = require('../models/Message');

exports.getAccount = async (req, res) => {
  try {
    const user  = await User.findById(req.session.userId).select('-password').lean();
    const adCnt = await Listing.countDocuments({ seller:req.session.userId });
    const msgCnt= await Message.countDocuments({ receiver:req.session.userId, read:false });
    res.render('user/account', { title:'My Account', user, adCnt, msgCnt });
  } catch(e) { req.flash('error','Failed.'); res.redirect('/'); }
};

exports.updateAccount = async (req, res) => {
  try {
    const { name, phone, city, state } = req.body;
    await User.findByIdAndUpdate(req.session.userId, { name:name.trim(), phone, city, state });
    req.flash('success','Profile updated!');
    res.redirect('/account');
  } catch(e) { req.flash('error','Update failed.'); res.redirect('/account'); }
};

exports.changePassword = async (req, res) => {
  try {
    const { current, newpwd, confirm } = req.body;
    if (newpwd !== confirm) { req.flash('error','Passwords do not match.'); return res.redirect('/account'); }
    if (newpwd.length < 6) { req.flash('error','Min 6 characters.'); return res.redirect('/account'); }
    const user = await User.findById(req.session.userId);
    if (!(await user.matchPassword(current))) { req.flash('error','Current password is wrong.'); return res.redirect('/account'); }
    user.password = newpwd;
    await user.save();
    req.flash('success','Password changed!');
    res.redirect('/account');
  } catch(e) { req.flash('error','Failed.'); res.redirect('/account'); }
};

// Admin
exports.adminDash = async (req, res) => {
  try {
    const totalUsers    = await User.countDocuments();
    const totalListings = await Listing.countDocuments();
    const active        = await Listing.countDocuments({ status:'Active' });
    const recentAds     = await Listing.find().populate('seller','name email').sort({ createdAt:-1 }).limit(10).lean();
    const recentUsers   = await User.find().select('-password').sort({ createdAt:-1 }).limit(10).lean();
    const catStats      = await Listing.aggregate([{ $group:{ _id:'$category', count:{ $sum:1 } } },{ $sort:{ count:-1 } }]);
    res.render('admin/dashboard', { title:'Admin', totalUsers, totalListings, active, recentAds, recentUsers, catStats });
  } catch(e) { req.flash('error','Failed.'); res.redirect('/'); }
};

exports.adminListings = async (req, res) => {
  try {
    const listings = await Listing.find().populate('seller','name email').sort({ createdAt:-1 }).lean();
    res.render('admin/listings', { title:'All Listings', listings });
  } catch(e) { req.flash('error','Failed.'); res.redirect('/admin'); }
};

exports.adminToggleFeatured = async (req, res) => {
  try {
    const l = await Listing.findById(req.params.id);
    if (l) { l.featured = !l.featured; await l.save(); }
    req.flash('success','Updated.'); res.redirect('/admin/listings');
  } catch(e) { req.flash('error','Failed.'); res.redirect('/admin/listings'); }
};

exports.adminDeleteListing = async (req, res) => {
  try {
    const l = await Listing.findByIdAndDelete(req.params.id);
    if (l) l.images.forEach(img => { const p = require('path').join(__dirname,'../uploads',img); require('fs').existsSync(p)&&require('fs').unlinkSync(p); });
    req.flash('success','Deleted.'); res.redirect('/admin/listings');
  } catch(e) { req.flash('error','Failed.'); res.redirect('/admin/listings'); }
};

exports.adminUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt:-1 }).lean();
    for (let u of users) u.adCount = await Listing.countDocuments({ seller:u._id });
    res.render('admin/users', { title:'All Users', users });
  } catch(e) { req.flash('error','Failed.'); res.redirect('/admin'); }
};

exports.adminDeleteUser = async (req, res) => {
  try {
    if (req.params.id === req.session.userId.toString()) { req.flash('error',"Can't delete yourself."); return res.redirect('/admin/users'); }
    await User.findByIdAndDelete(req.params.id);
    await Listing.deleteMany({ seller:req.params.id });
    req.flash('success','User deleted.'); res.redirect('/admin/users');
  } catch(e) { req.flash('error','Failed.'); res.redirect('/admin/users'); }
};
