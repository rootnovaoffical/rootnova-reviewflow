import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dir = '/tmp/cc-agent/69022784/.v3/persisted-tool-results/v3-session';
const files = [
  'call_31893cdd807e41a899887a8c.txt', // s0
  'call_eb3843fc7d5d490eb4a71f60.txt', // s1
  'call_36499bf0279948f6b38c56b0.txt', // s2
  'call_f0471a9645aa46309fc01110.txt', // s3
  'call_b18325b11b0b45f59d6e92e6.txt', // s4
];

function extractSegment(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  // The persisted file wraps JSON in escaped quotes: \"s0\":\"...\"
  // Find the segment value between \"sN\":\" and the closing \"
  const m = raw.match(/\\"s\d\\":\\"((?:[^"\\]|\\.)*)\\"/);
  if (!m) throw new Error(`No segment found in ${filePath}`);
  let s = m[1];
  // Unescape JSON string escapes
  s = s.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
  return s;
}

let b64 = '';
for (const f of files) {
  const seg = extractSegment(path.join(dir, f));
  console.error(`${f}: ${seg.length} chars`);
  b64 += seg;
}
console.error(`Total b64 length: ${b64.length}`);

const buf = Buffer.from(b64, 'base64');
console.error(`Decoded bytes: ${buf.length}`);

let tar;
try {
  tar = zlib.gunzipSync(buf);
  console.error(`Gunzip OK, decompressed bytes: ${tar.length}`);
} catch (e) {
  console.error(`gunzipSync failed: ${e.message}`);
  console.error('Trying inflateRawSync bypass...');
  tar = zlib.inflateRawSync(buf.subarray(2), { finishFlush: zlib.constants.Z_SYNC_FLUSH });
  console.error(`inflateRaw OK, decompressed bytes: ${tar.length}`);
}

fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', tar);
console.error(`Wrote tar to .v3/restored.tar (${tar.length} bytes)`);
