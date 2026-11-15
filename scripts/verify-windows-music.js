const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),asar=require('@electron/asar');
const version=process.env.GDQ_QA_VERSION||require('../package.json').version;
const root=path.resolve(__dirname,'..'),archive=path.join(root,`${process.env.GDQ_QA_OUTPUT_DIR||'version_windows/dist-'+version}/win-unpacked/resources/app.asar`);
const catalog=JSON.parse(fs.readFileSync(path.join(root,'qa/music-catalog-build.json'),'utf8'));
for(const song of catalog.songs){const data=asar.extractFile(archive,path.normalize(song.url));assert.equal(data.length,song.size);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),path.basename(song.url,'.mp3'));}
for(const name of ['music-catalog.js','fixed-music.js','runtime.js','account.css','banner.css','server-config.js'])assert.equal(asar.extractFile(archive,path.join('assets',name)).toString(),fs.readFileSync(path.join(root,'assets',name),'utf8'));
const files=asar.listPackage(archive).map(name=>name.replaceAll('\\','/'));
assert.equal(files.filter(name=>name.startsWith('/Sound/bundled-music/')&&name.endsWith('.mp3')).length,catalog.songs.length);
for(const folder of ['15 bài hát Quân đội','Biển đảo','Cách mạng','nhạc sinh viên','nhạc thanh niên','Trữ tình','nhạc 12 tháng'])assert(!files.some(name=>name.startsWith('/Sound/'+folder+'/')),'Original folder unexpectedly packaged');
for(const name of ['main.js','preload.js','desktop-security.cjs','fetch-page.cjs','tts_server.js','vtv_player.html','HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'])assert.equal(asar.extractFile(archive,name).toString(),fs.readFileSync(path.join(root,name),'utf8'));
assert.equal(asar.extractFile(archive,path.join('assets','account.js')).toString(),fs.readFileSync(path.join(root,'assets','account.js'),'utf8'));
const result={platform:'windows',version,tracksVerified:catalog.songs.length,sha256AllMatched:true,sourceFoldersExcluded:true,catalogAndUI:true,securitySourcesMatch:true};fs.writeFileSync(path.join(root,`qa/windows-packaged-verification-${version}.json`),JSON.stringify(result,null,2));console.log('PASS',JSON.stringify(result));
