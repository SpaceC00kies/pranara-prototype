#!/usr/bin/env node

/**
 * Deployment Readiness Check Script
 * Validates environment configuration and service connectivity
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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

// Required environment variables
const REQUIRED_ENV_VARS = [
  'GEMINI_API_KEY',
  'LINE_URL',
  'NEXT_PUBLIC_LINE_URL',
  'SESSION_SECRET'
];

// Optional environment variables (at least one database option required)
const DATABASE_ENV_VARS = {
  kv: ['KV_URL', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'],
  postgres: ['POSTGRES_URL', 'POSTGRES_USER', 'POSTGRES_HOST', 'POSTGRES_PASSWORD', 'POSTGRES_DATABASE']
};

async function checkEnvironmentVariables() {
  logInfo('Checking environment variables...');
  
  let hasErrors = false;
  
  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      logError(`Missing required environment variable: ${envVar}`);
      hasErrors = true;
    } else {
      logSuccess(`Found ${envVar}`);
    }
  }
  
  // Check database configuration
  const hasKV = DATABASE_ENV_VARS.kv.every(envVar => process.env[envVar]);
  const hasPostgres = DATABASE_ENV_VARS.postgres.every(envVar => process.env[envVar]);
  
  if (!hasKV && !hasPostgres) {
    logError('No database configuration found. Please configure either Vercel KV or Postgres.');
    hasErrors = true;
  } else {
    if (hasKV) {
      logSuccess('Vercel KV configuration found');
    }
    if (hasPostgres) {
      logSuccess('Postgres configuration found');
    }
  }
  
  return !hasErrors;
}

async function checkGeminiAPI() {
  logInfo('Testing Gemini API connectivity...');
  
  if (!process.env.GEMINI_API_KEY) {
    logError('GEMINI_API_KEY not found, skipping API test');
    return false;
  }
  
  try {
    // Simple test to validate API key format
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
      logWarning('Gemini API key format appears invalid');
      return false;
    }
    
    logSuccess('Gemini API key format is valid');
    return true;
  } catch (error) {
    logError(`Gemini API test failed: ${error.message}`);
    return false;
  }
}

async function checkLINEURL() {
  logInfo('Validating LINE URL configuration...');
  
  const lineUrl = process.env.LINE_URL;
  const publicLineUrl = process.env.NEXT_PUBLIC_LINE_URL;
  
  if (!lineUrl || !publicLineUrl) {
    logError('LINE URL configuration missing');
    return false;
  }
  
  if (lineUrl !== publicLineUrl) {
    logWarning('LINE_URL and NEXT_PUBLIC_LINE_URL do not match');
  }
  
  try {
    new URL(lineUrl);
    logSuccess('LINE URL format is valid');
    return true;
  } catch (error) {
    logError(`Invalid LINE URL format: ${error.message}`);
    return false;
  }
}

async function checkProjectStructure() {
  logInfo('Validating project structure...');
  
  const requiredFiles = [
    'package.json',
    'next.config.js',
    'tailwind.config.ts',
    'tsconfig.json',
    'src/app/layout.tsx',
    'src/app/page.tsx',
    'src/app/api/chat/route.ts',
    'src/app/api/health/route.ts'
  ];
  
  let hasErrors = false;
  
  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      logError(`Missing required file: ${file}`);
      hasErrors = true;
    } else {
      logSuccess(`Found ${file}`);
    }
  }
  
  return !hasErrors;
}

async function checkPackageJson() {
  logInfo('Validating package.json configuration...');
  
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const requiredScripts = ['dev', 'build', 'start', 'test'];
    const requiredDependencies = ['next', 'react', 'react-dom', '@google/genai'];
    
    let hasErrors = false;
    
    // Check scripts
    for (const script of requiredScripts) {
      if (!packageJson.scripts || !packageJson.scripts[script]) {
        logError(`Missing required script: ${script}`);
        hasErrors = true;
      } else {
        logSuccess(`Found script: ${script}`);
      }
    }
    
    // Check dependencies
    for (const dep of requiredDependencies) {
      if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
        logError(`Missing required dependency: ${dep}`);
        hasErrors = true;
      } else {
        logSuccess(`Found dependency: ${dep}`);
      }
    }
    
    return !hasErrors;
  } catch (error) {
    logError(`Failed to read package.json: ${error.message}`);
    return false;
  }
}

async function checkVercelConfig() {
  logInfo('Validating Vercel configuration...');
  
  const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
  
  if (!fs.existsSync(vercelConfigPath)) {
    logWarning('vercel.json not found - using default Vercel configuration');
    return true;
  }
  
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    
    // Check for security headers
    if (vercelConfig.headers && vercelConfig.headers.length > 0) {
      logSuccess('Security headers configured');
    } else {
      logWarning('No security headers configured');
    }
    
    // Check for API function configuration
    if (vercelConfig.functions) {
      logSuccess('API function configuration found');
    }
    
    logSuccess('Vercel configuration is valid');
    return true;
  } catch (error) {
    logError(`Invalid vercel.json: ${error.message}`);
    return false;
  }
}

async function checkBuildOutput() {
  logInfo('Checking if project builds successfully...');
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    let output = '';
    let errorOutput = '';
    
    buildProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    buildProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Project builds successfully');
        resolve(true);
      } else {
        logError('Build failed');
        if (errorOutput) {
          console.log('Build errors:', errorOutput);
        }
        resolve(false);
      }
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      buildProcess.kill();
      logError('Build timeout (5 minutes exceeded)');
      resolve(false);
    }, 300000);
  });
}

async function runProductionReadinessCheck() {
  log('\n🚀 Jirung Senior Advisor - Production Readiness Check\n', 'blue');
  
  const checks = [
    { name: 'Environment Variables', fn: checkEnvironmentVariables },
    { name: 'Project Structure', fn: checkProjectStructure },
    { name: 'Package Configuration', fn: checkPackageJson },
    { name: 'Vercel Configuration', fn: checkVercelConfig },
    { name: 'Gemini API', fn: checkGeminiAPI },
    { name: 'LINE URL', fn: checkLINEURL },
    { name: 'Build Process', fn: checkBuildOutput }
  ];
  
  const results = [];
  
  for (const check of checks) {
    log(`\n--- ${check.name} ---`);
    try {
      const result = await check.fn();
      results.push({ name: check.name, passed: result });
    } catch (error) {
      logError(`${check.name} check failed: ${error.message}`);
      results.push({ name: check.name, passed: false });
    }
  }
  
  // Summary
  log('\n📊 Summary:', 'blue');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    if (result.passed) {
      logSuccess(result.name);
    } else {
      logError(result.name);
    }
  });
  
  log(`\n${passed}/${total} checks passed`, passed === total ? 'green' : 'red');
  
  if (passed === total) {
    log('\n🎉 All checks passed! Ready for production deployment.', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some checks failed. Please fix the issues before deploying.', 'red');
    process.exit(1);
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  runProductionReadinessCheck().catch(error => {
    logError(`Deployment check failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runProductionReadinessCheck,
  checkEnvironmentVariables,
  checkGeminiAPI,
  checkLINEURL,
  checkProjectStructure,
  checkPackageJson,
  checkVercelConfig,
  checkBuildOutput
};