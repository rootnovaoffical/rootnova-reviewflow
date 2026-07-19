const fs = require('node:fs');
const zlib = require('node:zlib');

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
  const m = raw.match(/\\"s\d\\":\\"/);
  const startIdx = m.index + m[0].length;
  const endIdx = raw.indexOf('\\"', startIdx);
  b64 += raw.substring(startIdx, endIdx);
}

const buf = Buffer.from(b64, 'base64');
console.log('Decoded:', buf.length, 'bytes');

// Try streaming inflateRaw to bypass CRC
const inf = zlib.createInflateRaw({ finishFlush: zlib.constants.Z_SYNC_FLUSH });
const chunks = [];
inf.on('data', c => chunks.push(c));
inf.on('end', () => {
  const out = Buffer.concat(chunks);
  console.log('inflateRaw stream OK:', out.length, 'bytes');
  fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', out);
  console.log('Wrote restored.tar');
});
inf.on('error', e => {
  console.log('stream error:', e.message);
  // Fallback: try gunzip with skip
  try {
    const out = zlib.gunzipSync(buf, { finishFlush: zlib.constants.Z_SYNC_FLUSH });
    console.log('gunzipSync OK:', out.length);
    fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', out);
  } catch(e2) {
    console.log('all methods failed:', e2.message);
  }
});
inf.write(buf.subarray(2));
inf.end();
