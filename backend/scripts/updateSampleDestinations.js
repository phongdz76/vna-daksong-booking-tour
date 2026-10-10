import "dotenv/config";
import mongoose from "mongoose";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import Destination from "../models/Destination.js";

const slugs = ["thac-luu-ly", "thien-vien-truc-lam-dao-nguyen", "doi-dien-gio-dak-song"];
const args = process.argv.slice(2);
try {
  if (args.some(arg => arg !== "--apply")) throw new Error("Chỉ hỗ trợ tham số --apply.");
  const samples = JSON.parse(await readFile(new URL("../../frontend/src/data/sampleDestinations.json", import.meta.url), "utf8"));
  if (!process.env.MONGO_URI) throw new Error("Chưa cấu hình MONGO_URI trong backend/.env.");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const plans = [];
  for (const slug of slugs) {
    const sample = samples.find(item => item.slug === slug);
    if (!sample || sample.description.length < 1500 || !sample.sources.length) throw new Error(`Thiếu nội dung đầy đủ hoặc nguồn: ${slug}`);
    const existing = await Destination.findOne({ slug, name: sample.name });
    if (!existing) throw new Error(`Không tìm thấy điểm đến mẫu: ${slug}`);
    const changes = { summary: sample.summary, description: sample.description, sources: sample.sources };
    await new Destination({ ...existing.toObject(), ...changes }).validate();
    const same = existing.summary === sample.summary && existing.description === sample.description &&
      JSON.stringify(existing.sources.map(source => ({ title: source.title, url: source.url }))) ===
      JSON.stringify(sample.sources.map(source => ({ title: source.title, url: source.url })));
    plans.push({ existing, changes, same });
  }
  console.log(JSON.stringify(plans.map(({ existing, changes, same }) => ({ name: existing.name, oldLength: existing.description.length, newLength: changes.description.length, changed: !same })), null, 2));
  if (args.includes("--apply")) {
    const changed = plans.filter(plan => !plan.same);
    const outputDir = new URL("../../tmp/sample-destinations/", import.meta.url);
    await mkdir(outputDir, { recursive: true });
    await writeFile(new URL(`backup-${Date.now()}.json`, outputDir), JSON.stringify(changed.map(plan => plan.existing.toObject()), null, 2));
    for (const { existing, changes } of changed) {
      const result = await Destination.updateOne({ _id: existing._id, updatedAt: existing.updatedAt }, { $set: changes, $inc: { __v: 1 } }, { runValidators: true });
      if (result.matchedCount !== 1) throw new Error(`Điểm đến vừa được sửa ở nơi khác, dừng cập nhật: ${existing.slug}`);
    }
    console.log(`Đã cập nhật ${changed.length} điểm đến mẫu, giữ nguyên ID, tên, ảnh và địa chỉ.`);
  } else console.log("Chỉ kiểm tra, chưa ghi database. Thêm --apply để cập nhật ba điểm đến mẫu.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
