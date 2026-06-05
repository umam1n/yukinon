const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let replaced = content.replace(/aura/g, 'yukinon')
                          .replace(/Aura/g, 'Yukinon')
                          .replace(/AURA/g, 'YUKINON');
    if (content !== replaced) {
      fs.writeFileSync(filePath, replaced);
      console.log('Renamed in:', filePath);
    }
  }
});

let indexHtml = fs.readFileSync('./index.html', 'utf8');
indexHtml = indexHtml.replace(/aura/g, 'yukinon').replace(/Aura/g, 'Yukinon').replace(/AURA/g, 'YUKINON');
fs.writeFileSync('./index.html', indexHtml);

let readme = fs.readFileSync('./README.md', 'utf8');
readme = readme.replace(/aura/g, 'yukinon').replace(/Aura/g, 'Yukinon').replace(/AURA/g, 'YUKINON');
fs.writeFileSync('./README.md', readme);

console.log('Rename complete.');
