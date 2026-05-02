const path = require('path');

const PDF_AND_IMAGE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const isPdfOrImage = (file) => {
  if (!file) {
    return false;
  }

  if (PDF_AND_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    return true;
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  return ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension);
};

const buildStoredFile = (file) => {
  if (!file) {
    return null;
  }

  const safeName = (file.originalname || 'upload').replace(/[^a-zA-Z0-9._-]/g, '-');

  return {
    fileUrl: `/uploads/${Date.now()}-${safeName}`,
    fileName: file.originalname || safeName,
    fileType: file.mimetype || '',
    fileSize: file.size || 0,
  };
};

module.exports = {
  buildStoredFile,
  isPdfOrImage,
};
