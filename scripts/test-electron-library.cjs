// Read packaged resources with Electron's actual file:// and asar handling.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-electron-library-'));
const version=process.env.GDQ_QA_VERSION||require('../package.json').version;
app.setPath('userData',temporary);
app.whenReady().then(async()=>{
  const window=new BrowserWindow({show:false,width:1280,height:800,webPreferences:{nodeIntegration:false,contextIsolation:true,backgroundThrottling:false}});
  const errors=[];window.webContents.on('render-process-gone',(_event,details)=>errors.push(details.reason));
  try{
    await window.loadFile(path.join(root,`version_windows/dist-${version}/win-unpacked/resources/app.asar/HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html`));
    const result=await window.webContents.executeJavaScript(`(async()=>{
      await new Promise(r=>setTimeout(r,1500));
      const songs=await StorageManager.getAllSongs(),context=new AudioContext(),durations={};
      try{for(const category of GdqMusicCatalog.categories){const song=GdqMusicCatalog.songs.find(s=>s.category===category),response=await fetch(song.url);if(!response.ok)throw Error('Missing media '+song.url);const buffer=await context.decodeAudioData(await response.arrayBuffer());durations[category]=buffer.duration;}}finally{await context.close();}
      await GdqFixedMusic.open('15 bài hát Quân đội');
      const result={total:songs.length,bundled:songs.filter(s=>s.id.startsWith('preset_song_bundle_')).length,durations,libraryRows:document.querySelectorAll('#modal-song-list .sheet-action-item').length,libraryPicker:!!document.getElementById('song-file-input'),schedulePickerBlocked:document.getElementById('sch-audio-file-input').disabled,studioPickerAvailable:!document.getElementById('merge-body-file-input').disabled};
      closeModal();return result;
    })()`,true);
    assert.equal(result.bundled,93);assert.equal(result.libraryRows,12);assert(!result.libraryPicker&&result.schedulePickerBlocked&&result.studioPickerAvailable);assert(Object.values(result.durations).every(duration=>duration>0));assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(root,'qa','electron-library-results.json'),JSON.stringify(result,null,2));console.log('PASS packaged Electron library',JSON.stringify(result));
    fs.writeFileSync(path.join(root,'qa','windows-packaged-library.png'),(await window.webContents.capturePage()).toPNG());
    window.destroy();app.exit(0);
  }catch(error){console.error(error);window.destroy();app.exit(1);}
});
