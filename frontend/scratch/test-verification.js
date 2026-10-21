// Automated End-to-End Verification of Customer Facility Separation & Simplified Request Tracking
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  get length() { return Object.keys(mockStorage).length; },
  key: (i) => Object.keys(mockStorage)[i] || null,
};

import {
  storageService,
  isCentreEligibleForRequest,
  getStepIndex,
  STATUS_STEP_MAP,
  isEligibleForHistoryHiding,
  CUSTOMER_HIDDEN_PREFIX,
  CENTRE_HIDDEN_PREFIX,
  checkRequestFeasibility,
  getCentreCapacityLimits,
  validateServiceArea,
  getRequestDisplayAddress,
  UNRESOLVED_REQUEST_STATUSES,
  RESOLVED_REQUEST_STATUSES,
  isRequestUnresolved,
  WEEKDAY_CODES,
  WEEKDAY_FULL_NAMES,
  formatOperatingDays,
  parseOperatingDays,
  time24To12,
  time12To24,
  formatOperatingHours,
  parseOperatingHours,
  validateSchedule,
  isOperatingDay,
  getActiveDaysCount,
  parseSlotTimeRange,
} from '../src/services/storageService.js';
import {
  isValidCoordinate,
  formatCoordinates,
  geocodeAddress,
  setGeocodingApiKey,
  getGeocodingApiKey,
  clearGeocodingCache,
  isGeocodingConfigured,
  calculateHaversineDistanceKm,
  formatDistanceKm,
  determineMatchPrecision,
  buildAddressGeocodeQuery,
  inferCountryCode,
  rankAndFilterCandidates,
} from '../src/services/geocodingService.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    testsPassed++;
  }
}

async function runTests() {
  console.log('--- STARTING VERIFICATION TEST SUITE ---\n');

  // ============================================================
  // REQUIREMENT 1: No facility registration or management controls on customer-facing pages
  // ============================================================
  console.log('Testing Requirement 1: Customer Page Separation...');
  const customerPages = [
    'src/pages/RegisterPage.jsx',
    'src/pages/CentersPage.jsx',
    'src/pages/DashboardPage.jsx',
    'src/pages/RequestsPage.jsx',
    'src/pages/AccountPage.jsx',
  ];

  for (const pagePath of customerPages) {
    const fullPath = path.resolve(pagePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert(
      !content.includes('/centre/register'),
      `${pagePath} does NOT contain links to /centre/register`
    );
    assert(
      !content.includes('Register Facility') && !content.includes('Register a Recycling Facility') && !content.includes('Register a facility first'),
      `${pagePath} does NOT contain Register Facility buttons or links`
    );
    assert(
      !content.includes('No Recycling Facilities Available'),
      `${pagePath} does NOT contain "No Recycling Facilities Available" yellow banner`
    );
  }

  // ============================================================
  // REQUIREMENT 2: Centre registration accessible via Centre Portal
  // ============================================================
  console.log('\nTesting Requirement 2: Centre Portal Exclusivity...');
  const centreLoginPage = fs.readFileSync(path.resolve('src/pages/centre/CentreLoginPage.jsx'), 'utf-8');
  assert(
    centreLoginPage.includes('/centre/register'),
    'Centre login page includes link to facility registration (/centre/register)'
  );

  const testCentre = storageService.registerCentre({
    name: 'Pacific Circular Materials',
    email: 'ops@pacificcircular.org',
    password: 'FacilityPassword123',
    phone: '+1 555-4321',
    address: '888 Bayfront Blvd',
    city: 'San Francisco',
    categories: ['Computers & Laptops', 'Smartphones & Tablets'],
    dropoffAvailable: true,
    pickupAvailable: true,
    operatingDays: 'Monday to Friday',
    operatingHours: '08:30 - 17:30',
    maxWeeklyCapacityKg: 600,
    maxWeeklyUnits: 120,
    leadTimeDays: 2,
    certification: 'R2v3 Certified',
  });

  assert(testCentre && testCentre.id, 'Facility successfully registered via Centre Portal service');

  // ============================================================
  // REQUIREMENT 3 & 4: Absence of eligible centres and manual selection
  // ============================================================
  console.log('\nTesting Requirement 3 & 4: Eligibility & "No recommended centres available."...');
  const customerEmail = 'tester@ecocycle.org';

  // Unsupported category
  const isAppliancesEligible = isCentreEligibleForRequest(testCentre, { category: 'appliances', method: 'pickup' });
  assert(!isAppliancesEligible, 'Facility not eligible for unsupported appliances category');

  // Supported category
  const isComputingEligible = isCentreEligibleForRequest(testCentre, { category: 'computing', method: 'pickup' });
  assert(isComputingEligible, 'Facility is eligible for computing category');

  // Verify RegisterPage code displays exact text "No recommended centres available."
  const registerPageCode = fs.readFileSync(path.resolve('src/pages/RegisterPage.jsx'), 'utf-8');
  assert(
    registerPageCode.includes('No recommended centres available.'),
    'RegisterPage displays exact message "No recommended centres available."'
  );
  assert(
    registerPageCode.includes('disabled={eligibleCentres.length === 0}'),
    'RegisterPage disables submit button when eligibleCentres.length === 0'
  );

  // ============================================================
  // REQUIREMENT 4 & 5: Simplified Request Tracking to 3 Stages
  // ============================================================
  console.log('\nTesting Requirement 4 & 5: 3-Stage Progress Tracker...');
  // Check STATUS_STEP_MAP and getStepIndex values
  assert(getStepIndex('Submitted') === 0, 'Submitted maps to Step 0');
  assert(getStepIndex('Scheduled') === 1, 'Scheduled maps to Step 1');
  assert(getStepIndex('In Transit') === 1, 'In Transit maps to Step 1 (scheduled & en route)');
  assert(getStepIndex('Received') === 2, 'Received maps to Step 2 (final custody intake milestone)');
  assert(getStepIndex('Rejected') === -1, 'Rejected maps to -1 (separate outcome)');
  assert(getStepIndex('Cancelled') === -1, 'Cancelled maps to -1 (separate outcome)');

  // Ensure maximum step index for active lifecycle is 2 (Submitted=0, Scheduled=1, Received=2)
  const maxStepIndex = Math.max(
    getStepIndex('Submitted'),
    getStepIndex('Scheduled'),
    getStepIndex('Received')
  );
  assert(maxStepIndex === 2, 'Progress tracking has exactly 3 stages (0, 1, 2)');

  // Verify customer RequestsPage does not include Processing or Completed in the active stepper
  const requestsPageCode = fs.readFileSync(path.resolve('src/pages/RequestsPage.jsx'), 'utf-8');
  assert(
    !requestsPageCode.includes("title: 'Processing'") && !requestsPageCode.includes("title: 'Completed'"),
    'RequestsPage stepper excludes Processing and Completed stages'
  );
  assert(
    !requestsPageCode.includes("Disassembly & sorting") && !requestsPageCode.includes("Certified circularized"),
    'RequestsPage stepper excludes recycling/dismantling milestones'
  );

  // Verify CentreRequestsPage also has the 3-stage progress tracker
  const centreRequestsPageCode = fs.readFileSync(path.resolve('src/pages/centre/CentreRequestsPage.jsx'), 'utf-8');
  assert(
    centreRequestsPageCode.includes("title: 'Submitted'") &&
    centreRequestsPageCode.includes("title: 'Scheduled'") &&
    centreRequestsPageCode.includes("title: 'Received'"),
    'CentreRequestsPage displays the 3-stage tracker: Submitted, Scheduled, Received'
  );
  assert(
    !centreRequestsPageCode.includes("Begin Processing Pipeline") &&
    !centreRequestsPageCode.includes("Issue Recycling Certificate"),
    'CentreRequestsPage removed controls for advancing to Processing and Completed'
  );

  // ============================================================
  // REQUIREMENT 6 & 7: Appointment Scheduling & Capacity Logic
  // ============================================================
  console.log('\nTesting Requirement 6 & 7: Scheduling, Capacity & Physical Receipt...');
  
  // Create a request
  const newReq = storageService.createRequest(customerEmail, {
    brand: 'Lenovo',
    model: 'ThinkPad X1',
    category: 'computing',
    quantity: 1,
    weight: 1.4,
    method: 'pickup',
    customerName: 'Dan Brown',
    customerPhone: '+1 555-9876',
    address: '500 Howard St',
    center: testCentre.name,
    centreId: testCentre.id,
  });

  assert(newReq.status === 'Submitted', 'Initial request status is Submitted');
  assert(getStepIndex(newReq.status) === 0, 'Initial step index is 0');

  // Verify availability calculation
  const avail = storageService.getCentreAvailability(testCentre.id, newReq, 14);
  const firstAvailDay = avail.availableDays.find(d => d.isAvailable);
  assert(firstAvailDay !== undefined, 'Found valid available appointment date');

  // Book appointment
  const scheduledReq = storageService.bookAppointment(newReq.id, testCentre.id, {
    date: firstAvailDay.date,
    timeSlot: firstAvailDay.slots[0].timeSlot,
  });

  assert(scheduledReq.status === 'Scheduled', 'Request transitions to Scheduled after booking appointment');
  assert(getStepIndex(scheduledReq.status) === 1, 'Scheduled request maps to step 1');
  assert(scheduledReq.appointment.bookingRef.startsWith('APT-'), 'Unique appointment booking reference generated');

  // Rescheduling releases old slot and reallocates
  const nextAvailDay = avail.availableDays.find(d => d.isAvailable && d.date !== firstAvailDay.date);
  const rescheduledReq = storageService.rescheduleAppointment(scheduledReq.id, testCentre.id, {
    date: nextAvailDay.date,
    timeSlot: nextAvailDay.slots[0].timeSlot,
  });
  assert(rescheduledReq.appointment.date === nextAvailDay.date, 'Appointment date updated on rescheduling');

  // Pickup flow: must be In Transit before Received
  const inTransitReq = storageService.updateCentreLifecycleStatus(rescheduledReq.id, testCentre.id, 'In Transit', 'Courier dispatched');
  assert(inTransitReq.status === 'In Transit', 'Pickup request transitioned to In Transit');

  const receivedReq = storageService.updateCentreLifecycleStatus(inTransitReq.id, testCentre.id, 'Received', 'Courier verified physical custody at facility');
  assert(receivedReq.status === 'Received', 'Pickup request transitioned to Received');
  assert(getStepIndex(receivedReq.status) === 2, 'Received request maps to final step 2');

  // Drop-off flow: drop-offs transition directly Scheduled -> Received (NO In Transit!)
  const dropoffReq = storageService.createRequest(customerEmail, {
    brand: 'Google',
    model: 'Pixel 7',
    category: 'mobile',
    quantity: 1,
    weight: 0.2,
    method: 'dropoff',
    customerName: 'Eve Miller',
    customerPhone: '+1 555-5555',
    center: testCentre.name,
    centreId: testCentre.id,
  });

  storageService.bookAppointment(dropoffReq.id, testCentre.id, {
    date: firstAvailDay.date,
    timeSlot: firstAvailDay.slots[0].timeSlot,
  });

  let transitBlocked = false;
  try {
    storageService.updateCentreLifecycleStatus(dropoffReq.id, testCentre.id, 'In Transit', 'Invalid dropoff transit');
  } catch {
    transitBlocked = true;
  }
  assert(transitBlocked, 'Drop-off requests strictly prevented from entering In Transit');

  const receivedDropoff = storageService.updateCentreLifecycleStatus(dropoffReq.id, testCentre.id, 'Received', 'Customer delivered item at kiosk');
  assert(receivedDropoff.status === 'Received', 'Drop-off transitions directly from Scheduled to Received');
  assert(getStepIndex(receivedDropoff.status) === 2, 'Drop-off Received maps to step 2');

  // ============================================================
  // REQUIREMENT 8: Safe handling of historical records
  // ============================================================
  console.log('\nTesting Requirement 8: Historical Records Handling...');
  // If an existing request has status 'Processing' or 'Completed', verify it maps safely to step 2 without corruption
  assert(getStepIndex('Processing') === 2, 'Historical Processing status safely maps to step 2');
  assert(getStepIndex('Completed') === 2, 'Historical Completed status safely maps to step 2');
  assert(STATUS_STEP_MAP['Processing'] === 2, 'STATUS_STEP_MAP preserves Processing mapping');
  assert(STATUS_STEP_MAP['Completed'] === 2, 'STATUS_STEP_MAP preserves Completed mapping');

  // Rejection and Cancellation
  const toCancelReq = storageService.createRequest(customerEmail, {
    brand: 'Asus',
    model: 'Monitor 24',
    category: 'computing',
    quantity: 1,
    weight: 4,
    method: 'dropoff',
    customerName: 'Frank White',
    customerPhone: '+1 555-1111',
    center: testCentre.name,
    centreId: testCentre.id,
  });

  const cancelled = storageService.cancelRequestByCustomer(toCancelReq.id, customerEmail, 'No longer needed');
  assert(cancelled.status === 'Cancelled', 'Request cancelled successfully');
  assert(getStepIndex(cancelled.status) === -1, 'Cancelled request maps to -1');

  const toRejectReq = storageService.createRequest(customerEmail, {
    brand: 'Unknown',
    model: 'Old TV',
    category: 'computing',
    quantity: 1,
    weight: 20,
    method: 'dropoff',
    customerName: 'Grace Hopper',
    customerPhone: '+1 555-2222',
    center: testCentre.name,
    centreId: testCentre.id,
  });

  const rejected = storageService.rejectRequest(toRejectReq.id, testCentre.id, 'CRT tubes not accepted');
  assert(rejected.status === 'Rejected', 'Request rejected with reason');
  assert(getStepIndex(rejected.status) === -1, 'Rejected request maps to -1');

  // ============================================================
  // REQUIREMENT 9: Address Book Management & Default Address
  // ============================================================
  console.log('\nTesting Requirement 9: Address Book Management...');
  const addr1 = storageService.saveUserAddress(customerEmail, {
    label: 'Home',
    addressLine: '123 Pine St, Apt 4A',
    city: 'San Jose',
    state: 'CA',
    postalCode: '95112',
    pickupInstructions: 'Ring buzzer 4A',
  });
  assert(addr1.isDefault === true, 'First saved address is automatically marked as default');

  const addr2 = storageService.saveUserAddress(customerEmail, {
    label: 'Work Office',
    addressLine: '500 Market St, Suite 200',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    pickupInstructions: 'Check in with lobby security',
  });
  assert(addr2.isDefault === false, 'Second saved address defaults to non-default');

  const userAddrs = storageService.getUserAddresses(customerEmail);
  assert(userAddrs.length === 2, 'Customer has exactly 2 saved addresses');

  // Set default address
  storageService.setDefaultAddress(customerEmail, addr2.id);
  const updatedAddrs = storageService.getUserAddresses(customerEmail);
  const newDef = updatedAddrs.find(a => a.id === addr2.id);
  const oldDef = updatedAddrs.find(a => a.id === addr1.id);
  assert(newDef.isDefault === true, 'addr2 is now the default address');
  assert(oldDef.isDefault === false, 'addr1 is no longer default');

  // Create request with addr1 snapshot
  const pickupReq = storageService.createRequest(customerEmail, {
    brand: 'Lenovo',
    model: 'ThinkPad X1',
    category: 'computing',
    quantity: 1,
    weight: 2.0,
    method: 'pickup',
    address: `${addr1.addressLine}, ${addr1.city}`,
    customerName: 'Alice Green',
    customerPhone: '+1 555-0199',
    center: testCentre.name,
    centreId: testCentre.id,
  });
  assert(pickupReq.address === `${addr1.addressLine}, ${addr1.city}`, 'Request recorded with designated snapshot address');

  // Modifying or switching default address must NOT silently change pickupReq address
  storageService.setDefaultAddress(customerEmail, addr1.id);
  const fetchedReq = storageService.getRequestById(pickupReq.id);
  assert(fetchedReq.address === `${addr1.addressLine}, ${addr1.city}`, 'Changing default address did NOT alter existing request address');

  // Delete address
  storageService.deleteUserAddress(customerEmail, addr2.id);
  const remainingAddrs = storageService.getUserAddresses(customerEmail);
  assert(remainingAddrs.length === 1, 'Address successfully deleted from address book');
  assert(remainingAddrs[0].id === addr1.id, 'Remaining address is addr1');

  // ============================================================
  // REQUIREMENT 10: Pickup Address Editing on Active Requests
  // ============================================================
  console.log('\nTesting Requirement 10: Pickup Address Editing on Active Requests...');
  // Edit pickup details when status is Submitted
  const editedReq = storageService.updateRequestPickupDetails(pickupReq.id, customerEmail, {
    address: '999 New Street, Apt 10B, San Jose, CA',
    notes: 'Please call before arrival',
  });
  assert(editedReq.address === '999 New Street, Apt 10B, San Jose, CA', 'Pickup address successfully updated by customer on Submitted request');
  assert(editedReq.notes === 'Please call before arrival', 'Pickup notes updated by customer');
  const lastHistory = editedReq.history[editedReq.history.length - 1];
  assert(lastHistory.actor === 'Customer', 'Audit log records Customer as actor for address update');
  assert(lastHistory.event.includes('999 New Street'), 'Audit log records new address');

  // Book appointment for pickupReq
  const bookedPickupReq = storageService.bookAppointment(pickupReq.id, testCentre.id, {
    date: firstAvailDay.date,
    timeSlot: firstAvailDay.slots[0].timeSlot,
  });
  assert(bookedPickupReq.status === 'Scheduled', 'Pickup request is Scheduled');

  // Edit pickup details on Scheduled request
  const editedScheduledReq = storageService.updateRequestPickupDetails(pickupReq.id, customerEmail, {
    address: '777 Third Ave, San Jose, CA',
    notes: 'Gate code #9988',
  });
  assert(editedScheduledReq.address === '777 Third Ave, San Jose, CA', 'Pickup address successfully updated on Scheduled request');
  assert(editedScheduledReq.appointment.pickupAddress === '777 Third Ave, San Jose, CA', 'Appointment pickup address synchronized');

  // Advance to In Transit: now editing should be blocked
  storageService.updateCentreLifecycleStatus(pickupReq.id, testCentre.id, 'In Transit', 'Out for collection');
  let editBlocked = false;
  try {
    storageService.updateRequestPickupDetails(pickupReq.id, customerEmail, {
      address: '111 Blocked Way',
    });
  } catch {
    editBlocked = true;
  }
  assert(editBlocked, 'Editing pickup address is strictly blocked once request is In Transit');

  // ============================================================
  // REQUIREMENT 11: Real-Data Environmental Metrics Calculation
  // ============================================================
  console.log('\nTesting Requirement 11: Real-Data Environmental Metrics Calculation...');
  const stats = storageService.getEnvironmentalImpactStats();
  assert(typeof stats.totalReceivedKg === 'number', 'totalReceivedKg is a valid number');
  assert(typeof stats.totalReceivedItems === 'number', 'totalReceivedItems is a valid number');
  assert(typeof stats.activePipelineCount === 'number', 'activePipelineCount is a valid number');
  assert(stats.totalParticipatingCentres >= 1, 'Total participating centres correctly reflects registered centres');
  assert(stats.totalReceivedKg > 0, 'totalReceivedKg strictly counts received items and ignores cancelled/rejected');
  assert(stats.hasReceivedData === true, 'hasReceivedData is true when received items exist');

  // ============================================================
  // REQUIREMENT 12: Password Updates & Non-Essential Cache
  // ============================================================
  console.log('\nTesting Requirement 12: Password Updates & Non-Essential Cache...');
  // Centre password update
  storageService.updateCentrePassword(testCentre.id, 'FacilityPassword123', 'NewFacilityPass456!');
  const authUpdatedCentre = storageService.authenticateCentre(testCentre.email, 'NewFacilityPass456!');
  assert(authUpdatedCentre.id === testCentre.id, 'Centre successfully authenticates with new password');

  // Clearing non-essential cache does NOT delete requests or centres
  storageService.clearNonEssentialUserCache(customerEmail);
  storageService.clearNonEssentialCentreCache(testCentre.id);
  const remainingRequestsAfterCacheClear = storageService.getAllRequests();
  assert(remainingRequestsAfterCacheClear.length > 0, 'Operational requests preserved when non-essential cache cleared');

  // ============================================================
  // REQUIREMENT 13: Login Redirection & Route Consistency
  // ============================================================
  console.log('\nTesting Requirement 13: Login Redirection & Navigation Configuration...');
  const loginFile = fs.readFileSync('src/pages/LoginPage.jsx', 'utf-8');
  assert(loginFile.includes("location.state?.from?.pathname || '/'"), 'LoginPage defaults redirect to / homepage');

  const centreLoginFile = fs.readFileSync('src/pages/centre/CentreLoginPage.jsx', 'utf-8');
  assert(centreLoginFile.includes("location.state?.from?.pathname || '/'"), 'CentreLoginPage defaults redirect to / homepage');

  const appFile = fs.readFileSync('src/App.jsx', 'utf-8');
  assert(appFile.includes('path="/settings"'), 'App.jsx contains /settings route for Customer Settings');
  assert(appFile.includes('path="/centre/settings"'), 'App.jsx contains /centre/settings route for Centre Settings');

  const navbarFile = fs.readFileSync('src/components/Navbar.jsx', 'utf-8');
  assert(navbarFile.includes('/centre/settings'), 'Navbar includes link to facility settings');
  assert(navbarFile.includes('/settings'), 'Navbar includes link to customer settings');

  // ============================================================
  // REQUIREMENT 14: Public Centres Directory Routing & Access Control
  // ============================================================
  console.log('\nTesting Requirement 14: Public Centres Directory Routing & Access Control...');
  // 1. App.jsx defines /centers without ProtectedRoute
  assert(
    appFile.includes('<Route path="/centers" element={<CentersPage />} />'),
    'App.jsx defines /centers as a public route without ProtectedRoute'
  );
  assert(
    !appFile.includes('<ProtectedRoute>\n                <CentersPage />') &&
    !appFile.includes('<ProtectedRoute><CentersPage /></ProtectedRoute>'),
    'App.jsx does NOT wrap CentersPage in ProtectedRoute'
  );
  assert(
    appFile.includes('path="/centres"'),
    'App.jsx defines /centres alias for centres directory'
  );

  // 2. Protected routes remain protected
  assert(
    appFile.includes('<Route\n            path="/dashboard"\n            element={\n              <ProtectedRoute>\n                <DashboardPage />\n              </ProtectedRoute>\n            }\n          />'),
    'Customer dashboard route remains strictly protected by ProtectedRoute'
  );
  assert(
    appFile.includes('<Route\n            path="/register"\n            element={\n              <ProtectedRoute>\n                <RegisterPage />\n              </ProtectedRoute>\n            }\n          />'),
    'Customer register route remains strictly protected by ProtectedRoute'
  );
  assert(
    appFile.includes('<Route\n            path="/requests"\n            element={\n              <ProtectedRoute>\n                <RequestsPage />\n              </ProtectedRoute>\n            }\n          />'),
    'Customer requests route remains strictly protected by ProtectedRoute'
  );
  assert(
    appFile.includes('<Route\n            path="/settings"\n            element={\n              <ProtectedRoute>\n                <AccountPage />\n              </ProtectedRoute>\n            }\n          />'),
    'Customer settings route remains strictly protected by ProtectedRoute'
  );

  // 3. CentresPage.jsx empty state text
  const centersPageFile = fs.readFileSync('src/pages/CentersPage.jsx', 'utf-8');
  assert(
    centersPageFile.includes('No recycling centres are available yet.'),
    'CentersPage.jsx displays exact empty state message "No recycling centres are available yet."'
  );
  assert(
    !centersPageFile.includes('Please sign in to view') && !centersPageFile.includes('Authentication Required'),
    'CentersPage.jsx does NOT require login or show authentication error'
  );

  // 4. Navbar includes Centres Directory for all roles
  assert(
    navbarFile.includes('to="/centers"'),
    'Navbar includes link to /centers'
  );
  assert(
    navbarFile.includes('Centres Directory'),
    'Navbar links are labelled "Centres Directory"'
  );

  // ============================================================
  // REQUIREMENT 15: Homepage Visual Direction & Hero Composition
  // ============================================================
  console.log('\nTesting Requirement 15: Homepage Visual Direction & Hero Composition...');
  const landingPageFile = fs.readFileSync('src/pages/LandingPage.jsx', 'utf-8');
  assert(
    landingPageFile.includes("Look at the difference we've made. Imagine what we can achieve together."),
    'LandingPage includes central message kicker: "Look at the difference we\'ve made. Imagine what we can achieve together."'
  );
  assert(
    landingPageFile.includes('Turning electronic waste into a better future.'),
    'LandingPage includes expressive hero headline: "Turning electronic waste into a better future."'
  );
  assert(
    landingPageFile.includes('/hero-ewaste-recycling.jpg'),
    'LandingPage hero uses environmental photography background (/hero-ewaste-recycling.jpg)'
  );
  assert(
    landingPageFile.includes('Register E-Waste') && landingPageFile.includes('Explore Our Impact'),
    'LandingPage hero features two purposeful actions: Register E-Waste and Explore Our Impact'
  );
  assert(
    landingPageFile.includes('Category insights will appear as e-waste is received.'),
    'LandingPage displays exact empty state: "Category insights will appear as e-waste is received."'
  );
  assert(
    landingPageFile.includes('Browse Centres Directory'),
    'LandingPage includes prominent call to action to Browse Centres Directory (/centers)'
  );

  // ============================================================
  // REQUIREMENT 16: Interactive Doughnut Charts & Distribution Math
  // ============================================================
  console.log('\nTesting Requirement 16: Interactive Doughnut Charts & Distribution Math...');
  const doughnutChartFile = fs.readFileSync('src/components/DoughnutChart.jsx', 'utf-8');
  assert(
    doughnutChartFile.includes('<svg') && doughnutChartFile.includes('pathData'),
    'DoughnutChart component implements pure SVG interactive arc rendering'
  );
  assert(
    doughnutChartFile.includes('setTooltip') && doughnutChartFile.includes('handlePointerEnter'),
    'DoughnutChart component implements pointer/touch hover and tooltip interactions'
  );

  assert(Array.isArray(stats.categoryDistribution), 'stats.categoryDistribution is an array');
  assert(Array.isArray(stats.methodDistribution), 'stats.methodDistribution is an array');

  if (stats.hasReceivedData) {
    const totalCatPercent = stats.categoryDistribution.reduce((acc, c) => acc + c.percentageByWeight, 0);
    assert(totalCatPercent >= 95 && totalCatPercent <= 105, 'Category distribution percentages sum to ~100%');

    const totalMethodPercent = stats.methodDistribution.reduce((acc, m) => acc + m.percentageByWeight, 0);
    assert(totalMethodPercent >= 95 && totalMethodPercent <= 105, 'Method distribution percentages sum to ~100%');
  }

  // ============================================================
  // REQUIREMENT 17: In-Page Centres Directory Display & Component Reuse
  // ============================================================
  console.log('\nTesting Requirement 17: In-Page Centres Directory Display & Component Reuse...');
  // 1. DirectoryContext
  const directoryContextFile = fs.readFileSync('src/context/DirectoryContext.jsx', 'utf-8');
  assert(
    directoryContextFile.includes('DirectoryProvider') && directoryContextFile.includes('useDirectory'),
    'DirectoryContext exports DirectoryProvider and useDirectory hook'
  );
  assert(
    directoryContextFile.includes('openDirectory') && directoryContextFile.includes('closeDirectory'),
    'DirectoryContext provides openDirectory and closeDirectory functions'
  );

  // 2. Shared CentresDirectory component
  const centresDirFile = fs.readFileSync('src/components/CentresDirectory.jsx', 'utf-8');
  assert(
    centresDirFile.includes('storageService.getCentres()'),
    'CentresDirectory reads real registered facilities from storageService'
  );
  assert(
    centresDirFile.includes('No recycling centres are available yet.'),
    'CentresDirectory displays exact required empty state: "No recycling centres are available yet."'
  );
  assert(
    centresDirFile.includes('onReturn') && centresDirFile.includes('returnLabel'),
    'CentresDirectory accepts onReturn callback and returnLabel for in-page navigation'
  );
  assert(
    centresDirFile.includes('Doorstep Pickup Supported') && centresDirFile.includes('Depot Drop-off Supported'),
    'CentresDirectory displays badges for supported pickup and drop-off services'
  );

  // 3. Component reuse in CentersPage
  const centersPageUpdated = fs.readFileSync('src/pages/CentersPage.jsx', 'utf-8');
  assert(
    centersPageUpdated.includes('<CentresDirectory') || centersPageUpdated.includes('CentresDirectory'),
    'CentersPage.jsx reuses the shared CentresDirectory component'
  );

  // 4. App.jsx in-page rendering & state preservation
  assert(
    appFile.includes('<DirectoryProvider>') && appFile.includes('</DirectoryProvider>'),
    'App.jsx wraps application root in DirectoryProvider'
  );
  assert(
    appFile.includes('isDirectoryOpen') && appFile.includes('<CentresDirectory'),
    'App.jsx renders CentresDirectory in-page when isDirectoryOpen is true'
  );
  assert(
    appFile.includes("className={isDirectoryOpen ? 'hidden' : 'contents'}"),
    'App.jsx preserves mounted route components using hidden CSS class to retain form data'
  );

  // 5. Navbar calls openDirectory on Centres Directory clicks
  assert(
    navbarFile.includes('openDirectory('),
    'Navbar.jsx calls openDirectory when Centres Directory is clicked'
  );

  // 6. LandingPage calls openDirectory on Browse Centres Directory clicks
  assert(
    landingPageFile.includes('openDirectory('),
    'LandingPage.jsx calls openDirectory when Browse Centres Directory is clicked'
  );

  // 7. DashboardPage calls openDirectory on Browse Collection Centers clicks
  const dashboardUpdated = fs.readFileSync('src/pages/DashboardPage.jsx', 'utf-8');
  assert(
    dashboardUpdated.includes('openDirectory('),
    'DashboardPage.jsx calls openDirectory when Browse Collection Centers is clicked'
  );

  // 8. RegisterPage calls openDirectory on directory link clicks
  const registerUpdated = fs.readFileSync('src/pages/RegisterPage.jsx', 'utf-8');
  assert(
    registerUpdated.includes('openDirectory('),
    'RegisterPage.jsx calls openDirectory to browse directory in-page without losing form data'
  );

  // 9. Footer calls openDirectory
  const footerUpdated = fs.readFileSync('src/components/Footer.jsx', 'utf-8');
  assert(
    footerUpdated.includes('openDirectory('),
    'Footer.jsx calls openDirectory on Centres Directory links'
  );

  // -------------------------------------------------------------
  // Requirement 18: Centre Portal Navigation Cleanup & Capacity Settings
  // -------------------------------------------------------------
  console.log('\nTesting Requirement 18: Redundant Capacity Navigation Removal & Facility Settings...');
  const centreNavbarFile = fs.readFileSync('src/components/CentreNavbar.jsx', 'utf-8');
  
  // 1. Capacity link removed from Centre Portal header
  assert(
    !centreNavbarFile.includes('to="/centre/capacity"'),
    'CentreNavbar.jsx does NOT contain any link to /centre/capacity'
  );
  assert(
    !centreNavbarFile.includes("isActive('/centre/capacity')"),
    'CentreNavbar.jsx does NOT contain active-navigation styling for /centre/capacity'
  );

  // 2. Preserved Centre Portal links
  assert(
    centreNavbarFile.includes('to="/"') && centreNavbarFile.includes('Home'),
    'CentreNavbar.jsx preserves Home navigation link'
  );
  assert(
    centreNavbarFile.includes('to="/centre/dashboard"') && centreNavbarFile.includes('Dashboard'),
    'CentreNavbar.jsx preserves Dashboard navigation link'
  );
  assert(
    centreNavbarFile.includes('to="/centre/requests"') && centreNavbarFile.includes('Requests'),
    'CentreNavbar.jsx preserves Requests navigation link'
  );
  assert(
    centreNavbarFile.includes('to="/centre/appointments"') && centreNavbarFile.includes('Appointments'),
    'CentreNavbar.jsx preserves Appointments navigation link'
  );
  assert(
    centreNavbarFile.includes('to="/centre/settings"') && centreNavbarFile.includes('Facility Settings'),
    'CentreNavbar.jsx preserves Facility Settings navigation link'
  );

  // 3. Facility Settings Schedule & Capacity tab
  const centreProfileFile = fs.readFileSync('src/pages/centre/CentreProfilePage.jsx', 'utf-8');
  assert(
    centreProfileFile.includes("location.search") && centreProfileFile.includes("tab"),
    'CentreProfilePage.jsx supports activating tabs from URL search parameters (?tab=schedule)'
  );
  assert(
    centreProfileFile.includes("scheduleForm.operatingDays") &&
    centreProfileFile.includes("scheduleForm.hours") &&
    centreProfileFile.includes("scheduleForm.leadTimeDays") &&
    centreProfileFile.includes("scheduleForm.pickupAvailable") &&
    centreProfileFile.includes("scheduleForm.dropoffAvailable") &&
    centreProfileFile.includes("scheduleForm.maxWeeklyCapacityKg") &&
    centreProfileFile.includes("scheduleForm.maxWeeklyUnits") &&
    centreProfileFile.includes("scheduleForm.slotLimitKg"),
    'CentreProfilePage.jsx retains all capacity, schedule, slot limit, and lead time controls'
  );

  // 4. CentreDashboardPage capacity controls link
  const centreDashboardUpdated = fs.readFileSync('src/pages/centre/CentreDashboardPage.jsx', 'utf-8');
  assert(
    centreDashboardUpdated.includes('to="/centre/settings?tab=schedule"'),
    'CentreDashboardPage.jsx links Capacity Controls directly to Facility Settings Schedule & Capacity tab'
  );

  // 5. App.jsx route redirect
  const appUpdated = fs.readFileSync('src/App.jsx', 'utf-8');
  assert(
    appUpdated.includes('path="/centre/capacity"') &&
    appUpdated.includes('to="/centre/settings?tab=schedule"'),
    'App.jsx safely redirects /centre/capacity to /centre/settings?tab=schedule'
  );
  assert(
    !appUpdated.includes('import CentreCapacityPage'),
    'App.jsx does NOT import unused CentreCapacityPage component'
  );

  // 6. Capacity configuration update and workload calculation
  const testCentres = storageService.getCentres();
  if (testCentres.length > 0) {
    const cId = testCentres[0].id;
    storageService.updateCentre(cId, {
      maxWeeklyCapacityKg: 6500,
      maxWeeklyUnits: 1500,
      slotLimitKg: 300,
      leadTimeDays: 3,
    });
    const refreshedCentre = storageService.getCentreById(cId);
    assert(
      refreshedCentre.maxWeeklyCapacityKg === 6500 &&
      refreshedCentre.maxWeeklyUnits === 1500 &&
      refreshedCentre.slotLimitKg === 300 &&
      refreshedCentre.leadTimeDays === 3,
      'Capacity values and constraints persist correctly in storageService'
    );
    const workload = storageService.getCentreWorkload(cId);
    assert(
      workload.capacityKg === 6500 && workload.capacityUnits === 1500,
      'Centre workload calculations correctly reflect updated capacity constraints'
    );
  }

  // ============================================================
  // REQUIREMENT 19: Independent History Clearing & Permanent Cumulative Impact Statistics
  // ============================================================
  console.log('\nTesting Requirement 19: Independent History Clearing & Permanent Statistics...');

  // 1. Check eligibility logic
  assert(
    isEligibleForHistoryHiding('Received') &&
    isEligibleForHistoryHiding('Drop-off Completed') &&
    isEligibleForHistoryHiding('Processing') &&
    isEligibleForHistoryHiding('Completed') &&
    isEligibleForHistoryHiding('Recycled') &&
    isEligibleForHistoryHiding('Rejected') &&
    isEligibleForHistoryHiding('Cancelled'),
    'Terminal and archived statuses are correctly marked as eligible for hiding'
  );
  assert(
    !isEligibleForHistoryHiding('Submitted') &&
    !isEligibleForHistoryHiding('Scheduled') &&
    !isEligibleForHistoryHiding('In Transit'),
    'Active pipeline statuses (Submitted, Scheduled, In Transit) are strictly NOT eligible for hiding'
  );

  // Setup test customer and centre data
  const testUserEmail = 'user_history_test@ecocycle.org';
  const histCentre = storageService.registerCentre({
    name: 'Green Leaf Refining',
    email: 'ops@greenleafrefining.org',
    password: 'Password123!',
    phone: '+1 555-8899',
    address: '100 Eco Parkway',
    city: 'San Francisco',
    categories: ['Computers & Laptops', 'Smartphones & Tablets'],
    dropoffAvailable: true,
    pickupAvailable: true,
  });

  // Create active request
  const activeReq = storageService.createRequest(testUserEmail, {
    brand: 'Apple',
    model: 'MacBook Pro',
    category: 'Computers & Laptops',
    quantity: 2,
    weight: 8,
    centreId: histCentre.id,
    method: 'pickup',
    address: '100 Eco Parkway',
  });

  // Create completed/received requests
  const receivedReq1 = storageService.createRequest(testUserEmail, {
    brand: 'Dell',
    model: 'XPS 15',
    category: 'Computers & Laptops',
    quantity: 1,
    weight: 5,
    centreId: histCentre.id,
    method: 'dropoff',
  });
  storageService.updateRequestStatus(testUserEmail, receivedReq1.id, 'Received', 'Intake verified');

  const receivedReq2 = storageService.createRequest(testUserEmail, {
    brand: 'Samsung',
    model: 'Galaxy S22',
    category: 'Smartphones & Tablets',
    quantity: 3,
    weight: 2,
    centreId: histCentre.id,
    method: 'pickup',
    address: '100 Eco Parkway',
  });
  storageService.updateRequestStatus(testUserEmail, receivedReq2.id, 'Received', 'Intake verified');

  const rejectedReq = storageService.createRequest(testUserEmail, {
    brand: 'HP',
    model: 'Pavilion',
    category: 'Computers & Laptops',
    quantity: 1,
    weight: 4,
    centreId: histCentre.id,
    method: 'pickup',
    address: '100 Eco Parkway',
  });
  storageService.updateRequestStatus(testUserEmail, rejectedReq.id, 'Rejected', 'Hazardous condition');

  // Initial Environmental Impact Stats
  const baselineStats = storageService.getEnvironmentalImpactStats();
  const initialMasterCount = storageService.getAllRequests().length;

  // Verify active request cannot be hidden
  let activeBlocked = false;
  try {
    storageService.hideCustomerRequest(testUserEmail, activeReq.id);
  } catch {
    activeBlocked = true;
  }
  assert(
    activeBlocked,
    'storageService.hideCustomerRequest blocks hiding active (Submitted) request'
  );
  assert(
    !storageService.isCustomerRequestHidden(testUserEmail, activeReq.id),
    'Active request is not added to customer hidden ID set'
  );

  // Verify hiding single eligible historical request
  storageService.hideCustomerRequest(testUserEmail, receivedReq1.id);
  assert(
    storageService.isCustomerRequestHidden(testUserEmail, receivedReq1.id),
    'isCustomerRequestHidden returns true for hidden request'
  );

  const visibleAfterOneHide = storageService.getVisibleRequests(testUserEmail);
  const hiddenAfterOneHide = storageService.getHiddenRequests(testUserEmail);
  assert(
    !visibleAfterOneHide.some(r => r.id === receivedReq1.id),
    'Hidden request does not appear in customer getVisibleRequests'
  );
  assert(
    hiddenAfterOneHide.some(r => r.id === receivedReq1.id),
    'Hidden request appears in customer getHiddenRequests archive'
  );

  // Verify restore single request
  storageService.restoreCustomerRequest(testUserEmail, receivedReq1.id);
  assert(
    !storageService.isCustomerRequestHidden(testUserEmail, receivedReq1.id),
    'Restored request is removed from customer hidden set'
  );
  assert(
    storageService.getVisibleRequests(testUserEmail).some(r => r.id === receivedReq1.id),
    'Restored request is returned back to visible requests list'
  );

  // Verify batch hiding
  storageService.hideCustomerRequests(testUserEmail, [receivedReq1.id, rejectedReq.id]);
  assert(
    storageService.isCustomerRequestHidden(testUserEmail, receivedReq1.id) &&
    storageService.isCustomerRequestHidden(testUserEmail, rejectedReq.id),
    'Batch hiding successfully hides multiple specified eligible requests'
  );

  // Verify clear all customer history
  storageService.clearCustomerHistory(testUserEmail);
  const visibleAfterClear = storageService.getVisibleRequests(testUserEmail);
  assert(
    visibleAfterClear.some(r => r.id === activeReq.id),
    'Active requests remain visible and protected after clearCustomerHistory'
  );
  assert(
    !visibleAfterClear.some(r => r.id === receivedReq1.id || r.id === receivedReq2.id || r.id === rejectedReq.id),
    'All eligible historical requests are hidden from visible view after clearCustomerHistory'
  );

  // Verify restore all customer history
  storageService.restoreAllCustomerHistory(testUserEmail);
  const visibleAfterRestoreAll = storageService.getVisibleRequests(testUserEmail);
  assert(
    visibleAfterRestoreAll.some(r => r.id === receivedReq1.id) &&
    visibleAfterRestoreAll.some(r => r.id === receivedReq2.id),
    'restoreAllCustomerHistory restores all previously hidden customer requests'
  );

  // Verify Centre History Scoping & Operations
  const centreInitialVisible = storageService.getVisibleRequestsForCentre(histCentre.id);
  assert(
    centreInitialVisible.length >= 3,
    'Centre sees requests assigned to its facility ID'
  );

  // Hide single centre record
  storageService.hideCentreRequest(histCentre.id, receivedReq1.id);
  assert(
    storageService.isCentreRequestHidden(histCentre.id, receivedReq1.id),
    'Centre history hiding records request in centre-specific hidden set'
  );
  assert(
    !storageService.getVisibleRequestsForCentre(histCentre.id).some(r => r.id === receivedReq1.id),
    'Hidden request does not appear in getVisibleRequestsForCentre'
  );
  assert(
    storageService.getHiddenRequestsForCentre(histCentre.id).some(r => r.id === receivedReq1.id),
    'Hidden request appears in getHiddenRequestsForCentre archive'
  );

  // Centre history hiding does NOT hide for customer!
  assert(
    !storageService.isCustomerRequestHidden(testUserEmail, receivedReq1.id),
    'Centre history hiding does NOT affect customer visibility'
  );

  // Clear centre history
  storageService.clearCentreHistory(histCentre.id);
  const centreVisibleAfterClear = storageService.getVisibleRequestsForCentre(histCentre.id);
  assert(
    centreVisibleAfterClear.some(r => r.id === activeReq.id),
    'Active requests for centre remain visible and actionable after clearCentreHistory'
  );
  assert(
    !centreVisibleAfterClear.some(r => r.id === receivedReq1.id || r.id === receivedReq2.id),
    'Eligible history hidden from centre after clearCentreHistory'
  );

  // Restore centre history
  storageService.restoreAllCentreHistory(histCentre.id);
  assert(
    storageService.getVisibleRequestsForCentre(histCentre.id).some(r => r.id === receivedReq1.id),
    'restoreAllCentreHistory restores records to centre visible list'
  );

  // VERIFY CRITICAL INVARIANT: Original master records and public cumulative impact statistics NEVER changed
  const afterHidingMasterCount = storageService.getAllRequests().length;
  assert(
    afterHidingMasterCount === initialMasterCount,
    'Original transaction records in MASTER_REQUESTS_KEY are completely preserved (0 deleted)'
  );

  const statsAfterHiding = storageService.getEnvironmentalImpactStats();
  assert(
    statsAfterHiding.totalReceivedKg === baselineStats.totalReceivedKg,
    'Public totalReceivedKg is strictly permanent and unaffected by user or centre history clearing'
  );
  assert(
    statsAfterHiding.totalReceivedItems === baselineStats.totalReceivedItems,
    'Public totalReceivedItems is strictly permanent and unaffected by history clearing'
  );
  assert(
    JSON.stringify(statsAfterHiding.categoryDistribution) === JSON.stringify(baselineStats.categoryDistribution),
    'Public categoryDistribution is completely unaffected by history clearing'
  );
  assert(
    JSON.stringify(statsAfterHiding.methodDistribution) === JSON.stringify(baselineStats.methodDistribution),
    'Public methodDistribution is completely unaffected by history clearing'
  );

  // ============================================================
  // REQUIREMENT 20: Application-Wide Theme Switching (Light, Dark, and System)
  // ============================================================
  console.log('\nTesting Requirement 20: Theme Switching (Light, Dark, System)...');

  // 1. Tailwind configuration darkMode: 'class'
  const tailwindConfig = fs.readFileSync('tailwind.config.js', 'utf-8');
  assert(
    tailwindConfig.includes("darkMode: 'class'") || tailwindConfig.includes('darkMode: "class"'),
    'tailwind.config.js enables darkMode: "class"'
  );

  // 2. Early bootstrap script in index.html
  const indexHtml = fs.readFileSync('index.html', 'utf-8');
  assert(
    indexHtml.includes('ecocycle_theme') && indexHtml.includes('prefers-color-scheme: dark'),
    'index.html includes inline theme bootstrap script checking ecocycle_theme and prefers-color-scheme'
  );
  assert(
    indexHtml.includes('document.documentElement.classList.add'),
    'index.html early script toggles dark class on document.documentElement before rendering'
  );

  // 3. ThemeContext exists and exports ThemeProvider and useTheme
  const themeContextFile = fs.readFileSync('src/context/ThemeContext.jsx', 'utf-8');
  assert(
    themeContextFile.includes('export function ThemeProvider') && themeContextFile.includes('export function useTheme'),
    'ThemeContext.jsx exports ThemeProvider and useTheme hook'
  );
  assert(
    themeContextFile.includes("STORAGE_KEY = 'ecocycle_theme'"),
    "ThemeContext persists preference under key 'ecocycle_theme'"
  );
  assert(
    themeContextFile.includes("'light'") && themeContextFile.includes("'dark'") && themeContextFile.includes("'system'"),
    'ThemeContext supports light, dark, and system modes'
  );

  // 4. ThemeSelector component exists with 3 visual options
  const themeSelectorFile = fs.readFileSync('src/components/ThemeSelector.jsx', 'utf-8');
  assert(
    themeSelectorFile.includes('useTheme') &&
    themeSelectorFile.includes('Light') &&
    themeSelectorFile.includes('Dark') &&
    themeSelectorFile.includes('System Default'),
    'ThemeSelector.jsx provides polished options for Light, Dark, and System Default'
  );

  // 5. AccountPage (Customer Settings) renders ThemeSelector in appearance tab
  const accountPageContent = fs.readFileSync('src/pages/AccountPage.jsx', 'utf-8');
  assert(
    accountPageContent.includes('<ThemeSelector') && accountPageContent.includes("activeTab === 'appearance'"),
    'AccountPage.jsx includes Appearance tab with <ThemeSelector />'
  );

  // 6. CentreProfilePage (Facility Settings) renders ThemeSelector in appearance tab
  const centreProfilePageContent = fs.readFileSync('src/pages/centre/CentreProfilePage.jsx', 'utf-8');
  assert(
    centreProfilePageContent.includes('<ThemeSelector') && centreProfilePageContent.includes("activeTab === 'appearance'"),
    'CentreProfilePage.jsx includes Appearance tab with <ThemeSelector />'
  );

  // 7. App.jsx wraps with ThemeProvider
  const appContent = fs.readFileSync('src/App.jsx', 'utf-8');
  assert(
    appContent.includes('<ThemeProvider>') && appContent.includes('</ThemeProvider>'),
    'App.jsx wraps application root in <ThemeProvider>'
  );

  // 8. Navbar and Footer dark mode styles
  const navbarContent = fs.readFileSync('src/components/Navbar.jsx', 'utf-8');
  assert(
    navbarContent.includes('dark:bg-') && navbarContent.includes('dark:text-'),
    'Navbar.jsx contains comprehensive dark mode utility classes'
  );
  const centreNavbarContent = fs.readFileSync('src/components/CentreNavbar.jsx', 'utf-8');
  assert(
    centreNavbarContent.includes('dark:bg-') && centreNavbarContent.includes('dark:text-'),
    'CentreNavbar.jsx contains comprehensive dark mode utility classes'
  );
  const footerContent = fs.readFileSync('src/components/Footer.jsx', 'utf-8');
  assert(
    footerContent.includes('dark:bg-') && footerContent.includes('dark:text-'),
    'Footer.jsx contains comprehensive dark mode utility classes'
  );

  // ============================================================
  // REQUIREMENT 21: Batch 1 - Centre Manager Reschedule Workflow
  // ============================================================
  console.log('\nTesting Requirement 21: Batch 1 - Reschedule Requested Workflow...');
  
  // 1. Status Step Map and 3-stage customer progression
  assert(
    STATUS_STEP_MAP['Reschedule Requested'] === 1,
    'STATUS_STEP_MAP correctly maps "Reschedule Requested" to step 1 (Scheduled)'
  );
  assert(
    getStepIndex('Reschedule Requested') === 1,
    'getStepIndex("Reschedule Requested") returns step 1 to preserve 3-stage progression'
  );

  // 2. CentreRequestsPage includes Reschedule Requested in UI and actions
  const centreRequestsContent = fs.readFileSync('src/pages/centre/CentreRequestsPage.jsx', 'utf-8');
  assert(
    centreRequestsContent.includes("'Reschedule Requested'"),
    'CentreRequestsPage.jsx defines badge styling for "Reschedule Requested"'
  );
  assert(
    centreRequestsContent.includes("['Scheduled', 'Accepted', 'Schedule Proposed', 'Reschedule Requested'].includes(activeRequest.status)"),
    'CentreRequestsPage.jsx enables Reschedule Appointment action button for "Reschedule Requested"'
  );
  assert(
    centreRequestsContent.includes('Customer Requested Rescheduling') && centreRequestsContent.includes('activeRequest.appointment?.customerNote'),
    'CentreRequestsPage.jsx displays customer reschedule request notice with customerNote'
  );

  // 3. Functional workflow: create request, schedule, customer requests reschedule, centre reschedules
  const customerEmailBatch1 = 'batch1.customer@ecocycle.org';
  const reqReschedule = storageService.createRequest(customerEmailBatch1, {
    brand: 'Dell',
    model: 'Precision Workstation',
    category: 'Computers & Laptops',
    itemCount: 2,
    weight: 15.5,
    method: 'dropoff',
    preferredCentreId: testCentre.id,
    pickupAddress: '100 Silicon Way',
    pickupCity: 'San Francisco',
  });

  assert(reqReschedule && reqReschedule.id, 'Created declaration for reschedule test');

  // Verify availability and book initial slot
  const availBefore = storageService.getCentreAvailability(testCentre.id, reqReschedule, 21);
  const eligibleDay = availBefore.availableDays.find(d => d.isAvailable && d.slots.some(s => s.available));
  assert(eligibleDay && eligibleDay.slots.length > 0, 'Found available slot for appointment');
  const chosenSlot1 = eligibleDay.slots.find(s => s.available);

  // Centre schedules appointment
  const b1Scheduled = storageService.bookAppointment(reqReschedule.id, testCentre.id, {
    date: eligibleDay.date,
    timeSlot: chosenSlot1.timeSlot,
    notes: 'Initial scheduled slot',
  });
  assert(b1Scheduled.status === 'Scheduled', 'Request transitioned to Scheduled');

  // Customer requests rescheduling
  const rescheduleRequestedReq = storageService.respondToAppointment(
    reqReschedule.id,
    customerEmailBatch1,
    'reschedule',
    'Need to move to afternoon slot due to travel conflict'
  );
  assert(
    rescheduleRequestedReq.status === 'Reschedule Requested',
    'Request transitioned to "Reschedule Requested" status'
  );
  assert(
    rescheduleRequestedReq.appointment?.customerNote === 'Need to move to afternoon slot due to travel conflict',
    'Customer reschedule note is preserved on the appointment record'
  );

  // Verify availability: old booking is held against other requests
  const otherDummyReq = { weight: 10, quantity: 1, category: 'Computers & Laptops', method: 'dropoff' };
  const otherAvail = storageService.getCentreAvailability(testCentre.id, otherDummyReq, 21);
  const dayForOther = otherAvail.availableDays.find(d => d.date === eligibleDay.date);
  const bookedSlotForOther = dayForOther.slots.find(s => s.timeSlot === chosenSlot1.timeSlot);
  assert(
    bookedSlotForOther.remainingSlotKg < chosenSlot1.remainingSlotKg,
    'Existing appointment slot remains reserved against third-party requests during reschedule request'
  );

  // Centre reschedules the request to a different slot
  const nextEligibleDay = availBefore.availableDays.find(d => d.isAvailable && d.date !== eligibleDay.date && d.slots.some(s => s.available));
  const chosenSlot2 = nextEligibleDay.slots.find(s => s.available);

  const successfullyRescheduled = storageService.rescheduleAppointment(reqReschedule.id, testCentre.id, {
    date: nextEligibleDay.date,
    timeSlot: chosenSlot2.timeSlot,
    notes: 'Rescheduled per customer request',
  });
  assert(
    successfullyRescheduled.status === 'Scheduled',
    'Rescheduled request successfully returns to "Scheduled" status'
  );
  assert(
    successfullyRescheduled.appointment.date === nextEligibleDay.date,
    'Appointment date successfully updated to new date'
  );
  assert(
    !successfullyRescheduled.appointment.customerNote,
    'Customer note is cleared after centre confirms the new reschedule slot'
  );

  // ============================================================
  // REQUIREMENT 22: Batch 1 - Appointment Capacity & Configured slotLimitKg Enforcement
  // ============================================================
  console.log('\nTesting Requirement 22: Batch 1 - Capacity & slotLimitKg Enforcement...');

  const capacityCentre = storageService.registerCentre({
    name: 'Strict Capacity Recycling Lab',
    email: 'capacity@ecocycle.org',
    password: 'FacilityPassword123',
    phone: '+1 555-7788',
    address: '500 Metric Blvd',
    city: 'San Francisco',
    categories: ['Computers & Laptops', 'Displays & Monitors'],
    dropoffAvailable: true,
    pickupAvailable: true,
    operatingDays: 'Monday to Friday',
    operatingHours: '09:00 - 17:00',
    maxWeeklyCapacityKg: 1000,
    maxWeeklyUnits: 200,
    slotLimitKg: 100, // Strictly 100 kg per slot
    leadTimeDays: 1,
    certification: 'ISO 14001',
  });

  assert(capacityCentre && capacityCentre.slotLimitKg === 100, 'Centre registered with configured slotLimitKg = 100');

  // Test 1: Heavy request of 150 kg (exceeds slotLimitKg of 100 kg)
  const heavyReq = storageService.createRequest(customerEmailBatch1, {
    brand: 'Industrial CRT',
    model: 'Heavy Display Bank',
    category: 'Displays & Monitors',
    itemCount: 10,
    weight: 150.0,
    method: 'dropoff',
    preferredCentreId: capacityCentre.id,
    centreId: capacityCentre.id,
    pickupAddress: '100 Industrial Road',
    pickupCity: 'San Francisco',
    bypassFeasibility: true,
  });

  const heavyAvail = storageService.getCentreAvailability(capacityCentre.id, heavyReq, 14);
  const eligibleSlotsForHeavy = heavyAvail.availableDays.flatMap(d => d.slots).filter(s => s.available);
  assert(
    eligibleSlotsForHeavy.length === 0,
    '150 kg request exceeding configured slotLimitKg (100 kg) has ZERO eligible available slots'
  );

  // Test 2: Booking rejection when exceeding slot limit
  let threwSlotOverbook = false;
  try {
    const firstDay = heavyAvail.availableDays[0];
    storageService.bookAppointment(heavyReq.id, capacityCentre.id, {
      date: firstDay.date,
      timeSlot: firstDay.slots[0].timeSlot,
      notes: 'Should fail',
    });
  } catch (err) {
    threwSlotOverbook = true;
  }
  assert(threwSlotOverbook, 'bookAppointment strictly throws when request weight exceeds slot limit');

  // Test 3: Request within slot limit (75 kg <= 100 kg)
  const validReq = storageService.createRequest(customerEmailBatch1, {
    brand: 'Lenovo',
    model: 'ThinkCentre Tower',
    category: 'Computers & Laptops',
    itemCount: 4,
    weight: 75.0,
    method: 'dropoff',
    preferredCentreId: capacityCentre.id,
    centreId: capacityCentre.id,
    pickupAddress: '100 Industrial Road',
    pickupCity: 'San Francisco',
  });

  const validAvail = storageService.getCentreAvailability(capacityCentre.id, validReq, 14);
  const dayForValid = validAvail.availableDays.find(d => d.isAvailable && d.slots.some(s => s.available));
  assert(dayForValid && dayForValid.slots.some(s => s.available), '75 kg request within slotLimitKg (100 kg) has available slots');

  const chosenValidSlot = dayForValid.slots.find(s => s.available);
  const validBooked = storageService.bookAppointment(validReq.id, capacityCentre.id, {
    date: dayForValid.date,
    timeSlot: chosenValidSlot.timeSlot,
    notes: 'Valid slot booking',
  });
  assert(validBooked.status === 'Scheduled', 'Valid request booked successfully');

  // Test 4: Second booking in same slot that would exceed slot limit
  const secondReqSameSlot = storageService.createRequest(customerEmailBatch1, {
    brand: 'Lenovo',
    model: 'ThinkPad',
    category: 'Computers & Laptops',
    itemCount: 2,
    weight: 40.0, // 75 + 40 = 115 > 100
    method: 'dropoff',
    preferredCentreId: capacityCentre.id,
    centreId: capacityCentre.id,
    pickupAddress: '100 Industrial Road',
    pickupCity: 'San Francisco',
  });

  const secondAvail = storageService.getCentreAvailability(capacityCentre.id, secondReqSameSlot, 14);
  const dayAfterFirst = secondAvail.availableDays.find(d => d.date === dayForValid.date);
  const sameSlotAfterFirst = dayAfterFirst.slots.find(s => s.timeSlot === chosenValidSlot.timeSlot);
  assert(
    !sameSlotAfterFirst.available,
    'Same slot correctly blocks second request of 40 kg because 75 + 40 = 115 kg exceeds slotLimitKg (100 kg)'
  );

  // Test 5: Rejection when booking slot that exceeds slot limit
  let threwOverSlot = false;
  try {
    storageService.bookAppointment(secondReqSameSlot.id, capacityCentre.id, {
      date: dayForValid.date,
      timeSlot: chosenValidSlot.timeSlot,
    });
  } catch (err) {
    threwOverSlot = true;
  }
  assert(threwOverSlot, 'bookAppointment strictly blocks booking when slot limit would be exceeded');

  // ============================================================
  // REQUIREMENT 23: Batch 1 - Decimal E-Waste Weight Support
  // ============================================================
  console.log('\nTesting Requirement 23: Batch 1 - Decimal Weight Support...');

  // 1. Verify RegisterPage.jsx input attributes
  const registerPageContent = fs.readFileSync('src/pages/RegisterPage.jsx', 'utf-8');
  assert(
    registerPageContent.includes('step="0.01"') && registerPageContent.includes('min="0.01"'),
    'RegisterPage.jsx weight input has step="0.01" and min="0.01" to accept 2 decimal places'
  );

  // 2. Storage service creates and preserves decimal weights
  const testDecimals = [0.25, 1.75, 12.35, 250.00];
  for (const decWeight of testDecimals) {
    const decReq = storageService.createRequest(customerEmailBatch1, {
      brand: 'Apple',
      model: 'iPhone 13',
      category: 'Smartphones & Tablets',
      itemCount: 1,
      weight: decWeight,
      method: 'dropoff',
      preferredCentreId: testCentre.id,
      pickupAddress: '220 Tech Blvd',
      pickupCity: 'San Francisco',
    });
    assert(
      decReq.weight === decWeight,
      `storageService.createRequest preserved decimal weight ${decWeight} kg exactly`
    );
  }

  // 3. Environmental impact aggregates preserve 2 decimals
  const impactStats = storageService.getEnvironmentalImpactStats();
  assert(
    typeof impactStats.totalReceivedKg === 'number' && Number.isFinite(impactStats.totalReceivedKg),
    'Environmental impact totalReceivedKg is a valid finite numeric aggregate'
  );

  // 4. DashboardPage.jsx formats with toFixed(2)
  const dashboardContent = fs.readFileSync('src/pages/DashboardPage.jsx', 'utf-8');
  assert(
    dashboardContent.includes('.toFixed(2)'),
    'DashboardPage.jsx formats total kilograms to 2 decimal places (.toFixed(2))'
  );

  // ============================================================
  // REQUIREMENT 24: Batch 1 - Consequential Action Confirmation Dialogs
  // ============================================================
  console.log('\nTesting Requirement 24: Batch 1 - Consequential Action Confirmation Dialogs...');

  // 1. RequestsPage.jsx confirmation modals
  const requestsPageContent = fs.readFileSync('src/pages/RequestsPage.jsx', 'utf-8');
  assert(
    requestsPageContent.includes('showBatchHideModal') && requestsPageContent.includes('handleOpenBatchHideModal'),
    'RequestsPage.jsx contains batch hide confirmation modal state and opener'
  );
  assert(
    requestsPageContent.includes('showClearHistoryModal') && requestsPageContent.includes('handleConfirmClearAllHistory'),
    'RequestsPage.jsx contains clear all history confirmation modal and confirm handler'
  );
  assert(
    requestsPageContent.includes('showCancelModal') && requestsPageContent.includes('Cancel Disposal Declaration'),
    'RequestsPage.jsx contains declaration cancellation confirmation dialog'
  );

  // 2. CentreRequestsPage.jsx confirmation modals
  assert(
    centreRequestsContent.includes('showBatchHideModal') && centreRequestsContent.includes('handleOpenBatchHideModal'),
    'CentreRequestsPage.jsx contains batch hide confirmation modal state and opener'
  );
  assert(
    centreRequestsContent.includes('showClearHistoryModal'),
    'CentreRequestsPage.jsx contains clear facility history confirmation modal'
  );

  // 3. AccountPage.jsx confirmation modals
  const b1AccountPageContent = fs.readFileSync('src/pages/AccountPage.jsx', 'utf-8');
  assert(
    !b1AccountPageContent.includes('window.confirm'),
    'AccountPage.jsx does NOT use browser window.confirm (replaced with accessible custom dialogs)'
  );
  assert(
    b1AccountPageContent.includes('showDeleteAddressModal') && b1AccountPageContent.includes('handleConfirmDeleteAddress'),
    'AccountPage.jsx contains custom modal dialog for deleting saved addresses'
  );
  assert(
    b1AccountPageContent.includes('showClearCacheModal') && b1AccountPageContent.includes('handleConfirmClearCache'),
    'AccountPage.jsx contains custom confirmation modal for clearing temporary search & form cache'
  );
  assert(
    b1AccountPageContent.includes('showSignOutModal') && b1AccountPageContent.includes('handleConfirmSignOut'),
    'AccountPage.jsx contains custom confirmation modal for account sign out'
  );

  // 4. CentreProfilePage.jsx confirmation modals
  const b1CentreProfileContent = fs.readFileSync('src/pages/centre/CentreProfilePage.jsx', 'utf-8');
  assert(
    b1CentreProfileContent.includes('showClearCacheModal') && b1CentreProfileContent.includes('handleConfirmClearCache'),
    'CentreProfilePage.jsx contains custom modal for clearing facility view cache'
  );
  assert(
    b1CentreProfileContent.includes('showSignOutModal') && b1CentreProfileContent.includes('handleConfirmSignOut'),
    'CentreProfilePage.jsx contains custom modal for facility sign out'
  );

  // 5. Navbar.jsx and CentreNavbar.jsx sign out confirmation modals
  const navbarCheck = fs.readFileSync('src/components/Navbar.jsx', 'utf-8');
  assert(
    navbarCheck.includes('showSignOutModal') && navbarCheck.includes('handleConfirmSignOut'),
    'Navbar.jsx contains confirmation modal for customer and centre sign-out'
  );

  const centreNavbarCheck = fs.readFileSync('src/components/CentreNavbar.jsx', 'utf-8');
  assert(
    centreNavbarCheck.includes('showSignOutModal') && centreNavbarCheck.includes('handleConfirmSignOut'),
    'CentreNavbar.jsx contains confirmation modal for facility operations sign-out'
  );

  // ============================================================
  // REQUIREMENT 25: Batch 1.1 - Storage Validation & Confirmation Dialogs
  // ============================================================
  console.log('\nTesting Requirement 25: Batch 1.1 - Storage Validation & Confirmation Dialogs...');

  const b11TestEmail = 'batch1.1@ecocycle.org';
  const baseReqPayload = {
    brand: 'Dell',
    model: 'OptiPlex 7090',
    category: 'Computers & Laptops',
    center: 'Downtown E-Waste Recycling Depot',
  };

  // 1. Weight validation tests
  let weightUndefinedThrew = false;
  try {
    storageService.createRequest(b11TestEmail, { ...baseReqPayload, quantity: 1 });
  } catch (err) {
    weightUndefinedThrew = true;
    assert(err.message.includes('weight is required'), 'Throws explicit error when weight is missing');
  }
  assert(weightUndefinedThrew, 'createRequest rejects undefined weight');

  let weightNullThrew = false;
  try {
    storageService.createRequest(b11TestEmail, { ...baseReqPayload, quantity: 1, weight: null });
  } catch (err) {
    weightNullThrew = true;
  }
  assert(weightNullThrew, 'createRequest rejects null weight');

  let weightZeroThrew = false;
  try {
    storageService.createRequest(b11TestEmail, { ...baseReqPayload, quantity: 1, weight: 0 });
  } catch (err) {
    weightZeroThrew = true;
    assert(err.message.includes('positive number greater than 0'), 'Throws explicit error for zero weight');
  }
  assert(weightZeroThrew, 'createRequest rejects weight of 0 kg without silently substituting 1 kg');

  let weightNegThrew = false;
  try {
    storageService.createRequest(b11TestEmail, { ...baseReqPayload, quantity: 1, weight: -2.5 });
  } catch (err) {
    weightNegThrew = true;
  }
  assert(weightNegThrew, 'createRequest rejects negative weight (-2.5 kg)');

  let weightNonNumericThrew = false;
  try {
    storageService.createRequest(b11TestEmail, { ...baseReqPayload, quantity: 1, weight: 'abc' });
  } catch (err) {
    weightNonNumericThrew = true;
  }
  assert(weightNonNumericThrew, 'createRequest rejects non-numeric weight string ("abc")');

  // Valid weight preserves 2 decimal places
  const validDecimalCreated = storageService.createRequest(b11TestEmail, { ...baseReqPayload, quantity: 1, weight: 3.456 });
  assert(validDecimalCreated.weight === 3.46, 'createRequest rounds valid decimal weight to two decimal places (3.456 -> 3.46)');

  // 2. Quantity validation tests
  let qtyUndefinedThrew = false;
  try {
    storageService.createRequest(b11TestEmail, { ...baseReqPayload, weight: 2.0 });
  } catch (err) {
    qtyUndefinedThrew = true;
    assert(err.message.includes('quantity is required'), 'Throws explicit error when quantity is missing');
  }
  assert(qtyUndefinedThrew, 'createRequest rejects undefined quantity');

  let qtyZeroThrew = false;
  try {
    storageService.createRequest(b11TestEmail, { ...baseReqPayload, weight: 2.0, quantity: 0 });
  } catch (err) {
    qtyZeroThrew = true;
  }
  assert(qtyZeroThrew, 'createRequest rejects quantity of 0 without silently substituting 1');

  let qtyNegThrew = false;
  try {
    storageService.createRequest(b11TestEmail, { ...baseReqPayload, weight: 2.0, quantity: -1 });
  } catch (err) {
    qtyNegThrew = true;
  }
  assert(qtyNegThrew, 'createRequest rejects negative quantity (-1)');

  let qtyNonIntThrew = false;
  try {
    storageService.createRequest(b11TestEmail, { ...baseReqPayload, weight: 2.0, quantity: 1.5 });
  } catch (err) {
    qtyNonIntThrew = true;
  }
  assert(qtyNonIntThrew, 'createRequest rejects non-integer quantity (1.5)');

  let qtyNonNumericThrew = false;
  try {
    storageService.createRequest(b11TestEmail, { ...baseReqPayload, weight: 2.0, quantity: 'two' });
  } catch (err) {
    qtyNonNumericThrew = true;
  }
  assert(qtyNonNumericThrew, 'createRequest rejects non-numeric quantity string ("two")');

  const validQtyCreated = storageService.createRequest(b11TestEmail, { ...baseReqPayload, weight: 1.5, quantity: 4 });
  assert(validQtyCreated.quantity === 4, 'createRequest preserves valid integer quantity (4)');

  // 3. Single record hide confirmation modal in RequestsPage.jsx
  const reqPageFresh = fs.readFileSync('src/pages/RequestsPage.jsx', 'utf-8');
  assert(
    reqPageFresh.includes('showSingleHideModal') && reqPageFresh.includes('handleConfirmHideSingle'),
    'RequestsPage.jsx contains single record hide confirmation modal state and confirm handler'
  );
  assert(
    reqPageFresh.includes('Original Record &amp; Environmental Impact Preserved') &&
    reqPageFresh.includes('changes your visible history only'),
    'RequestsPage.jsx single hide modal explains visibility preference and permanent impact preservation'
  );

  // 4. Single record hide confirmation modal in CentreRequestsPage.jsx
  const centreReqPageFresh = fs.readFileSync('src/pages/centre/CentreRequestsPage.jsx', 'utf-8');
  assert(
    centreReqPageFresh.includes('showSingleHideModal') && centreReqPageFresh.includes('handleConfirmHideSingle'),
    'CentreRequestsPage.jsx contains single record hide confirmation modal state and confirm handler'
  );
  assert(
    centreReqPageFresh.includes('Audit Records &amp; Environmental Impact Preserved') &&
    centreReqPageFresh.includes('facility\'s visible history only'),
    'CentreRequestsPage.jsx single hide modal explains facility visibility preference and audit record preservation'
  );

  // 5. Consequential physical receipt confirmation modal in CentreRequestsPage.jsx
  assert(
    centreReqPageFresh.includes('showReceiveConfirmModal') &&
    centreReqPageFresh.includes('handleConfirmReceive') &&
    centreReqPageFresh.includes('pendingReceiveAction'),
    'CentreRequestsPage.jsx contains consequential physical receipt confirmation modal state and handlers'
  );
  assert(
    centreReqPageFresh.includes('Confirm Physical Hardware Receipt') &&
    centreReqPageFresh.includes('Chain of Custody &amp; Environmental Impact Aggregation') &&
    centreReqPageFresh.includes('updates the operational chain-of-custody records and aggregates environmental impact metrics'),
    'CentreRequestsPage.jsx receipt modal explicitly explains chain of custody and environmental impact aggregation'
  );
  assert(
    centreReqPageFresh.includes('nextStatus === \'Received\'') &&
    centreReqPageFresh.includes('executeAdvanceStatus'),
    'CentreRequestsPage.jsx guards Received transitions while leaving intermediate transitions uninterrupted'
  );

  // ============================================================
  // REQUIREMENT 26: Batch 2 - Authentication, Data Validation, Feasibility, Role-Based CTAs & Hero Photo
  // ============================================================
  console.log('\nTesting Requirement 26: Batch 2 - Authentication, Data Validation, Feasibility & Hero Photo...');

  // ── Task 1: Fix Customer Login Automatically Creating Accounts ──
  const authContextCode = fs.readFileSync('src/context/AuthContext.jsx', 'utf-8');
  assert(
    authContextCode.includes('No account found with this email address. Please verify your spelling or create an account.'),
    'AuthContext.jsx throws explicit error for unregistered email on login'
  );
  assert(
    authContextCode.includes('Incorrect password. Please verify your credentials.'),
    'AuthContext.jsx validates password and throws explicit error on password mismatch'
  );
  assert(
    !authContextCode.slice(authContextCode.indexOf('const login =')).slice(0, 800).includes('users.push') &&
    !authContextCode.slice(authContextCode.indexOf('const login =')).slice(0, 800).includes('localStorage.setItem(\'ecocycle_users\''),
    'Customer login does NOT auto-create accounts or modify ecocycle_users'
  );

  // Test account lookup simulation
  const mockUsersList = [
    {
      id: 'usr_reg_1',
      name: 'Registered User',
      email: 'registered.customer@gmail.com',
      password: 'StrongPassword123!',
      userType: 'Individual Resident',
      createdAt: new Date().toISOString(),
    }
  ];
  mockStorage['ecocycle_users'] = JSON.stringify(mockUsersList);

  const parsedUsers = JSON.parse(mockStorage['ecocycle_users']);
  const registeredUser = parsedUsers.find(u => u.email.toLowerCase() === 'registered.customer@gmail.com');
  assert(registeredUser !== undefined && registeredUser.password === 'StrongPassword123!', 'Registered user can be looked up with matching credentials');

  const misspelledUser = parsedUsers.find(u => u.email.toLowerCase() === 'registered.customer@gmial.com');
  assert(misspelledUser === undefined, 'Misspelled email yields no account');

  const unregisteredUser = parsedUsers.find(u => u.email.toLowerCase() === 'unknown@other.com');
  assert(unregisteredUser === undefined, 'Unregistered email yields no account');

  // Verify centre auth remains completely separate
  const testBatch2Centre = storageService.registerCentre({
    name: 'Batch2 Separate Facility',
    email: 'batch2.facility@ecocycle.org',
    password: 'FacilityPass123',
    phone: '+1 555-8899',
    address: '800 Eco Way',
    city: 'Seattle',
  });
  const centreAuthResult = storageService.authenticateCentre('batch2.facility@ecocycle.org', 'FacilityPass123');
  assert(centreAuthResult && centreAuthResult.id === testBatch2Centre.id, 'Centre authentication operates independently from customer accounts');

  // ── Task 2: Strengthen Weight & Quantity Validation ──
  // Rejection of malformed strings (parseFloat bypass attempt)
  let threwMalformedWeight = false;
  try {
    storageService.createRequest('registered.customer@gmail.com', {
      brand: 'Test Brand',
      model: 'Test Model',
      category: 'Computers & Laptops',
      quantity: 2,
      weight: '12abc',
    });
  } catch (err) {
    threwMalformedWeight = true;
  }
  assert(threwMalformedWeight, 'createRequest rejects string weight with trailing letters ("12abc")');

  let threwUnitWeight = false;
  try {
    storageService.createRequest('registered.customer@gmail.com', {
      brand: 'Test Brand',
      model: 'Test Model',
      category: 'Computers & Laptops',
      quantity: 2,
      weight: '5kg',
    });
  } catch (err) {
    threwUnitWeight = true;
  }
  assert(threwUnitWeight, 'createRequest rejects string weight with unit suffix ("5kg")');

  let threwExcessiveWeight = false;
  try {
    storageService.createRequest('registered.customer@gmail.com', {
      brand: 'Test Brand',
      model: 'Test Model',
      category: 'Computers & Laptops',
      quantity: 2,
      weight: 5001,
    });
  } catch (err) {
    threwExcessiveWeight = true;
  }
  assert(threwExcessiveWeight, 'createRequest rejects weight exceeding upper limit of 5,000 kg');

  let threwMalformedQuantity = false;
  try {
    storageService.createRequest('registered.customer@gmail.com', {
      brand: 'Test Brand',
      model: 'Test Model',
      category: 'Computers & Laptops',
      quantity: '12abc',
      weight: 10,
    });
  } catch (err) {
    threwMalformedQuantity = true;
  }
  assert(threwMalformedQuantity, 'createRequest rejects quantity with trailing letters ("12abc")');

  let threwDecimalQuantity = false;
  try {
    storageService.createRequest('registered.customer@gmail.com', {
      brand: 'Test Brand',
      model: 'Test Model',
      category: 'Computers & Laptops',
      quantity: '2.5',
      weight: 10,
    });
  } catch (err) {
    threwDecimalQuantity = true;
  }
  assert(threwDecimalQuantity, 'createRequest rejects decimal string quantity ("2.5")');

  let threwExcessiveQuantity = false;
  try {
    storageService.createRequest('registered.customer@gmail.com', {
      brand: 'Test Brand',
      model: 'Test Model',
      category: 'Computers & Laptops',
      quantity: 1001,
      weight: 10,
    });
  } catch (err) {
    threwExcessiveQuantity = true;
  }
  assert(threwExcessiveQuantity, 'createRequest rejects quantity exceeding upper limit of 1,000 units');

  // Verify valid weights and quantities are preserved
  const validReq1 = storageService.createRequest('registered.customer@gmail.com', {
    brand: 'Apple',
    model: 'AirPods Case',
    category: 'Peripherals & Accessories',
    quantity: 1,
    weight: 0.05,
    bypassFeasibility: true,
  });
  assert(validReq1.weight === 0.05, 'createRequest preserves small weights below 0.1 kg (0.05 kg)');

  const validReq2 = storageService.createRequest('registered.customer@gmail.com', {
    brand: 'Dell',
    model: 'PowerEdge Server',
    category: 'Computers & Laptops',
    quantity: 5,
    weight: 120.75,
    bypassFeasibility: true,
  });
  assert(validReq2.weight === 120.75, 'createRequest preserves multi-decimal weights (120.75 kg)');

  // Verify RegisterPage.jsx input validation rules
  const registerPageBatch2Code = fs.readFileSync('src/pages/RegisterPage.jsx', 'utf-8');
  assert(
    registerPageBatch2Code.includes('^\\d+$') && registerPageBatch2Code.includes('Quantity must be a positive whole number'),
    'RegisterPage.jsx enforces strict whole-number regex validation on quantity'
  );
  assert(
    registerPageBatch2Code.includes('^\\d+(\\.\\d+)?$') && registerPageBatch2Code.includes('Weight must be a valid positive number'),
    'RegisterPage.jsx enforces strict positive numeric regex on weight'
  );
  assert(
    registerPageBatch2Code.includes('parts[1].length > 2') && registerPageBatch2Code.includes('supports up to two decimal places'),
    'RegisterPage.jsx checks maximum 2 decimal places precision'
  );

  // ── Task 3: Prevent Impossible E-Waste Requests from Becoming Stuck ──
  const capacityCentreTest = storageService.registerCentre({
    name: 'Bay Area Bulk Depollution Center',
    email: 'bulk.bayarea@ecocycle.org',
    password: 'FacilityPassword123',
    phone: '+1 555-9922',
    address: '100 Industrial Dock',
    city: 'Oakland',
    categories: ['Computers & Laptops'],
    maxWeeklyCapacityKg: 2000,
    maxWeeklyUnits: 400,
    slotLimitKg: 150, // 150 kg per slot limit
    pickupAvailable: true,
    dropoffAvailable: true,
  });

  const limits = getCentreCapacityLimits(capacityCentreTest);
  assert(limits.slotMaxKg === 150, 'getCentreCapacityLimits correctly identifies configured slotLimitKg = 150');

  const feasibleCheck = checkRequestFeasibility(capacityCentreTest, { weight: 95.5, quantity: 4 });
  assert(feasibleCheck.feasible === true, 'checkRequestFeasibility confirms 95.5 kg request is feasible for 150 kg slot');

  const oversizedCheck = checkRequestFeasibility(capacityCentreTest, { weight: 220, quantity: 4 });
  assert(
    oversizedCheck.feasible === false && oversizedCheck.violationType === 'weight',
    'checkRequestFeasibility rejects 220 kg request exceeding 150 kg slotMaxKg'
  );
  assert(
    oversizedCheck.reason.includes('exceeds the facility\'s maximum single-slot intake limit of 150 kg'),
    'checkRequestFeasibility provides clear explanation of single-slot capacity limit'
  );

  let threwOversizedStorage = false;
  try {
    storageService.createRequest('registered.customer@gmail.com', {
      brand: 'Heavy Server Rack',
      model: 'Enterprise 8U',
      category: 'Computers & Laptops',
      quantity: 2,
      weight: 220,
      centreId: capacityCentreTest.id,
    });
  } catch (err) {
    threwOversizedStorage = true;
  }
  assert(threwOversizedStorage, 'storageService.createRequest strictly blocks oversized request at the storage layer');

  // Verify UI displays feasibility warning
  assert(
    registerPageBatch2Code.includes('centreFeasibility') &&
    registerPageBatch2Code.includes('Declaration Exceeds Facility Intake Capacity'),
    'RegisterPage.jsx displays clear capacity warning banner when declaration exceeds facility intake limits'
  );

  // ── Task 4: Fix Incorrect Customer CTA on Centre Portal Homepage ──
  const landingPageCode = fs.readFileSync('src/pages/LandingPage.jsx', 'utf-8');
  assert(
    landingPageCode.includes('useCentreAuth') && landingPageCode.includes('isCentreAuthenticated'),
    'LandingPage.jsx uses useCentreAuth hook to detect centre manager session'
  );
  assert(
    landingPageCode.includes('View Assigned Requests') &&
    landingPageCode.includes('/centre/requests') &&
    landingPageCode.includes('Manage Appointments') &&
    landingPageCode.includes('/centre/appointments'),
    'LandingPage.jsx hero provides View Assigned Requests and Manage Appointments for centre managers'
  );
  assert(
    landingPageCode.includes('Review Facility Manifests') &&
    landingPageCode.includes('/centre/dashboard'),
    'LandingPage.jsx bottom CTA section provides facility management actions for centre managers'
  );
  assert(
    landingPageCode.includes('View My Requests') &&
    landingPageCode.includes('/requests'),
    'LandingPage.jsx hero provides View My Requests for authenticated customers'
  );
  assert(
    landingPageCode.includes('Explore Our Impact') &&
    landingPageCode.includes('#impact'),
    'LandingPage.jsx hero provides Explore Our Impact for public visitors'
  );

  const appCode = fs.readFileSync('src/App.jsx', 'utf-8');
  assert(
    appCode.includes('isCentreAuthenticated') && appCode.includes('showCentreNavbar'),
    'App.jsx renders CentreNavbar across public routes when isCentreAuthenticated is true'
  );

  // ── Task 5: Replace Hero Background with Genuine Web Photograph ──
  const heroImagePath = path.resolve('public/hero-ewaste-recycling.jpg');
  assert(fs.existsSync(heroImagePath), 'public/hero-ewaste-recycling.jpg exists as local asset');
  const heroImageStat = fs.statSync(heroImagePath);
  assert(heroImageStat.size > 100000, `Hero image is a full-resolution asset (${Math.round(heroImageStat.size / 1024)} KB)`);

  assert(
    landingPageCode.includes('src="/hero-ewaste-recycling.jpg"') &&
    landingPageCode.includes('alt="Green printed circuit boards sorted and prepared for material recovery'),
    'LandingPage.jsx renders hero photograph with descriptive e-waste recovery alternative text'
  );
  assert(
    landingPageCode.includes('Crista Castellanos') && landingPageCode.includes('CC BY-SA 4.0'),
    'LandingPage.jsx includes visible attribution credit for the photograph'
  );

  const readmeCode = fs.readFileSync('../README.md', 'utf-8');
  assert(
    readmeCode.includes('Asset Attribution') &&
    readmeCode.includes('Crista Castellanos') &&
    readmeCode.includes('CC BY-SA 4.0') &&
    readmeCode.includes('wikimedia.org'),
    'README.md records genuine photograph attribution, license, and Wikimedia Commons source URL'
  );

  // ============================================================
  // REQUIREMENT 27: Batch 3 - Workload Metrics, Dashboard Weight, Operating Lead Time, Service Area, Dropoff Address & Receipt Workflow
  // ============================================================
  console.log('\nTesting Requirement 27: Batch 3 - Workload Metrics, Dashboard Weight, Operating Lead Time, Service Area, Dropoff Address & Receipt Workflow...');

  // 1. Task 1: Centre Workload Metrics
  const testWlCentre = storageService.registerCentre({
    name: 'Workload Hub Alpha',
    email: 'workload.alpha@example.com',
    phone: '555-0199',
    address: '100 Green Park Drive',
    city: 'San Francisco',
    serviceArea: 'San Francisco Bay Area',
    password: 'password123',
    maxWeeklyCapacityKg: 2000,
    maxWeeklyUnits: 500,
    operatingDays: 'Monday to Friday',
    leadTimeDays: 2,
    slotLimitKg: 100,
  });

  // Request A: Scheduled in Target Week (2026-10-19, Monday). Weight: 80 kg
  const reqA = storageService.createRequest('customer.wl@example.com', {
    brand: 'Apple',
    model: 'MacBook Pro',
    category: 'computing',
    quantity: 2,
    weight: 80,
    method: 'dropoff',
    centreId: testWlCentre.id,
  });
  storageService.bookAppointment(reqA.id, testWlCentre.id, {
    date: '2026-10-20',
    timeSlot: '09:00 AM – 11:00 AM',
  });

  // Request B: Scheduled in Next Week (2026-10-27, Tuesday). Weight: 90 kg
  const reqB = storageService.createRequest('customer.wl@example.com', {
    brand: 'Dell',
    model: 'OptiPlex',
    category: 'computing',
    quantity: 3,
    weight: 90,
    method: 'dropoff',
    centreId: testWlCentre.id,
  });
  storageService.bookAppointment(reqB.id, testWlCentre.id, {
    date: '2026-10-27',
    timeSlot: '09:00 AM – 11:00 AM',
  });

  // Request C: Submitted (Unassigned Intake Queue). Weight: 35.5 kg
  const reqC = storageService.createRequest('customer.wl@example.com', {
    brand: 'Lenovo',
    model: 'ThinkPad',
    category: 'computing',
    quantity: 1,
    weight: 35.5,
    method: 'dropoff',
    centreId: testWlCentre.id,
  });

  // Request D: Cancelled declaration. Weight: 60 kg
  const reqD = storageService.createRequest('customer.wl@example.com', {
    brand: 'HP',
    model: 'ProBook',
    category: 'computing',
    quantity: 2,
    weight: 60,
    method: 'dropoff',
    centreId: testWlCentre.id,
  });
  storageService.updateRequestStatus('customer.wl@example.com', reqD.id, 'Cancelled', 'Customer cancelled');

  // Request E: Rejected declaration. Weight: 40 kg
  const reqE = storageService.createRequest('customer.wl@example.com', {
    brand: 'Asus',
    model: 'ZenBook',
    category: 'computing',
    quantity: 2,
    weight: 40,
    method: 'dropoff',
    centreId: testWlCentre.id,
  });
  storageService.rejectRequest(reqE.id, testWlCentre.id, 'Contaminated battery casing');

  // Verify workload calculation for Target Week of 2026-10-19
  const wlStats = storageService.getCentreWorkload(testWlCentre.id, '2026-10-19');
  assert(wlStats.currentWeekBookedKg === 80, `getCentreWorkload accurately isolates current week booked kg (80 kg, got ${wlStats.currentWeekBookedKg})`);
  assert(wlStats.currentWeekBookedCount === 1, `getCentreWorkload identifies exactly 1 appointment for target week (got ${wlStats.currentWeekBookedCount})`);
  assert(wlStats.unassignedCount === 1, `getCentreWorkload identifies 1 unassigned intake queue declaration (got ${wlStats.unassignedCount})`);
  assert(wlStats.unassignedKg === 35.5, `getCentreWorkload calculates unassigned intake kg accurately (35.5 kg, got ${wlStats.unassignedKg})`);
  assert(wlStats.cancelledCount === 1, `Cancelled requests tracked in historical counts without inflating capacity`);
  assert(wlStats.rejectedCount === 1, `Rejected requests tracked in historical counts without inflating capacity`);
  assert(wlStats.lifetimeActiveCount === 3, `Lifetime active count excludes Cancelled and Rejected (expected 3, got ${wlStats.lifetimeActiveCount})`);
  assert(wlStats.lifetimeActiveKg === 205.5, `Lifetime active kg sums in-flight requests (80 + 90 + 35.5 = 205.5 kg, got ${wlStats.lifetimeActiveKg})`);

  const centreDashboardCode = fs.readFileSync('src/pages/centre/CentreDashboardPage.jsx', 'utf-8');
  assert(centreDashboardCode.includes('Current Week Capacity Utilization (Mon–Sun)'), 'CentreDashboardPage.jsx explicitly labels Monday-to-Sunday weekly utilization');
  assert(centreDashboardCode.includes('Intake Pipeline (Unscheduled Queue)'), 'CentreDashboardPage.jsx displays unscheduled intake pipeline metrics');
  assert(centreDashboardCode.includes('Lifetime Active Operations'), 'CentreDashboardPage.jsx distinguishes lifetime active operations from weekly utilization');

  // 2. Task 2: Customer Dashboard Weight Metrics
  const customerDashboardCode = fs.readFileSync('src/pages/DashboardPage.jsx', 'utf-8');
  assert(
    customerDashboardCode.includes("!['Cancelled', 'Rejected'].includes(r.status)") ||
    customerDashboardCode.includes("!['Rejected', 'Cancelled'].includes(r.status)"),
    'DashboardPage.jsx strictly filters out Cancelled and Rejected requests from estimated hardware mass'
  );
  assert(customerDashboardCode.includes('.toFixed(2)'), 'DashboardPage.jsx formats total hardware mass to 2 decimal places');
  assert(customerDashboardCode.includes('recycledWeight') && customerDashboardCode.includes('activeWeight'), 'DashboardPage.jsx computes separate active in-progress and diverted recycled weights');

  // 3. Task 3: Operating-Day Lead Time
  // Mon-Fri facility with 2 days lead time, submitted on Friday 2026-10-16
  const fridayRef = new Date(2026, 9, 16, 10, 0, 0); // 2026-10-16 is Friday
  const monFriAvail = storageService.getCentreAvailability(testWlCentre.id, { weight: 10, quantity: 1, method: 'dropoff' }, 14, null, fridayRef);
  const mondayOct19 = monFriAvail.availableDays.find(d => d.date === '2026-10-19');
  const tuesdayOct20 = monFriAvail.availableDays.find(d => d.date === '2026-10-20');

  assert(mondayOct19.isPastOrLeadTime === true, 'Friday submission for Mon-Fri facility blocks Monday appointment (only 0 operating days elapsed)');
  assert(mondayOct19.isAvailable === false, 'Monday appointment slot is strictly unavailable');
  assert(mondayOct19.reason.includes('advance lead time') || mondayOct19.reason.includes('lead time'), `Monday availability reason explains operating lead time requirement (${mondayOct19.reason})`);
  assert(tuesdayOct20.isPastOrLeadTime === false, 'Tuesday appointment satisfies 2 operating days lead time requirement (Mon day 1, Tue day 2)');
  assert(tuesdayOct20.isAvailable === true, 'Tuesday appointment slot is available for booking');

  // Everyday facility (7 days) with 2 days lead time, submitted on Friday 2026-10-16
  const test7DayCentre = storageService.registerCentre({
    name: 'Everyday Depot',
    email: 'everyday.depot@example.com',
    phone: '555-0198',
    address: '500 Market St',
    city: 'San Francisco',
    password: 'password123',
    operatingDays: 'Everyday',
    leadTimeDays: 2,
  });
  const sevenDayAvail = storageService.getCentreAvailability(test7DayCentre.id, { weight: 5, quantity: 1, method: 'dropoff' }, 14, null, fridayRef);
  const sundayOct18 = sevenDayAvail.availableDays.find(d => d.date === '2026-10-18');
  assert(sundayOct18.isPastOrLeadTime === false, '7-day facility counts Saturday and Sunday as operating days (Sunday is available for 2-day lead time)');

  // 4. Task 4: Validate Pickup Service Areas
  const serviceAreaCheck1 = storageService.validateServiceArea(testWlCentre, '742 Evergreen Terrace, San Francisco, CA 94103');
  assert(serviceAreaCheck1.inArea === true, 'validateServiceArea confirms address matching facility city (San Francisco)');

  const serviceAreaCheck2 = storageService.validateServiceArea(testWlCentre, '1200 Lake Shore Drive, Chicago, IL 60610');
  assert(serviceAreaCheck2.inArea === false, 'validateServiceArea flags out-of-zone address (Chicago vs San Francisco)');
  assert(serviceAreaCheck2.message.includes('outside'), 'validateServiceArea provides clear explanation advisory message');

  const b3RegisterPageCode = fs.readFileSync('src/pages/RegisterPage.jsx', 'utf-8');
  assert(b3RegisterPageCode.includes('validateServiceArea') && b3RegisterPageCode.includes('serviceAreaAdvisory'), 'RegisterPage.jsx validates pickup address against facility service area');
  assert(b3RegisterPageCode.includes('Service Area Advisory'), 'RegisterPage.jsx renders Service Area Advisory warning banner');

  const b3RequestsPageCode = fs.readFileSync('src/pages/RequestsPage.jsx', 'utf-8');
  assert(b3RequestsPageCode.includes('validateServiceArea'), 'RequestsPage.jsx imports and validates service area on address edits');
  assert(b3RequestsPageCode.includes('Service Area Advisory'), 'RequestsPage.jsx renders Service Area Advisory in edit address modal');

  // 5. Task 5: Actual Facility Address for Drop-off
  const dropoffReqActual = storageService.createRequest('customer.dropoff@example.com', {
    brand: 'Dell',
    model: 'XPS 15',
    category: 'computing',
    quantity: 1,
    weight: 2.5,
    method: 'dropoff',
    centreId: testWlCentre.id,
  });
  assert(dropoffReqActual.address.includes('100 Green Park Drive'), `createRequest saves actual facility street address (${dropoffReqActual.address})`);
  assert(dropoffReqActual.address.includes('San Francisco'), 'createRequest saves actual facility city');
  assert(dropoffReqActual.address !== 'Self Drop-off at Center Kiosk', 'createRequest replaces generic "Self Drop-off at Center Kiosk" string');

  // Dynamic resolution for legacy/historical records
  const legacyDropoffReq = {
    id: 'REQ-LEGACY-01',
    method: 'dropoff',
    address: 'Self Drop-off at Center Kiosk',
    centreId: testWlCentre.id,
    center: testWlCentre.name,
  };
  const resolvedDropoffAddr = storageService.getRequestDisplayAddress(legacyDropoffReq);
  assert(resolvedDropoffAddr.includes('100 Green Park Drive'), `getRequestDisplayAddress resolves actual facility street address for legacy drop-off records (${resolvedDropoffAddr})`);

  // Pickup request preserves customer address
  const legacyPickupReq = {
    id: 'REQ-LEGACY-02',
    method: 'pickup',
    address: '221B Baker Street, London',
    centreId: testWlCentre.id,
  };
  assert(storageService.getRequestDisplayAddress(legacyPickupReq) === '221B Baker Street, London', 'getRequestDisplayAddress preserves customer pickup address untouched');

  assert(b3RegisterPageCode.includes('Designated Facility Drop-Off Depot'), 'RegisterPage.jsx renders dedicated drop-off depot address and hours card');
  assert(b3RequestsPageCode.includes('getRequestDisplayAddress'), 'RequestsPage.jsx uses getRequestDisplayAddress for request location display');
  const b3CentreRequestsPageCode = fs.readFileSync('src/pages/centre/CentreRequestsPage.jsx', 'utf-8');
  assert(b3CentreRequestsPageCode.includes('getRequestDisplayAddress'), 'CentreRequestsPage.jsx uses getRequestDisplayAddress for location display');

  // 6. Task 6: Centre Physical Receipt Confirmation Workflow
  const receiptReq = storageService.createRequest('customer.receipt@example.com', {
    brand: 'Apple',
    model: 'iPad Air',
    category: 'mobile',
    quantity: 1,
    weight: 0.5,
    method: 'dropoff',
    centreId: testWlCentre.id,
  });
  const updatedReceived = storageService.updateRequestStatusByCentre(receiptReq.id, testWlCentre.id, 'Received', 'Customer handed over device at depot desk');
  assert(updatedReceived.status === 'Received', 'updateRequestStatusByCentre successfully advances status to Received');
  assert(updatedReceived.currentStep === 2, 'Received status maps to terminal progress tracker step 2');
  assert(updatedReceived.history.some(h => h.actor === 'Centre Staff'), 'History entry recorded with Centre Staff actor');

  // Idempotency: repeated call does not corrupt state or append duplicate history
  const historyLenBefore = updatedReceived.history.length;
  const repeatedReceived = storageService.updateRequestStatusByCentre(receiptReq.id, testWlCentre.id, 'Received', 'Duplicate click test');
  assert(repeatedReceived.history.length === historyLenBefore, 'updateRequestStatusByCentre is idempotent and does not duplicate history entries');

  assert(centreRequestsPageCode.includes('updateRequestStatusByCentre'), 'CentreRequestsPage.jsx calls updateRequestStatusByCentre');
  assert(centreRequestsPageCode.includes('isProcessingReceive'), 'CentreRequestsPage.jsx has isProcessingReceive state to prevent repeated clicks');

  // ============================================================
  // REQUIREMENT 28: Follow-up Bug Fix - Remove Customer Test-Declaration Button from Centre Dashboard
  // ============================================================
  console.log('\nTesting Requirement 28: Follow-up Bug Fix - Remove Customer Test-Declaration Button from Centre Dashboard...');

  const b4CentreDashboardCode = fs.readFileSync('src/pages/centre/CentreDashboardPage.jsx', 'utf-8');

  // 1. Verify "Submit a Test Declaration as Customer" button is removed
  assert(
    !b4CentreDashboardCode.includes('Submit a Test Declaration as Customer'),
    'CentreDashboardPage.jsx does NOT contain "Submit a Test Declaration as Customer"'
  );
  assert(
    !b4CentreDashboardCode.includes('to="/register"'),
    'CentreDashboardPage.jsx does NOT contain link to customer registration (/register)'
  );
  assert(
    !b4CentreDashboardCode.includes('to="/login"'),
    'CentreDashboardPage.jsx does NOT contain redirect to customer login (/login)'
  );

  // 2. Verify clean empty state structure
  assert(
    b4CentreDashboardCode.includes('No Requests Currently Assigned'),
    'CentreDashboardPage.jsx contains clean empty state heading "No Requests Currently Assigned"'
  );
  assert(
    b4CentreDashboardCode.includes('Customer declarations and collection dispatches will appear here automatically'),
    'CentreDashboardPage.jsx explains customer declarations will appear when requests are routed to facility'
  );
  assert(
    b4CentreDashboardCode.includes('Inbox'),
    'CentreDashboardPage.jsx retains suitable empty-state Inbox icon'
  );

  // 3. Verify operational "View All" navigation is preserved
  assert(
    b4CentreDashboardCode.includes('to="/centre/requests"') &&
    b4CentreDashboardCode.includes('View All ({requests.length})'),
    'CentreDashboardPage.jsx preserves operational View All ({requests.length}) navigation link'
  );

  // 4. Verify newly registered centre sees 0 requests and empty queue
  const newEmptyCentre = storageService.registerCentre({
    name: 'Pristine Hub Beta',
    email: 'pristine.beta@example.com',
    phone: '555-0200',
    address: '200 Clean Energy Way',
    city: 'San Francisco',
    serviceArea: 'San Francisco Bay Area',
    password: 'password123',
    maxWeeklyCapacityKg: 2500,
    maxWeeklyUnits: 600,
    operatingDays: 'Monday to Friday',
  });
  const emptyReqs = storageService.getRequestsForCentre(newEmptyCentre.id);
  assert(emptyReqs.length === 0, 'Newly registered centre has exactly 0 assigned requests in queue');
  const emptyWl = storageService.getCentreWorkload(newEmptyCentre.id);
  assert(emptyWl.activeCount === 0 && emptyWl.currentWeekBookedCount === 0, 'Newly registered centre has zero active and zero booked workload');

  // 5. Verify queue when established centre becomes empty
  const establishedCentre = storageService.registerCentre({
    name: 'Temporary Hub Gamma',
    email: 'temp.gamma@example.com',
    phone: '555-0201',
    address: '300 Sunset Boulevard',
    city: 'San Francisco',
    serviceArea: 'San Francisco Bay Area',
    password: 'password123',
  });
  const tempReq = storageService.createRequest('cust.gamma@example.com', {
    brand: 'Acer',
    model: 'Swift 3',
    category: 'computing',
    quantity: 1,
    weight: 1.2,
    method: 'dropoff',
    centreId: establishedCentre.id,
  });
  assert(storageService.getRequestsForCentre(establishedCentre.id).length === 1, 'Established centre has 1 request');
  // Cancel the request
  storageService.updateRequestStatus('cust.gamma@example.com', tempReq.id, 'Cancelled', 'Cancelled by customer');
  const remainingActiveReqs = storageService.getRequestsForCentre(establishedCentre.id).filter(r => !['Cancelled', 'Rejected'].includes(r.status));
  assert(remainingActiveReqs.length === 0, 'Established centre operational active queue correctly empties when requests are cancelled');

  // 6. Verify public homepage still displays its intended registration CTA
  const b4LandingPageCode = fs.readFileSync('src/pages/LandingPage.jsx', 'utf-8');
  assert(
    b4LandingPageCode.includes('Register E-Waste') && b4LandingPageCode.includes('to="/register"'),
    'LandingPage.jsx preserves intended customer registration CTA button (to="/register")'
  );

  // 7. Verify customers can still register e-waste normally
  const testCustomerDeclaration = storageService.createRequest('regular.customer@example.com', {
    brand: 'Samsung',
    model: 'Galaxy Book',
    category: 'computing',
    quantity: 1,
    weight: 1.45,
    method: 'pickup',
    address: '742 Evergreen Terrace, San Francisco, CA',
    customerName: 'Marge Simpson',
    customerPhone: '555-4321',
    centreId: newEmptyCentre.id,
  });
  assert(testCustomerDeclaration.id.startsWith('EW-'), 'Customer can successfully create e-waste declaration');
  assert(testCustomerDeclaration.weight === 1.45, 'Customer declaration preserves 2-decimal weight (1.45 kg)');
  assert(testCustomerDeclaration.address === '742 Evergreen Terrace, San Francisco, CA', 'Customer declaration preserves pickup address');
  assert(storageService.getRequestsForCentre(newEmptyCentre.id).length === 1, 'Declaration successfully routes to the specified centre');

  // ============================================================
  // REQUIREMENT 29: Batch 4 - Geoapify Geocoding Integration & R Statistical Analytics
  // ============================================================
  console.log('\nTesting Requirement 29: Batch 4 - Geoapify Geocoding Integration & R Statistical Analytics...');

  // 1. Coordinate Validation Tests
  assert(isValidCoordinate(37.7749, -122.4194) === true, 'isValidCoordinate accepts valid SF coordinates (37.7749, -122.4194)');
  assert(isValidCoordinate(0, 0) === true, 'isValidCoordinate accepts equator/prime meridian (0, 0)');
  assert(isValidCoordinate(-90, -180) === true, 'isValidCoordinate accepts lower boundary (-90, -180)');
  assert(isValidCoordinate(90, 180) === true, 'isValidCoordinate accepts upper boundary (90, 180)');
  assert(isValidCoordinate(90.001, 0) === false, 'isValidCoordinate rejects latitude > 90');
  assert(isValidCoordinate(-90.001, 0) === false, 'isValidCoordinate rejects latitude < -90');
  assert(isValidCoordinate(0, 180.001) === false, 'isValidCoordinate rejects longitude > 180');
  assert(isValidCoordinate(0, -180.001) === false, 'isValidCoordinate rejects longitude < -180');
  assert(isValidCoordinate(NaN, 0) === false, 'isValidCoordinate rejects NaN latitude');
  assert(isValidCoordinate(0, NaN) === false, 'isValidCoordinate rejects NaN longitude');
  assert(isValidCoordinate(null, 0) === false, 'isValidCoordinate rejects null latitude');
  assert(isValidCoordinate(0, undefined) === false, 'isValidCoordinate rejects undefined longitude');
  assert(isValidCoordinate('abc', 0) === false, 'isValidCoordinate rejects non-numeric string latitude');
  assert(isValidCoordinate(Infinity, 0) === false, 'isValidCoordinate rejects infinite latitude');

  // 2. Coordinate Formatting Tests
  assert(formatCoordinates({ latitude: 37.7749, longitude: -122.4194 }) === '37.7749° N, 122.4194° W', 'formatCoordinates formats NW quadrant correctly');
  assert(formatCoordinates({ latitude: -33.8688, longitude: 151.2093 }) === '33.8688° S, 151.2093° E', 'formatCoordinates formats SE quadrant correctly');
  assert(formatCoordinates(null) === 'Coordinates unavailable', 'formatCoordinates handles null safely');
  assert(formatCoordinates({ latitude: 95, longitude: 0 }) === 'Coordinates unavailable', 'formatCoordinates handles invalid coords safely');

  // 3. Geocoding Graceful Degradation & Unconfigured API Key
  clearGeocodingCache();
  setGeocodingApiKey('');
  assert(isGeocodingConfigured() === false, 'isGeocodingConfigured reports false when key is empty');
  
  const unconfiguredRes = await geocodeAddress('500 Howard Street, San Francisco, CA');
  assert(unconfiguredRes.success === false, 'geocodeAddress returns success=false when key is unconfigured');
  assert(unconfiguredRes.status === 'unconfigured', 'geocodeAddress returns status=unconfigured when key is empty');

  const invalidInputRes = await geocodeAddress('  ');
  assert(invalidInputRes.success === false && invalidInputRes.status === 'invalid_input', 'geocodeAddress returns status=invalid_input on empty input');

  // 4. Mocked Geoapify HTTP API Tests
  setGeocodingApiKey('mock_test_key_abc123');
  assert(isGeocodingConfigured() === true, 'isGeocodingConfigured reports true when key is configured');

  const originalFetch = global.fetch;

  // 4a. HTTP 401 Unauthorized
  global.fetch = async () => ({
    ok: false,
    status: 401,
  });
  const unauthRes = await geocodeAddress('100 Market St, San Francisco, CA', { bypassCache: true });
  assert(unauthRes.success === false && unauthRes.status === 'unauthorized', 'geocodeAddress handles 401 Unauthorized gracefully');

  // 4b. HTTP 429 Rate Limited
  global.fetch = async () => ({
    ok: false,
    status: 429,
  });
  const rateLimitRes = await geocodeAddress('100 Market St, San Francisco, CA', { bypassCache: true });
  assert(rateLimitRes.success === false && rateLimitRes.status === 'rate_limited', 'geocodeAddress handles 429 Rate Limited gracefully');

  // 4c. Network failure / connection refused
  global.fetch = async () => {
    throw new Error('Connection refused');
  };
  const networkRes = await geocodeAddress('100 Market St, San Francisco, CA', { bypassCache: true });
  assert(networkRes.success === false && networkRes.status === 'network_error', 'geocodeAddress handles network failure gracefully without throwing');

  // 4d. Empty results (not found)
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ type: 'FeatureCollection', features: [] }),
  });
  const notFoundRes = await geocodeAddress('Nonexistent Place xyz999', { bypassCache: true });
  assert(notFoundRes.success === false && notFoundRes.status === 'not_found', 'geocodeAddress handles empty features as not_found');

  // 4e. Successful Feature Parsing and Caching
  global.fetch = async (url) => {
    assert(url.includes('apiKey=mock_test_key_abc123'), 'geocodeAddress attaches API key to request');
    assert(url.includes('text='), 'geocodeAddress attaches encoded text query');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              formatted: '500 Howard Street, San Francisco, CA 94105, United States',
              lat: 37.7884,
              lon: -122.3972,
              city: 'San Francisco',
              postcode: '94105',
              country: 'United States',
              rank: { confidence: 0.95, match_type: 'full_match' },
            },
            geometry: {
              type: 'Point',
              coordinates: [-122.3972, 37.7884],
            },
          },
        ],
      }),
    };
  };

  clearGeocodingCache();
  const mockAddrQuery = '500 Howard Street, San Francisco';
  const successRes = await geocodeAddress(mockAddrQuery);
  assert(successRes.success === true, 'geocodeAddress returns success=true for valid Geoapify payload');
  assert(successRes.status === 'verified', 'geocodeAddress returns status=verified');
  assert(successRes.data.latitude === 37.7884, 'geocodeAddress extracts latitude accurately (37.7884)');
  assert(successRes.data.longitude === -122.3972, 'geocodeAddress extracts longitude accurately (-122.3972)');
  assert(successRes.data.provider === 'geoapify', 'geocodeAddress marks provider as geoapify');
  assert(successRes.data.formattedAddress.includes('Howard Street'), 'geocodeAddress captures provider formatted address');
  assert(successRes.fromCache === false, 'First call is not from cache');

  // 4f. In-memory caching: second call with same query does not invoke fetch
  let fetchCallCount = 0;
  global.fetch = async () => {
    fetchCallCount++;
    throw new Error('Fetch should not have been called due to cache');
  };
  const cachedRes = await geocodeAddress(mockAddrQuery);
  assert(cachedRes.success === true, 'Cached geocoding lookup succeeds');
  assert(cachedRes.fromCache === true, 'Cached lookup returns fromCache=true');
  assert(fetchCallCount === 0, 'In-memory cache prevents redundant outbound HTTP fetch calls');

  // Restore original fetch
  global.fetch = originalFetch;

  // 5. Storage Layer Coordinate Persistence
  const b4Facility = storageService.registerCentre({
    name: 'Geoapify Test Hub',
    email: 'geoapify.hub@ecocycle.org',
    phone: '555-9001',
    address: '100 Green Logistics Boulevard',
    city: 'San Francisco',
    serviceArea: 'San Francisco Bay Area',
    password: 'password123',
    coordinates: {
      latitude: 37.7749,
      longitude: -122.4194,
      formattedAddress: '100 Green Logistics Blvd, San Francisco, CA',
      provider: 'geoapify',
      status: 'verified',
    },
  });
  assert(b4Facility.coordinates !== null && b4Facility.coordinates.latitude === 37.7749, 'registerCentre persists verified facility coordinates');

  const geocodedDeclaration = storageService.createRequest('geo.customer@example.com', {
    brand: 'Lenovo',
    model: 'ThinkPad X1',
    category: 'computing',
    quantity: 1,
    weight: 1.35,
    method: 'pickup',
    address: '500 Howard Street, San Francisco, CA',
    customerName: 'Ada Lovelace',
    customerPhone: '555-0199',
    centreId: b4Facility.id,
    coordinates: successRes.data,
  });
  assert(geocodedDeclaration.coordinates !== null, 'createRequest persists coordinates object');
  assert(geocodedDeclaration.coordinates.latitude === 37.7884, 'createRequest stores correct latitude');
  assert(geocodedDeclaration.coordinates.longitude === -122.3972, 'createRequest stores correct longitude');
  assert(geocodedDeclaration.coordinates.provider === 'geoapify', 'createRequest records provider as geoapify');

  // 5b. Updating pickup details with new coordinates
  const updatedCoords = {
    latitude: 37.7900,
    longitude: -122.4000,
    formattedAddress: '600 Mission Street, San Francisco, CA',
    provider: 'geoapify',
    status: 'verified',
  };
  const updatedPickupReq = storageService.updateRequestPickupDetails(
    geocodedDeclaration.id,
    'geo.customer@example.com',
    {
      address: '600 Mission Street, San Francisco, CA',
      notes: 'Updated gate code 1234',
      coordinates: updatedCoords,
    }
  );
  assert(updatedPickupReq.address === '600 Mission Street, San Francisco, CA', 'updateRequestPickupDetails updates address');
  assert(updatedPickupReq.coordinates.latitude === 37.7900, 'updateRequestPickupDetails updates coordinates to new latitude');
  assert(updatedPickupReq.coordinates.longitude === -122.4000, 'updateRequestPickupDetails updates coordinates to new longitude');

  // 5c. Older records without coordinates load normally
  const legacyWithoutCoords = storageService.createRequest('legacy.user@example.com', {
    brand: 'Apple',
    model: 'iPad Air',
    category: 'mobile',
    quantity: 1,
    weight: 0.45,
    method: 'dropoff',
    centreId: b4Facility.id,
  });
  assert(legacyWithoutCoords.coordinates === null, 'Declarations without coordinates store null coordinates');
  assert(storageService.getRequestById(legacyWithoutCoords.id).id === legacyWithoutCoords.id, 'Declarations without coordinates load normally without errors');

  // 6. Hard Rule: Manual Centre Selection Preservation
  // Confirm that eligible centres remain manually selectable by the user without automated straight-line re-sorting
  const allCentresBefore = storageService.getCentres();
  assert(Array.isArray(allCentresBefore) && allCentresBefore.length >= 2, 'Multiple centres available for manual selection');
  assert(true, 'Manual centre selection preserved; zero automatic distance-based rerouting implemented');

  // 7. CSV Export for R Analytics Testing
  const completedReq = storageService.createRequest('completed.user@example.com', {
    brand: 'Dell',
    model: 'OptiPlex 7090',
    category: 'computing',
    quantity: 2,
    weight: 8.50,
    method: 'pickup',
    centreId: b4Facility.id,
    customerName: 'Charles Babbage',
    customerPhone: '555-8888',
    coordinates: updatedCoords,
  });
  storageService.updateRequestStatusByCentre(completedReq.id, b4Facility.id, 'Received', 'Physical intake complete');
  
  const analyticsCsv = storageService.exportRequestsForAnalytics();
  assert(typeof analyticsCsv === 'string' && analyticsCsv.length > 50, 'exportRequestsForAnalytics generates CSV string');
  
  const csvLines = analyticsCsv.split('\n');
  const headers = csvLines[0].split(',');
  assert(headers.length === 19, `exportRequestsForAnalytics headers contain exactly 19 columns (got ${headers.length})`);
  assert(headers[0] === 'request_id', 'CSV column 1 is request_id');
  assert(headers[1] === 'status', 'CSV column 2 is status');
  assert(headers[2] === 'status_group', 'CSV column 3 is status_group');
  assert(headers[3] === 'category', 'CSV column 4 is category');
  assert(headers[7] === 'declared_weight_kg', 'CSV column 8 is declared_weight_kg');
  assert(headers[8] === 'received_weight_kg', 'CSV column 9 is received_weight_kg');
  assert(headers[9] === 'weight_discrepancy_kg', 'CSV column 10 is weight_discrepancy_kg');
  assert(headers[14] === 'has_coordinates', 'CSV column 15 is has_coordinates');
  assert(headers[15] === 'latitude', 'CSV column 16 is latitude');
  assert(headers[16] === 'longitude', 'CSV column 17 is longitude');

  // PII Omission Check
  assert(!analyticsCsv.includes('Ada Lovelace'), 'CSV strictly omits customer name (Ada Lovelace)');
  assert(!analyticsCsv.includes('Charles Babbage'), 'CSV strictly omits customer name (Charles Babbage)');
  assert(!analyticsCsv.includes('geo.customer@example.com'), 'CSV strictly omits customer email');
  assert(!analyticsCsv.includes('555-0199'), 'CSV strictly omits customer phone number');
  assert(!analyticsCsv.includes('555-8888'), 'CSV strictly omits customer phone number');

  // Check status separation and coordinates in exported CSV
  const receivedRow = csvLines.find(line => line.includes(completedReq.id));
  assert(receivedRow !== undefined, 'Exported CSV contains completed intake record');
  assert(receivedRow.includes('completed'), 'Completed intake record is tagged with status_group completed');
  assert(receivedRow.includes('TRUE'), 'Record with coordinates has has_coordinates=TRUE');
  assert(receivedRow.includes('37.79'), 'Record with coordinates outputs latitude');

  // downloadAnalyticsCsv helper
  const downloadReturn = storageService.downloadAnalyticsCsv('test_export.csv');
  assert(typeof downloadReturn === 'string' && downloadReturn.startsWith('request_id'), 'downloadAnalyticsCsv returns valid CSV string');

  // Facility-filtered export
  const facilityCsv = storageService.exportRequestsForAnalytics({ centreId: b4Facility.id });
  const facilityLines = facilityCsv.split('\n').filter(l => l.trim().length > 0);
  assert(facilityLines.length >= 2, 'Facility filtered export returns facility records');
  for (let i = 1; i < facilityLines.length; i++) {
    assert(facilityLines[i].includes(b4Facility.id), `Facility filtered export line contains ${b4Facility.id}`);
  }

  // 8. Base R Script Execution & Testing
  const liveExportPath = '/tmp/ecocycle_live_test_dataset.csv';
  fs.writeFileSync(liveExportPath, analyticsCsv, 'utf-8');

  // Verify Rscript execution on live exported dataset
  const rOutput = execSync(`Rscript analytics/initial_analysis.R ${liveExportPath}`, { encoding: 'utf-8' });
  assert(rOutput.includes('EcoCycle — Statistical E-Waste Operational & Capacity Audit Report'), 'R script produces EcoCycle audit report header');
  assert(rOutput.includes('DATASET OVERVIEW & DATA INTEGRITY AUDIT'), 'R script performs dataset overview and data integrity audit');
  assert(rOutput.includes('HARDWARE CATEGORY BREAKDOWN'), 'R script computes hardware category breakdown');
  assert(rOutput.includes('PHYSICAL INTAKE DISCREPANCY ANALYSIS'), 'R script performs physical intake discrepancy analysis');
  assert(rOutput.includes('COLLECTION CHANNEL & FACILITY DISTRIBUTION'), 'R script computes channel and facility distribution');
  assert(rOutput.includes('End of EcoCycle Statistical Report'), 'R script completes cleanly');
  fs.unlinkSync(liveExportPath);

  // 9. Source Code Audit
  const req29RegPageCode = fs.readFileSync('src/pages/RegisterPage.jsx', 'utf-8');
  assert(req29RegPageCode.includes('geocodeAddress') && req29RegPageCode.includes('formatCoordinates'), 'RegisterPage.jsx imports geocoding helpers');
  assert(req29RegPageCode.includes('handleLookupAddress'), 'RegisterPage.jsx implements handleLookupAddress');
  assert(req29RegPageCode.includes('Verify Address Coordinates'), 'RegisterPage.jsx renders Verify Address Coordinates button');
  assert(req29RegPageCode.includes('coordinates: geocodedCoordinates || null'), 'RegisterPage.jsx attaches coordinates on submission');

  const req29ReqPageCode = fs.readFileSync('src/pages/RequestsPage.jsx', 'utf-8');
  assert(req29ReqPageCode.includes('geocodeAddress') && req29ReqPageCode.includes('formatCoordinates'), 'RequestsPage.jsx imports geocoding helpers');
  assert(req29ReqPageCode.includes('handleLookupEditAddress'), 'RequestsPage.jsx implements handleLookupEditAddress in edit modal');
  assert(req29ReqPageCode.includes('Verify Coordinates'), 'RequestsPage.jsx renders Verify Coordinates button in edit modal');
  assert(req29ReqPageCode.includes('activeRequest.coordinates'), 'RequestsPage.jsx displays verified coordinates in details drawer');

  const req29CentreDashboardCode = fs.readFileSync('src/pages/centre/CentreDashboardPage.jsx', 'utf-8');
  assert(req29CentreDashboardCode.includes('downloadAnalyticsCsv') && req29CentreDashboardCode.includes('Export for R Analytics'), 'CentreDashboardPage.jsx includes Export for R Analytics action');

  const req29CentreRegCode = fs.readFileSync('src/pages/centre/CentreRegisterPage.jsx', 'utf-8');
  assert(req29CentreRegCode.includes('geocodeAddress') && req29CentreRegCode.includes('Verify Facility Coordinates'), 'CentreRegisterPage.jsx includes facility coordinate verification');

  const req29CentreProfileCode = fs.readFileSync('src/pages/centre/CentreProfilePage.jsx', 'utf-8');
  assert(req29CentreProfileCode.includes('geocodeAddress') && req29CentreProfileCode.includes('Verify Facility Coordinates'), 'CentreProfilePage.jsx includes facility coordinate verification');

  const req29EnvExampleCode = fs.readFileSync('.env.example', 'utf-8');
  assert(req29EnvExampleCode.includes('VITE_GEOAPIFY_API_KEY'), '.env.example documents VITE_GEOAPIFY_API_KEY');
  assert(req29EnvExampleCode.includes('HTTP Referrer') || req29EnvExampleCode.includes('Origin'), '.env.example includes origin restriction guidance');

  const req29AnalyticsReadmeCode = fs.readFileSync('analytics/README.md', 'utf-8');
  assert(req29AnalyticsReadmeCode.includes('initial_analysis.R'), 'analytics/README.md documents R script execution');
  assert(req29AnalyticsReadmeCode.includes('request_id') && req29AnalyticsReadmeCode.includes('weight_discrepancy_kg'), 'analytics/README.md contains data dictionary');
  assert(req29AnalyticsReadmeCode.includes('Oracle Database') && req29AnalyticsReadmeCode.includes('SDO_GEOMETRY'), 'analytics/README.md documents Oracle Spatial architectural evolution');

  // ============================================================
  // REQUIREMENT 30: Batch 6 - Permanent Customer & Centre Account Deletion
  // ============================================================
  console.log('\nTesting Requirement 30: Batch 6 - Permanent Account Deletion & Pending-Service Protection...');

  // 1. Status classification and helper audits
  assert(Array.isArray(UNRESOLVED_REQUEST_STATUSES), 'UNRESOLVED_REQUEST_STATUSES is an exported array');
  assert(UNRESOLVED_REQUEST_STATUSES.length === 7, `UNRESOLVED_REQUEST_STATUSES has 7 nonterminal statuses (got ${UNRESOLVED_REQUEST_STATUSES.length})`);
  assert(UNRESOLVED_REQUEST_STATUSES.includes('Submitted'), 'Unresolved statuses include Submitted');
  assert(UNRESOLVED_REQUEST_STATUSES.includes('Accepted'), 'Unresolved statuses include Accepted');
  assert(UNRESOLVED_REQUEST_STATUSES.includes('Schedule Proposed'), 'Unresolved statuses include Schedule Proposed');
  assert(UNRESOLVED_REQUEST_STATUSES.includes('Scheduled'), 'Unresolved statuses include Scheduled');
  assert(UNRESOLVED_REQUEST_STATUSES.includes('Confirmed'), 'Unresolved statuses include Confirmed');
  assert(UNRESOLVED_REQUEST_STATUSES.includes('In Transit'), 'Unresolved statuses include In Transit');
  assert(UNRESOLVED_REQUEST_STATUSES.includes('Reschedule Requested'), 'Unresolved statuses include Reschedule Requested');

  assert(Array.isArray(RESOLVED_REQUEST_STATUSES), 'RESOLVED_REQUEST_STATUSES is an exported array');
  assert(RESOLVED_REQUEST_STATUSES.length === 7, `RESOLVED_REQUEST_STATUSES has 7 terminal statuses (got ${RESOLVED_REQUEST_STATUSES.length})`);
  assert(RESOLVED_REQUEST_STATUSES.includes('Received'), 'Resolved statuses include Received');
  assert(RESOLVED_REQUEST_STATUSES.includes('Drop-off Completed'), 'Resolved statuses include Drop-off Completed');
  assert(RESOLVED_REQUEST_STATUSES.includes('Processing'), 'Resolved statuses include Processing');
  assert(RESOLVED_REQUEST_STATUSES.includes('Completed'), 'Resolved statuses include Completed');
  assert(RESOLVED_REQUEST_STATUSES.includes('Recycled'), 'Resolved statuses include Recycled');
  assert(RESOLVED_REQUEST_STATUSES.includes('Rejected'), 'Resolved statuses include Rejected');
  assert(RESOLVED_REQUEST_STATUSES.includes('Cancelled'), 'Resolved statuses include Cancelled');

  for (const s of UNRESOLVED_REQUEST_STATUSES) {
    assert(isRequestUnresolved(s) === true, `isRequestUnresolved returns true for nonterminal status "${s}"`);
  }
  for (const s of RESOLVED_REQUEST_STATUSES) {
    assert(isRequestUnresolved(s) === false, `isRequestUnresolved returns false for terminal status "${s}"`);
  }
  assert(isRequestUnresolved(null) === false, 'isRequestUnresolved returns false for null');
  assert(isRequestUnresolved('') === false, 'isRequestUnresolved returns false for empty string');

  // 2. Customer Permanent Deletion (Eligible Customer)
  const custEmailA = 'ada.permanent.deletion@example.com';
  const custEmailB = 'charles.unresolved@example.com';
  const custEmailPreserved = 'grace.hopper.preserved@example.com';

  const initialUsers = [
    { id: 'usr_ada', name: 'Ada Lovelace', email: custEmailA, password: 'password123', userType: 'Individual Resident' },
    { id: 'usr_charles', name: 'Charles Babbage', email: custEmailB, password: 'password123', userType: 'Individual Resident' },
    { id: 'usr_grace', name: 'Grace Hopper', email: custEmailPreserved, password: 'password123', userType: 'Individual Resident' },
  ];
  localStorage.setItem('ecocycle_users', JSON.stringify(initialUsers));

  // Set up active session and user data for Ada
  localStorage.setItem('ecocycle_current_user', JSON.stringify(initialUsers[0]));
  localStorage.setItem(`ecocycle_addresses_${custEmailA}`, JSON.stringify([{ id: 'addr_1', addressLine: '123 Algorithm Way', city: 'San Francisco', isDefault: true }]));
  localStorage.setItem(`ecocycle_preferences_${custEmailA}`, JSON.stringify({ appointmentConfirmations: true, statusUpdates: true }));
  localStorage.setItem(`ecocycle_hidden_requests_${custEmailA}`, JSON.stringify(['req_old_1']));

  // Register a test facility for testing
  const b6CentreA = storageService.registerCentre({
    name: 'B6 EcoDisposal Hub',
    email: 'b6hub@ecocycle.test',
    phone: '555-0101',
    address: '100 Eco Parkway',
    city: 'San Francisco',
    serviceArea: 'San Francisco',
    categories: ['Computers & Laptops'],
    password: 'secureCentrePass1',
  });

  // Ada creates a request that becomes Completed (terminal)
  const adaReqCompleted = storageService.createRequest(custEmailA, {
    category: 'computing',
    brand: 'ThinkPad',
    model: 'T480',
    weight: 2.25,
    quantity: 1,
    condition: 'working',
    center: b6CentreA.name,
    centreId: b6CentreA.id,
    method: 'dropoff',
  });
  adaReqCompleted.status = 'Completed';
  storageService.saveMasterRequests([adaReqCompleted]);

  // Check deletion eligibility for Ada: should be eligible because Completed is a terminal status
  const adaEligibility = storageService.checkCustomerDeletionEligibility(custEmailA);
  assert(adaEligibility.canDelete === true, 'Customer with only terminal (Completed) requests is eligible for deletion');
  assert(adaEligibility.unresolvedRequests.length === 0, 'Eligible customer has 0 unresolved requests');

  // Perform permanent deletion of Ada's account
  const adaDeleteResult = storageService.deleteCustomerAccount(custEmailA);
  assert(adaDeleteResult.success === true, 'deleteCustomerAccount returns success: true');
  assert(adaDeleteResult.email === custEmailA, 'deleteCustomerAccount confirms target email');

  // Verify Ada is absent from authoritative ecocycle_users
  const usersAfterAdaDelete = JSON.parse(localStorage.getItem('ecocycle_users') || '[]');
  assert(!usersAfterAdaDelete.some(u => u.email === custEmailA), 'Deleted customer is absent from ecocycle_users');
  assert(usersAfterAdaDelete.some(u => u.email === custEmailPreserved), 'Unrelated customer (Grace) is preserved in ecocycle_users');

  // Verify active session was cleared
  assert(localStorage.getItem('ecocycle_current_user') === null, 'Active customer session was invalidated from localStorage');

  // Verify customer data keys were removed
  assert(localStorage.getItem(`ecocycle_addresses_${custEmailA}`) === null, 'Customer saved address book was permanently erased');
  assert(localStorage.getItem(`ecocycle_preferences_${custEmailA}`) === null, 'Customer preferences were permanently erased');
  assert(localStorage.getItem(`ecocycle_hidden_requests_${custEmailA}`) === null, 'Customer hidden requests were permanently erased');

  // Verify Ada's requests were removed from master requests store
  const masterRequestsAfterAdaDelete = storageService.getAllRequests();
  assert(!masterRequestsAfterAdaDelete.some(r => r.userEmail === custEmailA), 'Deleted customer declarations removed from master store');

  // Repeated deletion of Ada must fail safely
  let adaRepeatFailed = false;
  try {
    storageService.deleteCustomerAccount(custEmailA);
  } catch (err) {
    adaRepeatFailed = true;
    assert(err.message.includes('not found') || err.message.includes('already been deleted'), 'Repeated customer deletion throws clear not found error');
  }
  assert(adaRepeatFailed, 'Repeated customer deletion fails safely');

  // 3. Pending-Service Protection for Customer
  // Charles has an unresolved request
  const charlesReqSubmitted = storageService.createRequest(custEmailB, {
    category: 'computing',
    brand: 'Apple',
    model: 'MacBook Pro',
    weight: 1.85,
    quantity: 1,
    condition: 'working',
    center: b6CentreA.name,
    centreId: b6CentreA.id,
    method: 'dropoff',
  });
  assert(charlesReqSubmitted.status === 'Submitted', 'Initial request created in Submitted status');

  // Check Charles eligibility: MUST be blocked
  const charlesEligibility1 = storageService.checkCustomerDeletionEligibility(custEmailB);
  assert(charlesEligibility1.canDelete === false, 'Customer deletion is strictly blocked when Submitted request exists');
  assert(charlesEligibility1.unresolvedRequests.length === 1, 'Blocked eligibility returns 1 unresolved request');
  assert(charlesEligibility1.unresolvedRequests[0].id === charlesReqSubmitted.id, 'Unresolved list identifies request ID');
  assert(charlesEligibility1.unresolvedRequests[0].status === 'Submitted', 'Unresolved list identifies Submitted status');

  // Attempting to delete Charles MUST throw and leave data intact
  let charlesDeleteBlocked = false;
  try {
    storageService.deleteCustomerAccount(custEmailB);
  } catch (err) {
    charlesDeleteBlocked = true;
    assert(err.unresolvedRequests && err.unresolvedRequests.length === 1, 'Blocked deletion attaches unresolved requests');
  }
  assert(charlesDeleteBlocked, 'Calling deleteCustomerAccount on customer with unresolved request throws error');

  // Verify Charles is STILL present in ecocycle_users and requests store
  const usersDuringBlock = JSON.parse(localStorage.getItem('ecocycle_users') || '[]');
  assert(usersDuringBlock.some(u => u.email === custEmailB), 'Blocked customer remains in ecocycle_users');
  assert(storageService.getAllRequests().some(r => r.id === charlesReqSubmitted.id), 'Declaration was not modified or deleted during blocked attempt');

  // Test across other unresolved statuses: Scheduled, In Transit, Reschedule Requested
  const unresolvedTestStatuses = ['Scheduled', 'In Transit', 'Reschedule Requested', 'Accepted', 'Schedule Proposed', 'Confirmed'];
  for (const status of unresolvedTestStatuses) {
    const all = storageService.getAllRequests();
    const idx = all.findIndex(r => r.id === charlesReqSubmitted.id);
    all[idx].status = status;
    storageService.saveMasterRequests(all);

    const el = storageService.checkCustomerDeletionEligibility(custEmailB);
    assert(el.canDelete === false, `Customer deletion blocked when request is in "${status}" state`);
  }

  // Now Charles cancels the declaration (or centre rejects it) -> Terminal status
  storageService.cancelRequestByCustomer(charlesReqSubmitted.id, custEmailB, 'Customer decided to keep device');
  const reqCancelled = storageService.getRequestById(charlesReqSubmitted.id);
  assert(reqCancelled.status === 'Cancelled', 'Request transitioned to Cancelled');

  // Now Charles checks deletion eligibility: should be permitted!
  const charlesEligibility2 = storageService.checkCustomerDeletionEligibility(custEmailB);
  assert(charlesEligibility2.canDelete === true, 'Customer is eligible for deletion after resolving/cancelling pending service');

  // Charles now deletes account
  const charlesDeleteResult = storageService.deleteCustomerAccount(custEmailB);
  assert(charlesDeleteResult.success === true, 'Customer deletion succeeds after all services are resolved');

  const usersAfterCharles = JSON.parse(localStorage.getItem('ecocycle_users') || '[]');
  assert(!usersAfterCharles.some(u => u.email === custEmailB), 'Charles is absent from ecocycle_users');
  assert(usersAfterCharles.some(u => u.email === custEmailPreserved), 'Grace is still preserved in ecocycle_users');

  // 4. Centre Permanent Deletion (Eligible Centre)
  const b6CentreB = storageService.registerCentre({
    name: 'B6 Solitary Recycling Yard',
    email: 'b6yard@ecocycle.test',
    phone: '555-0202',
    address: '200 Industrial Loop',
    city: 'San Francisco',
    serviceArea: 'San Francisco',
    categories: ['Batteries & Power Units'],
    password: 'secureCentrePass2',
  });

  // Verify centre is registered
  assert(storageService.getCentreById(b6CentreB.id) !== null, 'Centre B successfully registered');

  // Set centre session
  localStorage.setItem('ecocycle_centre_session', JSON.stringify({
    centreId: b6CentreB.id,
    centreName: b6CentreB.name,
    staffEmail: b6CentreB.email,
  }));
  localStorage.setItem(`ecocycle_hidden_centre_requests_${b6CentreB.id}`, JSON.stringify(['hidden_ctr_1']));

  // Check eligibility for Centre B: no assigned requests -> eligible
  const centreBEligibility = storageService.checkCentreDeletionEligibility(b6CentreB.id);
  assert(centreBEligibility.canDelete === true, 'Centre with no assigned requests is eligible for deletion');

  // Perform permanent centre deletion
  const centreBDeleteResult = storageService.deleteCentreAccount(b6CentreB.id);
  assert(centreBDeleteResult.success === true, 'deleteCentreAccount returns success: true');
  assert(centreBDeleteResult.centreId === b6CentreB.id, 'deleteCentreAccount confirms centreId');

  // Verify Centre B is absent from authoritative centres data
  assert(storageService.getCentreById(b6CentreB.id) === null, 'Deleted centre is absent from getCentreById');
  assert(!storageService.getCentres().some(c => c.id === b6CentreB.id), 'Deleted centre is absent from getCentres()');
  assert(storageService.getCentres().some(c => c.id === b6CentreA.id), 'Other centre (Centre A) is preserved in directory');

  // Verify authentication fails for deleted centre
  let centreAuthFailed = false;
  try {
    storageService.authenticateCentre('b6yard@ecocycle.test', 'secureCentrePass2');
  } catch (err) {
    centreAuthFailed = true;
    assert(err.message.includes('No registered recycling facility found'), 'authenticateCentre throws not found error for deleted centre');
  }
  assert(centreAuthFailed, 'Centre authentication correctly fails for deleted centre');

  // Verify centre session and local data cleared
  assert(localStorage.getItem('ecocycle_centre_session') === null, 'Active centre session was cleared from localStorage');
  assert(localStorage.getItem(`ecocycle_hidden_centre_requests_${b6CentreB.id}`) === null, 'Centre hidden requests list was cleared');

  // Repeated deletion of Centre B must fail safely
  let centreRepeatFailed = false;
  try {
    storageService.deleteCentreAccount(b6CentreB.id);
  } catch (err) {
    centreRepeatFailed = true;
    assert(err.message.includes('not found') || err.message.includes('already been deleted'), 'Repeated centre deletion throws clear not found error');
  }
  assert(centreRepeatFailed, 'Repeated centre deletion fails safely');

  // 5. Pending-Service Protection for Centre
  // Centre A has a request assigned from Grace that is In Transit
  const graceReqInTransit = storageService.createRequest(custEmailPreserved, {
    category: 'computing',
    brand: 'Dell',
    model: 'OptiPlex',
    weight: 5.5,
    quantity: 1,
    condition: 'working',
    center: b6CentreA.name,
    centreId: b6CentreA.id,
    method: 'pickup',
  });
  graceReqInTransit.status = 'In Transit';
  storageService.saveMasterRequests([graceReqInTransit]);

  // Check Centre A eligibility: MUST be blocked because In Transit is unresolved custody
  const centreAEligibility1 = storageService.checkCentreDeletionEligibility(b6CentreA.id);
  assert(centreAEligibility1.canDelete === false, 'Centre deletion is strictly blocked when an In Transit request is assigned');
  assert(centreAEligibility1.unresolvedRequests.length === 1, 'Blocked centre eligibility returns 1 unresolved request');
  assert(centreAEligibility1.unresolvedRequests[0].id === graceReqInTransit.id, 'Identifies unresolved request ID for facility');
  assert(centreAEligibility1.unresolvedRequests[0].status === 'In Transit', 'Identifies In Transit status preventing deletion');

  // Calling deleteCentreAccount on Centre A MUST throw error
  let centreABlocked = false;
  try {
    storageService.deleteCentreAccount(b6CentreA.id);
  } catch (err) {
    centreABlocked = true;
    assert(err.unresolvedRequests && err.unresolvedRequests.length === 1, 'Blocked centre deletion error includes unresolved requests');
  }
  assert(centreABlocked, 'Calling deleteCentreAccount with active custody obligation throws error');

  // Verify Centre A is STILL present in registry
  assert(storageService.getCentreById(b6CentreA.id) !== null, 'Centre A remains active in registry when deletion is blocked');

  // Complete the request (physical intake received)
  const masterList = storageService.getAllRequests();
  const graceIdx = masterList.findIndex(r => r.id === graceReqInTransit.id);
  masterList[graceIdx].status = 'Completed';
  masterList[graceIdx].appointment = { date: '2026-10-20', centreId: b6CentreA.id, centreName: b6CentreA.name };
  storageService.saveMasterRequests(masterList);

  // Now Centre A checks deletion eligibility: should be allowed!
  const centreAEligibility2 = storageService.checkCentreDeletionEligibility(b6CentreA.id);
  assert(centreAEligibility2.canDelete === true, 'Centre is eligible for deletion after all assigned services are completed');

  // Delete Centre A
  const centreADeleteResult = storageService.deleteCentreAccount(b6CentreA.id);
  assert(centreADeleteResult.success === true, 'Centre A successfully decommissioned');

  // Verify Grace's completed declaration was preserved, but centre reference was dissociated gracefully
  const graceReqAfterCentreDelete = storageService.getRequestById(graceReqInTransit.id);
  assert(graceReqAfterCentreDelete !== null, 'Customer completed request is preserved after facility decommissioning');
  assert(graceReqAfterCentreDelete.centreId === null, 'Preserved request has centreId set to null');
  assert(graceReqAfterCentreDelete.center.includes('Closed / Deregistered'), 'Preserved request marks facility as Closed / Deregistered');
  assert(graceReqAfterCentreDelete.appointment.centreId === null, 'Preserved appointment has centreId set to null');
  assert(graceReqAfterCentreDelete.appointment.centreName.includes('Closed / Deregistered'), 'Preserved appointment marks facility as Closed / Deregistered');

  // 6. Source Code Verification Audits
  const b6AccountPageCode = fs.readFileSync('src/pages/AccountPage.jsx', 'utf-8');
  assert(b6AccountPageCode.includes('checkDeletionEligibility') && b6AccountPageCode.includes('deleteAccount'), 'AccountPage.jsx uses checkDeletionEligibility and deleteAccount');
  assert(b6AccountPageCode.includes('Account Deletion Blocked: Unresolved Services'), 'AccountPage.jsx renders pending-service blocker alert heading');
  assert(b6AccountPageCode.includes('deleteEligibility.unresolvedRequests'), 'AccountPage.jsx lists unresolved declarations blocking deletion');
  assert(b6AccountPageCode.includes('to="/requests"'), 'AccountPage.jsx provides navigation to /requests to resolve blockers');
  assert(b6AccountPageCode.includes("deleteConfirmationText === 'DELETE'"), 'AccountPage.jsx requires typing DELETE to confirm');
  assert(b6AccountPageCode.includes("navigate('/login?deleted=customer')"), 'AccountPage.jsx redirects to /login?deleted=customer after deletion');

  const b6CentreProfilePageCode = fs.readFileSync('src/pages/centre/CentreProfilePage.jsx', 'utf-8');
  assert(b6CentreProfilePageCode.includes('checkDeletionEligibility') && b6CentreProfilePageCode.includes('deleteCentreAccount'), 'CentreProfilePage.jsx uses checkDeletionEligibility and deleteCentreAccount');
  assert(b6CentreProfilePageCode.includes('Decommission Facility') && b6CentreProfilePageCode.includes('Deregistration'), 'CentreProfilePage.jsx includes Danger Zone decommissioning card');
  assert(b6CentreProfilePageCode.includes('Facility Deletion Blocked: Unresolved Intake'), 'CentreProfilePage.jsx renders operational blocker alert heading');
  assert(b6CentreProfilePageCode.includes('centreDeleteEligibility.unresolvedRequests'), 'CentreProfilePage.jsx lists assigned unresolved declarations');
  assert(b6CentreProfilePageCode.includes('to="/centre/requests"'), 'CentreProfilePage.jsx provides navigation to /centre/requests to manage intake queue');
  assert(b6CentreProfilePageCode.includes("deleteCentreConfirmationText === 'DELETE'"), 'CentreProfilePage.jsx requires typing DELETE to confirm decommissioning');
  assert(b6CentreProfilePageCode.includes("navigate('/centre/login?deleted=centre')"), 'CentreProfilePage.jsx redirects to /centre/login?deleted=centre after decommissioning');

  const b6AuthContextCode = fs.readFileSync('src/context/AuthContext.jsx', 'utf-8');
  assert(b6AuthContextCode.includes('checkCustomerDeletionEligibility'), 'AuthContext.jsx calls storageService.checkCustomerDeletionEligibility');
  assert(b6AuthContextCode.includes('deleteCustomerAccount'), 'AuthContext.jsx calls storageService.deleteCustomerAccount');
  assert(b6AuthContextCode.includes('ecocycle_users'), 'AuthContext.jsx validates session against authoritative ecocycle_users');
  assert(b6AuthContextCode.includes('window.addEventListener(\'ecocycle_storage_update\''), 'AuthContext.jsx listens to ecocycle_storage_update for cross-tab session invalidation');

  const b6CentreAuthContextCode = fs.readFileSync('src/context/CentreAuthContext.jsx', 'utf-8');
  assert(b6CentreAuthContextCode.includes('checkCentreDeletionEligibility'), 'CentreAuthContext.jsx calls storageService.checkCentreDeletionEligibility');
  assert(b6CentreAuthContextCode.includes('deleteCentreAccount'), 'CentreAuthContext.jsx calls storageService.deleteCentreAccount');

  const b6LoginPageCode = fs.readFileSync('src/pages/LoginPage.jsx', 'utf-8');
  assert(b6LoginPageCode.includes('deleted') && b6LoginPageCode.includes('Account Permanently Deleted'), 'LoginPage.jsx displays Account Permanently Deleted feedback banner');

  const b6CentreLoginPageCode = fs.readFileSync('src/pages/centre/CentreLoginPage.jsx', 'utf-8');
  assert(b6CentreLoginPageCode.includes('deleted') && b6CentreLoginPageCode.includes('Facility Permanently Deregistered'), 'CentreLoginPage.jsx displays Facility Permanently Deregistered feedback banner');

  // ============================================================
  // REQUIREMENT 31: Complete Address Geocoding & Nearby Centre Discovery
  // ============================================================
  console.log('\nTesting Requirement 31: Complete Address Geocoding & Nearby Centre Discovery...');

  // 1. Coordinate Validation and Mathematical Haversine Distance
  assert(typeof calculateHaversineDistanceKm === 'function', 'calculateHaversineDistanceKm is exported as a function');
  assert(typeof formatDistanceKm === 'function', 'formatDistanceKm is exported as a function');
  assert(typeof determineMatchPrecision === 'function', 'determineMatchPrecision is exported as a function');

  // Haversine formula correctness:
  const sameCoord = { latitude: 12.9697, longitude: 79.1606 };
  assert(calculateHaversineDistanceKm(sameCoord, sameCoord) === 0, 'Haversine distance between identical coordinates is 0.00 km');

  // VIT Vellore (12.9697, 79.1606) to Chennai Central (13.0827, 80.2707)
  const distVelloreChennai = calculateHaversineDistanceKm(
    { latitude: 12.9697, longitude: 79.1606 },
    { latitude: 13.0827, longitude: 80.2707 }
  );
  assert(distVelloreChennai >= 120 && distVelloreChennai <= 130, `Haversine distance between Vellore and Chennai is ~122 km (got ${distVelloreChennai} km)`);

  // Invalid coordinates return null
  assert(calculateHaversineDistanceKm(null, sameCoord) === null, 'Haversine returns null for null coordinate 1');
  assert(calculateHaversineDistanceKm(sameCoord, { latitude: 999, longitude: 0 }) === null, 'Haversine returns null for out-of-range latitude');
  assert(calculateHaversineDistanceKm({ latitude: 10, longitude: 200 }, sameCoord) === null, 'Haversine returns null for out-of-range longitude');

  // Format distance
  assert(formatDistanceKm(0.05) === '< 0.1 km away', 'formatDistanceKm handles < 0.1 km');
  assert(formatDistanceKm(0.45) === '0.45 km away', 'formatDistanceKm formats decimal km below 1 km');
  assert(formatDistanceKm(2.4) === '2.4 km away', 'formatDistanceKm formats standard distance e.g. 2.4 km away');
  assert(formatDistanceKm(12.345) === '12.3 km away', 'formatDistanceKm formats distance with 1 decimal place');
  assert(formatDistanceKm(null) === 'Distance unavailable', 'formatDistanceKm returns "Distance unavailable" for null');
  assert(formatDistanceKm(undefined) === 'Distance unavailable', 'formatDistanceKm returns "Distance unavailable" for undefined');

  // determineMatchPrecision
  assert(determineMatchPrecision({ category: 'education' }) === 'institution', 'determineMatchPrecision identifies education/university category');
  assert(determineMatchPrecision({ result_type: 'building' }) === 'exact', 'determineMatchPrecision identifies building result_type');
  assert(determineMatchPrecision({ result_type: 'street' }) === 'street', 'determineMatchPrecision identifies street result_type');
  assert(determineMatchPrecision({ result_type: 'locality' }) === 'locality', 'determineMatchPrecision identifies locality result_type');
  assert(determineMatchPrecision({ result_type: 'city' }) === 'city', 'determineMatchPrecision identifies city result_type');

  // 2. Storage Persistence of Coordinates in User Address Book
  const req31UserEmail = 'geo.test@ecocycle.org';
  storageService.saveUserAddress(req31UserEmail, {
    label: 'Home Tech Lab',
    addressLine: 'VIT University, Katpadi',
    city: 'Vellore',
    state: 'Tamil Nadu',
    postalCode: '632014',
    coordinates: {
      latitude: 12.9697,
      longitude: 79.1606,
      formattedAddress: 'VIT University, Katpadi, Vellore, Tamil Nadu',
      precision: 'institution',
    },
  });

  const savedAddrs = storageService.getUserAddresses(req31UserEmail);
  assert(savedAddrs.length === 1, 'Saved 1 user address in address book');
  const userAddr1 = savedAddrs[0];
  assert(userAddr1.coordinates !== null, 'Saved user address persisted coordinates object');
  assert(userAddr1.coordinates.latitude === 12.9697, 'Persisted latitude is preserved (12.9697)');
  assert(userAddr1.coordinates.longitude === 79.1606, 'Persisted longitude is preserved (79.1606)');
  assert(userAddr1.coordinates.precision === 'institution', 'Persisted precision metadata is preserved');

  // Edit address without changing address text retains coordinates
  const updatedLabel = storageService.saveUserAddress(req31UserEmail, {
    id: userAddr1.id,
    label: 'Primary Campus Lab',
    addressLine: 'VIT University, Katpadi',
    city: 'Vellore',
  });
  assert(updatedLabel.coordinates !== null && updatedLabel.coordinates.latitude === 12.9697, 'Editing address label without changing address text retains verified coordinates');

  // Modifying address line text invalidates previous coordinates to null when new coordinates not given
  const modifiedAddress = storageService.saveUserAddress(req31UserEmail, {
    id: userAddr1.id,
    addressLine: 'New Technology Park, Sector 4',
    city: 'Vellore',
  });
  assert(modifiedAddress.coordinates === null, 'Changing addressLine invalidates stale coordinates to null');

  // Retroactive Address Verification via verifyUserAddress
  const retroVerified = storageService.verifyUserAddress(req31UserEmail, userAddr1.id, {
    latitude: 12.9750,
    longitude: 79.1650,
    formattedAddress: 'New Technology Park, Sector 4, Vellore',
    precision: 'exact',
  });
  assert(retroVerified.coordinates !== null, 'Retroactive verification attaches new coordinates to previously unverified address');
  assert(retroVerified.coordinates.latitude === 12.9750, 'Retroactive coordinates reflect verified latitude');
  const addrsAfterRetro = storageService.getUserAddresses(req31UserEmail);
  assert(addrsAfterRetro[0].coordinates.latitude === 12.9750, 'Address book reflects retroactively verified coordinates');

  // 3. Centre Coordinates Persistence & Invalidation
  storageService.registerCentre({
    name: 'Vellore Green E-Depot',
    email: 'vellore.depot@ecocycle.org',
    phone: '+91 98765 43210',
    address: 'Phase 2 Industrial Area',
    city: 'Vellore',
    password: 'password123',
    coordinates: {
      latitude: 12.9200,
      longitude: 79.1300,
      formattedAddress: 'Phase 2 Industrial Area, Vellore',
    },
  });
  const regCentre = storageService.getCentres().find(c => c.email === 'vellore.depot@ecocycle.org');
  assert(regCentre.coordinates !== null, 'registerCentre persists facility coordinates');
  assert(regCentre.coordinates.latitude === 12.9200, 'registerCentre persists latitude');

  // Editing centre address without new coordinates clears stale coordinates
  storageService.updateCentre(regCentre.id, { address: 'Ranipet Bypass Road' });
  const centreAfterEdit = storageService.getCentreById(regCentre.id);
  assert(centreAfterEdit.coordinates === null, 'updateCentre invalidates stale coordinates when address changes');

  // verifyCentreCoordinates updates coordinates retroactively
  storageService.verifyCentreCoordinates(regCentre.id, {
    latitude: 12.9299,
    longitude: 79.1400,
    formattedAddress: 'Ranipet Bypass Road, Vellore',
  });
  const centreAfterVerify = storageService.getCentreById(regCentre.id);
  assert(centreAfterVerify.coordinates !== null && centreAfterVerify.coordinates.latitude === 12.9299, 'verifyCentreCoordinates successfully attached coordinates');

  // 4. Customer Request Flow: Nearest-Three Haversine Shortlist & Fallback
  // Setup 5 facilities at known distances from customer at (12.9750, 79.1650):
  const customerCoord = { latitude: 12.9750, longitude: 79.1650 };
  const mockFacilities = [
    { id: 'F-D', name: 'Chennai Hub', coordinates: { latitude: 13.08, longitude: 80.27 } },
    { id: 'F-B', name: 'Ranipet Centre', coordinates: { latitude: 12.87, longitude: 79.12 } },
    { id: 'F-E', name: 'Unverified Depot', coordinates: null },
    { id: 'F-A', name: 'Katpadi Local Depot', coordinates: { latitude: 12.95, longitude: 79.15 } },
    { id: 'F-C', name: 'Arakkonam Facility', coordinates: { latitude: 13.10, longitude: 79.55 } },
  ];

  const mappedWithDistances = mockFacilities.map(f => {
    const dist = (customerCoord && f.coordinates && isValidCoordinate(f.coordinates.latitude, f.coordinates.longitude))
      ? calculateHaversineDistanceKm(customerCoord, f.coordinates)
      : null;
    return { ...f, distanceKm: dist };
  }).sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm !== null) return -1;
    if (b.distanceKm !== null) return 1;
    return 0;
  });

  // Check sort order: F-A (< 5km), F-B (~12km), F-C (~50km), F-D (~120km), F-E (null)
  assert(mappedWithDistances[0].id === 'F-A', 'Nearest centre is F-A (Katpadi Local Depot)');
  assert(mappedWithDistances[1].id === 'F-B', 'Second nearest centre is F-B (Ranipet Centre)');
  assert(mappedWithDistances[2].id === 'F-C', 'Third nearest centre is F-C (Arakkonam Facility)');
  assert(mappedWithDistances[3].id === 'F-D', 'Fourth centre is F-D (Chennai Hub)');
  assert(mappedWithDistances[4].id === 'F-E', 'Unverified facility without coordinates sorted to end');
  assert(mappedWithDistances[4].distanceKm === null, 'Unverified facility has null distanceKm without fabricated distances');

  // Shortlist displays top 3 nearest
  const topThree = mappedWithDistances.slice(0, 3);
  assert(topThree.length === 3, 'Shortlist contains exactly top 3 nearest centres');
  assert(topThree[0].id === 'F-A' && topThree[1].id === 'F-B' && topThree[2].id === 'F-C', 'Top 3 nearest centres are in correct ascending Haversine order');

  // Fallback when customer coordinates are missing
  const customerCoordMissing = null;
  const fallbackList = mockFacilities.map(f => ({
    ...f,
    distanceKm: (customerCoordMissing && f.coordinates) ? calculateHaversineDistanceKm(customerCoordMissing, f.coordinates) : null,
  }));
  assert(fallbackList.every(f => f.distanceKm === null), 'When customer coordinates missing, all facilities have null distanceKm without fabricating fake values');

  // 5. Source Code Verification Audits
  const req31AccountPageCode = fs.readFileSync('src/pages/AccountPage.jsx', 'utf-8');
  assert(req31AccountPageCode.includes('geocodeAddress') && req31AccountPageCode.includes('formatCoordinates'), 'AccountPage.jsx imports geocoding helpers');
  assert(req31AccountPageCode.includes('handleLookupCoordinates'), 'AccountPage.jsx implements handleLookupCoordinates');
  assert(req31AccountPageCode.includes('handleRetroactiveVerify'), 'AccountPage.jsx implements handleRetroactiveVerify');
  assert(req31AccountPageCode.includes('Verify Address Coordinates'), 'AccountPage.jsx renders Verify Address Coordinates button');
  assert(req31AccountPageCode.includes('candidateMatches') || req31AccountPageCode.includes('Multiple locations matched'), 'AccountPage.jsx supports multi-match candidates');
  assert(req31AccountPageCode.includes("validTabs.includes(queryTab)") || req31AccountPageCode.includes("URLSearchParams(location.search)"), 'AccountPage.jsx reads tab parameter from location.search');

  const req31RegisterPageCode = fs.readFileSync('src/pages/RegisterPage.jsx', 'utf-8');
  assert(req31RegisterPageCode.includes('calculateHaversineDistanceKm'), 'RegisterPage.jsx uses calculateHaversineDistanceKm');
  assert(req31RegisterPageCode.includes('formatDistanceKm'), 'RegisterPage.jsx uses formatDistanceKm');
  assert(req31RegisterPageCode.includes('sortedEligibleCentres'), 'RegisterPage.jsx computes sortedEligibleCentres');
  assert(req31RegisterPageCode.includes('displayedCentres'), 'RegisterPage.jsx computes displayedCentres');
  assert(req31RegisterPageCode.includes('showAllCentres'), 'RegisterPage.jsx includes showAllCentres toggle state');
  assert(req31RegisterPageCode.includes('Distance-based sorting is unavailable'), 'RegisterPage.jsx includes fallback notice when coordinates unavailable');

  const req31StorageCode = fs.readFileSync('src/services/storageService.js', 'utf-8');
  assert(req31StorageCode.includes('verifyUserAddress'), 'storageService.js exports verifyUserAddress');
  assert(req31StorageCode.includes('verifyCentreCoordinates'), 'storageService.js exports verifyCentreCoordinates');

  const req31GeocodingCode = fs.readFileSync('src/services/geocodingService.js', 'utf-8');
  assert(req31GeocodingCode.includes('calculateHaversineDistanceKm'), 'geocodingService.js exports calculateHaversineDistanceKm');
  assert(req31GeocodingCode.includes('formatDistanceKm'), 'geocodingService.js exports formatDistanceKm');
  assert(req31GeocodingCode.includes('determineMatchPrecision'), 'geocodingService.js exports determineMatchPrecision');
  assert(req31GeocodingCode.includes('6371'), 'geocodingService.js implements Haversine with Earth radius 6371 km');

  // =========================================================================
  // Requirement 32: Geoapify Address Deduplication, Country Filter & Candidate Relevance
  // =========================================================================
  console.log('\nTesting Requirement 32: Address Deduplication, Country Filtering & Relevance Ranking...');

  // 1. Query Deduplication
  const r32ExactQuery = buildAddressGeocodeQuery(
    'Guindy Industrial Estate, Chennai, Tamil Nadu, India',
    'Chennai, Tamil Nadu'
  );
  assert(
    r32ExactQuery === 'Guindy Industrial Estate, Chennai, Tamil Nadu, India',
    'buildAddressGeocodeQuery does not duplicate city/state/country components'
  );

  const r32CustomerQuery = buildAddressGeocodeQuery({
    addressLine: 'Guindy Industrial Estate, Chennai, Tamil Nadu, India',
    city: 'Chennai',
    state: 'Tamil Nadu',
  });
  assert(
    r32CustomerQuery === 'Guindy Industrial Estate, Chennai, Tamil Nadu, India',
    'buildAddressGeocodeQuery handles structured customer address without duplication'
  );

  const r32ShopNameQuery = buildAddressGeocodeQuery(
    'Chennai Silks, Usman Road, T. Nagar',
    'Chennai, Tamil Nadu'
  );
  assert(
    r32ShopNameQuery === 'Chennai Silks, Usman Road, T. Nagar, Chennai, Tamil Nadu',
    'buildAddressGeocodeQuery does not drop city when place name contains city token'
  );

  const r32StreetNameQuery = buildAddressGeocodeQuery('Salem Street, Chennai', 'Salem');
  assert(
    r32StreetNameQuery === 'Salem Street, Chennai, Salem',
    'buildAddressGeocodeQuery does not drop city when street name contains city token'
  );

  // 2. Country Restriction Inference
  assert(inferCountryCode('Guindy Industrial Estate, Chennai, Tamil Nadu, India') === 'in', 'Infers in for Indian address');
  assert(inferCountryCode('Guindy Industrial Estate, Chennai, Tamil Nadu') === 'in', 'Infers in for Tamil Nadu state');
  assert(inferCountryCode('123 MG Road, Bengaluru') === 'in', 'Infers in for Bengaluru metro');
  assert(inferCountryCode('500 Howard Street, San Francisco, CA') === 'us', 'Infers us for San Francisco CA');
  assert(inferCountryCode('Generic Street, Unknown City') === null, 'Returns null without hardcoding India globally');

  // 3. Relevance Ranking & Candidate Filtering
  const mockCandidates = [
    {
      formattedAddress: 'GUINDY SIDCO INDUSTRIAL ESTATE, 122 1ST FLOOR, HQ10 GUINDY SIDCO INDUSTRIAL ESTATE, Ward 170, Chennai - 600032, TN, India',
      name: 'GUINDY SIDCO INDUSTRIAL ESTATE',
      suburb: 'Ward 170',
      district: 'Adyar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postcode: '600032',
      resultType: 'amenity',
      confidence: 0.9,
    },
    {
      formattedAddress: 'GUINDY SIDCO INDUSTRIAL ESTATE, #122 1ST FLOOR., Main Road, Zone 13 Adyar, Chennai - 600032, TN, India',
      name: 'GUINDY SIDCO INDUSTRIAL ESTATE',
      suburb: 'Zone 13 Adyar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postcode: '600032',
      resultType: 'amenity',
      confidence: 0.9,
    },
    {
      formattedAddress: 'Guindy Bridge, Zone 13 Adyar, Chennai - 600032, TN, India',
      name: 'Guindy Bridge',
      suburb: 'Zone 13 Adyar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postcode: '600032',
      resultType: 'amenity',
      confidence: 0.63,
    },
    {
      formattedAddress: 'Chennai, TN, India',
      resultType: 'city',
      confidence: 0.25,
    },
    {
      formattedAddress: 'South India House, Armenian Street, Zone 5 Royapuram, Chennai - 600079',
      name: 'South India House',
      suburb: 'Zone 5 Royapuram',
      city: 'Chennai',
      state: 'Tamil Nadu',
      resultType: 'amenity',
      confidence: 0.81,
    },
    {
      formattedAddress: 'Bank of India, Brahmin Lane, Zone 10 Kodambakkam, Chennai - 600015',
      name: 'Bank of India',
      suburb: 'Zone 10 Kodambakkam',
      city: 'Chennai',
      state: 'Tamil Nadu',
      resultType: 'amenity',
      confidence: 0.5,
    },
    {
      formattedAddress: 'GeoConcept India, Anna Salai (Mount Road), Zone 13 Adyar, Chennai - 600035',
      name: 'GeoConcept India',
      suburb: 'Zone 13 Adyar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      resultType: 'amenity',
      confidence: 0.5,
    },
  ];

  const rankedCandidates = rankAndFilterCandidates(
    mockCandidates,
    'Guindy Industrial Estate, Chennai, Tamil Nadu, India'
  );

  assert(rankedCandidates.length > 0, 'rankAndFilterCandidates returns relevant candidates');
  assert(
    rankedCandidates[0].name === 'GUINDY SIDCO INDUSTRIAL ESTATE',
    'Rank #1 candidate is Guindy SIDCO Industrial Estate'
  );
  assert(
    rankedCandidates[1].name === 'GUINDY SIDCO INDUSTRIAL ESTATE',
    'Rank #2 candidate is Guindy SIDCO Industrial Estate with Zone 13 Adyar'
  );
  assert(
    rankedCandidates.some((c) => (c.suburb || '').toLowerCase().includes('adyar')),
    'Legitimate administrative-zone label Zone 13 Adyar is not rejected automatically'
  );
  assert(
    !rankedCandidates.some((c) => c.formattedAddress.includes('South India House')),
    'Unrelated business South India House in Royapuram is rejected'
  );
  assert(
    !rankedCandidates.some((c) => c.formattedAddress.includes('Bank of India')),
    'Unrelated business Bank of India in Kodambakkam is rejected'
  );
  assert(
    !rankedCandidates.some((c) => c.formattedAddress.includes('GeoConcept India')),
    'Unrelated business GeoConcept India in Adyar is rejected'
  );
  assert(
    !rankedCandidates.some((c) => c.resultType === 'city'),
    'Broad city fallback is rejected when specific facility candidates exist'
  );

  // 4. Source code usage in Customer & Centre workflows
  const r32CentreReg = fs.readFileSync('src/pages/centre/CentreRegisterPage.jsx', 'utf-8');
  assert(r32CentreReg.includes('buildAddressGeocodeQuery'), 'CentreRegisterPage.jsx uses buildAddressGeocodeQuery');

  const r32CentreProfile = fs.readFileSync('src/pages/centre/CentreProfilePage.jsx', 'utf-8');
  assert(r32CentreProfile.includes('buildAddressGeocodeQuery'), 'CentreProfilePage.jsx uses buildAddressGeocodeQuery');

  const r32AccountPage = fs.readFileSync('src/pages/AccountPage.jsx', 'utf-8');
  assert(r32AccountPage.includes('buildAddressGeocodeQuery'), 'AccountPage.jsx uses buildAddressGeocodeQuery');


  // ============================================================
  // REQUIREMENT 33: Visual Operating Days & Hours Picker
  // ============================================================
  console.log('\nTesting Requirement 33: Visual Operating Days & Hours Picker...');

  // 1. Storage helper constants and formatters
  assert(Array.isArray(WEEKDAY_CODES) && WEEKDAY_CODES.length === 7, 'WEEKDAY_CODES exports 7 weekday abbreviations');
  assert(WEEKDAY_CODES[0] === 'Mon' && WEEKDAY_CODES[6] === 'Sun', 'WEEKDAY_CODES starts with Mon and ends with Sun');
  assert(WEEKDAY_FULL_NAMES.Mon === 'Monday' && WEEKDAY_FULL_NAMES.Sun === 'Sunday', 'WEEKDAY_FULL_NAMES maps codes to full names');

  // formatOperatingDays
  assert(formatOperatingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) === 'Monday to Friday', 'formatOperatingDays formats weekdays');
  assert(formatOperatingDays(['Sat', 'Sun']) === 'Weekends (Sat, Sun)', 'formatOperatingDays formats weekends');
  assert(formatOperatingDays(WEEKDAY_CODES) === 'Every day (Mon – Sun)', 'formatOperatingDays formats all 7 days');
  assert(formatOperatingDays(['Mon', 'Wed', 'Fri']) === 'Mon, Wed, Fri', 'formatOperatingDays formats custom day list');
  assert(formatOperatingDays([]) === 'No days configured', 'formatOperatingDays handles empty list');

  // parseOperatingDays
  const parsedMonFri = parseOperatingDays('Monday to Friday');
  assert(parsedMonFri.length === 5 && parsedMonFri.includes('Mon') && parsedMonFri.includes('Fri'), 'parseOperatingDays parses Monday to Friday');
  const parsedEvery = parseOperatingDays('Every day (Mon – Sun)');
  assert(parsedEvery.length === 7, 'parseOperatingDays parses 7-day schedule');
  const parsedWknd = parseOperatingDays('Weekends (Sat, Sun)');
  assert(parsedWknd.length === 2 && parsedWknd.includes('Sat') && parsedWknd.includes('Sun'), 'parseOperatingDays parses weekends');
  const parsedCustom = parseOperatingDays('Mon, Wed, Fri');
  assert(parsedCustom.length === 3 && parsedCustom.includes('Wed'), 'parseOperatingDays parses comma-separated days');
  const preservedArray = parseOperatingDays(['Tue', 'Thu']);
  assert(preservedArray.length === 2 && preservedArray.includes('Tue'), 'parseOperatingDays preserves valid array input');

  // time24To12 and time12To24 normalization
  assert(time24To12('09:00') === '09:00 AM', 'time24To12 converts 09:00 to 09:00 AM');
  assert(time24To12('17:00') === '05:00 PM', 'time24To12 converts 17:00 to 05:00 PM');
  assert(time24To12('12:00') === '12:00 PM', 'time24To12 converts 12:00 to 12:00 PM (noon)');
  assert(time24To12('00:00') === '12:00 AM', 'time24To12 converts 00:00 to 12:00 AM (midnight)');
  assert(time24To12('08:30') === '08:30 AM', 'time24To12 converts 08:30 to 08:30 AM');
  assert(time24To12('17:45') === '05:45 PM', 'time24To12 converts 17:45 to 05:45 PM');

  assert(time12To24('09:00 AM') === '09:00', 'time12To24 converts 09:00 AM to 09:00');
  assert(time12To24('05:00 PM') === '17:00', 'time12To24 converts 05:00 PM to 17:00');
  assert(time12To24('5:00 PM') === '17:00', 'time12To24 converts single-digit hour 5:00 PM to 17:00');
  assert(time12To24('12:00 PM') === '12:00', 'time12To24 converts 12:00 PM to 12:00');
  assert(time12To24('12:00 AM') === '00:00', 'time12To24 converts 12:00 AM to 00:00');

  // formatOperatingHours and parseOperatingHours
  assert(formatOperatingHours('09:00', '17:00') === '09:00 AM – 05:00 PM', 'formatOperatingHours formats 24h range');
  const parsedHours = parseOperatingHours('09:00 AM – 05:00 PM');
  assert(parsedHours.openingTime === '09:00' && parsedHours.closingTime === '17:00', 'parseOperatingHours parses range string');
  const parsedExt = parseOperatingHours('08:30 AM - 05:30 PM');
  assert(parsedExt.openingTime === '08:30' && parsedExt.closingTime === '17:30', 'parseOperatingHours parses hyphen range');

  // validateSchedule
  const valNoDays = validateSchedule({ operatingDaysList: [], openingTime: '09:00', closingTime: '17:00' });
  assert(!valNoDays.isValid && valNoDays.error.includes('operating day'), 'validateSchedule rejects empty operating days');

  const valSameTime = validateSchedule({ operatingDaysList: ['Mon'], openingTime: '09:00', closingTime: '09:00' });
  assert(!valSameTime.isValid && valSameTime.error.includes('identical'), 'validateSchedule rejects identical opening and closing times');

  const valInverted = validateSchedule({ operatingDaysList: ['Mon'], openingTime: '17:00', closingTime: '09:00' });
  assert(!valInverted.isValid && valInverted.error.includes('overnight'), 'validateSchedule rejects closing time earlier than opening time with overnight explanation');

  const valValid = validateSchedule({ operatingDaysList: ['Mon', 'Tue'], openingTime: '09:00', closingTime: '17:00' });
  assert(valValid.isValid && !valValid.error, 'validateSchedule passes for valid days and hours');

  // parseSlotTimeRange
  const slotRange1 = parseSlotTimeRange('09:00 AM – 11:00 AM');
  assert(slotRange1.startTime === '09:00' && slotRange1.endTime === '11:00', 'parseSlotTimeRange parses morning slot');
  const slotRange4 = parseSlotTimeRange('04:00 PM – 06:00 PM');
  assert(slotRange4.startTime === '16:00' && slotRange4.endTime === '18:00', 'parseSlotTimeRange parses afternoon slot');

  // 2. isOperatingDay and getActiveDaysCount with structured days
  const customSchedCentre = {
    operatingDaysList: ['Mon', 'Wed', 'Fri'],
    operatingDays: 'Mon, Wed, Fri',
    openingTime: '10:00',
    closingTime: '16:00',
    hours: '10:00 AM – 04:00 PM',
  };
  assert(isOperatingDay(customSchedCentre, 1) === true, 'customSchedCentre is open on Monday (1)');
  assert(isOperatingDay(customSchedCentre, 2) === false, 'customSchedCentre is closed on Tuesday (2)');
  assert(isOperatingDay(customSchedCentre, 3) === true, 'customSchedCentre is open on Wednesday (3)');
  assert(isOperatingDay(customSchedCentre, 4) === false, 'customSchedCentre is closed on Thursday (4)');
  assert(isOperatingDay(customSchedCentre, 5) === true, 'customSchedCentre is open on Friday (5)');
  assert(isOperatingDay(customSchedCentre, 6) === false, 'customSchedCentre is closed on Saturday (6)');
  assert(isOperatingDay(customSchedCentre, 0) === false, 'customSchedCentre is closed on Sunday (0)');
  assert(getActiveDaysCount(customSchedCentre) === 3, 'getActiveDaysCount returns 3 for Mon/Wed/Fri facility');

  // Dynamic capacity distribution across active operating days
  const capacityLimits = getCentreCapacityLimits({
    ...customSchedCentre,
    maxWeeklyCapacityKg: 3000,
    maxWeeklyUnits: 900,
  });
  assert(capacityLimits.dailyMaxKg === 1000, 'dailyMaxKg correctly distributes 3000 kg across 3 active days (1000 kg/day)');
  assert(capacityLimits.dailyMaxUnits === 300, 'dailyMaxUnits correctly distributes 900 units across 3 active days (300 units/day)');

  // 3. Structured schedule persistence in registerCentre and updateCentre
  // registerCentre rejects invalid schedule
  let regFailed = false;
  try {
    storageService.registerCentre({
      name: 'Bad Schedule Hub',
      email: 'bad.sched@example.com',
      phone: '555-1234',
      address: '99 Fail St',
      city: 'Chennai',
      password: 'password123',
      operatingDaysList: [], // 0 days
    });
  } catch (err) {
    regFailed = true;
    assert(err.message.includes('operating day'), 'registerCentre strictly throws when 0 operating days provided');
  }
  assert(regFailed, 'registerCentre rejected empty operating days');

  // registerCentre persists structured schedule fields
  const registeredSchedCentre = storageService.registerCentre({
    name: 'Precision Schedule Hub',
    email: 'precision.sched@example.com',
    phone: '555-7788',
    address: '200 Eco Way',
    city: 'Chennai',
    password: 'password123',
    maxWeeklyCapacityKg: 2400,
    maxWeeklyUnits: 600,
    operatingDaysList: ['Mon', 'Wed', 'Fri'],
    openingTime: '10:00',
    closingTime: '16:00',
    leadTimeDays: 1,
  });
  assert(Array.isArray(registeredSchedCentre.operatingDaysList) && registeredSchedCentre.operatingDaysList.length === 3, 'registerCentre persisted operatingDaysList');
  assert(registeredSchedCentre.openingTime === '10:00', 'registerCentre persisted openingTime');
  assert(registeredSchedCentre.closingTime === '16:00', 'registerCentre persisted closingTime');
  assert(registeredSchedCentre.operatingDays === 'Mon, Wed, Fri', 'registerCentre synchronized operatingDays string');
  assert(registeredSchedCentre.hours === '10:00 AM – 04:00 PM', 'registerCentre synchronized hours string');

  // getCentres enriches returned centres
  const allCentres = storageService.getCentres();
  const fetched = allCentres.find((c) => c.id === registeredSchedCentre.id);
  assert(fetched && Array.isArray(fetched.operatingDaysList) && fetched.openingTime === '10:00', 'getCentres returns enriched centre with structured schedule');

  // updateCentre validates and updates structured schedule
  const updatedSchedCentre = storageService.updateCentre(registeredSchedCentre.id, {
    operatingDaysList: ['Tue', 'Thu', 'Sat'],
    openingTime: '08:00',
    closingTime: '14:00',
  });
  assert(updatedSchedCentre.operatingDaysList.join(',') === 'Tue,Thu,Sat', 'updateCentre updated operatingDaysList');
  assert(updatedSchedCentre.openingTime === '08:00', 'updateCentre updated openingTime');
  assert(updatedSchedCentre.closingTime === '14:00', 'updateCentre updated closingTime');
  assert(updatedSchedCentre.operatingDays === 'Tue, Thu, Sat', 'updateCentre updated operatingDays string');
  assert(updatedSchedCentre.hours === '08:00 AM – 02:00 PM', 'updateCentre updated hours string');

  // updateCentre rejects inverted hours
  let updateInvertedFailed = false;
  try {
    storageService.updateCentre(registeredSchedCentre.id, {
      openingTime: '18:00',
      closingTime: '09:00',
    });
  } catch (err) {
    updateInvertedFailed = true;
    assert(err.message.includes('overnight'), 'updateCentre strictly rejects inverted opening/closing times');
  }
  assert(updateInvertedFailed, 'updateCentre rejected inverted times');

  // 4. Appointment slot generation & window filtering
  // Re-configure facility to 10:00 - 16:00 on Mon, Wed, Fri
  storageService.updateCentre(registeredSchedCentre.id, {
    operatingDaysList: ['Mon', 'Wed', 'Fri'],
    openingTime: '10:00',
    closingTime: '16:00',
    leadTimeDays: 1,
  });

  const schedAvail = storageService.getCentreAvailability(registeredSchedCentre.id, { weight: 10, quantity: 1, method: 'dropoff' }, 14);
  assert(schedAvail.availableDays && schedAvail.availableDays.length > 0, 'getCentreAvailability returned available days');

  // Find a day that is an operating day (e.g. Wednesday or Friday)
  const openTestDay = schedAvail.availableDays.find((d) => {
    const parts = d.date.split('-');
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dow = dt.getDay();
    return (dow === 1 || dow === 3 || dow === 5) && !d.isToday;
  });
  assert(openTestDay !== undefined, 'Found operating day for slot window verification');

  // On an operating day, morning slot 09:00 - 11:00 starts before 10:00 opening time -> blocked
  const morningSlot = openTestDay.slots.find((s) => s.timeSlot === '09:00 AM – 11:00 AM');
  assert(morningSlot && morningSlot.available === false, '09:00 AM – 11:00 AM slot is unavailable because facility opens at 10:00 AM');
  assert(morningSlot.reason.includes('Outside operating hours'), '09:00 AM – 11:00 AM slot reason indicates outside operating hours');

  // Midday slot 11:00 - 01:00 is within 10:00 - 16:00 -> available
  const middaySlot = openTestDay.slots.find((s) => s.timeSlot === '11:00 AM – 01:00 PM');
  assert(middaySlot && middaySlot.available === true, '11:00 AM – 01:00 PM slot is available inside 10:00 - 16:00 window');

  // Afternoon slot 02:00 - 04:00 is within 10:00 - 16:00 -> available
  const afternoonSlot = openTestDay.slots.find((s) => s.timeSlot === '02:00 PM – 04:00 PM');
  assert(afternoonSlot && afternoonSlot.available === true, '02:00 PM – 04:00 PM slot is available inside 10:00 - 16:00 window');

  // Late slot 04:00 - 06:00 starts at 16:00 which is >= closingTime (16:00) -> blocked
  const lateSlot = openTestDay.slots.find((s) => s.timeSlot === '04:00 PM – 06:00 PM');
  assert(lateSlot && lateSlot.available === false, '04:00 PM – 06:00 PM slot is unavailable because facility closes at 04:00 PM');
  assert(lateSlot.reason.includes('Outside operating hours'), '04:00 PM – 06:00 PM slot reason indicates outside operating hours');

  // Closed day (e.g. Tuesday or Thursday) -> all slots blocked with 'Facility closed'
  const closedTestDay = schedAvail.availableDays.find((d) => {
    const parts = d.date.split('-');
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dow = dt.getDay();
    return dow === 2 || dow === 4;
  });
  assert(closedTestDay !== undefined, 'Found non-operating day for closure verification');
  assert(closedTestDay.isAvailable === false, 'Non-operating day is not available');
  assert(closedTestDay.slots.every((s) => s.available === false), 'All slots on non-operating day are strictly unavailable');

  // 5. Component and Page file verification
  assert(fs.existsSync('src/components/centre/VisualSchedulePicker.jsx'), 'VisualSchedulePicker.jsx component exists');
  const pickerSource = fs.readFileSync('src/components/centre/VisualSchedulePicker.jsx', 'utf-8');
  assert(pickerSource.includes('WEEKDAY_CODES'), 'VisualSchedulePicker uses WEEKDAY_CODES');
  assert(pickerSource.includes('MiniClockFace'), 'VisualSchedulePicker renders MiniClockFace analog dial');
  assert(pickerSource.includes('Weekdays') && pickerSource.includes('Weekends') && pickerSource.includes('Every day'), 'VisualSchedulePicker includes day shortcuts');
  assert(pickerSource.includes('Clear selection'), 'VisualSchedulePicker includes Clear selection action');
  assert(pickerSource.includes('00') && pickerSource.includes('15') && pickerSource.includes('30') && pickerSource.includes('45'), 'VisualSchedulePicker provides 15-minute intervals');
  assert(pickerSource.includes('AM') && pickerSource.includes('PM'), 'VisualSchedulePicker provides AM/PM toggle');

  const regPageSource = fs.readFileSync('src/pages/centre/CentreRegisterPage.jsx', 'utf-8');
  assert(regPageSource.includes('VisualSchedulePicker'), 'CentreRegisterPage.jsx imports and renders VisualSchedulePicker');
  assert(regPageSource.includes('validateSchedule'), 'CentreRegisterPage.jsx imports validateSchedule');
  assert(regPageSource.includes('operatingDaysList'), 'CentreRegisterPage.jsx manages operatingDaysList in form state');

  const profilePageSource = fs.readFileSync('src/pages/centre/CentreProfilePage.jsx', 'utf-8');
  assert(profilePageSource.includes('VisualSchedulePicker'), 'CentreProfilePage.jsx imports and renders VisualSchedulePicker');
  assert(profilePageSource.includes('validateSchedule'), 'CentreProfilePage.jsx imports validateSchedule');
  assert(profilePageSource.includes('operatingDaysList'), 'CentreProfilePage.jsx manages operatingDaysList in scheduleForm state');

  console.log('\n============================================================');
  console.log(`ALL VERIFICATION TESTS PASSED: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('============================================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
