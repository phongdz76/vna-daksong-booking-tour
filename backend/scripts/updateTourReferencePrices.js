import 'dotenv/config';
import mongoose from 'mongoose';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import Tour from '../models/Tour.js';

const args = process.argv.slice(2);
try {
  if (args.some(arg => arg !== '--apply')) throw new Error('Chỉ hỗ trợ tham số --apply.');
  const samples = JSON.parse(await readFile(new URL('../../frontend/src/data/sampleTours.json', import.meta.url), 'utf8')).filter(item => item.mode === 'create');
  if (samples.length !== 2) throw new Error('Cần đúng hai tour nguồn.');
  if (!process.env.MONGO_URI) throw new Error('Chưa cấu hình MONGO_URI.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const plans = [];
  for (const sample of samples) {
    const existing = await Tour.findOne({ slug: sample.slug });
    if (!existing || existing.name !== sample.name) throw new Error(`Tour không khớp: ${sample.slug}`);
    const changes = { referencePrice: sample.referencePrice, referencePriceNote: sample.referencePriceNote };
    await new Tour({ ...existing.toObject(), ...changes }).validate();
    plans.push({ existing, changes, same: existing.referencePrice === changes.referencePrice && existing.referencePriceNote === changes.referencePriceNote });
  }
  console.log(JSON.stringify(plans.map(({ existing, changes, same }) => ({ name: existing.name, price: changes.referencePrice, changed: !same })), null, 2));
  if (args.includes('--apply')) {
    const changed = plans.filter(plan => !plan.same);
    const output = new URL('../../tmp/tour-content/', import.meta.url);
    await mkdir(output, { recursive: true });
    await writeFile(new URL(`price-backup-${Date.now()}.json`, output), JSON.stringify(changed.map(plan => plan.existing.toObject()), null, 2));
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const { existing, changes } of changed) {
          const result = await Tour.updateOne({ _id: existing._id, updatedAt: existing.updatedAt, __v: existing.__v }, { $set: changes, $inc: { __v: 1 } }, { session, runValidators: true });
          if (result.matchedCount !== 1) throw new Error(`Tour vừa thay đổi: ${existing.slug}`);
        }
      });
    } finally { await session.endSession(); }
    console.log(`Đã cập nhật giá tham khảo cho ${changed.length} tour. Giá đặt theo Departure không đổi.`);
  } else console.log('Chỉ kiểm tra, chưa ghi. Thêm --apply để áp dụng.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
