require('dotenv').config();
const mongoose = require('mongoose');
const User    = require('./models/User');
const Listing = require('./models/Listing');
const Message = require('./models/Message');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
  await User.deleteMany({});
  await Listing.deleteMany({});
  await Message.deleteMany({});
  console.log('🗑️  Cleared all existing data');

  await User.create({ name:'Admin', email:'admin@petconnect.com', password:'admin123', role:'admin', phone:'+91 98765 00000', city:'Hyderabad', state:'Telangana' });
  await User.create({ name:'Ravi Kumar', email:'ravi@example.com', password:'ravi123', phone:'+91 98765 11111', city:'Hyderabad', state:'Telangana' });
  await User.create({ name:'Priya Singh', email:'priya@example.com', password:'priya123', phone:'+91 98765 22222', city:'Mumbai', state:'Maharashtra' });

  console.log('👥 Created 3 accounts. No ads pre-loaded — post your own!');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Admin:  admin@petconnect.com / admin123');
  console.log('   User 1: ravi@example.com     / ravi123');
  console.log('   User 2: priya@example.com    / priya123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  await mongoose.disconnect();
}
seed().catch(e => { console.error(e); process.exit(1); });
