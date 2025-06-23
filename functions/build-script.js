const { execSync } = require('child_process');
const path = require('path');

console.log('=== Firebase Functions Build & Deploy Script ===');

try {
  // 現在のディレクトリを確認
  console.log('Current directory:', process.cwd());
  
  // package.jsonの存在確認
  const fs = require('fs');
  if (fs.existsSync('package.json')) {
    console.log('✅ package.json found');
  } else {
    console.log('❌ package.json not found');
    process.exit(1);
  }
  
  // TypeScriptコンパイル
  console.log('\n📦 Building TypeScript...');
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('✅ TypeScript build completed');
  
  // ビルド成功の確認
  if (fs.existsSync('lib/index.js')) {
    console.log('✅ lib/index.js generated successfully');
  } else {
    console.log('❌ lib/index.js not found after build');
    process.exit(1);
  }
  
  // Firebase Functionsデプロイ
  console.log('\n🚀 Deploying to Firebase...');
  execSync('firebase deploy --only functions', { stdio: 'inherit' });
  console.log('✅ Firebase Functions deployed successfully');
  
} catch (error) {
  console.error('❌ Error occurred:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
}