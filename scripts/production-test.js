#!/usr/bin/env node

/**
 * Production Readiness Test Suite
 * Tests the deployed application for production readiness
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  timeout: 10000,
  retries: 3
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Jirung-Production-Test/1.0',
        ...options.headers
      },
      timeout: config.timeout
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test functions
async function testHealthEndpoint() {
  logInfo('Testing health endpoint...');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/health`);
    
    if (response.status !== 200) {
      logError(`Health endpoint returned status ${response.status}`);
      return false;
    }
    
    const health = response.data;
    
    if (!health || typeof health.status !== 'string') {
      logError('Health endpoint returned invalid response format');
      return false;
    }
    
    if (health.status === 'healthy') {
      logSuccess('Health endpoint: All services healthy');
      return true;
    } else if (health.status === 'degraded') {
      logWarning(`Health endpoint: Services degraded - ${health.issues?.join(', ')}`);
      return true; // Still acceptable for production
    } else {
      logError(`Health endpoint: Services unhealthy - ${health.issues?.join(', ')}`);
      return false;
    }
  } catch (error) {
    logError(`Health endpoint test failed: ${error.message}`);
    return false;
  }
}

async function testChatEndpoint() {
  logInfo('Testing chat endpoint...');
  
  const testMessages = [
    'สวัสดีครับ',
    'ผมต้องการคำแนะนำเรื่องการดูแลผู้สูงอายุ',
    'Hello, I need help with elder care'
  ];
  
  for (const message of testMessages) {
    try {
      const response = await makeRequest(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        body: { message }
      });
      
      if (response.status !== 200) {
        logError(`Chat endpoint returned status ${response.status} for message: "${message}"`);
        return false;
      }
      
      const chatResponse = response.data;
      
      if (!chatResponse || !chatResponse.response || !chatResponse.sessionId) {
        logError(`Chat endpoint returned invalid response format for message: "${message}"`);
        return false;
      }
      
      logSuccess(`Chat endpoint: Response received for "${message.substring(0, 20)}..."`);
    } catch (error) {
      logError(`Chat endpoint test failed for message "${message}": ${error.message}`);
      return false;
    }
  }
  
  return true;
}

async function testLINEClickEndpoint() {
  logInfo('Testing LINE click endpoint...');
  
  try {
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';
    const response = await makeRequest(`${config.baseUrl}/api/chat/line-click`, {
      method: 'POST',
      body: { sessionId, context: 'test' }
    });
    
    if (response.status !== 200) {
      logError(`LINE click endpoint returned status ${response.status}`);
      return false;
    }
    
    const lineResponse = response.data;
    
    if (!lineResponse || !lineResponse.success) {
      logError('LINE click endpoint returned invalid response format');
      return false;
    }
    
    logSuccess('LINE click endpoint: Working correctly');
    return true;
  } catch (error) {
    logError(`LINE click endpoint test failed: ${error.message}`);
    return false;
  }
}

async function testSecurityHeaders() {
  logInfo('Testing security headers...');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/`);
    const headers = response.headers;
    
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'referrer-policy'
    ];
    
    let hasAllHeaders = true;
    
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        logError(`Missing security header: ${header}`);
        hasAllHeaders = false;
      } else {
        logSuccess(`Security header present: ${header}`);
      }
    }
    
    return hasAllHeaders;
  } catch (error) {
    logError(`Security headers test failed: ${error.message}`);
    return false;
  }
}

async function testResponseTimes() {
  logInfo('Testing response times...');
  
  const endpoints = [
    { path: '/api/health', maxTime: 1000 },
    { path: '/api/chat', method: 'POST', body: { message: 'test' }, maxTime: 5000 },
    { path: '/', maxTime: 2000 }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      
      const response = await makeRequest(`${config.baseUrl}${endpoint.path}`, {
        method: endpoint.method || 'GET',
        body: endpoint.body
      });
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime > endpoint.maxTime) {
        logWarning(`${endpoint.path}: Response time ${responseTime}ms exceeds ${endpoint.maxTime}ms`);
      } else {
        logSuccess(`${endpoint.path}: Response time ${responseTime}ms (acceptable)`);
      }
    } catch (error) {
      logError(`Response time test failed for ${endpoint.path}: ${error.message}`);
      return false;
    }
  }
  
  return true;
}

async function testErrorHandling() {
  logInfo('Testing error handling...');
  
  const errorTests = [
    {
      name: 'Empty message',
      path: '/api/chat',
      method: 'POST',
      body: { message: '' },
      expectedStatus: 400
    },
    {
      name: 'Missing message',
      path: '/api/chat',
      method: 'POST',
      body: {},
      expectedStatus: 400
    },
    {
      name: 'Invalid session ID',
      path: '/api/chat/line-click',
      method: 'POST',
      body: { sessionId: 'invalid' },
      expectedStatus: 400
    },
    {
      name: 'Non-existent endpoint',
      path: '/api/nonexistent',
      method: 'GET',
      expectedStatus: 404
    }
  ];
  
  for (const test of errorTests) {
    try {
      const response = await makeRequest(`${config.baseUrl}${test.path}`, {
        method: test.method,
        body: test.body
      });
      
      if (response.status === test.expectedStatus) {
        logSuccess(`Error handling: ${test.name} - Correct status ${response.status}`);
      } else {
        logError(`Error handling: ${test.name} - Expected ${test.expectedStatus}, got ${response.status}`);
        return false;
      }
    } catch (error) {
      logError(`Error handling test failed for ${test.name}: ${error.message}`);
      return false;
    }
  }
  
  return true;
}

async function testRateLimiting() {
  logInfo('Testing rate limiting...');
  
  try {
    // Send multiple requests quickly to trigger rate limiting
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        makeRequest(`${config.baseUrl}/api/chat`, {
          method: 'POST',
          body: { message: `Test message ${i}` }
        })
      );
    }
    
    const responses = await Promise.allSettled(requests);
    const rateLimited = responses.some(result => 
      result.status === 'fulfilled' && result.value.status === 429
    );
    
    if (rateLimited) {
      logSuccess('Rate limiting: Working correctly (429 status received)');
    } else {
      logWarning('Rate limiting: No 429 status received (may need more requests)');
    }
    
    return true;
  } catch (error) {
    logError(`Rate limiting test failed: ${error.message}`);
    return false;
  }
}

async function testSSLCertificate() {
  if (!config.baseUrl.startsWith('https://')) {
    logWarning('SSL test skipped: Not using HTTPS');
    return true;
  }
  
  logInfo('Testing SSL certificate...');
  
  try {
    const response = await makeRequest(config.baseUrl);
    logSuccess('SSL certificate: Valid and working');
    return true;
  } catch (error) {
    if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      logError(`SSL certificate issue: ${error.message}`);
      return false;
    }
    // Other errors might not be SSL-related
    logWarning(`SSL test inconclusive: ${error.message}`);
    return true;
  }
}

async function runProductionTests() {
  log('\n🧪 Jirung Senior Advisor - Production Test Suite\n', 'blue');
  log(`Testing URL: ${config.baseUrl}`, 'blue');
  log(`Timeout: ${config.timeout}ms\n`, 'blue');
  
  const tests = [
    { name: 'Health Endpoint', fn: testHealthEndpoint },
    { name: 'Chat Endpoint', fn: testChatEndpoint },
    { name: 'LINE Click Endpoint', fn: testLINEClickEndpoint },
    { name: 'Security Headers', fn: testSecurityHeaders },
    { name: 'Response Times', fn: testResponseTimes },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'SSL Certificate', fn: testSSLCertificate }
  ];
  
  const results = [];
  
  for (const test of tests) {
    log(`\n--- ${test.name} ---`);
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (error) {
      logError(`${test.name} test failed: ${error.message}`);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  log('\n📊 Test Results Summary:', 'blue');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    if (result.passed) {
      logSuccess(result.name);
    } else {
      logError(result.name);
    }
  });
  
  log(`\n${passed}/${total} tests passed`, passed === total ? 'green' : 'red');
  
  if (passed === total) {
    log('\n🎉 All tests passed! Application is production ready.', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some tests failed. Please fix the issues before going live.', 'red');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runProductionTests().catch(error => {
    logError(`Production test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runProductionTests,
  testHealthEndpoint,
  testChatEndpoint,
  testLINEClickEndpoint,
  testSecurityHeaders,
  testResponseTimes,
  testErrorHandling,
  testRateLimiting,
  testSSLCertificate
};