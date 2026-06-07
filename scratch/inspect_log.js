const fs = require('fs');
const zlib = require('zlib');

const logPath = 'd:/posyandu-mobile/scratch/full_log.txt';
const buffer = fs.readFileSync(logPath);

console.log('Total file length:', buffer.length);

// Let's print the first few lines to verify
const textContent = buffer.toString('utf8');
const lines = textContent.split('\n');
console.log('Total lines parsed as UTF-8:', lines.length);
console.log('First 5 lines:');
for (let i = 0; i < Math.min(5, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// Let's find where the binary data starts.
// The binary data is likely at the end, or it's a gzip stream of the build logs.
// Let's search for gzip magic bytes (1F 8B) in the whole buffer.
let gzipOffsets = [];
for (let i = 0; i < buffer.length - 1; i++) {
  if (buffer[i] === 0x1f && buffer[i+1] === 0x8b) {
    gzipOffsets.push(i);
  }
}
console.log('Gzip magic bytes (1F 8B) found at offsets:', gzipOffsets);

// Let's try to gunzip from each found offset
for (const offset of gzipOffsets) {
  try {
    const chunk = buffer.slice(offset);
    const decompressed = zlib.gunzipSync(chunk);
    console.log(`Successfully decompressed chunk at offset ${offset}! Decompressed size:`, decompressed.length);
    fs.writeFileSync('d:/posyandu-mobile/scratch/decompressed_log.txt', decompressed);
    console.log('Saved decompressed log to scratch/decompressed_log.txt');
    
    // Print the end of the decompressed log
    const decompressedText = decompressed.toString('utf8');
    const decLines = decompressedText.split('\n');
    console.log('Decompressed log lines count:', decLines.length);
    console.log('Last 20 lines of decompressed log:');
    for (let i = Math.max(0, decLines.length - 20); i < decLines.length; i++) {
      console.log(decLines[i]);
    }
    break; // Found it!
  } catch (err) {
    // console.log(`Offset ${offset} failed to gunzip:`, err.message);
  }
}
