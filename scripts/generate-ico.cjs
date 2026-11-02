const fs = require("fs");
const path = require("path");

const pngPath = path.join(__dirname, "../src/assets/spoplayer-logo.png");
const icoPath = path.join(__dirname, "../build/icon.ico");
const publicIcoPath = path.join(__dirname, "../public/favicon.ico");

const pngBuffer = fs.readFileSync(pngPath);

// Create ICO header (6 bytes) + 1 Dir Entry (16 bytes) = 22 bytes
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Type 1 = ICO
header.writeUInt16LE(1, 4); // Count = 1 image

// Entry 0
header.writeUInt8(0, 6); // Width 256 (0 means 256)
header.writeUInt8(0, 7); // Height 256 (0 means 256)
header.writeUInt8(0, 8); // Color palette 0
header.writeUInt8(0, 9); // Reserved
header.writeUInt16LE(1, 10); // Color planes
header.writeUInt16LE(32, 12); // Bits per pixel
header.writeUInt32LE(pngBuffer.length, 14); // Image size in bytes
header.writeUInt32LE(22, 18); // Offset where PNG starts

const icoBuffer = Buffer.concat([header, pngBuffer]);
fs.writeFileSync(icoPath, icoBuffer);
fs.writeFileSync(publicIcoPath, icoBuffer);
console.log("Successfully generated icon.ico (size: " + icoBuffer.length + " bytes)");
