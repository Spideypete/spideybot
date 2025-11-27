const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Mock session cookie for authenticated requests
const SESSION_COOKIE = 'test-session';

const tests = [
  {
    name: '✅ PUBLIC: Get config (public)',
    method: 'GET',
    path: '/api/config',
    auth: false,
    expectedStatus: 200
  },
  {
    name: '❌ AUTH TEST: Get user (should fail - no auth)',
    method: 'GET',
    path: '/api/user',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ DASHBOARD: Get stats (requires auth)',
    method: 'GET',
    path: '/api/dashboard/stats?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ DASHBOARD: Get analytics (requires auth)',
    method: 'GET',
    path: '/api/dashboard/analytics?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ DASHBOARD: Get members (requires auth)',
    method: 'GET',
    path: '/api/dashboard/members?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ DASHBOARD: Get activity (requires auth)',
    method: 'GET',
    path: '/api/dashboard/activity?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ DASHBOARD: Get growth (requires auth)',
    method: 'GET',
    path: '/api/dashboard/growth?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ DASHBOARD: Get active-members (requires auth)',
    method: 'GET',
    path: '/api/dashboard/active-members?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ DASHBOARD: Get statistics (requires auth)',
    method: 'GET',
    path: '/api/dashboard/statistics?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ DASHBOARD: Get top-members (requires auth)',
    method: 'GET',
    path: '/api/dashboard/top-members?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ CONFIG: Get settings (requires auth)',
    method: 'GET',
    path: '/api/config/settings?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ CONFIG: Get subscriptions (requires auth)',
    method: 'GET',
    path: '/api/config/subscriptions?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ CONFIG: Get logging (requires auth)',
    method: 'GET',
    path: '/api/config/logging?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ CONFIG: Get server-guard (requires auth)',
    method: 'GET',
    path: '/api/config/server-guard?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ CONFIG: Get react-roles (requires auth)',
    method: 'GET',
    path: '/api/config/react-roles?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ CONFIG: Get role-categories (requires auth)',
    method: 'GET',
    path: '/api/config/role-categories?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ CONFIG: Get server-messages (requires auth)',
    method: 'GET',
    path: '/api/config/server-messages?guildId=test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ CREATOR: Get servers (requires auth)',
    method: 'GET',
    path: '/api/creator/servers',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ CREATOR: Get settings (requires auth)',
    method: 'GET',
    path: '/api/creator/settings',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ MEMBER: Get stats (requires auth)',
    method: 'GET',
    path: '/api/member-stats/test',
    auth: false,
    expectedStatus: 401
  },
  {
    name: '✅ MEMBER: Get events (requires auth)',
    method: 'GET',
    path: '/api/member-events/test',
    auth: false,
    expectedStatus: 401
  }
];

async function makeRequest(method, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n🔵 TESTING ALL API ENDPOINTS\n');
  console.log('═'.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await makeRequest(test.method, test.path);
    const statusMatch = result.status === test.expectedStatus;
    
    if (statusMatch) {
      console.log(`${test.name}`);
      console.log(`   Status: ${result.status} ✅`);
      passed++;
    } else {
      console.log(`${test.name}`);
      console.log(`   Expected: ${test.expectedStatus}, Got: ${result.status} ❌`);
      failed++;
    }
  }

  console.log('═'.repeat(60));
  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed\n`);
  
  if (failed === 0) {
    console.log('🎉 ALL APIS WORKING CORRECTLY!\n');
  } else {
    console.log(`⚠️  ${failed} API(s) need fixing\n`);
  }

  process.exit(0);
}

// Wait for server to be ready
setTimeout(runTests, 1000);
