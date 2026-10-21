import fs from 'fs';

// Read API key from .env without logging it
let apiKey = '';
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && match[1] === 'VITE_GEOAPIFY_API_KEY') {
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      apiKey = val.trim();
      break;
    }
  }
}

if (!apiKey) {
  console.error('API key not found in .env');
  process.exit(1);
}

// Test queries:
// 1. Exact query as constructed by CentreRegisterPage.jsx (address + city)
const addressInput = 'Guindy Industrial Estate, Chennai, Tamil Nadu, India';
const cityInput = 'Chennai, Tamil Nadu';
const centreRegisterFullQuery = `${addressInput.trim()}${cityInput.trim() ? `, ${cityInput.trim()}` : ''}`;

// 2. Address input alone without city duplication
const addressOnlyQuery = addressInput;

// 3. Address without country + city
const simplifiedQuery = 'Guindy Industrial Estate, Chennai, Tamil Nadu';

// 4. Guindy Industrial Estate
const pureQuery = 'Guindy Industrial Estate';

const queriesToTest = [
  { name: 'CentreRegisterPage fullQuery (address + city)', query: centreRegisterFullQuery },
  { name: 'Address alone (without appended city)', query: addressOnlyQuery },
  { name: 'Simplified address (without country)', query: simplifiedQuery },
  { name: 'Pure address query', query: pureQuery },
];

async function runDiagnostic() {
  for (const item of queriesToTest) {
    console.log(`\n============================================================`);
    console.log(`TEST QUERY [${item.name}]: "${item.query}"`);
    console.log(`============================================================`);

    const limit = 5;
    const endpoint = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(item.query)}&apiKey=${encodeURIComponent(apiKey)}&limit=${limit}`;

    const urlForDisplay = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(item.query)}&apiKey=[REDACTED]&limit=${limit}`;
    console.log(`Endpoint URL: ${urlForDisplay}`);

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    const payload = await res.json();

    const features = Array.isArray(payload?.features) ? payload.features : [];
    console.log(`Total Features Returned: ${features.length}`);

    features.forEach((feat, index) => {
      const p = feat.properties || {};
      const rank = p.rank || {};

      console.log(`\n--- Feature #${index + 1} ---`);
      console.log(`properties.formatted: ${JSON.stringify(p.formatted)}`);
      if (p.address_line1 !== undefined) console.log(`properties.address_line1: ${JSON.stringify(p.address_line1)}`);
      if (p.address_line2 !== undefined) console.log(`properties.address_line2: ${JSON.stringify(p.address_line2)}`);
      if (p.lat !== undefined) console.log(`properties.lat: ${p.lat}`);
      if (p.lon !== undefined) console.log(`properties.lon: ${p.lon}`);
      if (p.result_type !== undefined) console.log(`properties.result_type: ${JSON.stringify(p.result_type)}`);
      if (rank.confidence !== undefined) console.log(`properties.rank.confidence: ${rank.confidence}`);
      if (rank.confidence_city_level !== undefined) console.log(`properties.rank.confidence_city_level: ${rank.confidence_city_level}`);
      if (rank.confidence_street_level !== undefined) console.log(`properties.rank.confidence_street_level: ${rank.confidence_street_level}`);
      if (rank.confidence_building_level !== undefined) console.log(`properties.rank.confidence_building_level: ${rank.confidence_building_level}`);
      if (rank.match_type !== undefined) console.log(`properties.rank.match_type: ${JSON.stringify(rank.match_type)}`);
      if (p.datasource !== undefined) console.log(`properties.datasource: ${JSON.stringify(p.datasource)}`);
      if (p.place_id !== undefined) console.log(`properties.place_id: ${JSON.stringify(p.place_id)}`);
      if (p.housenumber !== undefined) console.log(`properties.housenumber: ${JSON.stringify(p.housenumber)}`);
      if (p.street !== undefined) console.log(`properties.street: ${JSON.stringify(p.street)}`);
      if (p.suburb !== undefined) console.log(`properties.suburb: ${JSON.stringify(p.suburb)}`);
      if (p.district !== undefined) console.log(`properties.district: ${JSON.stringify(p.district)}`);
      if (p.city !== undefined) console.log(`properties.city: ${JSON.stringify(p.city)}`);
      if (p.state !== undefined) console.log(`properties.state: ${JSON.stringify(p.state)}`);
      if (p.postcode !== undefined) console.log(`properties.postcode: ${JSON.stringify(p.postcode)}`);
      if (p.country !== undefined) console.log(`properties.country: ${JSON.stringify(p.country)}`);
    });
  }
}

runDiagnostic().catch((err) => {
  console.error('Diagnostic error:', err);
});
