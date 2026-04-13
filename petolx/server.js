require('dotenv').config();
const express      = require('express');
const session      = require('express-session');
const MongoStore   = require('connect-mongo');
const flash        = require('connect-flash');
const methodOverride = require('method-override');
const path         = require('path');
const connectDB    = require('./config/db');
const { loadUser } = require('./middleware/auth');

const app = express();
connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'petolx_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, ttl: 24*60*60 }),
  cookie: { maxAge: 24*60*60*1000 }
}));

app.use(flash());
app.use(loadUser);
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  res.locals.path    = req.path;
  next();
});

app.use('/', require('./routes/index'));

app.use((req, res) => res.status(404).render('404', { title:'404 — Page Not Found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  req.flash('error', err.message || 'Something went wrong!');
  res.redirect('back');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🐾 PetConnect → http://localhost:${PORT}`));
