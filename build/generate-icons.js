const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Installing sharp for image processing...');
  execSync('npm install sharp --save-dev', { stdio: 'inherit', cwd: path.dirname(__dirname) });
  sharp = require('sharp');
}

const svgPath = path.join(__dirname, 'icon.svg');
const iconsDir = path.join(__dirname, 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Read SVG file
const svgBuffer = fs.readFileSync(svgPath);

// Generate PNG icons for different platforms
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

async function generateIcons() {
  console.log('Generating icon files...');

  // Generate Windows ICO (multi-size)
  console.log('Generating Windows ICO...');
  const icoSizes = [16, 32, 48, 256];
  const icoBuffers = await Promise.all(
    icoSizes.map(size =>
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );

  // Use png-to-ico for Windows icon
  try {
    const pngToIco = require('png-to-ico');
    const icoBuffer = await pngToIco(icoBuffers.map((buf, i) =>
      sharp(buf).resize(icoSizes[i], icoSizes[i]).toBuffer()
    ));
    fs.writeFileSync(path.join(__dirname, 'icon.ico'), icoBuffer);
    console.log('Created icon.ico');
  } catch (e) {
    console.log('png-to-ico not available, creating single-size fallback...');
    // Fallback: just create a large PNG that electron-builder can use
    await sharp(svgBuffer)
      .resize(256, 256)
      .png()
      .toFile(path.join(__dirname, 'icon.png'));
    console.log('Created icon.png (use online converter to create .ico)');
  }

  // Generate macOS ICNS
  console.log('Generating macOS ICNS...');
  const macSizes = [16, 32, 64, 128, 256, 512, 1024];
  for (const size of macSizes) {
    const retinaSize = size * 2;
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon_${size}x${size}.png`));
    if (retinaSize <= 1024) {
      await sharp(svgBuffer)
        .resize(retinaSize, retinaSize)
        .png()
        .toFile(path.join(iconsDir, `icon_${size}x${size}@2x.png`));
    }
  }

  // Try to create ICNS using iconutil or fallback
  try {
    if (process.platform === 'darwin') {
      execSync(`iconutil -c icns "${iconsDir}" -o "${path.join(__dirname, 'icon.icns')}"`, { stdio: 'ignore' });
      console.log('Created icon.icns');
    } else {
      // On non-macOS, create a single PNG that can be converted
      await sharp(svgBuffer)
        .resize(1024, 1024)
        .png()
        .toFile(path.join(__dirname, 'icon-1024.png'));
      console.log('Created icon-1024.png (use online converter to create .icns)');
    }
  } catch (e) {
    console.log('Could not create ICNS automatically');
  }

  // Generate Linux icons
  console.log('Generating Linux icons...');
  const linuxSizes = [16, 24, 32, 48, 64, 128, 256, 512];
  for (const size of linuxSizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `${size}x${size}.png`));
  }

  console.log('Icon generation complete!');
  console.log('\nNote: For best results, you may want to:');
  console.log('1. Convert icon.png to icon.ico using an online converter like https://convertio.co/png-ico/');
  console.log('2. Convert icon-1024.png to icon.icns using an online converter');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
