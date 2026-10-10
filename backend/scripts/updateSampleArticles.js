import "dotenv/config";
import mongoose from "mongoose";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import Article from "../models/Article.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
try {
  if (args.some(arg => arg !== "--apply")) throw new Error("Chỉ hỗ trợ tham số --apply.");
  const samples = JSON.parse(await readFile(new URL("../../frontend/src/data/sampleArticles.json", import.meta.url), "utf8"));
  if (samples.length !== 4 || new Set(samples.map(sample => sample.slug)).size !== 4) throw new Error("Danh sách bốn bài mẫu không hợp lệ.");
  if (!process.env.MONGO_URI) throw new Error("Chưa cấu hình MONGO_URI trong backend/.env.");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const plans = [];
  for (const sample of samples) {
    const existing = await Article.findOne({ slug: sample.slug, title: sample.title });
    if (!existing) throw new Error(`Không tìm thấy bài mẫu: ${sample.slug}`);
    const changes = { summary: sample.summary, content: sample.content, sources: sample.sources };
    const candidate = new Article({ ...existing.toObject(), ...changes });
    await candidate.validate();
    if (sample.content.length < 1500 || !sample.sources.length) throw new Error(`Bài mẫu chưa có nội dung đầy đủ hoặc nguồn: ${sample.slug}`);
    const same = existing.summary === sample.summary && existing.content === sample.content &&
      JSON.stringify(existing.sources.map(source => ({ title: source.title, url: source.url }))) ===
      JSON.stringify(sample.sources.map(source => ({ title: source.title, url: source.url })));
    plans.push({ existing, changes, same });
  }
  console.log(JSON.stringify(plans.map(({ existing, changes, same }) => ({ title: existing.title, oldLength: existing.content.length, newLength: changes.content.length, changed: !same })), null, 2));
  if (apply) {
    const changed = plans.filter(plan => !plan.same);
    const outputDir = new URL("../../tmp/sample-articles/", import.meta.url);
    await mkdir(outputDir, { recursive: true });
    // Save the previous public article data before updating any record.
    await writeFile(new URL(`backup-${Date.now()}.json`, outputDir), JSON.stringify(changed.map(plan => plan.existing.toObject()), null, 2));
    for (const { existing, changes } of changed) {
      const result = await Article.updateOne({ _id: existing._id, updatedAt: existing.updatedAt }, { $set: changes, $inc: { __v: 1 } }, { runValidators: true });
      if (result.matchedCount !== 1) throw new Error(`Bài vừa được chỉnh sửa ở nơi khác, dừng cập nhật: ${existing.slug}`);
    }
    console.log(`Đã cập nhật ${changed.length} bài mẫu, giữ nguyên ID, tên, ảnh và đường dẫn.`);
  } else console.log("Chỉ kiểm tra, chưa ghi database. Thêm --apply để cập nhật đúng bốn bài mẫu.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
