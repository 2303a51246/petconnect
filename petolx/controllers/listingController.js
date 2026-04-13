const Listing = require('../models/Listing');
const User    = require('../models/User');
const fs      = require('fs');
const path    = require('path');

const CATS   = ['Dog','Cat','Bird','Fish','Rabbit','Hamster','Reptile','Horse','Other'];
const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Other'];
const CAT_EMOJI = { Dog:'🐕',Cat:'🐈',Bird:'🐦',Fish:'🐠',Rabbit:'🐇',Hamster:'🐹',Reptile:'🦎',Horse:'🐎',Other:'🐾' };

// HOME PAGE
exports.home = async (req, res) => {
  try {
    const { q, category, city, listingType, minPrice, maxPrice, sort, page } = req.query;
    const p = Math.max(1, parseInt(page)||1), PER = 24;
    let query = { status: 'Active' };
    if (category)    query.category    = category;
    if (listingType) query.listingType = listingType;
    if (city)        query.city        = new RegExp(city, 'i');
    if (q)           query.$or = [{ title: new RegExp(q,'i') },{ breed: new RegExp(q,'i') },{ description: new RegExp(q,'i') }];
    if (minPrice||maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = +minPrice;
      if (maxPrice) query.price.$lte = +maxPrice;
    }
    let sortOpt = { featured:-1, createdAt:-1 };
    if (sort==='price_asc')  sortOpt = { price:1 };
    if (sort==='price_desc') sortOpt = { price:-1 };
    if (sort==='newest')     sortOpt = { createdAt:-1 };

    const total    = await Listing.countDocuments(query);
    const listings = await Listing.find(query).populate('seller','name city phone').sort(sortOpt).skip((p-1)*PER).limit(PER).lean();
    const featured = await Listing.find({ status:'Active', featured:true }).populate('seller','name city').limit(6).sort({ createdAt:-1 }).lean();
    const catCounts= await Listing.aggregate([{ $match:{ status:'Active' } },{ $group:{ _id:'$category', count:{ $sum:1 } } }]);

    const catMap = {};
    catCounts.forEach(c => catMap[c._id] = c.count);

    res.render('listings/home', {
      title:'PetOLX — Buy, Sell & Adopt Pets',
      listings, featured, catMap, CATS, CAT_EMOJI, STATES,
      filters:{ q, category, city, listingType, minPrice, maxPrice, sort },
      pagination:{ current:p, total:Math.ceil(total/PER), count:total }
    });
  } catch(e) {
    console.error(e);
    res.render('listings/home', { title:'PetOLX', listings:[], featured:[], catMap:{}, CATS, CAT_EMOJI, STATES, filters:{}, pagination:{ current:1, total:1, count:0 } });
  }
};

// GET /pets/:id
exports.detail = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('seller','name city state phone createdAt').lean();
    if (!listing) { req.flash('error','Listing not found.'); return res.redirect('/'); }
    Listing.findByIdAndUpdate(req.params.id, { $inc:{ views:1 } }).exec();

    const similar = await Listing.find({ category:listing.category, status:'Active', _id:{ $ne:listing._id } }).populate('seller','name city').limit(6).lean();
    const sellerMore = await Listing.find({ seller:listing.seller._id, status:'Active', _id:{ $ne:listing._id } }).limit(4).lean();

    let inWishlist = false;
    const isOwner = req.session.userId && listing.seller._id.toString() === req.session.userId.toString();
    if (req.session.userId && !isOwner) {
      const u = await User.findById(req.session.userId).select('wishlist');
      inWishlist = u && u.wishlist.map(x=>x.toString()).includes(listing._id.toString());
    }
    res.render('listings/detail', { title:listing.title+' — PetOLX', listing, similar, sellerMore, inWishlist, isOwner, CAT_EMOJI });
  } catch(e) {
    console.error(e);
    req.flash('error','Failed to load listing.');
    res.redirect('/');
  }
};

// GET /post-ad
exports.getPost = (req, res) => res.render('listings/form', { title:'Post Your Ad', listing:null, CATS, STATES, action:'/post-ad' });

// POST /post-ad
exports.postAd = async (req, res) => {
  try {
    const { title,description,price,priceType,listingType,category,breed,age,ageUnit,gender,color,vaccinated,dewormed,pedigree,city,state } = req.body;
    const images = req.files ? req.files.map(f=>f.filename) : [];
    if (images.length===0 && !req.body.skipImg) {
      req.flash('error','Please upload at least one photo.');
      return res.redirect('/post-ad');
    }
    await Listing.create({
      title, description,
      price: priceType==='Free' ? 0 : (parseFloat(price)||0),
      priceType, listingType, category, breed,
      age: parseFloat(age)||0, ageUnit, gender, color,
      vaccinated: vaccinated==='on',
      dewormed:   dewormed==='on',
      pedigree:   pedigree==='on',
      images, city, state,
      seller: req.session.userId
    });
    req.flash('success','🎉 Your ad is live! Buyers can now see it.');
    res.redirect('/my-ads');
  } catch(e) {
    req.flash('error','Post failed: '+e.message);
    res.redirect('/post-ad');
  }
};

// GET /my-ads/:id/edit
exports.getEdit = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id:req.params.id, seller:req.session.userId }).lean();
    if (!listing) { req.flash('error','Not found or not authorized.'); return res.redirect('/my-ads'); }
    res.render('listings/form', { title:'Edit Ad', listing, CATS, STATES, action:`/my-ads/${listing._id}/edit` });
  } catch(e) { req.flash('error','Error.'); res.redirect('/my-ads'); }
};

// POST /my-ads/:id/edit
exports.updateAd = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id:req.params.id, seller:req.session.userId });
    if (!listing) { req.flash('error','Not authorized.'); return res.redirect('/my-ads'); }
    const { title,description,price,priceType,listingType,category,breed,age,ageUnit,gender,color,vaccinated,dewormed,pedigree,city,state,status,removeImages } = req.body;

    let images = [...listing.images];
    if (removeImages) {
      const toRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
      toRemove.forEach(img => {
        const p = path.join(__dirname,'../uploads',img);
        if (fs.existsSync(p)) fs.unlinkSync(p);
        images = images.filter(i=>i!==img);
      });
    }
    if (req.files && req.files.length) images = [...images,...req.files.map(f=>f.filename)].slice(0,6);

    Object.assign(listing, {
      title, description,
      price: priceType==='Free' ? 0 : (parseFloat(price)||0),
      priceType, listingType, category, breed,
      age: parseFloat(age)||0, ageUnit, gender, color,
      vaccinated: vaccinated==='on',
      dewormed:   dewormed==='on',
      pedigree:   pedigree==='on',
      images, city, state, status: status||'Active'
    });
    await listing.save();
    req.flash('success','Ad updated successfully!');
    res.redirect(`/pets/${listing._id}`);
  } catch(e) { req.flash('error','Update failed: '+e.message); res.redirect('/my-ads'); }
};

// POST /my-ads/:id/delete
exports.deleteAd = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id:req.params.id, seller:req.session.userId });
    if (!listing) { req.flash('error','Not authorized.'); return res.redirect('/my-ads'); }
    listing.images.forEach(img => {
      const p = path.join(__dirname,'../uploads',img);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    await listing.deleteOne();
    req.flash('success','Ad deleted.');
    res.redirect('/my-ads');
  } catch(e) { req.flash('error','Delete failed.'); res.redirect('/my-ads'); }
};

// POST /my-ads/:id/mark
exports.markStatus = async (req, res) => {
  try {
    await Listing.findOneAndUpdate({ _id:req.params.id, seller:req.session.userId }, { status:req.body.status });
    req.flash('success',`Marked as ${req.body.status}.`);
    res.redirect('/my-ads');
  } catch(e) { req.flash('error','Failed.'); res.redirect('/my-ads'); }
};

// GET /my-ads
exports.myAds = async (req, res) => {
  try {
    const listings = await Listing.find({ seller:req.session.userId }).sort({ createdAt:-1 }).lean();
    const stats = {
      active:  listings.filter(l=>l.status==='Active').length,
      sold:    listings.filter(l=>['Sold','Adopted'].includes(l.status)).length,
      views:   listings.reduce((a,l)=>a+(l.views||0),0)
    };
    res.render('user/my-ads', { title:'My Ads', listings, stats, CAT_EMOJI });
  } catch(e) { req.flash('error','Failed.'); res.redirect('/'); }
};

// POST /wishlist/toggle
exports.toggleWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const id   = req.params.id;
    const idx  = user.wishlist.findIndex(x=>x.toString()===id);
    if (idx===-1) user.wishlist.push(id);
    else          user.wishlist.splice(idx,1);
    await user.save();
    res.json({ success:true, saved: idx===-1 });
  } catch(e) { res.json({ success:false }); }
};

// GET /wishlist
exports.wishlist = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate({ path:'wishlist', populate:{ path:'seller', select:'name city' } });
    res.render('user/wishlist', { title:'Wishlist', listings: user ? user.wishlist : [], CAT_EMOJI });
  } catch(e) { req.flash('error','Failed.'); res.redirect('/'); }
};

// GET /seller/:id
exports.sellerProfile = async (req, res) => {
  try {
    const seller   = await User.findById(req.params.id).select('-password').lean();
    if (!seller) { req.flash('error','Not found.'); return res.redirect('/'); }
    const listings = await Listing.find({ seller:req.params.id, status:'Active' }).sort({ createdAt:-1 }).lean();
    res.render('user/seller', { title:seller.name+"'s Ads", seller, listings, CAT_EMOJI });
  } catch(e) { req.flash('error','Failed.'); res.redirect('/'); }
};

// GET /budget  (budget filter helper page)
exports.budget = async (req, res) => {
  try {
    const ranges = [
      { label:'Free / Adoption',    min:0,     max:0,      type:'Adopt', link:'/?listingType=Adopt' },
      { label:'Under ₹5,000',       min:1,     max:4999,   type:'Sell',  link:'/?minPrice=1&maxPrice=4999' },
      { label:'₹5,000 – ₹15,000',   min:5000,  max:14999,  type:'Sell',  link:'/?minPrice=5000&maxPrice=14999' },
      { label:'₹15,000 – ₹30,000',  min:15000, max:29999,  type:'Sell',  link:'/?minPrice=15000&maxPrice=29999' },
      { label:'₹30,000 – ₹60,000',  min:30000, max:59999,  type:'Sell',  link:'/?minPrice=30000&maxPrice=59999' },
      { label:'Above ₹60,000',      min:60000, max:9999999, type:'Sell', link:'/?minPrice=60000' }
    ];
    const results = await Promise.all(ranges.map(async r => {
      let q;
      if (r.type === 'Adopt') {
        q = { status:'Active', listingType:'Adopt' };
      } else {
        q = { status:'Active', listingType:'Sell', price:{ $gte:r.min, $lte:r.max } };
      }
      const count  = await Listing.countDocuments(q);
      const sample = await Listing.find(q).sort({ createdAt:-1 }).limit(4).lean();
      return { ...r, count, sample };
    }));
    res.render('user/budget', { title:'Browse by Budget', ranges: results, CAT_EMOJI });
  } catch(e) { console.error(e); req.flash('error','Failed to load budget page.'); res.redirect('/'); }
};
