import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { getPool, closePool } from '../src/config/db.js';
import userRepository from '../src/repositories/userRepository.js';
import addressRepository from '../src/repositories/addressRepository.js';
import {
  CUSTOMER_COOKIE_NAME,
  CENTRE_COOKIE_NAME,
  signToken,
  hashPassword,
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

test('EcoCycle Milestone 2: Customer Profile, Address Book & Preferences Suite', async (t) => {
  // Start server on an ephemeral port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const testEmailPrefix = `test_m2_${Date.now()}`;
  const custEmailA = `${testEmailPrefix}_a@example.com`;
  const custEmailB = `${testEmailPrefix}_b@example.com`;

  let tokenA = '';
  let userAId = '';
  let tokenB = '';
  let userBId = '';

  // Setup: Create two customer accounts
  const resA = await fetch(`${baseUrl}/api/auth/customer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Resident',
      email: custEmailA,
      password: 'OriginalPassword123!',
      phone: '+1-555-0101',
      userType: 'Individual Resident',
      avatarColor: 'bg-[#FF7028]',
    }),
  });
  assert.equal(resA.status, 201);
  const dataA = await resA.json();
  userAId = dataA.user.id;
  tokenA = extractCookieValue(resA, CUSTOMER_COOKIE_NAME);

  const resB = await fetch(`${baseUrl}/api/auth/customer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Resident',
      email: custEmailB,
      password: 'BobPassword123!',
      phone: '+1-555-0202',
    }),
  });
  assert.equal(resB.status, 201);
  const dataB = await resB.json();
  userBId = dataB.user.id;
  tokenB = extractCookieValue(resB, CUSTOMER_COOKIE_NAME);

  t.after(async () => {
    try {
      const pool = getPool();
      // Remove collection requests created in tests
      await pool.query('DELETE FROM collection_requests WHERE user_email LIKE ?', [`${testEmailPrefix}%`]);
      // Remove test users (foreign keys cascade to addresses & preferences)
      await pool.query('DELETE FROM users WHERE email LIKE ?', [`${testEmailPrefix}%`]);
    } catch (cleanupErr) {
      console.error('Error during Milestone 2 test cleanup:', cleanupErr.message);
    }
    server.close();
    await closePool();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Customer Profile Management
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Profile: PUT /api/customer/profile updates fields and preserves immutable properties', async () => {
    const res = await fetch(`${baseUrl}/api/customer/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Alice Updated',
        phone: '+1-555-9999',
        avatarColor: 'bg-[#10B981]',
        userType: 'Business/Commercial',
        // Attempting to overwrite protected fields must be ignored
        id: 'tampered_id',
        email: 'tampered_email@example.com',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'Profile updated successfully.');
    assert.equal(data.user.id, userAId);
    assert.equal(data.user.email, custEmailA.toLowerCase());
    assert.equal(data.user.name, 'Alice Updated');
    assert.equal(data.user.phone, '+1-555-9999');
    assert.equal(data.user.avatarColor, 'bg-[#10B981]');
    assert.equal(data.user.userType, 'Business/Commercial');
    // Ensure password_hash is never exposed
    assert.equal(data.user.password_hash, undefined);
    assert.equal(data.user.password, undefined);
  });

  await t.test('Profile: PUT /api/customer/profile rejects invalid input with 400', async () => {
    // Name too short (< 2 chars)
    const res = await fetch(`${baseUrl}/api/customer/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        name: 'A',
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, 'Bad Request');
  });

  await t.test('Profile: Unauthenticated profile update returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/customer/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauth Name' }),
    });
    assert.equal(res.status, 401);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Customer Password Management
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Password: PUT /api/customer/password fails when current password is wrong', async () => {
    const res = await fetch(`${baseUrl}/api/customer/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        currentPassword: 'IncorrectPassword123!',
        newPassword: 'BrandNewPassword789!',
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('Current password does not match'));
  });

  await t.test('Password: PUT /api/customer/password rejects short new password (< 8 chars)', async () => {
    const res = await fetch(`${baseUrl}/api/customer/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        currentPassword: 'OriginalPassword123!',
        newPassword: 'short',
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('at least 8 characters'));
  });

  await t.test('Password: PUT /api/customer/password successfully changes password and verifies login', async () => {
    const res = await fetch(`${baseUrl}/api/customer/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        currentPassword: 'OriginalPassword123!',
        newPassword: 'BrandNewPassword789!',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'Password updated successfully.');

    // 1. Old password must now fail
    const oldLogin = await fetch(`${baseUrl}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: custEmailA,
        password: 'OriginalPassword123!',
      }),
    });
    assert.equal(oldLogin.status, 401);

    // 2. New password must succeed
    const newLogin = await fetch(`${baseUrl}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: custEmailA,
        password: 'BrandNewPassword789!',
      }),
    });
    assert.equal(newLogin.status, 200);
    tokenA = extractCookieValue(newLogin, CUSTOMER_COOKIE_NAME);
    assert.ok(tokenA);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Notification Preferences
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Preferences: GET /api/customer/preferences returns current preferences', async () => {
    const res = await fetch(`${baseUrl}/api/customer/preferences`, {
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.preferences);
    assert.equal(data.preferences.appointmentConfirmations, true);
    assert.equal(data.preferences.statusUpdates, true);
    assert.equal(data.preferences.cancellationAlerts, true);
  });

  await t.test('Preferences: PUT /api/customer/preferences updates selected preferences', async () => {
    const res = await fetch(`${baseUrl}/api/customer/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        appointmentConfirmations: false,
        statusUpdates: true,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'Notification preferences updated successfully.');
    assert.equal(data.preferences.appointmentConfirmations, false);
    assert.equal(data.preferences.statusUpdates, true);
    assert.equal(data.preferences.cancellationAlerts, true); // preserved
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Saved Address Book & Transactional Defaults
  // ───────────────────────────────────────────────────────────────────────────
  let address1Id = '';
  let address2Id = '';

  await t.test('Addresses: POST creates first address and automatically designates it default', async () => {
    const res = await fetch(`${baseUrl}/api/customer/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        label: 'Home',
        addressLine: '123 Market Street, Apt 4B',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
        pickupInstructions: 'Ring buzzer 4B, leave on porch',
        latitude: 37.7749,
        longitude: -122.4194,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.message, 'Address saved successfully.');
    assert.ok(data.address);
    address1Id = data.address.id;
    assert.ok(address1Id);
    assert.equal(data.address.isDefault, true, 'First address must automatically be default');
    assert.equal(data.address.latitude, 37.7749);
    assert.equal(data.address.longitude, -122.4194);
    assert.deepEqual(data.address.coordinates, { lat: 37.7749, lng: -122.4194 });
  });

  await t.test('Addresses: POST creates second address as non-default by default', async () => {
    const res = await fetch(`${baseUrl}/api/customer/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        label: 'Office',
        addressLine: '500 Howard Street, Suite 200',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        isDefault: false,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    address2Id = data.address.id;
    assert.ok(address2Id);
    assert.equal(data.address.isDefault, false);
  });

  await t.test('Addresses: GET /api/customer/addresses lists all addresses with default first', async () => {
    const res = await fetch(`${baseUrl}/api/customer/addresses`, {
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.addresses.length, 2);
    assert.equal(data.addresses[0].id, address1Id, 'Default address must be first in list');
    assert.equal(data.addresses[0].isDefault, true);
    assert.equal(data.addresses[1].id, address2Id);
    assert.equal(data.addresses[1].isDefault, false);
  });

  await t.test('Addresses: POST /:id/default transactionally designates new default and resets previous', async () => {
    const res = await fetch(`${baseUrl}/api/customer/addresses/${address2Id}/default`, {
      method: 'POST',
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'Default address updated successfully.');
    assert.equal(data.address.id, address2Id);
    assert.equal(data.address.isDefault, true);

    // Verify in database: address1 must now be non-default
    const addr1 = await addressRepository.findByIdAndUserId(address1Id, userAId);
    const addr2 = await addressRepository.findByIdAndUserId(address2Id, userAId);
    assert.equal(addr1.isDefault, false);
    assert.equal(addr2.isDefault, true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Input Validations & Coordinate Boundary Checks
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Addresses: rejects invalid coordinates outside valid lat/lng ranges', async () => {
    // Latitude > 90
    let res = await fetch(`${baseUrl}/api/customer/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        addressLine: '999 North Pole Road',
        city: 'Arctic',
        latitude: 91.5,
        longitude: 0.0,
      }),
    });
    assert.equal(res.status, 400);
    let data = await res.json();
    assert.ok(data.message.includes('between -90 and 90'));

    // Longitude < -180
    res = await fetch(`${baseUrl}/api/customer/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        addressLine: '123 Deep Pacific Trench',
        city: 'Oceania',
        latitude: 10.0,
        longitude: -185.0,
      }),
    });
    assert.equal(res.status, 400);
    data = await res.json();
    assert.ok(data.message.includes('between -180 and 180'));

    // Missing required address line
    res = await fetch(`${baseUrl}/api/customer/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        city: 'San Francisco',
      }),
    });
    assert.equal(res.status, 400);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Cross-Customer Address Isolation & Role Guards
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Address Isolation: Customer B cannot modify or default Customer A address', async () => {
    const res = await fetch(`${baseUrl}/api/customer/addresses/${address1Id}/default`, {
      method: 'POST',
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenB}`,
      },
    });

    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.error, 'Not Found');
  });

  await t.test('Address Isolation: Customer B cannot delete Customer A address', async () => {
    const res = await fetch(`${baseUrl}/api/customer/addresses/${address1Id}`, {
      method: 'DELETE',
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenB}`,
      },
    });

    assert.equal(res.status, 404);
  });

  await t.test('Role Guard: Facility token cannot access customer endpoints (403 Forbidden)', async () => {
    const facToken = signToken(
      { id: 'CTR-test-fac', email: 'fac@example.com' },
      'centre'
    );

    const res = await fetch(`${baseUrl}/api/customer/addresses`, {
      headers: {
        Cookie: `${CENTRE_COOKIE_NAME}=${facToken}`,
      },
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error, 'Forbidden');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Active Request Protection & Safe Deletion
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('Active Request Protection: blocks address deletion when attached to unresolved request', async () => {
    const pool = getPool();
    const reqId = `REQ-test-m2-${Date.now()}`;

    // Insert an active collection request using address1's street
    await pool.query(
      `INSERT INTO collection_requests (
        id, user_id, user_email, customer_name, centre_name, category, brand, model,
        items, declared_weight_kg, method, pickup_address, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reqId,
        userAId,
        custEmailA,
        'Alice Updated',
        'Springfield Central Depot',
        'Computers',
        'Dell',
        'Latitude 5420',
        '1 Laptop',
        2.5,
        'pickup',
        '123 Market Street, Apt 4B, San Francisco, CA 94103',
        'Submitted', // Unresolved status
      ]
    );

    // Attempt deleting address1 while collection request is unresolved
    const res = await fetch(`${baseUrl}/api/customer/addresses/${address1Id}`, {
      method: 'DELETE',
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('attached to an active collection request'));

    // Clean up collection request
    await pool.query('DELETE FROM collection_requests WHERE id = ?', [reqId]);
  });

  await t.test('Safe Deletion: deleting default address automatically promotes remaining address to default', async () => {
    // Current default is address2Id. Let's delete address2Id.
    const res = await fetch(`${baseUrl}/api/customer/addresses/${address2Id}`, {
      method: 'DELETE',
      headers: {
        Cookie: `${CUSTOMER_COOKIE_NAME}=${tokenA}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'Address deleted successfully.');

    // Remaining address1 must now automatically be default
    const addr1 = await addressRepository.findByIdAndUserId(address1Id, userAId);
    assert.ok(addr1);
    assert.equal(addr1.isDefault, true, 'Remaining address must be promoted to default');
  });
});
