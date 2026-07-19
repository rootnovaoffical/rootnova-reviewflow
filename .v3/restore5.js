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

// Check gzip trailer: last 8 bytes = CRC32 (4) + ISIZE (4)
const crc32 = buf.readUInt32LE(buf.length - 8);
const isize = buf.readUInt32LE(buf.length - 4);
console.log('CRC32 from trailer:', '0x' + crc32.toString(16));
console.log('ISIZE from trailer:', isize, 'bytes');

// Try streaming gunzip with error tolerance
const chunks = [];
const gunzip = zlib.createGunzip({ finishFlush: zlib.constants.Z_SYNC_FLUSH });
gunzip.on('data', c => chunks.push(c));
gunzip.on('end', () => {
  const out = Buffer.concat(chunks);
  console.log('Gunzip stream recovered:', out.length, 'bytes');
  fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', out);
  console.log('Wrote restored.tar');
});
gunzip.on('error', e => {
  console.log('Gunzip stream error:', e.message);
  const out = Buffer.concat(chunks);
  console.log('Partial recovery:', out.length, 'bytes');
  if (out.length > 0) {
    fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', out);
    console.log('Wrote partial restored.tar');
  }
});
gunzip.write(buf);
gunzip.end();
