import 'dotenv/config';
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import Destination from '../models/Destination.js';

// Insert the new map catalogue only. Never update or reclassify existing places.
try {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--apply')) throw new Error('Chỉ hỗ trợ tham số --apply.');
  const places = JSON.parse(await readFile(new URL('../data/dakSongLocations.json', import.meta.url), 'utf8'));
  if (!process.env.MONGO_URI) throw new Error('Chưa cấu hình MONGO_URI trong backend/.env.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const before = await Destination.collection.find({}).sort({ _id: 1 }).toArray();
  let created = 0;
  for (const place of places) {
    const existing = before.find(item => item.slug === place.slug);
    if (existing) { console.log(`Giữ nguyên: ${existing.name}`); continue; }
    const input = { ...place, status: 'published', images: [] };
    await new Destination(input).validate();
    if (args.includes('--apply')) {
      try { await Destination.create(input); created++; }
      catch (error) { if (error.code !== 11000) throw error; }
    }
    console.log(`${args.includes('--apply') ? 'Thêm mới' : 'Sẽ thêm'}: ${place.name}`);
  }
  const after = await Destination.collection.find({ _id: { $in: before.map(place => place._id) } }).sort({ _id: 1 }).toArray();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Dữ liệu cũ đã thay đổi trong lúc chạy; cần kiểm tra.');
  console.log(`Đối chiếu ${before.length} địa điểm cũ: giữ nguyên toàn bộ.`);
  console.log(args.includes('--apply') ? `Đã thêm ${created} địa điểm mới.` : 'Chưa ghi database. Thêm --apply để tạo danh mục mới.');
} catch (error) {
  console.error(error.name === 'MongoServerSelectionError' ? 'Không kết nối được database địa điểm.' : error.message);
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
