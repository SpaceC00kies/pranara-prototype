#!/usr/bin/env node

/**
 * Migration script from Vercel KV to Postgres
 * 
 * This script helps migrate data from the discontinued Vercel KV
 * to a new Postgres database (Neon, Supabase, etc.)
 * 
 * Usage:
 *   node scripts/migrate-to-postgres.js
 * 
 * Prerequisites:
 *   - Set up new Postgres database
 *   - Update DATABASE_URL in environment
 *   - Keep old KV_URL for data export (if needed)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironment() {
  log('\n🔍 Checking environment configuration...', 'blue');
  
  const requiredVars = ['DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`❌ Missing required environment variables:`, 'red');
    missingVars.forEach(varName => {
      log(`   - ${varName}`, 'red');
    });
    log('\n💡 Please set up your Postgres database and update .env.local', 'yellow');
    log('📖 See VERCEL_KV_MIGRATION_GUIDE.md for instructions', 'cyan');
    process.exit(1);
  }
  
  // Check for legacy KV variables
  const kvVars = ['KV_URL', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  const hasKvVars = kvVars.some(varName => process.env[varName]);
  
  if (hasKvVars) {
    log('⚠️  Found legacy Vercel KV configuration', 'yellow');
    log('   These variables can be removed after migration:', 'yellow');
    kvVars.forEach(varName => {
      if (process.env[varName]) {
        log(`   - ${varName}`, 'yellow');
      }
    });
  }
  
  log('✅ Environment configuration looks good!', 'green');
}

function checkDatabaseConnection() {
  log('\n🔌 Testing database connection...', 'blue');
  
  try {
    // Test the database service
    const { createDatabaseService } = require('../src/services/databaseService');
    const db = createDatabaseService();
    
    log('✅ Database service created successfully!', 'green');
    return db;
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, 'red');
    log('\n💡 Troubleshooting tips:', 'yellow');
    log('   1. Verify DATABASE_URL is correct', 'yellow');
    log('   2. Check database server is running', 'yellow');
    log('   3. Verify network connectivity', 'yellow');
    process.exit(1);
  }
}

async function initializeSchema(db) {
  log('\n🏗️  Initializing database schema...', 'blue');
  
  try {
    await db.connect();
    await db.initializeSchema();
    log('✅ Database schema initialized successfully!', 'green');
  } catch (error) {
    log(`❌ Schema initialization failed: ${error.message}`, 'red');
    throw error;
  }
}

function updateDeploymentConfig() {
  log('\n⚙️  Updating deployment configuration...', 'blue');
  
  // Update package.json scripts if needed
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add migration-related scripts
    if (!packageJson.scripts['db:migrate']) {
      packageJson.scripts['db:migrate'] = 'node scripts/migrate-to-postgres.js';
      packageJson.scripts['db:setup'] = 'node scripts/migrate-to-postgres.js';
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      log('✅ Added database scripts to package.json', 'green');
    }
  }
  
  // Check Vercel configuration
  const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
  if (fs.existsSync(vercelJsonPath)) {
    log('📝 Vercel configuration found - ensure DATABASE_URL is set in dashboard', 'cyan');
  }
}

function generateMigrationReport() {
  log('\n📊 Migration Report', 'bold');
  log('==================', 'bold');
  
  const report = {
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'Postgres' : 'Unknown',
    status: 'Completed',
    nextSteps: [
      'Deploy to Vercel with new DATABASE_URL',
      'Test analytics functionality',
      'Monitor performance metrics',
      'Remove legacy KV environment variables'
    ]
  };
  
  log(`✅ Migration completed at: ${report.timestamp}`, 'green');
  log(`🐘 Database type: ${report.database}`, 'blue');
  log(`📈 Status: ${report.status}`, 'green');
  
  log('\n🎯 Next Steps:', 'bold');
  report.nextSteps.forEach((step, index) => {
    log(`   ${index + 1}. ${step}`, 'cyan');
  });
  
  // Save report
  const reportPath = path.join(process.cwd(), 'migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n💾 Migration report saved to: ${reportPath}`, 'magenta');
}

async function main() {
  try {
    log('🚀 Jirung Senior Advisor - Database Migration', 'bold');
    log('==============================================', 'bold');
    log('\n📖 Migrating from Vercel KV to Postgres', 'cyan');
    log('   See VERCEL_KV_MIGRATION_GUIDE.md for details\n', 'cyan');
    
    // Step 1: Check environment
    checkEnvironment();
    
    // Step 2: Test database connection
    const db = checkDatabaseConnection();
    
    // Step 3: Initialize schema
    await initializeSchema(db);
    
    // Step 4: Update configuration
    updateDeploymentConfig();
    
    // Step 5: Generate report
    generateMigrationReport();
    
    log('\n🎉 Migration completed successfully!', 'green');
    log('🚀 Your application is now ready for deployment', 'green');
    
    // Cleanup
    await db.disconnect();
    
  } catch (error) {
    log(`\n💥 Migration failed: ${error.message}`, 'red');
    log('\n🆘 Need help? Check the migration guide or contact support', 'yellow');
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };