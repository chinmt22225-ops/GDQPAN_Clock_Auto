const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function wav(){const rate=8000,samples=rate*16,b=Buffer.alloc(44+samples*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples*2,40);return b.toString('base64');}
async function prepareTimerFixture(page){
  await page.evaluate(base64=>{
    GdqMobile.switchPage('audio');AudioEngine.setVolume(0);AudioEngine.initContext();
    const blob=new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],{type:'audio/wav'});
    window.__timerSongs=[{id:'qa-timer-a',name:'Bài kiểm thử A',category:'QA',blob},{id:'qa-timer-b',name:'Bài kiểm thử B',category:'QA',blob}];
    window.__timerStarts=[];const old=AudioEngine.playAudioBlob;
    AudioEngine.playAudioBlob=function(blob,name,options){__timerStarts.push({id:options?.trackId,at:performance.now()});return old.apply(this,arguments);};
  },wav());
}
async function exerciseMusicTimer(page,{out,afterFocus}={}){
  fs.mkdirSync(out,{recursive:true});const checks=[];
  const check=(name,pass)=>{assert(pass,name);checks.push(name);console.log('PASS timer',name);};
  await prepareTimerFixture(page);
  async function open(index=0){await page.evaluate(index=>{closeModal();handleStopAll();__timerStarts=[];window.__timerOpenedAt=performance.now();handleMusicPanelTrackClick(__timerSongs[index],__timerSongs[index].id);},index);await page.waitForSelector('#music-timer-idle-status',{visible:true});await wait(300);}
  await open();await page.screenshot({path:path.join(out,'countdown.png')});
  await wait(1200);check('Does not start before five seconds',await page.evaluate(()=>__timerStarts.length===0));
  await page.waitForFunction(()=>__timerStarts.length===1,{timeout:8000});
  const automatic=await page.evaluate(()=>({elapsed:__timerStarts[0].at-__timerOpenedAt,id:__timerStarts[0].id,closed:!document.getElementById('modal-sheet').classList.contains('active'),timerHidden:document.getElementById('playback-timer-countdown').style.display==='none'}));
  check('Five-second idle starts the selected whole song',automatic.elapsed>=4900&&automatic.elapsed<7000&&automatic.id==='qa-timer-a'&&automatic.closed&&automatic.timerHidden);
  await page.waitForFunction(()=>AudioEngine.getCurrentTrackId()==='qa-timer-a'&&AudioEngine.getPlaybackInfo().currentTime>.2);
  check('Actual audio plays without a duration cut-off',true);
  for(const part of ['h','m','s']){
    await open();await page.tap('#music-timer-'+part);await page.waitForFunction(part=>document.activeElement?.id==='music-timer-'+part,{},part);
    await page.$eval('#music-timer-'+part,el=>el.value='');await page.type('#music-timer-'+part,'1');
    check('Keyboard input works in '+part,await page.$eval('#music-timer-'+part,el=>el.value==='1'));
    if(afterFocus)await afterFocus(part);
    await page.screenshot({path:path.join(out,'editing-'+part+'.png')});
    await page.evaluate(()=>document.activeElement.blur());await wait(5300);
    check('Touching '+part+' permanently cancels idle playback, including after blur',await page.evaluate(()=>__timerStarts.length===0&&document.getElementById('modal-sheet').classList.contains('active')&&document.getElementById('music-timer-idle-status').textContent.includes('Đã dừng')));
  }
  await open();await page.tap('#music-timer-s');await page.$eval('#music-timer-s',el=>{el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.click('#btn-confirm-music-timer');await page.waitForFunction(()=>__timerStarts.length===1);
  await page.waitForFunction(()=>document.getElementById('playback-timer-countdown').style.display!=='none',{timeout:5000});
  check('Explicit confirmation keeps the existing timed-play function',await page.$eval('#playback-timer-countdown',el=>el.style.display!=='none'));
  await open();await page.tap('#music-timer-s');await page.$eval('#music-timer-s',el=>el.value='59');await page.waitForFunction(()=>document.getElementById('music-timer-duration-display').textContent.includes('00:00:16'));await page.click('#btn-confirm-music-timer');
  check('A duration longer than the track stays in the editable form',await page.evaluate(()=>__timerStarts.length===0&&document.getElementById('music-timer-error-msg').textContent.includes('Không thể')));
  await open();await wait(3000);await page.evaluate(()=>closeModal());await open(1);await wait(2400);
  check('Closing or replacing a prompt cancels its old deadline',await page.evaluate(()=>__timerStarts.length===0));
  await page.waitForFunction(()=>__timerStarts.length===1,{timeout:6000});
  check('Only the newly selected song starts',await page.evaluate(()=>__timerStarts.length===1&&__timerStarts[0].id==='qa-timer-b'));
  await page.waitForFunction(()=>AudioEngine.getCurrentTrackId()==='qa-timer-b'&&AudioEngine.getPlaybackInfo().currentTime>.2);
  await open();await page.evaluate(()=>{const button=document.getElementById('btn-play-full-song');button.click();button.click();});await wait(350);
  check('Play whole song starts immediately and only once',await page.evaluate(()=>__timerStarts.length===1&&__timerStarts[0].at-__timerOpenedAt<2000));
  await page.waitForFunction(()=>AudioEngine.getCurrentTrackId()==='qa-timer-a'&&AudioEngine.getPlaybackInfo().currentTime>.2);
  await page.evaluate(()=>{closeModal();handleStopAll();});await wait(5300);
  check('No stale countdown starts another song',await page.evaluate(()=>__timerStarts.length===1));
  return {checks,automatic};
}
async function exerciseTimerTransitions(page){
  const checks=[];const check=(name,pass)=>{assert(pass,name);checks.push(name);console.log('PASS timer',name);};
  await page.evaluate(()=>{
    window.__realMetadataAudio=window.Audio;
    window.Audio=function(){const audio=new __realMetadataAudio();Object.defineProperty(audio,'src',{set(){},get(){return '';}});return audio;};
    __timerStarts=[];handleMusicPanelTrackClick(__timerSongs[0],__timerSongs[0].id);
  });
  await page.tap('#music-timer-m');await page.evaluate(()=>{window.Audio=__realMetadataAudio;document.getElementById('music-timer-m').value='1';});await wait(5300);
  check('Interaction while metadata is still loading cancels auto-play',await page.evaluate(()=>__timerStarts.length===0&&document.getElementById('modal-sheet').classList.contains('active')));
  await page.evaluate(async()=>{
    closeModal();handleStopAll();window.currentMusicGenreDesktop='all';
    const original=AudioEngine.playAudioUrl;AudioEngine.playAudioUrl=function(url,name,options){__timerStarts.push({id:options?.trackId,at:performance.now()});return original.apply(this,arguments);};
    __timerStarts=[];const songs=await StorageManager.getAllSongs();window.__naturalNext=songs[1].id;window.__naturalFirst=songs[0].id;
    // Preload the first MP3 so seeking near its end does not depend on HTTP range support.
    const first={...songs[0],blob:await fetch(songs[0].url).then(r=>r.blob())};handleMusicPanelTrackClick(first,first.id);
  });
  await page.click('#btn-play-full-song');await page.waitForFunction(()=>AudioEngine.getCurrentTrackId()===__naturalFirst&&AudioEngine.getPlaybackInfo().duration>0&&AudioEngine.getPlaybackInfo().currentTime>.2);
  await page.evaluate(()=>AudioEngine.seekTo(AudioEngine.getPlaybackInfo().duration-.1));
  await page.waitForSelector('#music-timer-idle-status',{visible:true});await wait(4000);
  check('Natural track end opens the next prompt without immediate playback',await page.evaluate(()=>__timerStarts.length===1));
  await page.waitForFunction(()=>__timerStarts.length===2,{timeout:5000});
  await page.waitForFunction(()=>AudioEngine.getCurrentTrackId()===__naturalNext&&AudioEngine.getPlaybackInfo().currentTime>.2);
  check('Next bundled song auto-plays whole after its five-second prompt',await page.evaluate(()=>!document.getElementById('modal-sheet').classList.contains('active')&&document.getElementById('playback-timer-countdown').style.display==='none'));
  await page.evaluate(()=>{closeModal();handleStopAll();});return checks;
}
module.exports={exerciseMusicTimer,exerciseTimerTransitions,prepareTimerFixture};
