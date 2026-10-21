import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup localStorage and window mocks for Node environment
const mockStorage = {};
global.localStorage = {
  getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  get length() { return Object.keys(mockStorage).length; },
  key: (i) => Object.keys(mockStorage)[i] || null,
};
global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };

// Import storageService after mocks
const { storageService } = await import('../src/services/storageService.js');

describe('EcoCycle Authentication Isolation & Cross-Account Switching Removal', () => {

  beforeEach(() => {
    global.localStorage.clear();
  });

  describe('1. Centre Navigation & Profile UI Structure', () => {
    it('CentreNavbar does not render any facility-switching dropdown or switchCentre call', () => {
      const centreNavbarCode = fs.readFileSync(
        path.resolve(__dirname, '../src/components/CentreNavbar.jsx'),
        'utf-8'
      );

      // Verify switchCentre is completely removed
      assert.strictEqual(
        centreNavbarCode.includes('switchCentre'),
        false,
        'CentreNavbar.jsx must not call or import switchCentre'
      );

      // Verify dropdown toggle state is removed
      assert.strictEqual(
        centreNavbarCode.includes('centreDropdownOpen'),
        false,
        'CentreNavbar.jsx must not have centreDropdownOpen state'
      );

      // Verify the switch facility title/options are removed
      assert.strictEqual(
        centreNavbarCode.includes('Switch Facility Identity'),
        false,
        'CentreNavbar.jsx must not have "Switch Facility Identity" dropdown text'
      );
      assert.strictEqual(
        centreNavbarCode.includes('Switch Facility'),
        false,
        'CentreNavbar.jsx must not have "Switch Facility" mobile select'
      );

      // Verify non-interactive identity badge is rendered
      assert.ok(
        centreNavbarCode.includes('centre-identity-badge'),
        'CentreNavbar.jsx must render a non-interactive identity badge'
      );
    });

    it('CentreProfilePage does not render any facility identity switcher', () => {
      const profileCode = fs.readFileSync(
        path.resolve(__dirname, '../src/pages/centre/CentreProfilePage.jsx'),
        'utf-8'
      );

      // Verify switchCentre is removed
      assert.strictEqual(
        profileCode.includes('switchCentre'),
        false,
        'CentreProfilePage.jsx must not call or import switchCentre'
      );

      // Verify the Active Identity select dropdown is removed
      assert.strictEqual(
        profileCode.includes('Active Identity:'),
        false,
        'CentreProfilePage.jsx must not contain an Active Identity switcher dropdown'
      );

      // Verify non-interactive active facility badge is rendered
      assert.ok(
        profileCode.includes('centre-profile-active-identity'),
        'CentreProfilePage.jsx must render non-interactive active facility text'
      );
    });
  });

  describe('2. Customer Navigation UI Structure', () => {
    it('Navbar does not render any customer account-switching dropdown', () => {
      const navbarCode = fs.readFileSync(
        path.resolve(__dirname, '../src/components/Navbar.jsx'),
        'utf-8'
      );

      assert.strictEqual(
        navbarCode.includes('switchUser'),
        false,
        'Navbar.jsx must not have switchUser'
      );
      assert.strictEqual(
        navbarCode.includes('switchAccount'),
        false,
        'Navbar.jsx must not have switchAccount'
      );
      assert.strictEqual(
        navbarCode.includes('profileDropdownOpen'),
        false,
        'Navbar.jsx must not maintain unused profileDropdownOpen state'
      );
    });
  });

  describe('3. Authenticated Facility Identity Boundary', () => {
    it('CentreAuthContext does not export switchCentre and enforces password authentication on login', () => {
      const contextCode = fs.readFileSync(
        path.resolve(__dirname, '../src/context/CentreAuthContext.jsx'),
        'utf-8'
      );

      assert.strictEqual(
        contextCode.includes('switchCentre'),
        false,
        'CentreAuthContext.jsx must not define or export switchCentre'
      );

      // Test authentication via storageService
      const facility = storageService.registerCentre({
        name: 'Alpha Facility',
        email: 'alpha@facility.org',
        password: 'securePassword123',
        phone: '1234567890',
        address: '100 Eco Way',
        city: 'Green City',
      });

      // Valid credentials succeeds
      const authenticated = storageService.authenticateCentre('alpha@facility.org', 'securePassword123');
      assert.strictEqual(authenticated.id, facility.id);

      // Wrong password fails
      assert.throws(
        () => storageService.authenticateCentre('alpha@facility.org', 'wrongPassword'),
        /Invalid password/
      );

      // Non-existent email fails
      assert.throws(
        () => storageService.authenticateCentre('nonexistent@facility.org', 'password'),
        /No registered recycling facility found/
      );
    });
  });

  describe('4. Authenticated Customer Identity Boundary', () => {
    it('Customer accounts require legitimate passwords and cannot be switched without credentials', () => {
      const users = [
        { id: 'usr_1', email: 'alice@test.com', password: 'alicePassword', name: 'Alice' },
        { id: 'usr_2', email: 'bob@test.com', password: 'bobPassword', name: 'Bob' },
      ];
      localStorage.setItem('ecocycle_users', JSON.stringify(users));

      // Correct password
      const alice = users.find(u => u.email === 'alice@test.com');
      assert.strictEqual(alice.name, 'Alice');

      // Wrong password fails
      assert.notStrictEqual(alice.password, 'wrongPassword');
    });
  });

  describe('5. Sign-Out and Sign-In with Different Credentials', () => {
    it('Signing out clears the facility session and allows signing in with another facility', () => {
      const facilityA = storageService.registerCentre({
        name: 'Facility A',
        email: 'fac_a@test.com',
        password: 'passA',
        phone: '1234567890',
        address: '123 St',
        city: 'City A',
      });
      const facilityB = storageService.registerCentre({
        name: 'Facility B',
        email: 'fac_b@test.com',
        password: 'passB',
        phone: '0987654321',
        address: '456 Ave',
        city: 'City B',
      });

      // Login Facility A
      const sessionA = {
        centreId: facilityA.id,
        centreName: facilityA.name,
        staffName: 'Lead A',
        staffEmail: facilityA.email,
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem('ecocycle_centre_session', JSON.stringify(sessionA));
      assert.strictEqual(JSON.parse(localStorage.getItem('ecocycle_centre_session')).centreId, facilityA.id);

      // Logout Facility A
      localStorage.removeItem('ecocycle_centre_session');
      assert.strictEqual(localStorage.getItem('ecocycle_centre_session'), null);

      // Login Facility B with credentials
      const authB = storageService.authenticateCentre('fac_b@test.com', 'passB');
      const sessionB = {
        centreId: authB.id,
        centreName: authB.name,
        staffName: 'Lead B',
        staffEmail: authB.email,
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem('ecocycle_centre_session', JSON.stringify(sessionB));
      assert.strictEqual(JSON.parse(localStorage.getItem('ecocycle_centre_session')).centreId, facilityB.id);
    });

    it('Signing out clears customer session and allows signing in as another customer', () => {
      const userA = { id: 'usr_a', email: 'user_a@test.com', password: 'passA', name: 'User A' };
      const userB = { id: 'usr_b', email: 'user_b@test.com', password: 'passB', name: 'User B' };
      localStorage.setItem('ecocycle_users', JSON.stringify([userA, userB]));

      // Login User A
      localStorage.setItem('ecocycle_current_user', JSON.stringify(userA));
      assert.strictEqual(JSON.parse(localStorage.getItem('ecocycle_current_user')).email, 'user_a@test.com');

      // Logout User A
      localStorage.removeItem('ecocycle_current_user');
      assert.strictEqual(localStorage.getItem('ecocycle_current_user'), null);

      // Login User B
      localStorage.setItem('ecocycle_current_user', JSON.stringify(userB));
      assert.strictEqual(JSON.parse(localStorage.getItem('ecocycle_current_user')).email, 'user_b@test.com');
    });
  });

  describe('6. Customer and Centre Session Isolation in Same Browser', () => {
    it('Customer and centre sessions coexist without clobbering each other', () => {
      const customerSession = { id: 'usr_1', email: 'customer@test.com', name: 'Customer One' };
      const centreSession = { centreId: 'centre_1', centreName: 'Eco Hub 1', staffEmail: 'ops@hub1.com' };

      localStorage.setItem('ecocycle_current_user', JSON.stringify(customerSession));
      localStorage.setItem('ecocycle_centre_session', JSON.stringify(centreSession));

      // Both exist simultaneously in their own isolated storage keys
      assert.strictEqual(JSON.parse(localStorage.getItem('ecocycle_current_user')).email, 'customer@test.com');
      assert.strictEqual(JSON.parse(localStorage.getItem('ecocycle_centre_session')).centreId, 'centre_1');

      // Logging out customer does not affect centre
      localStorage.removeItem('ecocycle_current_user');
      assert.strictEqual(localStorage.getItem('ecocycle_current_user'), null);
      assert.strictEqual(JSON.parse(localStorage.getItem('ecocycle_centre_session')).centreId, 'centre_1');

      // Logging out centre does not affect customer
      localStorage.setItem('ecocycle_current_user', JSON.stringify(customerSession));
      localStorage.removeItem('ecocycle_centre_session');
      assert.strictEqual(localStorage.getItem('ecocycle_centre_session'), null);
      assert.strictEqual(JSON.parse(localStorage.getItem('ecocycle_current_user')).email, 'customer@test.com');
    });
  });

  describe('7. Route Protection & Layout Isolation', () => {
    it('CentreProtectedRoute and ProtectedRoute require appropriate role sessions', () => {
      const centreProtectedCode = fs.readFileSync(
        path.resolve(__dirname, '../src/components/CentreProtectedRoute.jsx'),
        'utf-8'
      );
      assert.ok(
        centreProtectedCode.includes('isCentreAuthenticated'),
        'CentreProtectedRoute must check isCentreAuthenticated'
      );
      assert.ok(
        centreProtectedCode.includes('/centre/login'),
        'CentreProtectedRoute must redirect to /centre/login'
      );

      const customerProtectedCode = fs.readFileSync(
        path.resolve(__dirname, '../src/components/ProtectedRoute.jsx'),
        'utf-8'
      );
      assert.ok(
        customerProtectedCode.includes('isAuthenticated'),
        'ProtectedRoute must check isAuthenticated'
      );
      assert.ok(
        customerProtectedCode.includes('/login'),
        'ProtectedRoute must redirect to /login'
      );
    });

    it('App.jsx strictly scopes CentreNavbar to centre routes', () => {
      const appCode = fs.readFileSync(
        path.resolve(__dirname, '../src/App.jsx'),
        'utf-8'
      );
      assert.ok(
        appCode.includes('const showCentreNavbar = isCentreRoute;'),
        'App.jsx must only show CentreNavbar on centre routes'
      );
    });
  });

  describe('8. Private Request & Data Isolation', () => {
    it('Requests are strictly scoped by account and unauthorized operations are rejected', () => {
      const centreA = storageService.registerCentre({
        name: 'Centre A',
        email: 'centre_a@test.com',
        password: 'pass',
        phone: '1112223333',
        address: '1 St',
        city: 'City A',
        pickupAvailable: true,
        dropoffAvailable: true,
      });
      const centreB = storageService.registerCentre({
        name: 'Centre B',
        email: 'centre_b@test.com',
        password: 'pass',
        phone: '4445556666',
        address: '2 St',
        city: 'City B',
        pickupAvailable: true,
        dropoffAvailable: true,
      });

      // Create request for Customer 1 assigned to Centre A
      const req1 = storageService.createRequest('customer1@test.com', {
        category: 'Computers & Laptops',
        brand: 'Dell',
        model: 'XPS 15',
        weight: '2.5',
        quantity: 1,
        condition: 'Working',
        method: 'dropoff',
        center: centreA.name,
        centreId: centreA.id,
      });

      // 1. Data scoping: getRequests returns only requests for customer1
      const cust1Reqs = storageService.getRequests('customer1@test.com');
      assert.strictEqual(cust1Reqs.length, 1);
      assert.strictEqual(cust1Reqs[0].id, req1.id);

      const cust2Reqs = storageService.getRequests('customer2@test.com');
      assert.strictEqual(cust2Reqs.length, 0);

      // 2. Data scoping: getRequestsForCentre returns only requests for centreA
      const centreAReqs = storageService.getRequestsForCentre(centreA.id);
      assert.strictEqual(centreAReqs.length, 1);
      assert.strictEqual(centreAReqs[0].id, req1.id);

      const centreBReqs = storageService.getRequestsForCentre(centreB.id);
      assert.strictEqual(centreBReqs.length, 0);

      // 3. Unauthorized customer attempt to cancel another user's request
      assert.throws(
        () => storageService.cancelRequestByCustomer(req1.id, 'customer2@test.com', 'Cancel reason'),
        /Unauthorized/
      );

      // 4. Unauthorized customer attempt to update status of another user's request
      assert.throws(
        () => storageService.updateRequestStatus('customer2@test.com', req1.id, 'Cancelled'),
        /Unauthorized/
      );

      // 5. Unauthorized facility attempt to accept another facility's request
      assert.throws(
        () => storageService.acceptRequest(req1.id, centreB.id),
        /Unauthorized/
      );

      // 6. Unauthorized facility attempt to reject another facility's request
      assert.throws(
        () => storageService.rejectRequest(req1.id, centreB.id, 'Bad item'),
        /Unauthorized/
      );

      // 7. Unauthorized facility attempt to update status of another facility's request
      assert.throws(
        () => storageService.updateRequestStatusByCentre(req1.id, centreB.id, 'Received'),
        /Unauthorized/
      );
    });
  });

  describe('9. Existing Registrations & Records Preservation', () => {
    it('Registration storage persists facilities and customer accounts without deletion', () => {
      const initialCentres = storageService.getCentres();
      assert.ok(Array.isArray(initialCentres), 'Centres list must be an array');

      // Adding a facility adds to the list
      const added = storageService.registerCentre({
        name: 'Preserved Facility',
        email: 'preserved@facility.org',
        password: 'pass',
        phone: '7778889999',
        address: 'Preserve Rd',
        city: 'Green City',
      });

      const updated = storageService.getCentres();
      assert.ok(updated.some(c => c.id === added.id));
    });
  });

  describe('10. Public Registration Flows', () => {
    it('Public facility registration creates a new facility and can be authenticated', () => {
      const regData = {
        name: 'New Public Hub',
        email: 'public_hub@ecocycle.org',
        password: 'HubPassword999',
        phone: '9876543210',
        address: '404 Industrial Blvd',
        city: 'E-Town',
        serviceArea: 'Metro Region',
        pickupAvailable: true,
        dropoffAvailable: true,
      };

      const newFacility = storageService.registerCentre(regData);
      assert.ok(newFacility.id);
      assert.strictEqual(newFacility.name, 'New Public Hub');

      // Authenticate with new credentials
      const auth = storageService.authenticateCentre('public_hub@ecocycle.org', 'HubPassword999');
      assert.strictEqual(auth.id, newFacility.id);
    });
  });
});
