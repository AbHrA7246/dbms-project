import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { getPool, closePool } from '../src/config/db.js';
import centreRepository from '../src/repositories/centreRepository.js';
import {
  CUSTOMER_COOKIE_NAME,
  CENTRE_COOKIE_NAME,
  signToken,
} from '../src/utils/security.js';

function extractCookieValue(res, cookieName) {
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  for (const sc of setCookies) {
    if (sc && sc.includes(`${cookieName}=`)) {
      const match = sc.match(new RegExp(`${cookieName}=([^;]+)`));
      return match ? match[1] : null;
    }
  }
  return null;
}

test('EcoCycle Milestone 3: Public Centre Directory & Facility Operations Suite', async (t) => {
  // Start server on an ephemeral port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const testEmailPrefix = `test_m3_${Date.now()}`;
  const centreAEmail = `${testEmailPrefix}_centreA@example.com`;
  const centreBEmail = `${testEmailPrefix}_centreB@example.com`;

  let centreAId = '';
  let tokenA = '';
  let centreBId = '';
  let tokenB = '';

  // Setup: Register Centre A (Downtown Electronics Depot)
  const regA = await fetch(`${baseUrl}/api/auth/centre/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Downtown Electronics Depollution Hub',
      email: centreAEmail,
      password: 'FacilityPasswordA123!',
      phone: '+1-555-4401',
      address: '100 Metro Boulevard',
      city: 'Metroville',
      serviceArea: 'Greater Metroville',
      capabilities: 'ISO-14001 depollution, lithium safety, certified data wiping',
      maxWeeklyCapacityKg: 4500,
      maxWeeklyUnits: 1000,
      slotLimitKg: 300,
      leadTimeDays: 1,
      pickupAvailable: true,
      dropoffAvailable: true,
      openingTime: '08:00',
      closingTime: '17:00',
      operatingDaysSummary: 'Monday to Friday',
      operatingHoursSummary: '08:00 AM – 05:00 PM',
      operatingDaysList: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      categories: ['Computers & Laptops', 'Smartphones & Tablets'],
      coordinates: { lat: 37.7833, lng: -122.4167 },
      staffName: 'Alice Director',
      staffRole: 'Lead Operations Director',
    }),
  });
  assert.equal(regA.status, 201);
  const dataA = await regA.json();
  centreAId = dataA.centre.id;
  tokenA = extractCookieValue(regA, CENTRE_COOKIE_NAME);

  // Setup: Register Centre B (Suburban Heavy Recycling Facility)
  const regB = await fetch(`${baseUrl}/api/auth/centre/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Suburban Heavy Processing Depot',
      email: centreBEmail,
      password: 'FacilityPasswordB123!',
      phone: '+1-555-4402',
      address: '900 Industrial Parkway',
      city: 'Suburbtown',
      serviceArea: 'East County Suburbs',
      capabilities: 'High-volume metal shredding, bulk pallet intake',
      maxWeeklyCapacityKg: 10000,
      maxWeeklyUnits: 2500,
      slotLimitKg: 800,
      leadTimeDays: 3,
      pickupAvailable: false,
      dropoffAvailable: true,
      openingTime: '09:00',
      closingTime: '18:00',
      operatingDaysSummary: 'Monday to Saturday',
      operatingHoursSummary: '09:00 AM – 06:00 PM',
      operatingDaysList: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      categories: ['Home & Office Appliances', 'Servers & Telecom Infrastructure'],
      coordinates: { lat: 37.8044, lng: -122.2712 },
      staffName: 'Bob Manager',
      staffRole: 'Facility Manager',
    }),
  });
  assert.equal(regB.status, 201);
  const dataB = await regB.json();
  centreBId = dataB.centre.id;
  tokenB = extractCookieValue(regB, CENTRE_COOKIE_NAME);

  t.after(async () => {
    try {
      const pool = getPool();
      await pool.query('DELETE FROM recycling_centres WHERE email LIKE ?', [`${testEmailPrefix}%`]);
    } catch (cleanupErr) {
      console.error('Error during Milestone 3 test cleanup:', cleanupErr.message);
    }
    server.close();
    await closePool();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Public Centre Directory
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Public Directory: GET /api/centres returns list without authentication', async () => {
    const res = await fetch(`${baseUrl}/api/centres`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.centres));
    assert.ok(data.pagination);
    assert.ok(data.centres.length >= 2);

    const centreA = data.centres.find((c) => c.id === centreAId);
    assert.ok(centreA);
    assert.equal(centreA.name, 'Downtown Electronics Depollution Hub');
    assert.equal(centreA.city, 'Metroville');
    assert.equal(centreA.pickupAvailable, true);
    assert.equal(centreA.dropoffAvailable, true);
    assert.deepEqual(centreA.categories, ['Computers & Laptops', 'Smartphones & Tablets']);
    assert.deepEqual(centreA.operatingDaysList, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

    // Security: sensitive internal fields must NEVER appear in public responses
    assert.equal(centreA.password_hash, undefined);
    assert.equal(centreA.password_updated_at, undefined);
    assert.equal(centreA.password, undefined);
    assert.equal(centreA.staffName, undefined);
    assert.equal(centreA.staffRole, undefined);
    assert.equal(centreA.maxWeeklyCapacityKg, undefined);
    assert.equal(centreA.maxWeeklyUnits, undefined);
  });

  await t.test('Public Directory: Pagination limits and pages work as expected', async () => {
    const res = await fetch(`${baseUrl}/api/centres?page=1&limit=1`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.centres.length, 1);
    assert.equal(data.pagination.page, 1);
    assert.equal(data.pagination.limit, 1);
    assert.ok(data.pagination.total >= 2);
    assert.ok(data.pagination.totalPages >= 2);
  });

  await t.test('Public Directory: Search query filters by facility name and location', async () => {
    // Search by name substring
    let res = await fetch(`${baseUrl}/api/centres?search=Downtown`);
    assert.equal(res.status, 200);
    let data = await res.json();
    assert.ok(data.centres.some((c) => c.id === centreAId));
    assert.ok(!data.centres.some((c) => c.id === centreBId));

    // Search by city
    res = await fetch(`${baseUrl}/api/centres?city=Suburbtown`);
    assert.equal(res.status, 200);
    data = await res.json();
    assert.ok(data.centres.some((c) => c.id === centreBId));
    assert.ok(!data.centres.some((c) => c.id === centreAId));
  });

  await t.test('Public Directory: Filter by accepted category stream', async () => {
    const res = await fetch(`${baseUrl}/api/centres?category=Smartphones`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.centres.some((c) => c.id === centreAId));
    assert.ok(!data.centres.some((c) => c.id === centreBId));
  });

  await t.test('Public Directory: Filter by collection method (pickup vs dropoff)', async () => {
    // Only pickup available facilities
    const res = await fetch(`${baseUrl}/api/centres?pickupAvailable=true`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.centres.some((c) => c.id === centreAId));
    // Centre B has pickupAvailable: false
    assert.ok(!data.centres.some((c) => c.id === centreBId));
  });

  await t.test('Public Directory: Empty search returns structured empty response', async () => {
    const res = await fetch(`${baseUrl}/api/centres?search=NonExistentFacilityQuery12345`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.centres.length, 0);
    assert.equal(data.pagination.total, 0);
  });

  await t.test('Public Profile: GET /api/centres/:id returns single public centre profile', async () => {
    const res = await fetch(`${baseUrl}/api/centres/${centreAId}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.centre);
    assert.equal(data.centre.id, centreAId);
    assert.equal(data.centre.name, 'Downtown Electronics Depollution Hub');
    assert.equal(data.centre.password_hash, undefined);
    assert.equal(data.centre.staffName, undefined);
  });

  await t.test('Public Profile: GET /api/centres/:id returns 404 for unknown facility ID', async () => {
    const res = await fetch(`${baseUrl}/api/centres/CTR-9999-DOES-NOT-EXIST`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.error, 'Not Found');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Authenticated Centre Profile & Operational Capacity
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Centre Operations: GET /api/centre/profile requires facility authentication (401 without cookie)', async () => {
    const res = await fetch(`${baseUrl}/api/centre/profile`);
    assert.equal(res.status, 401);
  });

  await t.test('Centre Operations: Customer token cannot access centre profile (403 Forbidden)', async () => {
    const custToken = signToken(
      { id: 'usr-customer-test', email: 'cust@example.com' },
      'customer'
    );

    const res = await fetch(`${baseUrl}/api/centre/profile`, {
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=${custToken}`,
      },
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error, 'Forbidden');
  });

  await t.test('Centre Operations: GET /api/centre/profile returns full operational profile and capacity metrics', async () => {
    const res = await fetch(`${baseUrl}/api/centre/profile`, {
      headers: {
        Cookie: `${CENTRE_COOKIE_NAME}=${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.centre);
    assert.equal(data.centre.id, centreAId);
    // Manager profile includes operational staff details
    assert.equal(data.centre.staffName, 'Alice Director');
    assert.equal(data.centre.staffRole, 'Lead Operations Director');

    // Operational capacity calculation
    assert.ok(data.capacity);
    assert.equal(data.capacity.maxWeeklyCapacityKg, 4500);
    assert.equal(data.capacity.maxWeeklyUnits, 1000);
    assert.equal(data.capacity.slotLimitKg, 300);
    assert.equal(data.capacity.activeDaysCount, 5); // Mon-Fri
    assert.equal(data.capacity.dailyMaxKg, 900); // 4500 / 5
    assert.equal(data.capacity.dailyMaxUnits, 200); // 1000 / 5
  });

  await t.test('Centre Operations: PUT /api/centre/profile updates permitted fields transactionally', async () => {
    const res = await fetch(`${baseUrl}/api/centre/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Downtown Electronics Depollution Hub (Renovated)',
        phone: '+1-555-4499',
        address: '150 Metro Boulevard, 2nd Floor',
        city: 'Metroville',
        serviceArea: 'Metroville Central & Northern Districts',
        capabilities: 'Expanded cleanroom robotics and lithium storage',
        staffName: 'Dr. Alice Director',
        openingTime: '08:30',
        closingTime: '17:30',
        operatingDaysList: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        categories: [
          'Computers & Laptops',
          'Smartphones & Tablets',
          'Displays & Monitors',
        ],
        maxWeeklyCapacityKg: 6000,
        maxWeeklyUnits: 1500,
        slotLimitKg: 350,
        leadTimeDays: 2,
        // Attempting to overwrite protected or unauthorized fields
        id: 'TAMPERED_CENTRE_ID',
        email: 'tampered_email@example.com',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'Facility profile updated successfully.');
    assert.equal(data.centre.id, centreAId, 'Facility ID must not be tampered');
    assert.equal(data.centre.email, centreAEmail.toLowerCase(), 'Email must not be tampered');
    assert.equal(data.centre.name, 'Downtown Electronics Depollution Hub (Renovated)');
    assert.equal(data.centre.openingTime, '08:30');
    assert.equal(data.centre.closingTime, '17:30');
    assert.deepEqual(data.centre.operatingDaysList, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    assert.deepEqual(data.centre.categories, [
      'Computers & Laptops',
      'Displays & Monitors',
      'Smartphones & Tablets',
    ].sort());

    // Capacity metrics updated dynamically based on 6 operating days
    assert.equal(data.capacity.maxWeeklyCapacityKg, 6000);
    assert.equal(data.capacity.activeDaysCount, 6);
    assert.equal(data.capacity.dailyMaxKg, 1000); // 6000 / 6
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Operational Integrity & Security Isolation
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Isolation: Centre A cannot modify Centre B profile', async () => {
    // Attempt updating while logged in as Centre A with body referencing Centre B
    const res = await fetch(`${baseUrl}/api/centre/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        id: centreBId, // Injected Centre B ID
        name: 'Vandalized Centre B',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    // It only updated Centre A
    assert.equal(data.centre.id, centreAId);

    // Verify Centre B in database was completely unchanged
    const centreB = await centreRepository.findById(centreBId);
    assert.equal(centreB.name, 'Suburban Heavy Processing Depot');
  });

  await t.test('Validation: Rejects invalid schedule when openingTime >= closingTime with 400', async () => {
    const res = await fetch(`${baseUrl}/api/centre/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        openingTime: '17:00',
        closingTime: '09:00', // Closes before opens
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('Opening time must precede closing time'));
  });

  await t.test('Validation: Rejects invalid or empty operating days with 400', async () => {
    const res = await fetch(`${baseUrl}/api/centre/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        operatingDaysList: ['NotADay', 'TuesdayFunday'],
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('Invalid operating day'));
  });

  await t.test('Validation: Rejects empty categories list with 400', async () => {
    const res = await fetch(`${baseUrl}/api/centre/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        categories: [],
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('At least one accepted waste category'));
  });

  await t.test('Validation: Rejects invalid capacity limits (negative or 0) with 400', async () => {
    const res = await fetch(`${baseUrl}/api/centre/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        maxWeeklyCapacityKg: -500,
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('Max weekly capacity must be a positive number'));
  });

  await t.test('Transaction Rollback: Failure during child category insertion rolls back entire profile update', async () => {
    const initialCentre = await centreRepository.findById(centreAId);

    // Attempt direct repository update with invalid category causing rollback
    await assert.rejects(
      async () => {
        await centreRepository.updateProfile(centreAId, {
          name: 'Should Be Rolled Back Hub Name',
          categories: [], // Throws error during category validation inside transaction
        });
      },
      /category/i
    );

    // Verify facility name was NOT changed in database
    const postRollback = await centreRepository.findById(centreAId);
    assert.equal(postRollback.name, initialCentre.name, 'Transaction must roll back core table edits');
  });
});
