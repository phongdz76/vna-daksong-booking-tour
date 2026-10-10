import 'dotenv/config';
import mongoose from 'mongoose';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import Tour from '../models/Tour.js';
import Destination from '../models/Destination.js';
import { buildTourContent, sameTourContent } from '../utils/tourContent.js';

const args = process.argv.slice(2);
try {
  if (args.some(arg => arg !== '--apply')) throw new Error('Chỉ hỗ trợ tham số --apply.');
  const samples = JSON.parse(await readFile(new URL('../../frontend/src/data/sampleTours.json', import.meta.url), 'utf8'));
  if (samples.length !== 6 || new Set(samples.map(item => item.slug)).size !== 6) throw new Error('Cần đúng 6 tour riêng biệt.');
  if (!process.env.MONGO_URI) throw new Error('Chưa cấu hình MONGO_URI trong backend/.env.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const destinations = await Destination.find().lean();
  const plans = [];
  for (const sample of samples) {
    const existing = await Tour.findOne({ slug: sample.slug }).select('+bookingRevision');
    const changes = buildTourContent(sample, destinations, sample.mode === 'update' ? existing : null);
    if (sample.mode === 'create' && existing) {
      // A previous run already inserted this slug. Never overwrite later admin edits.
      plans.push({ action: 'skip', sample, existing });
      continue;
    }
    const validated = new Tour({ ...(existing?.toObject() || {}), ...changes });
    await validated.validate();
    const normalized = Object.fromEntries(Object.keys(changes).map(field => [field, validated.toObject()[field]]));
    plans.push({ action: existing ? (sameTourContent(existing.toObject(), normalized) ? 'skip' : 'update') : 'create', sample, existing, changes: normalized });
  }
  console.log(JSON.stringify(plans.map(({ action, sample }) => ({ action, name: sample.name, stops: sample.itinerary.length })), null, 2));
  if (args.includes('--apply')) {
    const outputDir = new URL('../../tmp/tour-content/', import.meta.url);
    await mkdir(outputDir, { recursive: true });
    await writeFile(new URL(`backup-${Date.now()}.json`, outputDir), JSON.stringify(plans.filter(plan => plan.existing).map(plan => plan.existing.toObject()), null, 2));
    const session = await mongoose.startSession();
    const applied = [];
    try {
      await session.withTransaction(async () => {
        applied.length = 0;
        for (const plan of plans.filter(item => item.action !== 'skip')) {
          if (plan.action === 'create') {
            const [created] = await Tour.create([plan.changes], { session });
            applied.push({ action: 'create', id: String(created._id), slug: created.slug });
          } else {
            const result = await Tour.updateOne({ _id: plan.existing._id, updatedAt: plan.existing.updatedAt, __v: plan.existing.__v },
              { $set: plan.changes, $inc: { __v: 1, bookingRevision: 1 } }, { runValidators: true, session });
            if (result.matchedCount !== 1) throw new Error(`Tour vừa thay đổi ở nơi khác: ${plan.sample.slug}`);
            applied.push({ action: 'update', id: String(plan.existing._id), slug: plan.sample.slug });
          }
        }
      });
    } finally { await session.endSession(); }
    await writeFile(new URL(`applied-${Date.now()}.json`, outputDir), JSON.stringify(applied, null, 2));
    console.log(`Đã chỉnh ${applied.filter(item => item.action === 'update').length} tour cũ và thêm ${applied.filter(item => item.action === 'create').length} tour mới. Giữ lịch, giá chuyến và các đơn cũ.`);
  } else console.log('Chỉ kiểm tra, chưa ghi database. Thêm --apply để áp dụng.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
