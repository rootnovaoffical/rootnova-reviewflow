import fs from 'node:fs';

const dir = '/tmp/cc-agent/69022784/.v3/persisted-tool-results/v3-session';
const files = [
  'call_31893cdd807e41a899887a8c.txt',
  'call_eb3843fc7d5d490eb4a71f60.txt',
  'call_36499bf0279948f6b38c56b0.txt',
  'call_f0471a9645aa46309fc01110.txt',
  'call_b18325b11b0b45f59d6e92e6.txt',
];

function extractSegment(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const m = raw.match(/\\"s\d\\":\\"((?:[^"\\]|\\.)*)\\"/);
  if (!m) throw new Error('No segment found in ' + filePath);
  let s = m[1];
  s = s.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
  return s;
}

let b64 = '';
for (const f of files) b64 += extractSegment(dir + '/' + f);
console.log('Total:', b64.length);
console.log('First 80:', b64.substring(0, 80));
console.log('Last 80:', b64.substring(b64.length - 80));
console.log('At 18000:', b64.substring(18000, 18050));
console.log('At 36000:', b64.substring(36000, 36050));
console.log('At 54000:', b64.substring(54000, 54050));
console.log('At 72000:', b64.substring(72000, 72050));

// Check if the base64 itself is valid
const buf = Buffer.from(b64, 'base64');
console.log('Decoded bytes:', buf.length);
console.log('First 4 bytes (gzip magic):', buf.subarray(0, 4).toString('hex'));
console.log('Last 8 bytes:', buf.subarray(buf.length - 8).toString('hex'));

// Expected gzip magic: 1f 8b 08
// Try gunzip
const zlib = await import('node:zlib');
try {
  const out = zlib.gunzipSync(buf);
  console.log('Gunzip OK, decompressed:', out.length, 'bytes');
  fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', out);
  console.log('Wrote restored.tar');
} catch (e) {
  console.log('Gunzip failed:', e.message);
  // Try raw inflate bypass
  try {
    const out = zlib.inflateRawSync(buf.subarray(2), { finishFlush: zlib.constants.Z_SYNC_FLUSH });
    console.log('inflateRaw OK, decompressed:', out.length, 'bytes');
    fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', out);
    console.log('Wrote restored.tar');
  } catch (e2) {
    console.log('inflateRaw failed:', e1.message);
  }
}
