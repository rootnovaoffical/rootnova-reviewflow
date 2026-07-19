import fs from 'node:fs';
import zlib from 'node:zlib';

// Read all 5 persisted files and extract base64
const dir = '/tmp/cc-agent/69022784/.v3/persisted-tool-results/v3-session';
const files = [
  'call_31893cdd807e41a899887a8c.txt',
  'call_eb3843fc7d5d490eb4a71f60.txt',
  'call_36499bf0279948f6b38c56b0.txt',
  'call_f0471a9645aa46309fc01110.txt',
  'call_b18325b11b0b45f59d6e92e6.txt',
];

let b64 = '';
for (const f of files) {
  const raw = fs.readFileSync(dir + '/' + f, 'utf8');
  // Find H4sI or the segment value, extract until \\"}] marker
  const startMatch = raw.match(/\\"s\d\\":\\"/);
  if (!startMatch) throw new Error('No start marker in ' + f);
  const startIdx = startMatch.index + startMatch[0].length;
  const endIdx = raw.indexOf('\\"', startIdx);
  if (endIdx < 0) throw new Error('No end marker in ' + f);
  const seg = raw.substring(startIdx, endIdx);
  console.error(`${f}: ${seg.length} chars`);
  b64 += seg;
}
console.error(`Total: ${b64.length} chars`);

// Verify it's all valid base64
if (!/^[A-Za-z0-9+/=]+$/.test(b64)) {
  console.error('ERROR: b64 contains non-base64 chars!');
  // Find first non-base64 char
  for (let i = 0; i < b64.length; i++) {
    if (!/[A-Za-z0-9+/=]/.test(b64[i])) {
      console.error(`First invalid char at ${i}: '${b64[i]}' (0x${b64.charCodeAt(i).toString(16)})`);
      console.error(`Context: ...${b64.substring(Math.max(0, i - 20), i + 20)}...`);
      break;
    }
  }
  process.exit(1);
}

const buf = Buffer.from(b64, 'base64');
console.error(`Decoded: ${buf.length} bytes`);
console.error(`Magic: ${buf.subarray(0, 4).toString('hex')}`);

// Try gunzip
try {
  const out = zlib.gunzipSync(buf);
  console.error(`Gunzip OK: ${out.length} bytes`);
  fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', out);
  console.error('Wrote restored.tar');
} catch (e) {
  console.error(`Gunzip failed: ${e.message}`);
  // Try with different options
  try {
    const out = zlib.inflateRawSync(buf.subarray(2), { finishFlush: zlib.constants.Z_SYNC_FLUSH });
    console.error(`inflateRaw OK: ${out.length} bytes`);
    fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', out);
    console.error('Wrote restored.tar');
  } catch (e2) {
    console.error(`inflateRaw failed: ${e2.message}`);
    // Try gunzip with finishFlush option to skip CRC
    try {
      const out = zlib.gunzipSync(buf, { finishFlush: zlib.constants.Z_SYNC_FLUSH });
      console.error(`gunzipSync(finishFlush) OK: ${out.length} bytes`);
      fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', out);
      console.error('Wrote restored.tar');
    } catch (e3) {
      console.error(`gunzipSync(finishFlush) failed: ${e3.message}`);
      process.exit(1);
    }
  }
}
