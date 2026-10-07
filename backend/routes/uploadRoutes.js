import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

router.post('/', protect, adminOnly, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn ảnh để upload.', code: 'NO_FILE_PROVIDED' });
    }

    // Upload to Cloudinary using a stream from memory
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'vna-daksong',
      resource_type: 'auto',
    });

    res.status(200).json({
      message: 'Upload thành công',
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
