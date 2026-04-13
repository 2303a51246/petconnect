const express = require('express');
const router  = express.Router();
const upload  = require('../config/multer');
const { loadUser, isAuth, isAdmin, noAuth } = require('../middleware/auth');
const auth    = require('../controllers/authController');
const list    = require('../controllers/listingController');
const chat    = require('../controllers/chatController');
const user    = require('../controllers/userController');

// ── AUTH ──────────────────────────────────────────────
router.get('/login',            noAuth, auth.getLogin);
router.post('/login',           noAuth, auth.postLogin);
router.get('/signup',           noAuth, auth.getSignup);
router.post('/signup',          noAuth, auth.postSignup);
router.get('/forgot-password',  noAuth, auth.getForgot);
router.post('/forgot-password', noAuth, auth.postForgot);
router.get('/reset-password/:token',  auth.getReset);
router.post('/reset-password/:token', auth.postReset);
router.post('/logout', auth.logout);

// ── HOME / BROWSE ─────────────────────────────────────
router.get('/',        list.home);
router.get('/budget',  list.budget);

// ── LISTINGS ─────────────────────────────────────────
router.get('/pets/:id',       list.detail);
router.get('/post-ad',        isAuth, list.getPost);
router.post('/post-ad',       isAuth, upload.array('images',6), list.postAd);
router.get('/my-ads',         isAuth, list.myAds);
router.get('/my-ads/:id/edit',isAuth, list.getEdit);
router.post('/my-ads/:id/edit',isAuth, upload.array('images',6), list.updateAd);
router.post('/my-ads/:id/delete', isAuth, list.deleteAd);
router.post('/my-ads/:id/mark',   isAuth, list.markStatus);

// ── WISHLIST ─────────────────────────────────────────
router.post('/wishlist/:id',  isAuth, list.toggleWishlist);
router.get('/wishlist',       isAuth, list.wishlist);

// ── CHAT ─────────────────────────────────────────────
router.get('/chat',           isAuth, chat.inbox);
router.get('/chat/:lid/:uid', isAuth, chat.conversation);
router.post('/chat/:lid/:uid',isAuth, chat.send);
router.post('/chat/start',    isAuth, chat.startChat);

// ── ACCOUNT / PROFILE ────────────────────────────────
router.get('/account',         isAuth, user.getAccount);
router.post('/account',        isAuth, user.updateAccount);
router.post('/account/password',isAuth, user.changePassword);
router.get('/seller/:id',      list.sellerProfile);

// ── ADMIN ─────────────────────────────────────────────
router.get('/admin',            isAuth, isAdmin, user.adminDash);
router.get('/admin/listings',   isAuth, isAdmin, user.adminListings);
router.post('/admin/listings/:id/feature', isAuth, isAdmin, user.adminToggleFeatured);
router.post('/admin/listings/:id/delete',  isAuth, isAdmin, user.adminDeleteListing);
router.get('/admin/users',      isAuth, isAdmin, user.adminUsers);
router.post('/admin/users/:id/delete', isAuth, isAdmin, user.adminDeleteUser);

module.exports = router;
