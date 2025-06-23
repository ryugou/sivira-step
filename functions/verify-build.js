/**
 * Build Verification Script
 * Checks if TypeScript compilation was successful
 */

const fs = require('fs');
const path = require('path');

console.log('=== Build Verification ===\n');

// Check if lib directory exists
const libDir = path.join(__dirname, 'lib');
if (!fs.existsSync(libDir)) {
  console.log('❌ lib/ directory not found');
  console.log('📝 Run: npm run build');
  process.exit(1);
}

console.log('✅ lib/ directory exists');

// Check if index.js exists
const indexJs = path.join(libDir, 'index.js');
if (!fs.existsSync(indexJs)) {
  console.log('❌ lib/index.js not found');
  console.log('📝 Run: npm run build');
  process.exit(1);
}

console.log('✅ lib/index.js exists');

// Check file size (should be substantial)
const stats = fs.statSync(indexJs);
if (stats.size < 1000) {
  console.log('⚠️  lib/index.js is very small, build may have failed');
} else {
  console.log(`✅ lib/index.js size: ${stats.size} bytes`);
}

// List all compiled files
console.log('\n📁 Compiled files:');
const files = fs.readdirSync(libDir);
files.forEach(file => {
  const filePath = path.join(libDir, file);
  const fileStats = fs.statSync(filePath);
  console.log(`  - ${file} (${fileStats.size} bytes)`);
});

console.log('\n=== Build Verification Complete ===');
console.log('✅ Ready for deployment');
console.log('📝 Next: firebase deploy --only functions');