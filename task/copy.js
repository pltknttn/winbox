const fs = require('fs');
const path = require('path');

const srcDir = 'src/img';
const destDir = 'dist/img';

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Copy all files from src/img to dist/img
const files = fs.readdirSync(srcDir);

files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    
    if (fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, destPath);
        console.log('Copied:', file);
    }
});

console.log('Copy complete.');