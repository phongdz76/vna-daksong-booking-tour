// Only the notification feature. Uses a disposable MongoDB database, never the application database.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Article from "../models/Article.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import NotificationRead from "../models/NotificationRead.js";
import notificationRoutes from "../routes/notificationRoutes.js";
import articleRoutes from "../routes/articleRoutes.js";
import { errorHandler } from "../middlewares/errorMiddleware.js";

dotenv.config({ quiet: true });
const databaseName = "vna_notif_test_" + randomBytes(8).toString("hex");
const secret = "notification-test-" + randomBytes(32).toString("hex");
process.env.JWT_SECRET = secret;
const checks = [];
let server;
let dropped = false;
const run = async (name, fn) => { await fn(); checks.push(name); console.log("PASS " + name); };
try {
  await mongoose.connect(process.env.MONGO_URI, { dbName: databaseName, serverSelectionTimeoutMS: 15000 });
  await Promise.all([User, Article, Booking, NotificationRead].map(model => model.init()));
  const [owner, other, admin] = await User.create([{ name: "Notification owner" }, { name: "Other owner" }, { name: "Test admin", role: "admin" }]);
  const token = user => jwt.sign({}, secret, { subject: String(user._id), issuer: "vna-daksong-api", audience: "session", expiresIn: "10m" });
  const app = express();
  app.use(express.json());
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/articles", articleRoutes);
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const root = `http://127.0.0.1:${server.address().port}/api`;
  async function http(method, path, user, body) {
    const response = await fetch(root + path, { method, headers: { "Content-Type": "application/json", ...(user ? { Authorization: "Bearer " + token(user) } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json(), headers: response.headers };
  }
  async function feed(user, query = "") { const response = await http("GET", "/notifications" + query, user); assert.equal(response.status, 200); return response.data; }
  const oldDate = new Date(Date.now() - 60000);
  const source = { title: "Notification test source", url: "https://example.com/test", checkedAt: oldDate };
  const article = extra => ({ title: "New published article", slug: "article-" + randomBytes(6).toString("hex"), summary: "Public summary", content: "Plain article content", category: "travel_tips", sources: [source], ...extra });
  const [published, draft] = await Article.create([article({ status: "published", publishedAt: oldDate }), article({ status: "draft" }), article({ status: "archived" })]);
  function booking(user, code, statuses, paymentStatus = "unpaid") {
    return Booking.create({ code, userId: user._id, tourId: new mongoose.Types.ObjectId(), departureId: new mongoose.Types.ObjectId(), adults: 1, children: 0,
      contact: { name: "PRIVATE CONTACT", phone: "0900123456" }, note: "PRIVATE CUSTOMER NOTE", status: paymentStatus === "refunded" ? "cancelled" : "confirmed", paymentStatus,
      snapshot: { tourName: code + " test tour", departureAt: new Date(Date.now() + 86400000), meetingPoint: "Test meeting point", adultPrice: 350000, subTotal: 350000, total: 350000, cancellationPolicy: "Test policy" },
      idempotencyKey: code, requestHash: code,
      history: statuses.map((status, index) => ({ status, actorId: user._id, at: new Date(oldDate.getTime() + (index + 1) * 1000) })),
    });
  }
  const own = await booking(owner, "OWN", ["pending_confirmation", "confirmed", "payment_received", "cancelled", "refund_pending", "refunded"], "refunded");
  await booking(owner, "UNPAID", ["confirmed"]);
  const foreign = await booking(other, "FOREIGN", ["confirmed", "payment_received"], "paid");
  const ownPaymentId = `booking:${own._id}:2`;

  await run("Guests see only published articles, no booking information", async () => {
    const result = await feed(); assert.equal(result.data.length, 1); assert.equal(result.data[0].id, "article:" + published._id); assert.equal(result.data[0].type, "article");
  });
  await run("Owner sees own trip and payment history only", async () => {
    const result = await feed(owner); assert.equal(result.pagination.total, 8); assert.equal(result.unreadCount, 8); assert.ok(result.data.some(item => item.id === ownPaymentId)); assert.ok(!JSON.stringify(result).includes(String(foreign._id)));
    assert.ok(!JSON.stringify(result).includes("PRIVATE CONTACT")); assert.ok(!JSON.stringify(result).includes("PRIVATE CUSTOMER NOTE"));
  });
  await run("Other account cannot see the owner's notifications", async () => {
    const result = await feed(other); assert.equal(result.pagination.total, 3); assert.ok(!JSON.stringify(result).includes(String(own._id)));
  });
  await run("Payment filter keeps the global unread count and never treats confirmed/unpaid as paid", async () => {
    const result = await feed(owner, "?type=payment"); assert.equal(result.data.length, 3); assert.equal(result.unreadCount, 8); assert.ok(result.data.every(item => item.type === "payment" && !item.message.includes("UNPAID")));
  });
  await run("Pagination is stable with no duplicate events", async () => {
    const first = await feed(owner, "?limit=2&page=1"), second = await feed(owner, "?limit=2&page=2"); assert.equal(first.data.length, 2); assert.equal(first.pagination.pages, 4); assert.ok(!second.data.some(item => first.data.some(old => old.id === item.id)));
  });
  await run("Invalid filters return 400", async () => {
    for (const query of ["?limit=101", "?page=0", "?type=unknown"]) assert.equal((await http("GET", "/notifications" + query, owner)).status, 400);
  });
  await run("Read writes require authentication", async () => {
    assert.equal((await http("PATCH", `/notifications/${ownPaymentId}/read`)).status, 401); assert.equal((await http("PATCH", "/notifications/read-all")).status, 401);
  });
  await run("Cannot mark another customer's event or a draft article as read", async () => {
    assert.equal((await http("PATCH", `/notifications/booking:${foreign._id}:1/read`, owner)).status, 404);
    assert.equal((await http("PATCH", `/notifications/article:${draft._id}/read`, owner)).status, 404);
    assert.equal((await http("PATCH", "/notifications/not-an-id/read", owner)).status, 404);
  });
  await run("Read status persists and reduces unread count", async () => {
    assert.equal((await http("PATCH", `/notifications/${ownPaymentId}/read`, owner)).status, 200);
    const result = await feed(owner); assert.equal(result.unreadCount, 7); assert.ok(result.data.find(item => item.id === ownPaymentId).readAt);
  });
  await run("Repeated and concurrent read requests are idempotent", async () => {
    const responses = await Promise.all(Array.from({ length: 3 }, () => http("PATCH", `/notifications/${ownPaymentId}/read`, owner)));
    assert.ok(responses.every(response => response.status === 200)); assert.equal(await NotificationRead.countDocuments({ userId: owner._id, notificationId: ownPaymentId }), 1); assert.equal((await feed(owner)).unreadCount, 7);
  });
  await run("An article read by another user stays unread for the owner", async () => {
    await http("PATCH", `/notifications/article:${published._id}/read`, other); assert.equal((await feed(owner)).data.find(item => item.type === "article").readAt, null);
  });
  await run("Read all affects only the current account", async () => {
    assert.equal((await http("PATCH", "/notifications/read-all", owner)).status, 200); assert.equal((await feed(owner)).unreadCount, 0); assert.ok((await feed(other)).unreadCount > 0);
  });
  await run("Publishing a draft creates a new unread article after read-all", async () => {
    await new Promise(resolve => setTimeout(resolve, 5));
    const response = await http("PATCH", "/articles/" + draft._id, admin, { status: "published" }); assert.equal(response.status, 200); assert.ok(response.data.publishedAt);
    const result = await feed(owner); assert.equal(result.unreadCount, 1); assert.equal(result.data[0].id, "article:" + draft._id); assert.equal(result.data[0].readAt, null);
  });
  await run("Editing a published article does not resend the same notification", async () => {
    await http("PATCH", `/notifications/article:${draft._id}/read`, owner);
    await http("PATCH", "/articles/" + draft._id, admin, { title: "Updated article title" }); assert.equal((await feed(owner)).unreadCount, 0);
  });
  await run("Newly created published articles have a publication timestamp", async () => {
    const response = await http("POST", "/articles", admin, article({ status: "published" })); assert.equal(response.status, 201); assert.ok(response.data.publishedAt); assert.equal((await feed(owner)).unreadCount, 1);
  });
  await run("Notification responses cannot be shared through an HTTP cache", async () => {
    assert.equal((await http("GET", "/notifications", owner)).headers.get("cache-control"), "private, no-store");
  });
  console.log(`${checks.length} notification checks passed.`);
} catch (error) {
  console.error(error.name === "MongooseServerSelectionError" ? "MongoDB test connection unavailable." : error.stack);
  process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1 && mongoose.connection.db.databaseName === databaseName) { await mongoose.connection.dropDatabase(); dropped = true; }
  await mongoose.disconnect();
  const output = new URL("../test-results/", import.meta.url);
  await mkdir(output, { recursive: true });
  await writeFile(new URL("notifications-results.json", output), JSON.stringify({ passed: checks.length, success: !process.exitCode, testDatabaseDropped: dropped, checks }, null, 2));
}
