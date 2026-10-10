import "dotenv/config";
import mongoose from "mongoose";
import { mkdir, writeFile } from "node:fs/promises";
import Article from "../models/Article.js";
import Destination from "../models/Destination.js";
import { cleanPortalText } from "../utils/portalContent.js";

const args = process.argv.slice(2);
try {
  if (args.some(arg => arg !== "--apply")) throw new Error("Chỉ hỗ trợ --apply.");
  if (!process.env.MONGO_URI) throw new Error("Thiếu MONGO_URI.");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const plans = [];
  for (const [Model, field] of [[Article, "content"], [Destination, "description"]]) {
    const documents = await Model.find({ slug: /^vna-portal-/ });
    for (const document of documents) {
      const text = cleanPortalText(document[field]);
      if (text === document[field]) continue;
      await new Model({ ...document.toObject(), [field]: text }).validate();
      plans.push({ Model, document, field, text });
    }
  }
  console.log("Bài cần sửa chú thích:", plans.map(plan => plan.document.slug));
  if (args.includes("--apply")) {
    const outputDir = new URL("../../tmp/portal-caption-repair/", import.meta.url);
    await mkdir(outputDir, { recursive: true });
    await writeFile(new URL(`backup-${Date.now()}.json`, outputDir), JSON.stringify(plans.map(plan => plan.document.toObject()), null, 2));
    for (const { Model, document, field, text } of plans) {
      const result = await Model.updateOne({ _id: document._id, updatedAt: document.updatedAt }, { $set: { [field]: text }, $inc: { __v: 1 } }, { runValidators: true });
      if (result.matchedCount !== 1) throw new Error("Bài vừa thay đổi ở nơi khác; dừng sửa.");
    }
    console.log(`Đã sửa ${plans.length} bản ghi, giữ nguyên ID và ảnh.`);
  } else console.log("Chưa ghi database. Thêm --apply để sửa các bản ghi trên.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
