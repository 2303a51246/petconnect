const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true, maxlength: 100 },
  description:  { type: String, required: true, maxlength: 2000 },
  price:        { type: Number, required: true, min: 0, default: 0 },
  priceType:    { type: String, enum: ['Fixed','Negotiable','Free'], default: 'Fixed' },
  listingType:  { type: String, enum: ['Sell','Adopt'], default: 'Sell' },
  category:     { type: String, required: true, enum: ['Dog','Cat','Bird','Fish','Rabbit','Hamster','Reptile','Horse','Other'] },
  breed:        { type: String, required: true, trim: true },
  age:          { type: Number, required: true, min: 0 },
  ageUnit:      { type: String, enum: ['Days','Weeks','Months','Years'], default: 'Months' },
  gender:       { type: String, enum: ['Male','Female','Unknown'], default: 'Unknown' },
  color:        { type: String, default: '' },
  vaccinated:   { type: Boolean, default: false },
  dewormed:     { type: Boolean, default: false },
  pedigree:     { type: Boolean, default: false },
  images:       [{ type: String }],
  city:         { type: String, required: true },
  state:        { type: String, required: true },
  seller:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:       { type: String, enum: ['Active','Sold','Adopted'], default: 'Active' },
  featured:     { type: Boolean, default: false },
  views:        { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});
listingSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

module.exports = mongoose.model('Listing', listingSchema);
