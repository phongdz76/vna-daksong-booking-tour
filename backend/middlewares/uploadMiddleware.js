import multer from 'multer';

// Setup multer storage (using memory storage to buffer files before uploading to cloudinary directly)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    const error = new Error('Chỉ chấp nhận tập tin ảnh.');
    error.status = 400;
    error.code = 'INVALID_FILE_TYPE';
    error.expose = true;
    cb(error, false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});
