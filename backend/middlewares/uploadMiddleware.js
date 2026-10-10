import multer from 'multer';

// Setup multer storage (using memory storage to buffer files before uploading to cloudinary directly)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.mimetype)) {
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
    files: 1,
    fields: 0,
  },
  fileFilter,
});

export function matchesImageSignature(file) {
  const bytes = file?.buffer;
  if (!Buffer.isBuffer(bytes) || bytes.length < 12) return false;
  switch (file.mimetype) {
    case 'image/png': return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case 'image/jpeg': return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    case 'image/gif': return ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6));
    case 'image/webp': return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    case 'image/avif': return bytes.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(bytes.toString('ascii', 8, 12));
    default: return false;
  }
}
