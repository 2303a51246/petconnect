const multer = require('multer');
const path = require('path');
const fs = require('fs');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, 'pet-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname))
});
const fileFilter = (req, file, cb) =>
  /image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype) ? cb(null, true) : cb(new Error('Images only!'), false);

module.exports = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
