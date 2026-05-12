const fs = require('fs');
const path = require('path');

// ICO file format constants
const ICO_HEADER_SIZE = 6;
const ICO_DIR_ENTRY_SIZE = 16;

function createICO(outputPath, imageBuffers) {
  const numImages = imageBuffers.length;
  const header = Buffer.alloc(ICO_HEADER_SIZE);
  
  // ICO header
  header.writeUInt16LE(0, 0);  // Reserved
  header.writeUInt16LE(1, 2);  // Type: ICO
  header.writeUInt16LE(numImages, 4);  // Number of images
  
  let offset = ICO_HEADER_SIZE + (numImages * ICO_DIR_ENTRY_SIZE);
  const dirEntries = [];
  const imageData = [];
  
  for (const img of imageBuffers) {
    const width = img.width;
    const height = img.height;
    const size = img.buffer.length;
    
    // Directory entry
    const entry = Buffer.alloc(ICO_DIR_ENTRY_SIZE);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);  // Width
    entry.writeUInt8(height >= 256 ? 0 : height, 1);  // Height
    entry.writeUInt8(0, 2);  // Color palette
    entry.writeUInt8(0, 3);  // Reserved
    entry.writeUInt16LE(1, 4);  // Color planes
    entry.writeUInt16LE(32, 6);  // Bits per pixel
    entry.writeUInt32LE(size, 8);  // Image size
    entry.writeUInt32LE(offset, 12);  // Image offset
    
    dirEntries.push(entry);
    imageData.push(img.buffer);
    offset += size;
  }
  
  // Combine all parts
  const icoBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...imageData
  ]);
  
  fs.writeFileSync(outputPath, icoBuffer);
  console.log(`Created ${outputPath}`);
}

// Simple PNG to ICO conversion
// Since we already have PNG files, we'll use a simplified approach
// Read the 256x256 PNG and create a basic ICO
const png256 = fs.readFileSync(path.join(__dirname, 'icons', '256x256.png'));
const png48 = fs.readFileSync(path.join(__dirname, 'icons', '48x48.png'));
const png32 = fs.readFileSync(path.join(__dirname, 'icons', '32x32.png'));
const png16 = fs.readFileSync(path.join(__dirname, 'icons', '16x16.png'));

// Create ICO with multiple sizes
const images = [
  { width: 256, height: 256, buffer: png256 },
  { width: 48, height: 48, buffer: png48 },
  { width: 32, height: 32, buffer: png32 },
  { width: 16, height: 16, buffer: png16 }
];

createICO(path.join(__dirname, 'icon.ico'), images);
console.log('ICO file created successfully!');
