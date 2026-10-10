import 'dotenv/config';
import mongoose from 'mongoose';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import Tour from '../models/Tour.js';
import Departure from '../models/Departure.js';

// Updates only the two new sample tours and their unpriced, upcoming open departures.
// Existing bookings keep their price and policy snapshots.
const slugs = ['gia-nghia-ta-dung-cong-chieng-luu-ly', 'ta-dung-nam-nung-dao-nguyen-luu-ly'];
const args = process.argv.slice(2);
try {
  if (args.some(arg => arg !== '--apply')) throw new Error('Chỉ hỗ trợ tham số --apply.');
  const samples = JSON.parse(await readFile(new URL('../../frontend/src/data/sampleTours.json', import.meta.url), 'utf8'))
    .filter(sample => slugs.includes(sample.slug) && sample.previewChildPrice != null);
  if (!samples.length || samples.some(sample => !sample.childPolicy.trim() || !Number.isSafeInteger(sample.previewChildPrice) || sample.previewChildPrice < 0)) {
    throw new Error('Thiếu chính sách hoặc giá trẻ em hợp lệ trong bộ mẫu.');
  }
  if (!process.env.MONGO_URI) throw new Error('Chưa cấu hình MONGO_URI.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const plans = [];
  for (const sample of samples) {
    const tour = await Tour.findOne({ slug: sample.slug }).select('+bookingRevision');
    if (!tour || tour.name !== sample.name) throw new Error(`Tour không khớp: ${sample.slug}`);
    await new Tour({ ...tour.toObject(), childPolicy: sample.childPolicy }).validate();
    const departures = await Departure.find({ tourId: tour._id, status: 'open', bookingDeadline: { $gt: new Date() }, departureAt: { $gt: new Date() } }).select('+bookingRevision');
    if (!departures.length) throw new Error(`Chưa có lịch đang mở: ${sample.slug}`);
    for (const departure of departures) {
      if (departure.adultPrice !== sample.referencePrice || (departure.childPrice != null && departure.childPrice !== sample.previewChildPrice)) {
        throw new Error(`Chuyến đã có giá riêng, hãy kiểm tra trong quản trị: ${departure._id}`);
      }
      await new Departure({ ...departure.toObject(), childPrice: sample.previewChildPrice }).validate();
    }
    plans.push({ tour, departures, sample });
  }
  console.log(JSON.stringify(plans.map(({ tour, departures, sample }) => ({ slug: tour.slug, childPrice: sample.previewChildPrice, departures: departures.length })), null, 2));
  if (args.includes('--apply')) {
    const output = new URL('../../tmp/tour-content/', import.meta.url);
    await mkdir(output, { recursive: true });
    await writeFile(new URL(`children-backup-${Date.now()}.json`, output), JSON.stringify(plans.map(({ tour, departures }) => ({ tour: tour.toObject(), departures: departures.map(item => item.toObject()) })), null, 2));
    const session = await mongoose.startSession();
    let changed = 0;
    try {
      await session.withTransaction(async () => {
        changed = 0;
        for (const { tour, departures, sample } of plans) {
          if (tour.childPolicy !== sample.childPolicy) {
            const result = await Tour.updateOne({ _id: tour._id, updatedAt: tour.updatedAt, __v: tour.__v },
              { $set: { childPolicy: sample.childPolicy }, $inc: { __v: 1, bookingRevision: 1 } }, { session, runValidators: true });
            if (result.matchedCount !== 1) throw new Error(`Tour vừa thay đổi: ${tour.slug}`);
          }
          for (const departure of departures) {
            if (departure.childPrice === sample.previewChildPrice) continue;
            const result = await Departure.updateOne({ _id: departure._id, updatedAt: departure.updatedAt, __v: departure.__v, childPrice: null },
              { $set: { childPrice: sample.previewChildPrice }, $inc: { __v: 1, bookingRevision: 1 } }, { session, runValidators: true });
            if (result.matchedCount !== 1) throw new Error(`Chuyến vừa thay đổi: ${departure._id}`);
            changed++;
          }
        }
      });
    } finally { await session.endSession(); }
    console.log(`Đã bật giá trẻ em cho ${changed} lịch mẫu. Các đơn hàng cũ giữ nguyên.`);
  } else console.log('Chỉ kiểm tra; thêm --apply để cập nhật lịch mẫu.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
