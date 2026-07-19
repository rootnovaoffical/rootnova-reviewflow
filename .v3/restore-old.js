const fs = require('node:fs');
const zlib = require('node:zlib');

const dir = '/tmp/cc-agent/69022784/.v3/persisted-tool-results/v3-session';
const files = [
  'call_486d02f2dc8142f8a7c44e12.txt',
  'call_897dc518b8134815bacec58f.txt',
  'call_41c0c6adf99141fd8b6cbd29.txt',
  'call_72bdea8610014bb79f349259.txt',
  'call_b80660da6a79465ea4d02ff5.txt',
];

let b64 = '';
for (const f of files) {
  const raw = fs.readFileSync(dir + '/' + f, 'utf8');
  const m = raw.match(/\\"s\d\\":\\"/);
  const startIdx = m.index + m[0].length;
  const endIdx = raw.indexOf('\\"', startIdx);
  const seg = raw.substring(startIdx, endIdx);
  console.error(`${f}: ${seg.length} chars`);
  b64 += seg;
}
console.error(`Total: ${b64.length} chars`);

const buf = Buffer.from(b64, 'base64');
console.error(`Decoded: ${buf.length} bytes`);
console.error(`Magic: ${buf.subarray(0, 4).toString('hex')}`);

// Try streaming gunzip with error tolerance for partial recovery
const chunks = [];
const gunzip = zlib.createGunzip({ finishFlush: zlib.constants.Z_SYNC_FLUSH });
gunzip.on('data', c => chunks.push(c));
gunzip.on('end', () => {
  const out = Buffer.concat(chunks);
  console.error(`Gunzip stream OK: ${out.length} bytes`);
  fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored-old.tar', out);
  console.error('Wrote restored-old.tar');
});
gunzip.on('error', e => {
  console.error(`Gunzip stream error: ${e.message}`);
  const out = Buffer.concat(chunks);
  console.error(`Partial recovery: ${out.length} bytes`);
  if (out.length > 0) {
    fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored-old.tar', out);
    console.error('Wrote partial restored-old.tar');
  }
});
gunzip.write(buf);
gunzip.end();
