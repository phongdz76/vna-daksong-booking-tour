import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { loginWithZalo } from "../controllers/authController.js";
import { safeZaloErrorMessage } from "../utils/zaloAuthDiagnostics.js";

const accessToken = "test-identity-only-token";
const appSecret = "test-parent-zalo-app-secret";
const jwtSecret = "test-session-secret-with-at-least-32-characters";
const userId = "000000000000000000000001";
const zaloId = "999000000001";

function setup(t, { profile = { error: 0, id: zaloId }, status = 200, existing, failure, optionalProfile, profileFailure } = {}) {
  const savedEnv = { ZALO_APP_SECRET: process.env.ZALO_APP_SECRET, JWT_SECRET: process.env.JWT_SECRET };
  process.env.ZALO_APP_SECRET = appSecret;
  process.env.JWT_SECRET = jwtSecret;
  t.after(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const providerCalls = [];
  const databaseCalls = [];
  const warnings = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    providerCalls.push({ url, options });
    if (failure) throw failure;
    if (new URL(url).searchParams.get("fields") !== "id") {
      if (profileFailure) throw profileFailure;
      return new Response(JSON.stringify(optionalProfile ?? profile), { status });
    }
    return new Response(JSON.stringify(profile), { status });
  });
  t.mock.method(console, "warn", (...args) => warnings.push(args));
  t.mock.method(User, "findOneAndUpdate", async (filter, update, options) => {
    databaseCalls.push({ filter, update, options });
    const data = existing || { _id: userId, zaloId: filter.zaloId, ...update.$setOnInsert };
    Object.assign(data, update.$set);
    return { ...data, toJSON: () => ({ ...data }) };
  });
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return {
    providerCalls, databaseCalls, warnings, res,
    async login(body = { accessToken }) { await loginWithZalo({ body }, res); return res; },
  };
}

test("ID-only Zalo token signs in without profile permission and uses the parent app proof", async t => {
  const h = setup(t);
  const res = await h.login();
  assert.equal(res.statusCode, 200);
  const call = h.providerCalls[0];
  assert.equal(new URL(call.url).searchParams.get("fields"), "id");
  assert.equal(call.options.headers.access_token, accessToken);
  assert.equal(call.options.headers.appsecret_proof, createHmac("sha256", appSecret).update(accessToken).digest("hex"));
  assert.equal(res.body.user.zaloId, zaloId);
  assert.equal(res.body.user.name, "Khách Zalo");
  assert.equal(res.body.user.role, "user");
  const session = jwt.verify(res.body.token, jwtSecret, {
    algorithms: ["HS256"], issuer: "vna-daksong-api", audience: "session",
  });
  assert.equal(session.sub, userId);
  assert.equal(session.exp - session.iat, 86400);
});

test("ID-only sign-in preserves a returning user's name and avatar", async t => {
  const existing = { _id: userId, zaloId, name: "Tên đã lưu", avatar: "https://example.test/avatar.png", role: "user", active: true };
  const h = setup(t, { existing });
  const res = await h.login();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.name, existing.name);
  assert.equal(res.body.user.avatar, existing.avatar);
  assert.equal(h.databaseCalls[0].update.$set, undefined);
});

test("consented Zalo profile persists a verified name and avatar instead of client data", async t => {
  const avatar = "https://example.test/zalo-avatar.jpg";
  const h = setup(t, { optionalProfile: { error: 0, id: zaloId, name: "  Tên Zalo  ", picture: { data: { url: avatar } } } });
  const res = await h.login({ accessToken, includeProfile: true, name: "Forged name", avatar: "https://example.test/forged.jpg", role: "admin" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.name, "Tên Zalo");
  assert.equal(res.body.user.avatar, avatar);
  assert.equal(res.body.user.role, "user");
  assert.equal(h.providerCalls.length, 2);
  assert.equal(new URL(h.providerCalls[1].url).searchParams.get("fields"), "id,name,picture");
  assert.equal(h.providerCalls[1].options.headers.appsecret_proof, createHmac("sha256", appSecret).update(accessToken).digest("hex"));
  const { update } = h.databaseCalls[0];
  assert.equal(update.$setOnInsert.name, undefined);
  assert.equal(update.$setOnInsert.avatar, undefined);
});

for (const [name, optionalProfile] of [
  ["profile permission denied", { error: -1402 }],
  ["profile belongs to another identity", { error: 0, id: "999000000002", name: "Other user", picture: { data: { url: "https://example.test/other.jpg" } } }],
  ["profile success flag missing", { id: zaloId, name: "Unverified profile" }],
]) {
  test(`${name} preserves saved profile and still allows verified ID sign-in`, async t => {
    const existing = { _id: userId, zaloId, name: "Saved name", avatar: "https://example.test/saved.jpg", role: "user", active: true };
    const h = setup(t, { existing, optionalProfile });
    const res = await h.login({ accessToken, includeProfile: true });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.name, existing.name);
    assert.equal(res.body.user.avatar, existing.avatar);
    assert.equal(h.databaseCalls[0].update.$set, undefined);
  });
}

test("optional profile network failure cannot block sign-in", async t => {
  const h = setup(t, { profileFailure: new Error("provider timeout") });
  const res = await h.login({ accessToken, includeProfile: true });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.name, "Khách Zalo");
  assert.equal(res.body.user.avatar, "");
});

for (const avatar of ["javascript:alert(1)", "http://example.test/avatar.jpg", "/relative.jpg", "https://private:credential@example.test/avatar.jpg"]) {
  test(`unsafe avatar ${avatar.split(":")[0]} is not persisted`, async t => {
    const h = setup(t, { optionalProfile: { error: 0, id: zaloId, name: "Zalo name", picture: { data: { url: avatar } } } });
    const res = await h.login({ accessToken, includeProfile: true });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.name, "Zalo name");
    assert.equal(res.body.user.avatar, "");
    assert.equal(h.databaseCalls[0].update.$set.avatar, undefined);
  });
}

for (const [name, profile, status] of [
  ["invalid token", { error: -1 }, 401],
  ["provider permission rejection", { error: -1402, message: accessToken }, 200],
  ["missing ID", { error: 0 }, 200],
  ["non-numeric ID", { error: 0, id: "not-a-zalo-id" }, 200],
  ["numeric JSON ID that could lose precision", { error: 0, id: 12345 }, 200],
  ["missing success indicator", { id: zaloId }, 200],
]) {
  test(`${name} cannot create a session or update a user`, async t => {
    const h = setup(t, { profile, status });
    const res = await h.login({ accessToken, userId: zaloId, name: "Client-supplied identity" });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.token, undefined);
    assert.equal(h.databaseCalls.length, 0);
    const log = JSON.stringify(h.warnings);
    assert.ok(!log.includes(accessToken));
    assert.ok(!log.includes(appSecret));
    assert.ok(!log.includes(zaloId));
  });
}

test("provider network failure is retryable and never accesses the database", async t => {
  const h = setup(t, { failure: new Error("provider unavailable") });
  assert.equal((await h.login()).statusCode, 502);
  assert.equal(h.databaseCalls.length, 0);
});

test("missing application secret blocks provider calls", async t => {
  const h = setup(t);
  delete process.env.ZALO_APP_SECRET;
  assert.equal((await h.login()).statusCode, 503);
  assert.equal(h.providerCalls.length, 0);
});

test("malformed token blocks provider calls", async t => {
  const h = setup(t);
  assert.equal((await h.login({ accessToken: "token\r\nother-header: bad" })).statusCode, 400);
  assert.equal(h.providerCalls.length, 0);
});

test("verified identity cannot sign in to a disabled account", async t => {
  const h = setup(t, { existing: { _id: userId, zaloId, name: "Disabled", role: "user", active: false } });
  const res = await h.login();
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.token, undefined);
});

test("provider -501 explanation reaches logs without credentials or profile data", async t => {
  const message = `Diagnostic failure; access_token=${accessToken}; secret=${appSecret}; id=${zaloId}`;
  const h = setup(t, { profile: { error: -501, message, name: "PRIVATE_PROFILE_NAME" } });
  const res = await h.login();
  assert.equal(res.statusCode, 401);
  assert.equal(h.databaseCalls.length, 0);
  const details = h.warnings[0][1];
  assert.equal(details.errorCode, -501);
  assert.match(details.providerMessage, /Diagnostic failure/);
  assert.equal(details.region, process.env.VERCEL_REGION || "local");
  const log = JSON.stringify(h.warnings);
  for (const value of [accessToken, appSecret, zaloId, "PRIVATE_PROFILE_NAME"]) assert.ok(!log.includes(value));
});

test("diagnostics redact encoded credentials, proof strings, URLs and multiline content", () => {
  const credential = "short+secret/example";
  const proof = createHmac("sha256", appSecret).update(accessToken).digest("hex");
  const message = `Reason\n${encodeURIComponent(credential)} appsecret_proof=${proof} https://example.test/?token=${credential}`;
  const safe = safeZaloErrorMessage(message, [credential]);
  assert.ok(!safe.includes(credential));
  assert.ok(!safe.includes(encodeURIComponent(credential)));
  assert.ok(!safe.includes(proof));
  assert.ok(!safe.includes("https://"));
  assert.ok(!safe.includes("\n"));
  assert.match(safe, /Reason/);
  assert.equal(safeZaloErrorMessage({ token: accessToken }), null);
});
