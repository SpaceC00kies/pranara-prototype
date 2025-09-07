#!/usr/bin/env node

/**
 * Comprehensive Quality Assurance Test Runner
 * 
 * This script runs all end-to-end tests and quality checks for the Jirung Senior Advisor
 * as specified in task 15 of the implementation plan.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Comprehensive QA Test Suite for Jirung Senior Advisor\n');

// Test categories as per task requirements
const testCategories = {
  'User Journey Tests': 'e2e/user-journey.spec.ts',
  'Thai Language Tests': 'e2e/thai-language.spec.ts', 
  'PII Security Tests': 'e2e/pii-security.spec.ts',
  'Real-World PII Tests': 'e2e/real-world-pii.spec.ts',
  'LINE Integration Tests': 'e2e/line-integration.spec.ts',
  'Content Safety Tests': 'e2e/content-safety.spec.ts',
  'Accessibility & Performance Tests': 'e2e/accessibility-performance.spec.ts'
};

const results = {
  passed: [],
  failed: [],
  skipped: []
};

function runCommand(command, description) {
  console.log(`\n📋 ${description}`);
  console.log(`Running: ${command}\n`);
  
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: 300000 // 5 minute timeout per test suite
    });
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${description}`);
    console.error(`Error: ${error.message}`);
    return false;
  }
}

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...\n');
  
  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  Warning: .env.local not found. Some tests may fail without proper environment variables.');
  }
  
  // Check if Playwright browsers are installed
  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
    console.log('✅ Playwright is installed');
  } catch (error) {
    console.error('❌ Playwright not found. Please run: npx playwright install');
    process.exit(1);
  }
  
  // Check if Next.js app can build
  console.log('🏗️  Verifying application build...');
  const buildSuccess = runCommand('npm run build', 'Building Next.js application');
  if (!buildSuccess) {
    console.error('❌ Application build failed. Please fix build errors before running E2E tests.');
    process.exit(1);
  }
  
  console.log('✅ Prerequisites check completed\n');
}

function runUnitTests() {
  console.log('🧪 Running Unit Tests...\n');
  
  const success = runCommand('npm run test:run', 'Unit and Integration Tests');
  
  if (success) {
    results.passed.push('Unit Tests');
    console.log('✅ Unit tests passed');
  } else {
    results.failed.push('Unit Tests');
    console.log('❌ Unit tests failed');
  }
  
  return success;
}

function runE2ETests() {
  console.log('\n🎭 Running End-to-End Tests...\n');
  
  let allPassed = true;
  
  for (const [category, testFile] of Object.entries(testCategories)) {
    console.log(`\n📝 Running ${category}...`);
    
    const success = runCommand(
      `npx playwright test ${testFile} --reporter=line`,
      `${category} (${testFile})`
    );
    
    if (success) {
      results.passed.push(category);
      console.log(`✅ ${category} passed`);
    } else {
      results.failed.push(category);
      console.log(`❌ ${category} failed`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

function runSecurityTests() {
  console.log('\n🔒 Running Additional Security Checks...\n');
  
  // Run PII scrubbing tests specifically
  const success = runCommand(
    'npx playwright test e2e/pii-security.spec.ts --reporter=line',
    'PII Scrubbing and Security Validation'
  );
  
  if (success) {
    console.log('✅ Security tests passed');
    return true;
  } else {
    console.log('❌ Security tests failed');
    return false;
  }
}

function runAccessibilityTests() {
  console.log('\n♿ Running Accessibility Compliance Tests...\n');
  
  const success = runCommand(
    'npx playwright test e2e/accessibility-performance.spec.ts --reporter=line',
    'WCAG 2.1 AA Compliance and Performance'
  );
  
  if (success) {
    console.log('✅ Accessibility tests passed');
    return true;
  } else {
    console.log('❌ Accessibility tests failed');
    return false;
  }
}

function generateReport() {
  console.log('\n📊 Test Results Summary\n');
  console.log('='.repeat(50));
  
  console.log(`\n✅ Passed Tests (${results.passed.length}):`);
  results.passed.forEach(test => console.log(`   • ${test}`));
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed Tests (${results.failed.length}):`);
    results.failed.forEach(test => console.log(`   • ${test}`));
  }
  
  if (results.skipped.length > 0) {
    console.log(`\n⏭️  Skipped Tests (${results.skipped.length}):`);
    results.skipped.forEach(test => console.log(`   • ${test}`));
  }
  
  const totalTests = results.passed.length + results.failed.length + results.skipped.length;
  const passRate = ((results.passed.length / totalTests) * 100).toFixed(1);
  
  console.log(`\n📈 Overall Pass Rate: ${passRate}% (${results.passed.length}/${totalTests})`);
  
  if (results.failed.length === 0) {
    console.log('\n🎉 All tests passed! The application is ready for deployment.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix issues before deployment.');
    return false;
  }
}

function main() {
  const startTime = Date.now();
  
  try {
    // Step 1: Check prerequisites
    checkPrerequisites();
    
    // Step 2: Run unit tests
    const unitTestsPass = runUnitTests();
    
    // Step 3: Run E2E tests (main requirement)
    const e2eTestsPass = runE2ETests();
    
    // Step 4: Generate comprehensive report
    const allTestsPass = generateReport();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️  Total execution time: ${duration} seconds`);
    
    // Exit with appropriate code
    process.exit(allTestsPass ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Test suite execution failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Test execution interrupted by user');
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runCommand, checkPrerequisites, generateReport };