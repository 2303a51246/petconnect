const Message = require('../models/Message');
const Listing  = require('../models/Listing');
const User     = require('../models/User');

exports.inbox = async (req, res) => {
  try {
    const me = req.session.userId;
    const msgs = await Message.find({ $or:[{ sender:me },{ receiver:me }] })
      .populate('sender','name')
      .populate('receiver','name')
      .populate('listing','title images status')
      .sort({ createdAt:-1 }).lean();

    const map = new Map();
    msgs.forEach(m => {
      if (!m.listing) return;
      const other = m.sender._id.toString()===me.toString() ? m.receiver : m.sender;
      const key   = `${m.listing._id}||${other._id}`;
      if (!map.has(key)) map.set(key, { msg:m, other, unread:0 });
      if (!m.read && m.receiver._id.toString()===me.toString()) map.get(key).unread++;
    });

    const convs = Array.from(map.values());
    const totalUnread = await Message.countDocuments({ receiver:me, read:false });
    res.render('chat/inbox', { title:'Messages', convs, totalUnread });
  } catch(e) { console.error(e); req.flash('error','Failed.'); res.redirect('/'); }
};

exports.conversation = async (req, res) => {
  try {
    const me   = req.session.userId.toString();
    const { lid, uid } = req.params;
    const listing   = await Listing.findById(lid).lean();
    const otherUser = await User.findById(uid).select('name city createdAt').lean();
    if (!listing||!otherUser) { req.flash('error','Not found.'); return res.redirect('/chat'); }

    const messages = await Message.find({
      listing: lid,
      $or:[{ sender:me, receiver:uid },{ sender:uid, receiver:me }]
    }).sort({ createdAt:1 }).lean();

    await Message.updateMany({ listing:lid, sender:uid, receiver:me, read:false }, { read:true });
    res.render('chat/conversation', { title:'Chat', listing, otherUser, messages, me });
  } catch(e) { req.flash('error','Failed.'); res.redirect('/chat'); }
};

exports.send = async (req, res) => {
  try {
    const { lid, uid } = req.params;
    const text = (req.body.text||'').trim();
    if (!text) return res.redirect(`/chat/${lid}/${uid}`);
    await Message.create({ listing:lid, sender:req.session.userId, receiver:uid, text });
    res.redirect(`/chat/${lid}/${uid}`);
  } catch(e) { req.flash('error','Send failed.'); res.redirect('/chat'); }
};

// First contact from listing detail page
exports.startChat = async (req, res) => {
  try {
    const { listingId, sellerId, text } = req.body;
    const msg = (text||'').trim();
    if (!msg) { req.flash('error','Please enter a message.'); return res.redirect(`/pets/${listingId}`); }
    await Message.create({ listing:listingId, sender:req.session.userId, receiver:sellerId, text:msg });
    req.flash('success','Message sent to seller!');
    res.redirect(`/chat/${listingId}/${sellerId}`);
  } catch(e) { req.flash('error','Failed.'); res.redirect('back'); }
};
