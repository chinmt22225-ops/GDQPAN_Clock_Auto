// Verify the actual distributable, including its signature, before publishing it.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');

function inspectArchive(file, expected = {}) {
  const size = fs.statSync(file).size;
  if (expected.bytes !== undefined && size !== Number(expected.bytes))
    throw Error(`APK size mismatch: expected ${expected.bytes} bytes, received ${size}. Copy/download again.`);
  const fd = fs.openSync(file, 'r');
  try {
    const tail = Buffer.alloc(Math.min(size, 65557));
    fs.readSync(fd, tail, 0, tail.length, size - tail.length);
    let end = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === 0x06054b50 && i + 22 + tail.readUInt16LE(i + 20) === tail.length) {
        end = i; break;
      }
    }
    if (end < 0) throw Error('APK is incomplete or invalid: ZIP end record is missing. Copy/download again.');
    const count = tail.readUInt16LE(end + 10);
    const directorySize = tail.readUInt32LE(end + 12);
    const directoryOffset = tail.readUInt32LE(end + 16);
    if (tail.readUInt16LE(end + 4) || tail.readUInt16LE(end + 6) ||
        tail.readUInt16LE(end + 8) !== count || count === 0 || count === 65535 ||
        directoryOffset + directorySize !== size - tail.length + end)
      throw Error('Unsupported or corrupt APK ZIP directory.');
    const directory = Buffer.alloc(directorySize);
    if (fs.readSync(fd, directory, 0, directorySize, directoryOffset) !== directorySize)
      throw Error('Incomplete APK ZIP directory.');
    const names = new Set();
    let offset = 0;
    for (let i = 0; i < count; i++) {
      if (offset + 46 > directory.length || directory.readUInt32LE(offset) !== 0x02014b50)
        throw Error('Corrupt APK ZIP entry.');
      const nameLength = directory.readUInt16LE(offset + 28);
      const next = offset + 46 + nameLength + directory.readUInt16LE(offset + 30) + directory.readUInt16LE(offset + 32);
      if (next > directory.length) throw Error('Incomplete APK ZIP entry.');
      const name = directory.toString('utf8', offset + 46, offset + 46 + nameLength);
      if (names.has(name)) throw Error(`Duplicate APK ZIP entry: ${name}`);
      names.add(name); offset = next;
    }
    if (offset !== directorySize || !names.has('AndroidManifest.xml') || !names.has('classes.dex'))
      throw Error('APK manifest or classes are missing, or ZIP directory is corrupt.');
  } finally { fs.closeSync(fd); }
  const hash = crypto.createHash('sha256');
  const input = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(1024 * 1024);
    let length;
    while ((length = fs.readSync(input, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, length));
  } finally { fs.closeSync(input); }
  const sha256 = hash.digest('hex');
  if (expected.sha256 && sha256 !== expected.sha256.toLowerCase())
    throw Error('APK SHA-256 mismatch. The file differs from the verified release. Copy/download again.');
  return {bytes: size, sha256};
}

function verifyApk(options) {
  const file = path.resolve(options.apk);
  const integrity = inspectArchive(file, options);
  const sdk = options.sdk || process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk) throw Error('Set ANDROID_HOME or pass --sdk.');
  const buildTools = path.join(sdk, 'build-tools', options.buildTools || '36.0.0');
  const java = options.java || (process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java');
  // ASCII temporary names also work with Windows SDK tools on accented project paths.
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gdqpan-apk-'));
  const run = (exe, args) => execFileSync(exe, args, {encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 4 * 1024 * 1024});
  try {
    const staged = path.join(temp, 'app.apk'); fs.copyFileSync(file, staged);
    const sign = (apk, extra = []) => run(java, ['-jar', path.join(buildTools, 'lib', 'apksigner.jar'), 'verify', '--verbose', '--print-certs', ...extra, apk]);
    const signature = sign(staged);
    if (!signature.includes('Verified using v2 scheme (APK Signature Scheme v2): true')) throw Error('APK v2 signature is required.');
    // With minSdk 24, apksigner skips v1 when v2 succeeds. Force an independent
    // legacy signature check; this does not change the app's minimum Android API.
    const legacySignature = options.requireV1 ? sign(staged, ['--min-sdk-version', '23', '--max-sdk-version', '23']) : signature;
    const v1 = legacySignature.includes('Verified using v1 scheme (JAR signing): true');
    if (options.requireV1 && !v1) throw Error('APK v1 signature is required for this release.');
    const certificateSha256 = signature.match(/Signer #1 certificate SHA-256 digest: ([a-f0-9]+)/)?.[1];
    if (!certificateSha256) throw Error('Signing certificate is missing.');
    let referenceCertificateSha256;
    if (options.reference) {
      const reference = path.join(temp, 'reference.apk'); fs.copyFileSync(path.resolve(options.reference), reference);
      referenceCertificateSha256 = sign(reference).match(/Signer #1 certificate SHA-256 digest: ([a-f0-9]+)/)?.[1];
      if (referenceCertificateSha256 !== certificateSha256) throw Error('Signing certificate changed: in-place upgrade would fail.');
    }
    const badging = run(path.join(buildTools, process.platform === 'win32' ? 'aapt.exe' : 'aapt'), ['dump', 'badging', staged]);
    const pkg = badging.match(/package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/);
    if (!pkg || pkg[1] !== 'vn.gdqpan.app.mobile') throw Error('Unexpected Android application ID.');
    if (options.version && pkg[3] !== options.version) throw Error(`Version mismatch: expected ${options.version}, received ${pkg[3]}.`);
    if (options.code && pkg[2] !== String(options.code)) throw Error(`Version code mismatch: expected ${options.code}, received ${pkg[2]}.`);
    const minSdk = Number(badging.match(/^sdkVersion:'(\d+)'/m)?.[1]);
    const targetSdk = Number(badging.match(/^targetSdkVersion:'(\d+)'/m)?.[1]);
    if (minSdk !== 24 || targetSdk !== 36) throw Error(`Unexpected SDK range: min=${minSdk}, target=${targetSdk}.`);
    run(path.join(buildTools, process.platform === 'win32' ? 'zipalign.exe' : 'zipalign'), ['-c', '4', staged]);
    // Verify the staged bytes too, so a failed copy cannot be released.
    inspectArchive(staged, integrity);
    const result = {file: path.basename(file), ...integrity, package: pkg[1], version: pkg[3], versionCode: Number(pkg[2]), minSdk, targetSdk, signatures: {v1, v2: true}, v1VerificationApi: options.requireV1 ? 23 : undefined, certificateSha256, referenceCertificateSha256, zipAligned: true, checkedAt: new Date().toISOString()};
    if (options.output) fs.writeFileSync(options.output, JSON.stringify(result, null, 2) + '\n');
    return result;
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
}

if (require.main === module) {
  try {
    const options = {};
    const names = {'build-tools': 'buildTools', 'require-v1': 'requireV1'};
    for (let i = 2; i < process.argv.length; i++) {
      const key = process.argv[i].replace(/^--/, '');
      options[names[key] || key] = key === 'require-v1' ? true : process.argv[++i];
    }
    if (!options.apk) throw Error('Usage: node verify-apk.cjs --apk FILE [--version VERSION --code CODE --require-v1 --reference OLD_APK --output REPORT]');
    console.log(JSON.stringify(verifyApk(options), null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = {inspectArchive, verifyApk};
