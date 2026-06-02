const fs = require('fs');
const path = require('path');

const clientDir = path.resolve(__dirname, 'dist/client');
const distDir = path.resolve(__dirname, 'dist');

const shellPath = path.resolve(clientDir, '_shell.html');
const clientIndexPath = path.resolve(clientDir, 'index.html');
const distIndexPath = path.resolve(distDir, 'index.html');

console.log('Running post-build script...');

if (fs.existsSync(shellPath)) {
  // 1. Copy dist/client/_shell.html to dist/client/index.html
  fs.copyFileSync(shellPath, clientIndexPath);
  console.log('Copied _shell.html to dist/client/index.html');
  
  // 2. Copy dist/client/_shell.html to dist/index.html
  fs.copyFileSync(shellPath, distIndexPath);
  console.log('Copied _shell.html to dist/index.html');
} else {
  console.error('Error: _shell.html not found!');
}

const clientAssetsDir = path.resolve(clientDir, 'assets');
const distAssetsDir = path.resolve(distDir, 'assets');

if (fs.existsSync(clientAssetsDir)) {
  // 3. Copy dist/client/assets to dist/assets recursively
  fs.cpSync(clientAssetsDir, distAssetsDir, { recursive: true });
  console.log('Copied dist/client/assets to dist/assets recursively');
} else {
  console.warn('Warning: dist/client/assets not found');
}

console.log('Post-build script completed successfully!');
