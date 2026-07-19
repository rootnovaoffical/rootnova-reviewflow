import fs from 'node:fs';
import zlib from 'node:zlib';

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
  // Base64 content is only [A-Za-z0-9+/=]. Match between \"sN":" and the closing "
  // The persisted file has escaped quotes: \"s0\":\"BASE64\"
  // Just grab all base64 chars after the key marker
  const m = raw.match(/s\d\\":\\"([A-Za-z0-9+/=]+)/);
  if (!m) throw new Error('No segment found in ' + filePath);
  return m[1];
}

let b64 = '';
for (const f of files) {
  const seg = extractSegment(dir + '/' + f);
  console.error(`${f}: ${seg.length} chars`);
  b64 += seg;
}
console.error(`Total b64 length: ${b64.length}`);

const buf = Buffer.from(b64, 'base64');
console.error(`Decoded bytes: ${buf.length}`);
console.error(`First 4 bytes: ${buf.subarray(0, 4).toString('hex')}`);

try {
  const out = zlib.gunzipSync(buf);
  console.error(`Gunzip OK, decompressed: ${out.length} bytes`);
  fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', out);
  console.error('Wrote restored.tar');
} catch (e) {
  console.error(`Gunzip failed: ${e.message}`);
  try {
    const out = zlib.inflateRawSync(buf.subarray(2), { finishFlush: zlib.constants.Z_SYNC_FLUSH });
    console.error(`inflateRaw OK, decompressed: ${out.length} bytes`);
    fs.writeFileSync('/tmp/cc-agent/69022784/project/.v3/restored.tar', out);
    console.error('Wrote restored.tar');
  } catch (e2) {
    console.error(`inflateRaw failed: ${e2.message}`);
    process.exit(1);
  }
}
