const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const assetsDir = 'd:/posyandu-mobile/assets';

async function main() {
  walkDir(assetsDir, async (filePath) => {
    if (filePath.endsWith('.png')) {
      const buffer = fs.readFileSync(filePath);
      const hex = buffer.slice(0, 4).toString('hex');
      
      if (hex.startsWith('ffd8ff')) {
        console.log(`[ALERT] File ${filePath} is actually a JPEG! Magic bytes: ${hex}`);
        console.log(`Converting ${filePath} to a real PNG...`);
        try {
          const image = await Jimp.read(filePath);
          await image.write(filePath); // Jimp automatically encodes based on the file extension/output
          console.log(`[SUCCESS] Converted ${filePath} to real PNG.`);
        } catch (err) {
          console.error(`[ERROR] Failed to convert ${filePath}:`, err.message);
        }
      } else if (hex.startsWith('89504e47')) {
        console.log(`[OK] File ${filePath} is a valid PNG.`);
      } else {
        console.log(`[WARNING] File ${filePath} has unknown format: ${hex}`);
      }
    }
  });
}

main().catch(console.error);
