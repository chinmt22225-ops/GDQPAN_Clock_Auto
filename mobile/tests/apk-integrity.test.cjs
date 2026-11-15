const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {inspectArchive} = require('../verify-apk.cjs');

// Tiny ZIP fixtures exercise transport damage without needing the Android SDK.
function archive(names = ['AndroidManifest.xml', 'classes.dex']) {
  const locals = [], directories = []; let offset = 0;
  for (const name of names) {
    const filename = Buffer.from(name), local = Buffer.alloc(30), entry = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(filename.length, 26);
    entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(filename.length, 28); entry.writeUInt32LE(offset, 42);
    locals.push(local, filename); directories.push(entry, filename); offset += local.length + filename.length;
  }
  const directory = Buffer.concat(directories), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(names.length, 8); end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
function fixture(t, bytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gdqpan-integrity-test-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const file = path.join(dir, 'test.apk'); fs.writeFileSync(file, bytes); return file;
}
test('complete archive returns exact bytes and SHA-256', t => {
  const data = archive(), file = fixture(t, data), result = inspectArchive(file);
  assert.equal(result.bytes, data.length); assert.match(result.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(inspectArchive(file, result), result);
});
test('partial transfers fail before invoking Android tools', t => {
  const data = archive();
  for (const length of [0, 10, Math.floor(data.length * .84), data.length - 1, data.length - 22])
    assert.throws(() => inspectArchive(fixture(t, data.subarray(0, length))), /incomplete|invalid/i);
});
test('wrong download size fails with an actionable message', t => {
  assert.throws(() => inspectArchive(fixture(t, archive()), {bytes: 999}), /size mismatch.*Copy\/download again/);
});
test('same-sized altered bytes fail the published checksum', t => {
  const data = archive(), file = fixture(t, data), approved = inspectArchive(file);
  data[12] ^= 1; fs.writeFileSync(file, data);
  assert.throws(() => inspectArchive(file, approved), /SHA-256 mismatch/);
});
test('trailing bytes and malformed central directory are rejected', t => {
  assert.throws(() => inspectArchive(fixture(t, Buffer.concat([archive(), Buffer.from('extra')]))), /incomplete|invalid/i);
  const data = archive(); data.writeUInt32LE(1, data.length - 6);
  assert.throws(() => inspectArchive(fixture(t, data)), /corrupt/);
});
test('non-APK archives and duplicate entries are rejected', t => {
  assert.throws(() => inspectArchive(fixture(t, archive(['readme.txt']))), /manifest or classes are missing/);
  assert.throws(() => inspectArchive(fixture(t, archive(['AndroidManifest.xml', 'classes.dex', 'classes.dex']))), /Duplicate/);
});
