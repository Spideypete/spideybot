#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log('✓ Created dist/ directory');
}

// Copy public folder to dist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  console.error('✗ ERROR: public/ folder not found!');
  process.exit(1);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

try {
  copyRecursive(publicDir, distDir);
  console.log('✓ Successfully copied public/ to dist/');
  
  // Verify it worked
  const filesInDist = fs.readdirSync(distDir);
  console.log(`✓ dist/ now contains ${filesInDist.length} items`);
  
  if (fs.existsSync(path.join(distDir, 'dashboard.html'))) {
    console.log('✓ dashboard.html is present');
  }
  
  process.exit(0);
} catch (err) {
  console.error('✗ Build failed:', err.message);
  process.exit(1);
}
