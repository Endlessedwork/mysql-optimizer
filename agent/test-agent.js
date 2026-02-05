// Simple test to verify agent structure
const fs = require('fs');
const path = require('path');

// Check that all required files exist
const requiredFiles = [
  'src/index.ts',
  'src/agent.ts',
  'src/config.ts',
  'src/logger.ts',
  'src/telemetry.ts',
  'src/mysql-connector.ts',
  'package.json',
  'tsconfig.json',
  '.env.example',
  'README.md',
  'Dockerfile'
];

console.log('Checking agent structure...');

let allFilesExist = true;
requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✓ ${file}`);
  } else {
    console.log(`✗ ${file} (missing)`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('\n✅ All required files are present');
} else {
  console.log('\n❌ Some files are missing');
  process.exit(1);
}

console.log('\nAgent structure verification complete');