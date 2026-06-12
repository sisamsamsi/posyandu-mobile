const { Jimp } = require('jimp');
const fs = require('fs');

async function processIcons() {
  try {
    console.log('Starting branding update...');
    
    const iconSourcePath = 'assets/simpulsehat-icon-raw.png';

    // 1. Read and Crop the Raw Icon to remove whitespace FIRST
    console.log('Reading raw icon for cropping...');
    const sourceIcon = await Jimp.read(iconSourcePath);
    const width = sourceIcon.bitmap.width;
    const height = sourceIcon.bitmap.height;
    
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    
    sourceIcon.scan(0, 0, width, height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      const a = this.bitmap.data[idx + 3];
      
      const isBg = (a < 50) || (r > 240 && g > 240 && b > 240);
      
      if (!isBg) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    });
    
    console.log('Detected icon boundary:', { minX, maxX, minY, maxY });
    
    let croppedIcon;
    if (maxX > minX && maxY > minY) {
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const size = Math.max(contentW, contentH);
      
      const centerX = minX + contentW / 2;
      const centerY = minY + contentH / 2;
      
      const padding = 10;
      const cropSize = size + 2 * padding;
      
      const cropX = Math.max(0, Math.round(centerX - cropSize / 2));
      const cropY = Math.max(0, Math.round(centerY - cropSize / 2));
      
      console.log('Cropping raw icon to square:', { cropX, cropY, cropSize });
      sourceIcon.crop({ x: cropX, y: cropY, w: cropSize, h: cropSize });
      croppedIcon = sourceIcon;
    } else {
      console.warn('Could not detect icon content bounds, using raw icon directly.');
      croppedIcon = sourceIcon;
    }

    // 2. Splash Screen (Icon ONLY on White, No Text, Centered)
    console.log('Generating Splash Screen (icon only)...');
    const bgSplash = new Jimp({ width: 1242, height: 2436, color: '#FFFFFF' });
    const splashIcon = croppedIcon.clone();
    splashIcon.resize({ w: 320 }); // Professional size (about 25% of screen width)
    
    const xSplash = (1242 - splashIcon.bitmap.width) / 2;
    const ySplash = (2436 - splashIcon.bitmap.height) / 2;
    bgSplash.composite(splashIcon, xSplash, ySplash);
    await bgSplash.write('assets/simpulsehat-splash.png');
    console.log('Created assets/simpulsehat-splash.png (Icon-only on White, 320px)');

    // 3. App Icon (Original Gradient Icon on White Background)
    console.log('Generating App Icon (white background)...');
    const bgIcon = new Jimp({ width: 1024, height: 1024, color: '#FFFFFF' });
    const appIcon = croppedIcon.clone();
    appIcon.resize({ w: 680 });
    const xIcon = (1024 - appIcon.bitmap.width) / 2;
    const yIcon = (1024 - appIcon.bitmap.height) / 2;
    bgIcon.composite(appIcon, xIcon, yIcon);
    await bgIcon.write('assets/simpulsehat-icon.png');
    console.log('Created assets/simpulsehat-icon.png (Gradient Icon on White)');

    // 4. Adaptive Icon (Foreground with transparent background)
    console.log('Generating Adaptive Icon (transparent foreground)...');
    const bgAdaptive = new Jimp({ width: 1024, height: 1024, color: '#00000000' });
    const adaptiveIcon = croppedIcon.clone();
    adaptiveIcon.resize({ w: 600 });
    const xAdapt = (1024 - adaptiveIcon.bitmap.width) / 2;
    const yAdapt = (1024 - adaptiveIcon.bitmap.height) / 2;
    bgAdaptive.composite(adaptiveIcon, xAdapt, yAdapt);
    await bgAdaptive.write('assets/simpulsehat-adaptive-icon.png');
    console.log('Created assets/simpulsehat-adaptive-icon.png');

    // 5. Favicon
    console.log('Generating Favicon...');
    const favicon = croppedIcon.clone();
    favicon.resize({ w: 48 });
    await favicon.write('assets/simpulsehat-favicon.png');
    console.log('Created assets/simpulsehat-favicon.png');

    // 6. Update app.json
    const appJsonPath = 'app.json';
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    if (appJson.expo) {
      appJson.expo.name = "SIMPUL SEHAT";
      appJson.expo.icon = "./assets/simpulsehat-icon.png";
      if (appJson.expo.splash) {
        appJson.expo.splash.backgroundColor = "#FFFFFF";
        appJson.expo.splash.image = "./assets/simpulsehat-splash.png";
      }
      if (appJson.expo.android && appJson.expo.android.adaptiveIcon) {
        appJson.expo.android.adaptiveIcon.backgroundColor = "#FFFFFF"; // Set background to White
        appJson.expo.android.adaptiveIcon.foregroundImage = "./assets/simpulsehat-adaptive-icon.png";
      }
      if (appJson.expo.web) {
        appJson.expo.web.favicon = "./assets/simpulsehat-favicon.png";
      }
    }
    
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('Updated app.json branding successfully.');

  } catch (err) {
    console.error('Error during branding update:', err);
  }
}

processIcons();
