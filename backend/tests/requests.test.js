import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { getPool, closePool } from '../src/config/db.js';
import requestRepository from '../src/repositories/requestRepository.js';
import {
  CUSTOMER_COOKIE_NAME,
  CENTRE_COOKIE_NAME,
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

test('EcoCycle Milestone 4: Collection Requests & Request History Suite', async (t) => {
  // Start server on an ephemeral port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const testPrefix = `test_m4_${Date.now()}`;
  const custEmailA = `${testPrefix}_custA@example.com`;
  const custEmailB = `${testPrefix}_custB@example.com`;
  const centreEmailA = `${testPrefix}_centreA@example.com`;
  const centreEmailB = `${testPrefix}_centreB@example.com`;

  let custAId = '';
  let custAToken = '';
  let custBId = '';
  let custBToken = '';
  let centreAId = '';
  let centreAToken = '';
  let centreBId = '';
  let centreBToken = '';

  let custAAddressId = '';
  let custBAddressId = '';

  // Setup: Register Customer A
  const resCustA = await fetch(`${baseUrl}/api/auth/customer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice EcoCustomer',
      email: custEmailA,
      password: 'AlicePassword123!',
      phone: '+1-555-1001',
    }),
  });
  assert.equal(resCustA.status, 201);
  const dataCustA = await resCustA.json();
  custAId = dataCustA.user.id;
  custAToken = extractCookieValue(resCustA, CUSTOMER_COOKIE_NAME);

  // Setup: Create Address for Customer A
  const resAddrA = await fetch(`${baseUrl}/api/customer/addresses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}`,
    },
    body: JSON.stringify({
      label: 'Home',
      recipientName: 'Alice EcoCustomer',
      recipientPhone: '+1-555-1001',
      addressLine: '123 Green Valley Road',
      city: 'Metroville',
      state: 'CA',
      postalCode: '90210',
      pickupInstructions: 'Ring doorbell twice; package on porch',
      latitude: 37.7749,
      longitude: -122.4194,
    }),
  });
  assert.equal(resAddrA.status, 201);
  const dataAddrA = await resAddrA.json();
  custAAddressId = dataAddrA.address.id;

  // Setup: Register Customer B
  const resCustB = await fetch(`${baseUrl}/api/auth/customer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob EcoCustomer',
      email: custEmailB,
      password: 'BobPassword123!',
      phone: '+1-555-2002',
    }),
  });
  assert.equal(resCustB.status, 201);
  const dataCustB = await resCustB.json();
  custBId = dataCustB.user.id;
  custBToken = extractCookieValue(resCustB, CUSTOMER_COOKIE_NAME);

  // Setup: Create Address for Customer B
  const resAddrB = await fetch(`${baseUrl}/api/customer/addresses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `${CUSTOMER_COOKIE_NAME}=${custBToken}`,
    },
    body: JSON.stringify({
      label: 'Apartment',
      recipientName: 'Bob EcoCustomer',
      recipientPhone: '+1-555-2002',
      addressLine: '456 Solar Avenue',
      city: 'Metroville',
      state: 'CA',
      postalCode: '90211',
    }),
  });
  assert.equal(resAddrB.status, 201);
  const dataAddrB = await resAddrB.json();
  custBAddressId = dataAddrB.address.id;

  // Setup: Register Facility A (Accepts Computers & Mobile, pickup + dropoff, slot limit 100 kg)
  const resCentreA = await fetch(`${baseUrl}/api/auth/centre/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alpha Eco Depollution Facility',
      email: centreEmailA,
      password: 'FacilityPasswordA123!',
      phone: '+1-555-3001',
      address: '789 Industrial Parkway',
      city: 'Metroville',
      serviceArea: 'Metroville Central',
      capabilities: 'ISO-14001, certified hardware erasure',
      maxWeeklyCapacityKg: 5000,
      maxWeeklyUnits: 1200,
      slotLimitKg: 100,
      leadTimeDays: 1,
      pickupAvailable: true,
      dropoffAvailable: true,
      openingTime: '08:00',
      closingTime: '17:00',
      operatingDaysSummary: 'Monday to Friday',
      operatingHoursSummary: '08:00 AM – 05:00 PM',
      operatingDaysList: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      categories: ['Computers & Laptops', 'Smartphones & Tablets'],
    }),
  });
  assert.equal(resCentreA.status, 201);
  const dataCentreA = await resCentreA.json();
  centreAId = dataCentreA.centre.id;
  centreAToken = extractCookieValue(resCentreA, CENTRE_COOKIE_NAME);

  // Setup: Register Facility B (Accepts White Goods only, dropoff only, slot limit 50 kg)
  const resCentreB = await fetch(`${baseUrl}/api/auth/centre/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Beta Large Appliance Recyclers',
      email: centreEmailB,
      password: 'FacilityPasswordB123!',
      phone: '+1-555-3002',
      address: '999 Heavy Scrap Way',
      city: 'Metroville Outskirts',
      serviceArea: 'Greater Metroville',
      capabilities: 'Refrigerant recovery, heavy shredding',
      maxWeeklyCapacityKg: 8000,
      maxWeeklyUnits: 300,
      slotLimitKg: 50,
      leadTimeDays: 2,
      pickupAvailable: false, // Dropoff only!
      dropoffAvailable: true,
      openingTime: '09:00',
      closingTime: '18:00',
      operatingDaysSummary: 'Tuesday, Thursday, Saturday',
      operatingHoursSummary: '09:00 AM – 06:00 PM',
      operatingDaysList: ['Tue', 'Thu', 'Sat'],
      categories: ['White Goods & Appliances'],
    }),
  });
  assert.equal(resCentreB.status, 201);
  const dataCentreB = await resCentreB.json();
  centreBId = dataCentreB.centre.id;
  centreBToken = extractCookieValue(resCentreB, CENTRE_COOKIE_NAME);

  t.after(async () => {
    try {
      const pool = getPool();
      // Delete collection requests and cascade to request_history
      await pool.query('DELETE FROM collection_requests WHERE user_email LIKE ?', [`${testPrefix}%`]);
      // Delete test users (cascades to addresses and preferences)
      await pool.query('DELETE FROM users WHERE email LIKE ?', [`${testPrefix}%`]);
      // Delete test recycling centres (cascades to categories and days)
      await pool.query('DELETE FROM recycling_centres WHERE email LIKE ?', [`${testPrefix}%`]);
    } catch (cleanupErr) {
      console.error('Error during Milestone 4 cleanup:', cleanupErr.message);
    }
    server.close();
    await closePool();
  });

  // Track created requests for downstream tests
  let pickupRequestId = '';
  let dropoffRequestId = '';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Customer Collection Request Creation (POST /api/requests)
  // ─────────────────────────────────────────────────────────────────────────────

  await t.test('Create Request: Doorstep pickup request with saved address snapshots address and coordinates', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}`,
      },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Dell',
        model: 'Latitude 7490',
        quantity: 2,
        declaredWeightKg: 4.5,
        method: 'pickup',
        centreId: centreAId,
        addressId: custAAddressId,
        condition: 'working',
        preferredSlot: 'Morning (09:00 - 12:00)',
        notes: 'Battery removed and packed separately.',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.message, 'Collection request created successfully.');
    assert.ok(data.request);
    assert.ok(data.request.id.startsWith('EW-'));
    assert.equal(data.request.userId, custAId);
    assert.equal(data.request.userEmail, custEmailA.toLowerCase());
    assert.equal(data.request.customerName, 'Alice EcoCustomer');
    assert.equal(data.request.centreId, centreAId);
    assert.equal(data.request.centreName, 'Alpha Eco Depollution Facility');
    assert.equal(data.request.category, 'Computers & Laptops');
    assert.equal(data.request.brand, 'Dell');
    assert.equal(data.request.model, 'Latitude 7490');
    assert.equal(data.request.quantity, 2);
    assert.equal(data.request.declaredWeightKg, 4.5);
    assert.equal(data.request.method, 'pickup');
    assert.equal(data.request.channel, 'Doorstep Pickup');
    assert.equal(data.request.status, 'Submitted');
    assert.equal(data.request.currentStep, 0);

    // Verify snapshotting of address text, instructions, and coordinates
    assert.ok(data.request.pickupAddress.includes('123 Green Valley Road'));
    assert.ok(data.request.pickupAddress.includes('Ring doorbell twice'));
    assert.equal(data.request.latitude, 37.7749);
    assert.equal(data.request.longitude, -122.4194);

    pickupRequestId = data.request.id;
  });

  await t.test('Create Request: Centre drop-off snapshots depot address, city, and operating hours', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}`,
      },
      body: JSON.stringify({
        category: 'Smartphones & Tablets',
        brand: 'Apple',
        model: 'iPhone 11 & iPad Air',
        quantity: 3,
        weight: 1.25,
        method: 'dropoff',
        centreId: centreAId,
        condition: 'repairable',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.request);
    assert.equal(data.request.method, 'dropoff');
    assert.equal(data.request.channel, 'Center Drop-off');
    assert.equal(data.request.dropoffFacilityAddress, '789 Industrial Parkway');
    assert.equal(data.request.dropoffFacilityCity, 'Metroville');
    assert.ok(data.request.dropoffFacilityHours.includes('08:00'));
    assert.equal(data.request.status, 'Submitted');

    dropoffRequestId = data.request.id;
  });

  await t.test('Create Request: Doorstep pickup with raw address string and coordinates', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}`,
      },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Lenovo',
        model: 'ThinkPad T480',
        quantity: 1,
        declaredWeightKg: 1.8,
        method: 'pickup',
        centreId: centreAId,
        address: '555 Custom Direct Street, Metroville',
        latitude: 37.7801,
        longitude: -122.4205,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.request.pickupAddress, '555 Custom Direct Street, Metroville');
    assert.equal(data.request.latitude, 37.7801);
    assert.equal(data.request.longitude, -122.4205);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Strict Input & Validation Tests
  // ─────────────────────────────────────────────────────────────────────────────

  await t.test('Validation: Rejects missing required category, brand, or model with 400', async () => {
    // Missing category
    const res1 = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        brand: 'Dell',
        model: 'XPS 13',
        quantity: 1,
        weight: 1.5,
        centreId: centreAId,
      }),
    });
    assert.equal(res1.status, 400);
    const data1 = await res1.json();
    assert.ok(data1.message.includes('category stream is required'));

    // Missing brand
    const res2 = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        model: 'XPS 13',
        quantity: 1,
        weight: 1.5,
        centreId: centreAId,
      }),
    });
    assert.equal(res2.status, 400);

    // Missing model
    const res3 = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Dell',
        quantity: 1,
        weight: 1.5,
        centreId: centreAId,
      }),
    });
    assert.equal(res3.status, 400);
  });

  await t.test('Validation: Rejects invalid or non-strict quantity (strings with letters, 0, negatives, decimals)', async () => {
    const invalidQuantities = ['12abc', 0, -5, 1.5, 1001, ''];
    for (const q of invalidQuantities) {
      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
        body: JSON.stringify({
          category: 'Computers & Laptops',
          brand: 'Dell',
          model: 'OptiPlex',
          quantity: q,
          weight: 5.0,
          centreId: centreAId,
        }),
      });
      assert.equal(res.status, 400, `Expected 400 for invalid quantity: ${q}`);
      const data = await res.json();
      assert.ok(data.message.toLowerCase().includes('quantity'));
    }
  });

  await t.test('Validation: Rejects invalid or non-strict weight (strings with letters, 0, negatives, excessive)', async () => {
    const invalidWeights = ['12abc', 0, -2.5, 5001, ''];
    for (const w of invalidWeights) {
      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
        body: JSON.stringify({
          category: 'Computers & Laptops',
          brand: 'Dell',
          model: 'OptiPlex',
          quantity: 1,
          weight: w,
          centreId: centreAId,
        }),
      });
      assert.equal(res.status, 400, `Expected 400 for invalid weight: ${w}`);
      const data = await res.json();
      assert.ok(data.message.toLowerCase().includes('weight'));
    }
  });

  await t.test('Validation: Rejects invalid coordinates outside range', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Dell',
        model: 'OptiPlex',
        quantity: 1,
        weight: 5.0,
        method: 'pickup',
        centreId: centreAId,
        address: '123 Valid Road, City',
        latitude: 95.0, // Invalid lat > 90
        longitude: 50.0,
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('Latitude must be between -90 and 90'));
  });

  await t.test('Validation: Rejects pickup request when no address or addressId provided', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Dell',
        model: 'Latitude',
        quantity: 1,
        weight: 2.0,
        method: 'pickup',
        centreId: centreAId,
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('pickup address or saved address ID is required'));
  });

  await t.test('Validation & Security: Rejects pickup request with another customer addressId', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Dell',
        model: 'Latitude',
        quantity: 1,
        weight: 2.0,
        method: 'pickup',
        centreId: centreAId,
        addressId: custBAddressId, // Belongs to Customer B!
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('not found in your saved address book'));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Centre Compatibility Rules
  // ─────────────────────────────────────────────────────────────────────────────

  await t.test('Compatibility: Rejects request if target facility does not accept the category stream', async () => {
    // Facility A accepts 'Computers & Laptops' and 'Smartphones & Tablets', but not 'White Goods & Appliances'
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        category: 'White Goods & Appliances',
        brand: 'Whirlpool',
        model: 'Microwave Oven',
        quantity: 1,
        weight: 12.0,
        method: 'dropoff',
        centreId: centreAId,
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('does not accept the "White Goods & Appliances" waste stream'));
  });

  await t.test('Compatibility: Rejects pickup request if target facility does not offer pickup', async () => {
    // Facility B is dropoff only (pickupAvailable = false)
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        category: 'White Goods & Appliances',
        brand: 'Bosch',
        model: 'Washing Machine',
        quantity: 1,
        weight: 45.0,
        method: 'pickup',
        centreId: centreBId,
        addressId: custAAddressId,
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('does not offer doorstep pickup services'));
  });

  await t.test('Compatibility: Rejects request if weight exceeds facility single-slot intake limit', async () => {
    // Facility A has slotLimitKg = 100 kg. Submitting 120 kg should be rejected.
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Server Cluster',
        model: 'Rackmount Blades',
        quantity: 4,
        declaredWeightKg: 120.0,
        method: 'dropoff',
        centreId: centreAId,
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('exceeds the facility\'s single-slot intake limit of 100 kg'));
  });

  await t.test('Compatibility: Rejects request if selected facility does not exist', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Dell',
        model: 'Latitude',
        quantity: 1,
        weight: 2.0,
        centreId: 'non-existent-centre-id',
      }),
    });
    assert.equal(res.status, 404);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Role Isolation & Authentication Guards
  // ─────────────────────────────────────────────────────────────────────────────

  await t.test('Security: Unauthenticated request creation returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Dell',
        model: 'Latitude',
        quantity: 1,
        weight: 2.0,
        centreId: centreAId,
      }),
    });
    assert.equal(res.status, 401);
  });

  await t.test('Security: Centre facility token cannot create customer requests (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}`,
      },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Dell',
        model: 'Latitude',
        quantity: 1,
        weight: 2.0,
        centreId: centreAId,
      }),
    });
    assert.equal(res.status, 403);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Customer Request Listing, Filtering, and History
  // ─────────────────────────────────────────────────────────────────────────────

  await t.test('Customer Listing: GET /api/requests lists only the authenticated customer requests', async () => {
    const res = await fetch(`${baseUrl}/api/requests`, {
      headers: { Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.requests));
    assert.ok(data.requests.length >= 3);
    assert.ok(data.pagination);
    assert.equal(data.pagination.page, 1);
    assert.ok(data.pagination.total >= 3);

    // Verify all requests belong to Customer A
    for (const req of data.requests) {
      assert.equal(req.userEmail.toLowerCase(), custEmailA.toLowerCase());
    }

    // Verify Customer B has no requests yet
    const resB = await fetch(`${baseUrl}/api/requests`, {
      headers: { Cookie: `${CUSTOMER_COOKIE_NAME}=${custBToken}` },
    });
    assert.equal(resB.status, 200);
    const dataB = await resB.json();
    assert.equal(dataB.requests.length, 0);
    assert.equal(dataB.pagination.total, 0);
  });

  await t.test('Customer Listing: Filtering by category, method, and status works correctly', async () => {
    // Filter by method=dropoff
    const resDropoff = await fetch(`${baseUrl}/api/requests?method=dropoff`, {
      headers: { Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
    });
    assert.equal(resDropoff.status, 200);
    const dataDropoff = await resDropoff.json();
    assert.ok(dataDropoff.requests.length >= 1);
    for (const r of dataDropoff.requests) {
      assert.equal(r.method, 'dropoff');
    }

    // Filter by category=Smartphones & Tablets
    const resPhones = await fetch(`${baseUrl}/api/requests?category=Smartphones%20%26%20Tablets`, {
      headers: { Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
    });
    assert.equal(resPhones.status, 200);
    const dataPhones = await resPhones.json();
    assert.ok(dataPhones.requests.length >= 1);
    for (const r of dataPhones.requests) {
      assert.equal(r.category, 'Smartphones & Tablets');
    }
  });

  await t.test('Customer Request Detail & History: Customer can view their request and audit events', async () => {
    const res = await fetch(`${baseUrl}/api/requests/${pickupRequestId}`, {
      headers: { Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.request.id, pickupRequestId);
    assert.equal(data.request.brand, 'Dell');

    // Retrieve history
    const resHist = await fetch(`${baseUrl}/api/requests/${pickupRequestId}/history`, {
      headers: { Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
    });
    assert.equal(resHist.status, 200);
    const dataHist = await resHist.json();
    assert.ok(Array.isArray(dataHist.history));
    assert.ok(dataHist.history.length >= 1);
    assert.equal(dataHist.history[0].actor, 'Customer');
    assert.ok(dataHist.history[0].eventDescription.includes('Disposal declaration submitted online'));
  });

  await t.test('Customer Isolation: Customer B cannot view or retrieve Customer A request or history', async () => {
    // Customer B calls Customer A's request
    const resDetail = await fetch(`${baseUrl}/api/requests/${pickupRequestId}`, {
      headers: { Cookie: `${CUSTOMER_COOKIE_NAME}=${custBToken}` },
    });
    assert.equal(resDetail.status, 404);

    // Customer B calls Customer A's history
    const resHist = await fetch(`${baseUrl}/api/requests/${pickupRequestId}/history`, {
      headers: { Cookie: `${CUSTOMER_COOKIE_NAME}=${custBToken}` },
    });
    assert.equal(resHist.status, 404);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Customer Cancellation Workflow
  // ─────────────────────────────────────────────────────────────────────────────

  await t.test('Customer Cancellation: Successfully cancels Submitted request and appends to history', async () => {
    const res = await fetch(`${baseUrl}/api/requests/${dropoffRequestId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}`,
      },
      body: JSON.stringify({
        reason: 'Decided to donate items to a community school instead',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'Request cancelled successfully.');
    assert.equal(data.request.status, 'Cancelled');
    assert.equal(data.request.currentStep, -1);
    assert.equal(data.request.cancellationReason, 'Decided to donate items to a community school instead');
    assert.ok(data.request.cancelledAt);

    // Verify history log contains cancellation entry
    const resHist = await fetch(`${baseUrl}/api/requests/${dropoffRequestId}/history`, {
      headers: { Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
    });
    const dataHist = await resHist.json();
    assert.equal(dataHist.history.length, 2);
    const cancelEvent = dataHist.history[1];
    assert.equal(cancelEvent.actor, 'Customer');
    assert.ok(cancelEvent.eventDescription.includes('Request cancelled by customer'));
    assert.ok(cancelEvent.eventDescription.includes('donate items'));
  });

  await t.test('Customer Cancellation: Rejects cancelling already cancelled request with 400', async () => {
    const res = await fetch(`${baseUrl}/api/requests/${dropoffRequestId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}`,
      },
      body: JSON.stringify({ reason: 'Try again' }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('already cancelled'));
  });

  await t.test('Customer Cancellation: Customer B cannot cancel Customer A request (returns 404)', async () => {
    const res = await fetch(`${baseUrl}/api/requests/${pickupRequestId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${custBToken}`,
      },
      body: JSON.stringify({ reason: 'Malicious attempt' }),
    });
    assert.equal(res.status, 404);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Facility Request Management & Access Control
  // ─────────────────────────────────────────────────────────────────────────────

  await t.test('Centre Requests: Facility A lists assigned requests with pagination', async () => {
    const res = await fetch(`${baseUrl}/api/centre/requests`, {
      headers: { Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.requests));
    assert.ok(data.requests.length >= 3);
    assert.ok(data.pagination);

    for (const r of data.requests) {
      assert.equal(r.centreId, centreAId);
    }
  });

  await t.test('Centre Isolation: Facility B cannot view or access Facility A requests (returns 403)', async () => {
    const res = await fetch(`${baseUrl}/api/centre/requests/${pickupRequestId}`, {
      headers: { Cookie: `${CENTRE_COOKIE_NAME}=${centreBToken}` },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.ok(data.message.includes('assigned to another recycling facility'));

    const resHist = await fetch(`${baseUrl}/api/centre/requests/${pickupRequestId}/history`, {
      headers: { Cookie: `${CENTRE_COOKIE_NAME}=${centreBToken}` },
    });
    assert.equal(resHist.status, 403);
  });

  await t.test('Centre Security: Customer token cannot access facility request management (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/centre/requests`, {
      headers: { Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
    });
    assert.equal(res.status, 403);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Lifecycle Transitions by Facility Staff
  // ─────────────────────────────────────────────────────────────────────────────

  await t.test('Lifecycle: Facility transitions Submitted -> Accepted', async () => {
    const res = await fetch(`${baseUrl}/api/centre/requests/${pickupRequestId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}`,
      },
      body: JSON.stringify({
        status: 'Accepted',
        note: 'Facility accepted request and assigned to Logistics Team 1',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.request.status, 'Accepted');
    assert.equal(data.request.currentStep, 0);

    // Verify history
    const resHist = await fetch(`${baseUrl}/api/centre/requests/${pickupRequestId}/history`, {
      headers: { Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}` },
    });
    const dataHist = await resHist.json();
    const latestEvent = dataHist.history[dataHist.history.length - 1];
    assert.equal(latestEvent.actor, 'Centre Staff');
    assert.ok(latestEvent.eventDescription.includes('Logistics Team 1'));
  });

  await t.test('Lifecycle: Facility transitions Accepted -> In Transit', async () => {
    const res = await fetch(`${baseUrl}/api/centre/requests/${pickupRequestId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}`,
      },
      body: JSON.stringify({
        status: 'In Transit',
        note: 'Van 4 dispatched for doorstep pickup',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.request.status, 'In Transit');
    assert.equal(data.request.currentStep, 1);
  });

  await t.test('Lifecycle Protection: Customer cannot cancel request once In Transit', async () => {
    const res = await fetch(`${baseUrl}/api/requests/${pickupRequestId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}`,
      },
      body: JSON.stringify({ reason: 'Changed my mind' }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.message.includes('cannot be cancelled once collection, transit, or processing has commenced'));
  });

  await t.test('Lifecycle: Facility transitions In Transit -> Received and records weight discrepancy', async () => {
    // Declared weight was 4.5 kg. Facility inspects and weighs 4.85 kg.
    const res = await fetch(`${baseUrl}/api/centre/requests/${pickupRequestId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}`,
      },
      body: JSON.stringify({
        status: 'Received',
        receivedWeightKg: 4.85,
        note: 'Hardware received, power cables included adding 0.35 kg',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.request.status, 'Received');
    assert.equal(data.request.currentStep, 2);
    assert.equal(data.request.receivedWeightKg, 4.85);
    assert.equal(data.request.weightDiscrepancyKg, 0.35); // 4.85 - 4.5 = +0.35
  });

  await t.test('Lifecycle: Facility transitions Received -> Processing -> Completed -> Recycled', async () => {
    // 1. Processing
    const res1 = await fetch(`${baseUrl}/api/centre/requests/${pickupRequestId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}`,
      },
      body: JSON.stringify({ status: 'Processing' }),
    });
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.request.status, 'Processing');
    assert.equal(data1.request.currentStep, 2);

    // 2. Completed
    const res2 = await fetch(`${baseUrl}/api/centre/requests/${pickupRequestId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}`,
      },
      body: JSON.stringify({ status: 'Completed' }),
    });
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.request.status, 'Completed');
    assert.equal(data2.request.currentStep, 2);

    // 3. Recycled
    const res3 = await fetch(`${baseUrl}/api/centre/requests/${pickupRequestId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}`,
      },
      body: JSON.stringify({ status: 'Recycled' }),
    });
    assert.equal(res3.status, 200);
    const data3 = await res3.json();
    assert.equal(data3.request.status, 'Recycled');
    assert.equal(data3.request.currentStep, 2);
  });

  await t.test('Lifecycle: Facility rejection workflow enforces minimum reason length', async () => {
    // Create fresh request to reject
    const resNew = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Generic',
        model: 'Server Tower',
        quantity: 1,
        weight: 15.0,
        method: 'dropoff',
        centreId: centreAId,
      }),
    });
    const dataNew = await resNew.json();
    const newReqId = dataNew.request.id;

    // Reject without reason
    const resRejectFail = await fetch(`${baseUrl}/api/centre/requests/${newReqId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}` },
      body: JSON.stringify({
        status: 'Rejected',
        reason: 'No', // < 3 chars
      }),
    });
    assert.equal(resRejectFail.status, 400);
    const dataFail = await resRejectFail.json();
    assert.ok(dataFail.message.includes('at least 3 characters'));

    // Reject with valid reason
    const resRejectSuccess = await fetch(`${baseUrl}/api/centre/requests/${newReqId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}` },
      body: JSON.stringify({
        status: 'Rejected',
        reason: 'Item severely burned and leaking hazardous chemical sludge',
      }),
    });
    assert.equal(resRejectSuccess.status, 200);
    const dataSuccess = await resRejectSuccess.json();
    assert.equal(dataSuccess.request.status, 'Rejected');
    assert.equal(dataSuccess.request.currentStep, -1);
    assert.ok(dataSuccess.request.rejectionReason.includes('hazardous chemical sludge'));

    // Verify history has rejection recorded
    const resHist = await fetch(`${baseUrl}/api/centre/requests/${newReqId}/history`, {
      headers: { Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}` },
    });
    const dataHist = await resHist.json();
    const rejEvent = dataHist.history[dataHist.history.length - 1];
    assert.equal(rejEvent.actor, 'Centre Staff');
    assert.ok(rejEvent.eventDescription.includes('Request rejected'));
    assert.ok(rejEvent.eventDescription.includes('hazardous chemical sludge'));
  });

  await t.test('Lifecycle: Invalid transitions and disallowed targets are strictly blocked', async () => {
    // Create fresh request in 'Submitted' state
    const resNew = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${CUSTOMER_COOKIE_NAME}=${custAToken}` },
      body: JSON.stringify({
        category: 'Computers & Laptops',
        brand: 'Acer',
        model: 'Aspire',
        quantity: 1,
        weight: 3.0,
        method: 'dropoff',
        centreId: centreAId,
      }),
    });
    const reqId = (await resNew.json()).request.id;

    // 1. Cannot skip directly from Submitted to Completed
    const resSkip = await fetch(`${baseUrl}/api/centre/requests/${reqId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}` },
      body: JSON.stringify({ status: 'Completed' }),
    });
    assert.equal(resSkip.status, 400);
    const skipData = await resSkip.json();
    assert.ok(skipData.message.includes('Invalid status transition'));

    // 2. Facility staff cannot set status to 'Cancelled' (only customer can cancel)
    const resCancel = await fetch(`${baseUrl}/api/centre/requests/${reqId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `${CENTRE_COOKIE_NAME}=${centreAToken}` },
      body: JSON.stringify({ status: 'Cancelled' }),
    });
    assert.equal(resCancel.status, 400);

    // 3. Facility B cannot transition Facility A's request (403 Forbidden)
    const resCross = await fetch(`${baseUrl}/api/centre/requests/${reqId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `${CENTRE_COOKIE_NAME}=${centreBToken}` },
      body: JSON.stringify({ status: 'Accepted' }),
    });
    assert.equal(resCross.status, 403);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Atomic Transactions & Rollback
  // ─────────────────────────────────────────────────────────────────────────────

  await t.test('Database Transaction Rollback: Insert failure in request creation rolls back entire transaction', async () => {
    const pool = getPool();
    const fakeRequestId = `EW-FAIL-${Date.now()}`;

    // Test calling repository create directly with invalid foreign key or data that causes history insert failure
    const reqPayload = {
      id: fakeRequestId,
      userId: custAId,
      userEmail: custEmailA,
      customerName: 'Alice EcoCustomer',
      centreId: centreAId,
      centreName: 'Alpha Eco Depollution Facility',
      category: 'Computers & Laptops',
      brand: 'TestBrand',
      model: 'TestModel',
      items: 'TestBrand TestModel',
      quantity: 1,
      declaredWeightKg: 2.0,
      method: 'dropoff',
      status: 'Submitted',
      currentStep: 0,
    };

    // Cause history insert to fail by passing an invalid actor enum value (e.g. 'InvalidActor')
    const badHistoryPayload = {
      eventDescription: 'Should fail and rollback',
      actor: 'HackerBot', // Not 'Customer', 'Centre Staff', or 'System' -> schema enum failure
    };

    let caught = false;
    try {
      await requestRepository.create(reqPayload, badHistoryPayload);
    } catch {
      caught = true;
    }
    assert.ok(caught, 'Expected transaction error on invalid actor enum');

    // Confirm that fakeRequestId was completely rolled back from collection_requests
    const [rows] = await pool.query('SELECT * FROM collection_requests WHERE id = ?', [fakeRequestId]);
    assert.equal(rows.length, 0, 'collection_requests row must not persist when history insert fails');
  });
});
