import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { getPool, closePool } from '../src/config/db.js';
import userRepository from '../src/repositories/userRepository.js';
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

function getSetCookieHeader(res, cookieName) {
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  for (const sc of setCookies) {
    if (sc && sc.includes(`${cookieName}=`)) {
      return sc;
    }
  }
  return null;
}

test('EcoCycle Milestone 1: Core Account Authentication Suite', async (t) => {
  // Start server on an ephemeral port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const testEmailPrefix = `test_m1_${Date.now()}`;

  t.after(async () => {
    try {
      const pool = getPool();
      await pool.query('DELETE FROM users WHERE email LIKE ?', [`${testEmailPrefix}%`]);
      await pool.query('DELETE FROM recycling_centres WHERE email LIKE ?', [`${testEmailPrefix}%`]);
    } catch (cleanupErr) {
      console.error('Error during test cleanup:', cleanupErr.message);
    }
    server.close();
    await closePool();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Customer Registration
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Customer Registration: registers with valid data, hashes password, sets cookie', async () => {
    const custPayload = {
      name: 'Jane EcoResident',
      email: `${testEmailPrefix}_cust1@example.com`,
      password: 'StrongPassword123!',
      phone: '+1-555-0199',
      userType: 'Individual Resident',
      avatarColor: 'bg-[#FF7028]',
    };

    const res = await fetch(`${baseUrl}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(custPayload),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.message, 'Account registered successfully.');
    assert.ok(data.user);
    assert.equal(data.user.name, 'Jane EcoResident');
    assert.equal(data.user.email, custPayload.email.toLowerCase());
    assert.equal(data.user.phone, '+1-555-0199');
    assert.equal(data.user.userType, 'Individual Resident');
    // Ensure password_hash is never exposed in response
    assert.equal(data.user.password_hash, undefined);
    assert.equal(data.user.password, undefined);

    // Verify HTTP-only cookie
    const cookieHeader = getSetCookieHeader(res, CUSTOMER_COOKIE_NAME);
    assert.ok(cookieHeader, 'Expected customer auth cookie in Set-Cookie header');
    assert.ok(cookieHeader.toLowerCase().includes('httponly'));
    assert.ok(cookieHeader.toLowerCase().includes('samesite=strict'));

    // Verify database state: password must be hashed with bcrypt
    const dbRecord = await userRepository.findByEmail(custPayload.email);
    assert.ok(dbRecord);
    assert.notEqual(dbRecord.password_hash, custPayload.password);
    assert.ok(dbRecord.password_hash.startsWith('$2a$') || dbRecord.password_hash.startsWith('$2b$'));

    // Verify default preferences record was created atomically
    const prefs = await userRepository.getPreferences(dbRecord.id);
    assert.ok(prefs);
    assert.equal(Boolean(prefs.appointment_confirmations), true);
    assert.equal(Boolean(prefs.status_updates), true);
    assert.equal(Boolean(prefs.cancellation_alerts), true);
  });

  await t.test('Customer Registration: rejects duplicate email (case-insensitive) with 409 Conflict', async () => {
    const custEmail = `${testEmailPrefix}_cust1@example.com`;
    // Attempt duplicate registration with different casing
    const dupPayload = {
      name: 'Duplicate Jane',
      email: custEmail.toUpperCase(),
      password: 'AnotherPassword456!',
    };

    const res = await fetch(`${baseUrl}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dupPayload),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.error, 'Conflict');
    assert.ok(data.message.includes('already exists'));
  });

  await t.test('Customer Registration: rejects invalid payload with 400 Bad Request', async () => {
    // Missing name
    let res = await fetch(`${baseUrl}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${testEmailPrefix}_cust_invalid@example.com`,
        password: 'ValidPassword123!',
      }),
    });
    assert.equal(res.status, 400);

    // Invalid email
    res = await fetch(`${baseUrl}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: 'ValidPassword123!',
      }),
    });
    assert.equal(res.status, 400);

    // Short password (< 8 chars)
    res = await fetch(`${baseUrl}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Short Pwd User',
        email: `${testEmailPrefix}_cust_short@example.com`,
        password: 'short',
      }),
    });
    assert.equal(res.status, 400);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Customer Login & Session
  // ───────────────────────────────────────────────────────────────────────────
  let customerAuthCookie = '';

  await t.test('Customer Login: succeeds with valid credentials and sets cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${testEmailPrefix}_cust1@example.com`,
        password: 'StrongPassword123!',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'Signed in successfully.');
    assert.ok(data.user);
    assert.equal(data.user.email, `${testEmailPrefix}_cust1@example.com`.toLowerCase());
    assert.equal(data.user.password_hash, undefined);

    customerAuthCookie = extractCookieValue(res, CUSTOMER_COOKIE_NAME);
    assert.ok(customerAuthCookie, 'Customer auth cookie should be populated');
  });

  await t.test('Customer Login: fails with wrong password with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${testEmailPrefix}_cust1@example.com`,
        password: 'WrongPassword999!',
      }),
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, 'Unauthorized');
    assert.equal(data.message, 'Invalid email or password.');
  });

  await t.test('Customer Login: fails with non-existent email with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${testEmailPrefix}_nonexistent@example.com`,
        password: 'SomePassword123!',
      }),
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, 'Unauthorized');
    assert.equal(data.message, 'Invalid email or password.');
  });

  await t.test('Customer Session: GET /api/auth/customer/me succeeds with cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/customer/me`, {
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=${customerAuthCookie}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.email, `${testEmailPrefix}_cust1@example.com`.toLowerCase());
    assert.ok(data.user.preferences);
    assert.equal(data.user.password_hash, undefined);
  });

  await t.test('Customer Session: GET /api/auth/customer/me succeeds with Bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/customer/me`, {
      headers: {
        Authorization: `Bearer ${customerAuthCookie}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.email, `${testEmailPrefix}_cust1@example.com`.toLowerCase());
  });

  await t.test('Customer Session: GET /api/auth/customer/me fails without authentication', async () => {
    const res = await fetch(`${baseUrl}/api/auth/customer/me`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, 'Unauthorized');
  });

  await t.test('Customer Session: GET /api/auth/customer/me fails with invalid token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/customer/me`, {
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=invalid_malformed_token_string`,
      },
    });
    assert.equal(res.status, 401);
  });

  await t.test('Customer Logout: clears customer cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/customer/logout`, {
      method: 'POST',
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=${customerAuthCookie}`,
      },
    });

    assert.equal(res.status, 200);
    const cookieHeader = getSetCookieHeader(res, CUSTOMER_COOKIE_NAME);
    assert.ok(cookieHeader, 'Expected Set-Cookie header on logout');
    // Cookie should be cleared (e.g. Expires in 1970 or Max-Age=0 or empty value)
    assert.ok(
      cookieHeader.includes('Expires=Thu, 01 Jan 1970') ||
      cookieHeader.includes('Max-Age=0') ||
      cookieHeader.startsWith(`${CUSTOMER_COOKIE_NAME}=;`)
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Recycling Centre Registration & Atomic Relations
  // ───────────────────────────────────────────────────────────────────────────
  let centreId = '';
  let centreAuthCookie = '';

  await t.test('Centre Registration: creates facility, operating days, and categories atomically', async () => {
    const centrePayload = {
      name: 'GreenTech Recycling Hub',
      email: `${testEmailPrefix}_fac1@example.com`,
      password: 'FacilityPassword2026!',
      phone: '+1-555-8822',
      address: '742 Evergreen Terrace',
      city: 'Springfield',
      serviceArea: 'Greater Springfield Metro',
      capabilities: 'Certified electronics disassembly, battery processing, metals recovery',
      maxWeeklyCapacityKg: 5000,
      maxWeeklyUnits: 1200,
      slotLimitKg: 400,
      leadTimeDays: 2,
      pickupAvailable: true,
      dropoffAvailable: true,
      openingTime: '08:30',
      closingTime: '18:00',
      operatingDaysSummary: 'Monday to Saturday',
      operatingHoursSummary: '08:30 AM – 06:00 PM',
      operatingDaysList: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      categories: ['Computers & Laptops', 'Smartphones & Tablets', 'Batteries & Power Supplies'],
      coordinates: { lat: 37.7749, lng: -122.4194 },
      staffName: 'Marcus Vance',
      staffRole: 'Operations Director',
    };

    const res = await fetch(`${baseUrl}/api/auth/centre/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(centrePayload),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.message, 'Recycling facility registered successfully.');
    assert.ok(data.centre);
    centreId = data.centre.id;
    assert.ok(centreId);
    assert.equal(data.centre.name, 'GreenTech Recycling Hub');
    assert.equal(data.centre.email, centrePayload.email.toLowerCase());
    assert.equal(data.centre.password_hash, undefined);
    assert.equal(data.centre.password, undefined);

    // Verify operating days and categories in response
    assert.deepEqual(data.centre.operatingDaysList, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    assert.deepEqual(data.centre.categories, [
      'Batteries & Power Supplies',
      'Computers & Laptops',
      'Smartphones & Tablets',
    ].sort());

    // Verify HTTP-only cookie
    const cookieHeader = getSetCookieHeader(res, CENTRE_COOKIE_NAME);
    assert.ok(cookieHeader, 'Expected facility auth cookie in Set-Cookie header');
    assert.ok(cookieHeader.toLowerCase().includes('httponly'));

    // Direct database verification
    const dbCentre = await centreRepository.findById(centreId);
    assert.ok(dbCentre);
    assert.equal(dbCentre.name, 'GreenTech Recycling Hub');
    assert.deepEqual(dbCentre.operatingDaysList, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    assert.equal(dbCentre.categories.length, 3);
  });

  await t.test('Centre Registration: rejects duplicate email with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/auth/centre/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another Hub',
        email: `${testEmailPrefix}_fac1@example.com`,
        password: 'Password123!',
        phone: '+1-555-1234',
        address: '123 Fake Street',
        city: 'Springfield',
      }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.error, 'Conflict');
  });

  await t.test('Centre Registration: rejects payload with missing required fields with 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/centre/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Incomplete Hub',
        email: `${testEmailPrefix}_incomplete@example.com`,
        // Missing password, phone, address, city
      }),
    });

    assert.equal(res.status, 400);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Centre Login & Session
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Centre Login: succeeds with valid email and password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/centre/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${testEmailPrefix}_fac1@example.com`,
        password: 'FacilityPassword2026!',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'Signed in successfully.');
    assert.ok(data.centre);
    assert.equal(data.centre.id, centreId);

    centreAuthCookie = extractCookieValue(res, CENTRE_COOKIE_NAME);
    assert.ok(centreAuthCookie);
  });

  await t.test('Centre Login: succeeds with facility ID and password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/centre/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrId: centreId,
        password: 'FacilityPassword2026!',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.centre.id, centreId);
  });

  await t.test('Centre Login: rejects invalid password with 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/centre/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${testEmailPrefix}_fac1@example.com`,
        password: 'BadPassword!',
      }),
    });

    assert.equal(res.status, 401);
  });

  await t.test('Centre Session: GET /api/auth/centre/me succeeds with facility cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/centre/me`, {
      headers: {
        Cookie: `${CENTRE_COOKIE_NAME}=${centreAuthCookie}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.centre);
    assert.equal(data.centre.id, centreId);
    assert.equal(data.centre.name, 'GreenTech Recycling Hub');
  });

  await t.test('Centre Logout: clears centre cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/centre/logout`, {
      method: 'POST',
      headers: {
        Cookie: `${CENTRE_COOKIE_NAME}=${centreAuthCookie}`,
      },
    });

    assert.equal(res.status, 200);
    const cookieHeader = getSetCookieHeader(res, CENTRE_COOKIE_NAME);
    assert.ok(cookieHeader);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Cross-Role Isolation & Security Guards
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Cross-Role Isolation: customer token cannot access centre /me (returns 403 Forbidden)', async () => {
    // Generate valid customer token
    const customerToken = signToken(
      { id: 'usr_test_cust_id', email: `${testEmailPrefix}_cust1@example.com` },
      'customer'
    );

    const res = await fetch(`${baseUrl}/api/auth/centre/me`, {
      headers: {
        Cookie: `${CENTRE_COOKIE_NAME}=${customerToken}`,
      },
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error, 'Forbidden');
  });

  await t.test('Cross-Role Isolation: centre token cannot access customer /me (returns 403 Forbidden)', async () => {
    // Generate valid centre token
    const centreToken = signToken(
      { id: centreId, email: `${testEmailPrefix}_fac1@example.com` },
      'centre'
    );

    const res = await fetch(`${baseUrl}/api/auth/customer/me`, {
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=${centreToken}`,
      },
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error, 'Forbidden');
  });

  await t.test('Database Transaction Rollback: invalid operating day rolls back entire centre registration', async () => {
    const testRollbackEmail = `${testEmailPrefix}_rollback@example.com`;

    // Attempt registration with invalid operating day directly via repository
    await assert.rejects(
      async () => {
        await centreRepository.create(
          {
            name: 'Rollback Hub',
            email: testRollbackEmail,
            passwordHash: 'dummy_hash',
            phone: '1234567',
            address: 'Rollback Street',
            city: 'Springfield',
          },
          ['InvalidDayName'], // Invalid day of week enum
          ['Computers']
        );
      },
      /operating day/i
    );

    // Verify facility was NOT inserted
    const exists = await centreRepository.existsByEmail(testRollbackEmail);
    assert.equal(exists, false, 'Failed transaction must not leave orphaned facility records');
  });
});
