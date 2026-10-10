// Focused HTTP tests for destination selection, route order and user map data.
// Uses a separate test database; never updates the application database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Destination from '../models/Destination.js';
import Tour from '../models/Tour.js';
import User from '../models/User.js';
import Departure from '../models/Departure.js';
import destinationRoutes from '../routes/destinationRoutes.js';
import tourRoutes from '../routes/tourRoutes.js';
import { getBookingQuote } from '../controllers/bookingController.js';
import { validateBody, validateQuery } from '../middlewares/inputValidation.js';
import { errorHandler } from '../middlewares/errorMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

test('destination locations: admin → persisted tour → public map and quote', { timeout: 120000 }, async t => {
  const env = dotenv.parse(await readFile(new URL('../.env', import.meta.url), 'utf8'));
  const databaseName = 'vna_loc_test_' + Date.now() + '_' + randomBytes(4).toString('hex');
  const secret = 'location-test-' + randomBytes(32).toString('hex');
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  let server;
  const timeout = setTimeout(() => { console.error('Location test database connection timed out.'); process.exit(1); }, 45000);
  try {
    if (!env.MONGO_URI) throw new Error('MONGO_URI is required for the isolated location tests.');
    await mongoose.connect(env.MONGO_URI, { dbName: databaseName, serverSelectionTimeoutMS: 15000 });
    clearTimeout(timeout);
    const admin = await User.create({ name: 'Location test admin', role: 'admin' });
    const user = await User.create({ name: 'Location test customer' });
    const token = account => jwt.sign({}, secret, { subject: String(account._id), audience: 'session', issuer: 'vna-daksong-api', expiresIn: '5m' });
    const app = express();
    app.use(express.json()); app.use('/api', validateQuery);
    app.use('/api/destinations', destinationRoutes); app.use('/api/tours', tourRoutes);
    app.get('/api/auth/me', protect, (req, res) => res.json({ user: req.user }));
    app.get('/api/notifications', (_req, res) => res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 }, unreadCount: 0 }));
    app.post('/api/bookings/quote', validateBody('quote'), getBookingQuote);
    app.use(errorHandler);
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const http = async (method, path, body, account = admin, expected = 200) => {
      const response = await fetch(base + path, { method,
        headers: { ...(account ? { Authorization: 'Bearer ' + token(account) } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      assert.equal(response.status, expected, `${method} ${path}: ${data.message || 'unexpected status'}`);
      return data;
    };
    const source = { title: 'Demo source for isolated tests', url: 'https://example.com/location-demo', checkedAt: new Date().toISOString() };
    const destinationBody = (slug, extra = {}) => ({ name: 'Demo ' + slug, slug, summary: 'Location fixture', description: 'Isolated test data', category: 'nature',
      address: 'Địa chỉ demo', status: 'published', sources: [source], ...extra });
    const legacy = await Destination.create(destinationBody('legacy-location'));
    const legacyBefore = JSON.stringify(await Destination.findById(legacy._id).lean());
    let first, second, hidden, tour;
    await t.test('new locations save classification, locality and exact coordinates', async () => {
      first = await http('POST', '/destinations', destinationBody('new-pickup', { placeGroup: 'pickup', areaScope: 'daksong', locality: 'Khu vực demo A', coordinates: { latitude: 12.2, longitude: 107.6 } }), admin, 201);
      second = await http('POST', '/destinations', destinationBody('new-stop', { placeGroup: 'rest', areaScope: 'nearby', locality: 'Khu vực demo B', coordinates: { latitude: 12.3, longitude: 107.7 } }), admin, 201);
      hidden = await http('POST', '/destinations', destinationBody('draft-stop', { status: 'draft', placeGroup: 'culture', areaScope: 'unspecified', coordinates: { latitude: 12.4, longitude: 107.8 } }), admin, 201);
      assert.deepEqual(first.coordinates, { latitude: 12.2, longitude: 107.6 });
      assert.equal(second.areaScope, 'nearby');
      const list = await http('GET', '/destinations?limit=100');
      assert.equal(list.data.find(place => place._id === first._id).placeGroup, 'pickup');
    });
    await t.test('coordinates reject strings, missing pairs, extra fields and out-of-range values', async () => {
      for (const coordinates of [{ latitude: '12.2', longitude: 107.6 }, { latitude: 91, longitude: 107.6 }, { latitude: 12, longitude: -181 },
        { latitude: 12 }, { latitude: 12, longitude: 107, unexpected: true }, [12, 107]]) {
        await http('PATCH', '/destinations/' + first._id, { coordinates }, admin, 400);
      }
      assert.deepEqual((await http('GET', '/destinations/' + first._id)).coordinates, first.coordinates);
      await http('PATCH', '/destinations/' + first._id, { areaScope: 'invented' }, admin, 400);
      await http('PATCH', '/destinations/' + first._id, { placeGroup: 'invented' }, admin, 400);
    });
    await t.test('only admins may change locations', async () => {
      await http('PATCH', '/destinations/' + first._id, { coordinates: null }, user, 403);
      await http('PATCH', '/destinations/' + first._id, { coordinates: null }, null, 401);
    });
    const tourBody = { name: 'Demo mapped tour', slug: 'demo-mapped-tour', summary: 'Mapped tour fixture', description: 'Location feature test only', durationHours: 4,
      themes: ['nature'], destinationIds: [first._id, second._id, String(legacy._id), hidden._id],
      itinerary: [{ title: 'Demo activity', description: 'Visit the selected location', destinationId: second._id }],
      meetingPoint: 'Client text', meetingDestinationId: first._id, cancellationPolicy: 'Demo policy', status: 'published' };
    await t.test('tour saves route IDs in admin order and derives its meeting point on the server', async () => {
      tour = await http('POST', '/tours', tourBody, admin, 201);
      assert.deepEqual(tour.destinationIds, tourBody.destinationIds);
      assert.equal(tour.meetingPoint, first.name + ', ' + first.address);
    });
    await t.test('public map gets published locations in order without draft details', async () => {
      const publicTour = await http('GET', '/tours/' + tour._id, undefined, null);
      assert.deepEqual(publicTour.routeDestinations.map(place => place._id), [first._id, second._id, String(legacy._id)]);
      assert.equal(publicTour.meetingDestination._id, first._id);
      assert.equal(JSON.stringify(publicTour.routeDestinations).includes(hidden.name), false);
      assert.deepEqual(publicTour.routeDestinations[0].coordinates, first.coordinates);
    });
    await t.test('reordering and choosing a meeting point persist to the customer API', async () => {
      await http('PATCH', '/tours/' + tour._id, { destinationIds: [second._id, first._id, String(legacy._id), hidden._id], meetingDestinationId: second._id });
      const saved = await http('GET', '/tours/' + tour._id, undefined, null);
      assert.deepEqual(saved.routeDestinations.map(place => place._id), [second._id, first._id, String(legacy._id)]);
      assert.equal(saved.meetingDestination._id, second._id);
      assert.equal(saved.meetingPoint, second.name + ', ' + second.address);
    });
    await t.test('rejects a meeting point outside the tour and unpublished pickup on a published tour', async () => {
      await http('PATCH', '/tours/' + tour._id, { meetingDestinationId: String(new mongoose.Types.ObjectId()) }, admin, 400);
      await http('PATCH', '/tours/' + tour._id, { meetingDestinationId: hidden._id }, admin, 400);
      await http('PATCH', '/tours/' + tour._id, { destinationIds: [first._id] }, admin, 400);
      await http('PATCH', '/tours/' + tour._id, { destinationIds: [first._id, first._id] }, admin, 400);
      assert.equal((await Tour.findById(tour._id)).meetingDestinationId.toString(), second._id);
    });
    await t.test('the selected meeting point reaches the user booking quote', async () => {
      const departure = await Departure.create({ tourId: tour._id, departureAt: new Date(Date.now() + 172800000), bookingDeadline: new Date(Date.now() + 86400000), adultPrice: 150000 });
      const quote = await http('POST', '/bookings/quote', { departureId: String(departure._id), adults: 1, children: 0 }, null);
      assert.equal(quote.meetingPoint, second.name + ', ' + second.address);
    });
    if (process.argv.includes('--with-ui')) await t.test('focused Chrome flow: new place → admin selection → customer map', async () => {
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [fileURLToPath(new URL('../../frontend/tests/destination-locations-ui.mjs', import.meta.url))], {
          windowsHide: true, stdio: ['ignore', 'inherit', 'inherit'],
          env: { ...process.env, LOCATION_API_URL: base, LOCATION_ADMIN_TOKEN: token(admin), LOCATION_TOUR_ID: tour._id,
            LOCATION_LEGACY_ID: String(legacy._id), LOCATION_FIRST_ID: first._id, LOCATION_SECOND_ID: second._id },
        });
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error('Focused location UI test failed.')));
      });
    });
    await t.test('editing a new location updates public coordinates without editing the tour', async () => {
      await http('PATCH', '/destinations/' + first._id, { coordinates: { latitude: 12.25, longitude: 107.65 } });
      const saved = await http('GET', '/tours/' + tour._id, undefined, null);
      assert.deepEqual(saved.routeDestinations.find(place => place._id === first._id).coordinates, { latitude: 12.25, longitude: 107.65 });
    });
    await t.test('clearing coordinates and archiving exclude pins without fabricating a location', async () => {
      await http('PATCH', '/destinations/' + first._id, { coordinates: null });
      const withoutCoordinates = await http('GET', '/tours/' + tour._id, undefined, null);
      assert.equal(withoutCoordinates.routeDestinations.find(place => place._id === first._id).coordinates, null);
      await http('DELETE', '/destinations/' + first._id);
      const saved = await http('GET', '/tours/' + tour._id, undefined, null);
      assert.equal(saved.routeDestinations.some(place => place._id === first._id), false);
    });
    await t.test('legacy destinations remain unchanged and receive no new defaults', async () => {
      const publicLegacy = await http('GET', '/destinations/' + legacy._id, undefined, null);
      for (const field of ['placeGroup', 'areaScope', 'locality', 'coordinates']) assert.equal(field in publicLegacy, false);
      assert.equal(JSON.stringify(await Destination.findById(legacy._id).lean()), legacyBefore);
    });
  } finally {
    clearTimeout(timeout);
    if (server) await new Promise(resolve => server.close(resolve));
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.name === databaseName && databaseName.startsWith('vna_loc_test_')) await mongoose.connection.dropDatabase();
    } finally { await mongoose.disconnect(); }
    if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
  }
});
