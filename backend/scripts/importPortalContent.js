import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mongoose from "mongoose";
import Article from "../models/Article.js";
import Destination from "../models/Destination.js";
import { fetchPortalContent, isPortalDuplicate, PORTAL_URL } from "../utils/portalContent.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const outputDir = path.join(root, "tmp", "portal-import");
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const snapshotIndex = args.indexOf("--from-snapshot");
const allowedArgs = new Set(["--apply", "--from-snapshot"]);

try {
  for (let index = 0; index < args.length; index++) {
    if (!allowedArgs.has(args[index])) throw new Error(`Tham số không hợp lệ: ${args[index]}`);
    if (args[index] === "--from-snapshot" && !args[++index]) throw new Error("Thiếu đường dẫn snapshot.");
  }
  const snapshot = snapshotIndex >= 0
    ? JSON.parse(await readFile(path.resolve(args[snapshotIndex + 1]), "utf8"))
    : await fetchPortalContent({ onProgress: console.log });
  if (snapshot.source !== PORTAL_URL || !Array.isArray(snapshot.entries) || !Array.isArray(snapshot.separateTours)) throw new Error("Snapshot không hợp lệ.");
  // Validate the complete batch before making any database change.
  const plans = [];
  for (const entry of snapshot.entries) {
    if (!["destinations", "articles"].includes(entry.resource) || entry.value?.slug !== `vna-portal-${entry.sourceId.toLowerCase()}`) throw new Error("Bản ghi nhập không hợp lệ.");
    const Model = entry.resource === "destinations" ? Destination : Article;
    const document = new Model(entry.value);
    await document.validate();
    plans.push({ entry, Model, document });
  }
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "content-snapshot.json"), JSON.stringify(snapshot, null, 2));
  await writeFile(path.join(outputDir, "tours-separate.json"), JSON.stringify(snapshot.separateTours, null, 2));
  const planned = {
    destinations: plans.filter(plan => plan.entry.resource === "destinations").length,
    articles: plans.filter(plan => plan.entry.resource === "articles").length,
    separateTours: snapshot.separateTours.length,
  };
  console.log("Nội dung đã kiểm tra:", planned);
  console.log("Hai bài tour được để riêng tại tmp/portal-import/tours-separate.json.");
  if (apply) {
    if (!process.env.MONGO_URI) throw new Error("Chưa cấu hình MONGO_URI trong backend/.env.");
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    const existing = {
      destinations: await Destination.find({}).select("name slug sources").lean(),
      articles: await Article.find({}).select("title slug sources").lean(),
    };
    const summary = { created: { destinations: 0, articles: 0 }, skipped: { destinations: 0, articles: 0 } };
    for (const { entry, Model, document } of plans) {
      const duplicate = isPortalDuplicate(entry.resource, entry.value, existing[entry.resource]);
      if (duplicate) { summary.skipped[entry.resource]++; continue; }
      try {
        await document.save();
        existing[entry.resource].push(document.toObject());
        summary.created[entry.resource]++;
      } catch (error) {
        if (error.code === 11000) summary.skipped[entry.resource]++;
        else throw error;
      }
    }
    await writeFile(path.join(outputDir, "import-result.json"), JSON.stringify(summary, null, 2));
    console.log("Kết quả nhập:", summary);
  } else {
    console.log("Chưa ghi database. Chạy lại với --apply để nhập; bản ghi trùng và chỉnh sửa có sẵn được giữ nguyên.");
  }
} catch (error) {
  console.error("Không hoàn tất nhập nội dung:", error.name === "ValidationError" ? "Bản ghi không đạt schema; chưa nhập toàn bộ lô." : error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
