const JimpModule = require('jimp');
const Jimp = JimpModule.default || JimpModule;
const fs = require('fs');

async function processIcons() {
  try {
    console.log('Starting branding update...');
    
    const logoSourcePath = 'assets/simpulsehat-logo.png';
    const iconSourcePath = 'assets/simpulsehat-icon.png';

    // 1. Splash Screen (Logo on White, Medium Proportional)
    let bgSplash;
    if (typeof Jimp === 'function') {
      bgSplash = new Jimp(1242, 2436, '#FFFFFF');
    } else if (Jimp.create) {
      bgSplash = await Jimp.create(1242, 2436, '#FFFFFF');
    } else {
      bgSplash = await Jimp.read('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=');
      bgSplash.resize(1242, 2436);
    }
    const logoSplash = await Jimp.read(logoSourcePath);
    
    // Resize logo to "medium proportional" (e.g. 900px wide)
    logoSplash.resize(900, Jimp.AUTO);
    
    const xSplash = (1242 - logoSplash.bitmap.width) / 2;
    const ySplash = (2436 - logoSplash.bitmap.height) / 2;
    bgSplash.composite(logoSplash, xSplash, ySplash);
    await bgSplash.writeAsync('assets/simpulsehat-splash.png');
    console.log('Created assets/simpulsehat-splash.png (Logo on White, 900px)');

    // 2. App Icon (White Icon on Teal)
    let bgIcon;
    if (typeof Jimp === 'function') {
      bgIcon = new Jimp(1024, 1024, '#0D9488');
    } else if (Jimp.create) {
      bgIcon = await Jimp.create(1024, 1024, '#0D9488');
    } else {
      bgIcon = await Jimp.read('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=');
      bgIcon.resize(1024, 1024);
      bgIcon.background(0x0D9488FF);
    }
    const sourceIcon = await Jimp.read(iconSourcePath);
    
    // Attempt to remove white background from icon.png to avoid "white square"
    sourceIcon.scan(0, 0, sourceIcon.bitmap.width, sourceIcon.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If it's pure white or very close, make it transparent
      if (r > 245 && g > 245 && b > 245) {
        this.bitmap.data[idx + 3] = 0; 
      } else if (this.bitmap.data[idx + 3] > 0) {
        // Make the icon itself white for the teal background
        this.bitmap.data[idx + 0] = 255;
        this.bitmap.data[idx + 1] = 255;
        this.bitmap.data[idx + 2] = 255;
      }
    });

    sourceIcon.resize(700, Jimp.AUTO);
    const xIcon = (1024 - sourceIcon.bitmap.width) / 2;
    const yIcon = (1024 - sourceIcon.bitmap.height) / 2;
    bgIcon.composite(sourceIcon, xIcon, yIcon);
    await bgIcon.writeAsync('assets/simpulsehat-icon.png');
    console.log('Created assets/simpulsehat-icon.png (Processed Icon on Teal)');

    // 3. Adaptive Icon
    let bgAdaptive;
    if (typeof Jimp === 'function') {
      bgAdaptive = new Jimp(1024, 1024, 0x00000000);
    } else if (Jimp.create) {
      bgAdaptive = await Jimp.create(1024, 1024, 0x00000000);
    } else {
      bgAdaptive = await Jimp.read('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=');
      bgAdaptive.resize(1024, 1024);
    }
    const adaptiveIcon = sourceIcon.clone();
    adaptiveIcon.resize(600, Jimp.AUTO);
    const xAdapt = (1024 - adaptiveIcon.bitmap.width) / 2;
    const yAdapt = (1024 - adaptiveIcon.bitmap.height) / 2;
    bgAdaptive.composite(adaptiveIcon, xAdapt, yAdapt);
    await bgAdaptive.writeAsync('assets/simpulsehat-adaptive-icon.png');
    console.log('Created assets/simpulsehat-adaptive-icon.png');

    // 4. Update app.json
    const appJsonPath = 'app.json';
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    if (appJson.expo) {
      appJson.expo.name = "SIMPUL SEHAT";
      if (appJson.expo.splash) {
        appJson.expo.splash.backgroundColor = "#FFFFFF"; // Back to White for splash
        appJson.expo.splash.image = "./assets/simpulsehat-splash.png";
      }
      if (appJson.expo.android && appJson.expo.android.adaptiveIcon) {
        appJson.expo.android.adaptiveIcon.backgroundColor = "#0D9488";
      }
    }
    
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('Updated app.json branding successfully.');

  } catch (err) {
    console.error('Error during branding update:', err);
  }
}

processIcons();
