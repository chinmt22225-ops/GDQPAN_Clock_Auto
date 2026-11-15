// Checks the targeted transitive update without building an APK or an iOS app.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const xcode=require('xcode'),req=createRequire(require.resolve('xcode')),uuid=req('uuid');
const project=xcode.project('qa-memory-only.pbxproj');project.hash={project:{objects:{}}};
const ids=Array.from({length:100},()=>project.generateUuid());assert(ids.every(id=>/^[0-9A-F]{24}$/.test(id)));assert.equal(new Set(ids).size,100);
assert.throws(()=>uuid.v5('x',uuid.v5.DNS,new Uint8Array(8),4),RangeError);
const version=JSON.parse(fs.readFileSync(path.resolve(path.dirname(req.resolve('uuid')),'../../package.json'),'utf8')).version;
const result={uuidVersion:version,xcodeUniqueIds:100,invalidV5OutputBufferRejected:true,scope:'synthetic Xcode UUID generation; not a native/iOS build',testedAt:new Date().toISOString()};
const out=path.resolve(__dirname,'../../qa/build-tooling-review-after.json');fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
