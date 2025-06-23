const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Environment Test ===\n');

// 1. Node.js バージョン確認
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log('✅ Node.js version:', nodeVersion);
} catch (error) {
  console.log('❌ Node.js not found:', error.message);
}

// 2. npm バージョン確認
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log('✅ npm version:', npmVersion);
} catch (error) {
  console.log('❌ npm not found:', error.message);
}

// 3. Firebase CLI確認
try {
  const firebaseVersion = execSync('firebase --version', { encoding: 'utf8' }).trim();
  console.log('✅ Firebase CLI version:', firebaseVersion);
} catch (error) {
  console.log('❌ Firebase CLI not found:', error.message);
}

// 4. TypeScript確認
try {
  const tscVersion = execSync('npx tsc --version', { encoding: 'utf8' }).trim();
  console.log('✅ TypeScript version:', tscVersion);
} catch (error) {
  console.log('❌ TypeScript not found:', error.message);
}

// 5. 現在のディレクトリ確認
console.log('\n📁 Current directory:', process.cwd());

// 6. ファイル存在確認
const filesToCheck = [
  'package.json',
  'tsconfig.json', 
  'src/index.ts',
  'node_modules'
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// 7. package.json内容確認
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('\n📦 Scripts available:');
  Object.keys(packageJson.scripts || {}).forEach(script => {
    console.log(`  - ${script}: ${packageJson.scripts[script]}`);
  });
}