const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}

// Create dist directory
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
}

// Copy public files
copyDir('public', 'dist');

// Copy dashboard-icons
if (fs.existsSync('dashboard-icons')) {
    copyDir('dashboard-icons', 'dist/dashboard-icons');
}

// Copy tutorials
if (fs.existsSync('tutorials')) {
    copyDir('tutorials', 'dist/tutorials');
}

console.log('Build complete!');
