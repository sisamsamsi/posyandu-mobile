const Jimp = require('jimp');
const fs = require('fs');

async function processIcons() {
  try {
    console.log('Starting branding update...');
    
    const logoSourcePath = 'assets/images/logo.png';
    const iconSourcePath = 'assets/images/icon.png';

    // 1. Splash Screen (Logo on White, Medium Proportional)
    const bgSplash = new Jimp(1242, 2436, '#FFFFFF');
    const logoSplash = await Jimp.read(logoSourcePath);
    
    // Resize logo to "medium proportional" (e.g. 900px wide)
    logoSplash.resize(900, Jimp.AUTO);
    
    const xSplash = (1242 - logoSplash.bitmap.width) / 2;
    const ySplash = (2436 - logoSplash.bitmap.height) / 2;
    bgSplash.composite(logoSplash, xSplash, ySplash);
    await bgSplash.writeAsync('assets/ayomi-splash.png');
    console.log('Created assets/ayomi-splash.png (Logo on White, 900px)');

    // 2. App Icon (White Icon on Teal)
    const bgIcon = new Jimp(1024, 1024, '#0D9488');
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
    await bgIcon.writeAsync('assets/ayomi-icon.png');
    console.log('Created assets/ayomi-icon.png (Processed Icon on Teal)');

    // 3. Adaptive Icon
    const bgAdaptive = new Jimp(1024, 1024, 0x00000000);
    const adaptiveIcon = sourceIcon.clone();
    adaptiveIcon.resize(600, Jimp.AUTO);
    const xAdapt = (1024 - adaptiveIcon.bitmap.width) / 2;
    const yAdapt = (1024 - adaptiveIcon.bitmap.height) / 2;
    bgAdaptive.composite(adaptiveIcon, xAdapt, yAdapt);
    await bgAdaptive.writeAsync('assets/ayomi-adaptive-icon.png');
    console.log('Created assets/ayomi-adaptive-icon.png');

    // 4. Update app.json
    const appJsonPath = 'app.json';
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    if (appJson.expo) {
      appJson.expo.name = "AYOMI";
      if (appJson.expo.splash) {
        appJson.expo.splash.backgroundColor = "#FFFFFF"; // Back to White for splash
        appJson.expo.splash.image = "./assets/ayomi-splash.png";
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
