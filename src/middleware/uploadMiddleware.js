const multer = require('multer');

// Use memory storage for ImageKit uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = { upload };
