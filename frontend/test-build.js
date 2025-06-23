const { execSync } = require('child_process');

try {
  console.log('Starting Angular build test...');
  const result = execSync('npm run build', { 
    encoding: 'utf8', 
    cwd: process.cwd(),
    timeout: 60000 
  });
  console.log('✅ Build successful!');
  console.log(result);
} catch (error) {
  console.log('❌ Build failed:');
  console.log(error.stdout || error.message);
  console.log('Error details:', error.stderr);
}