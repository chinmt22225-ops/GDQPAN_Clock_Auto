const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

function silentWav() {
  const rate = 8000, length = rate * 2 * 60, wav = Buffer.alloc(44 + length);
  wav.write('RIFF'); wav.writeUInt32LE(36 + length, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(length, 40);
  return wav.toString('base64');
}
async function exercisePlayer(page, {out, baseline = false, screenshots = true, capture = file => page.screenshot({path: file})} = {}) {
  fs.mkdirSync(out, {recursive: true});
  const checks = [], check = (name, value, details) => { checks.push({name, passed: !!value, details}); assert(value, name); console.log('PASS player', name); };
  const errors = []; const onError = e => errors.push(e.message); page.on('pageerror', onError);
  try {
    await page.evaluate(async () => {
      GdqMobile.switchPage('audio'); document.activeElement?.blur();
      document.getElementById('mobile-music-category').value = 'all';
      await selectMusicPanelGenre('all');
      document.getElementById('mobile-heading').scrollIntoView({block: 'start'});
      AudioEngine.setVolume(0);
      // Reproduce returning from the real VTV UI callback, without an external stream.
      updateVtvPlaybackBar(true); window.currentMusicMode = 'vtv'; window.isVtvPlaying = true;
    });
    await page.evaluate(async base64 => {
      const songs = await StorageManager.getAllSongs();
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      window.__playerError = null;
      void AudioEngine.playAudioBlob(new Blob([bytes], {type: 'audio/wav'}),
        'Bản nhạc kiểm thử với tên bài hát dài để kiểm tra đầy đủ thanh điều khiển trên điện thoại',
        {trackId: songs[0].id, isMusicTrack: true}).catch(e => window.__playerError = e.message);
    }, silentWav());
    await page.waitForFunction(() => AudioEngine.getPlaybackInfo().duration > 0, {timeout: 30000});
    await page.waitForFunction(() => !document.getElementById('playback-seek-slider').disabled, {timeout: 10000});
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const geometry = await page.evaluate(() => {
      const bounds = el => { const r = el.getBoundingClientRect(); return {left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height}; };
      const bar = document.getElementById('playback-control-bar'), seek = document.getElementById('playback-seek-row');
      const nav = document.querySelector('.mobile-nav');
      return {bar: bounds(bar), seek: bounds(seek), nav: bounds(nav), seekVisible: getComputedStyle(seek).display !== 'none' && seek.getBoundingClientRect().height > 0,
        title: bounds(document.getElementById('playback-title')), overflow: document.documentElement.scrollWidth > innerWidth + 1,
        rows: [...document.querySelectorAll('.music-track-row')].map(row => ({row: bounds(row), button: bounds(row.querySelector('button')), title: bounds(row.querySelector('.music-track-title')), category: bounds(row.querySelector('.music-track-cat'))}))};
    });
    if (screenshots) await capture(path.join(out, 'playing.png'));
    if (baseline) return {baseline: true, reproducedHiddenSeek: !geometry.seekVisible, geometry};
    check('Seek restored after VTV', geometry.seekVisible);
    check('Full controls above bottom navigation', geometry.bar.bottom <= geometry.nav.top - 4 && geometry.seek.bottom <= geometry.bar.bottom && geometry.seek.top >= geometry.bar.top);
    check('Long title keeps player compact', geometry.bar.height <= 155);
    check('No horizontal overflow', !geometry.overflow);
    check('Play buttons on right, categories below title', geometry.rows.length > 0 && geometry.rows.every(r => r.button.left >= r.title.right - 1 && r.category.top >= r.title.bottom - 1 && r.button.right <= r.row.right && r.button.height >= 44 && r.button.width <= 72));
    const before = await page.evaluate(() => AudioEngine.getPlaybackInfo().currentTime);
    await page.waitForFunction(before => AudioEngine.getPlaybackInfo().currentTime > before + .2, {}, before);
    check('Playback time advances', true);
    await page.click('#btn-playback-pause');
    await page.waitForFunction(() => AudioEngine.getCurrentPlaybackState() === 'paused');
    const paused = await page.evaluate(() => AudioEngine.getPlaybackInfo().currentTime);
    await new Promise(r => setTimeout(r, 250));
    check('Pause stops playback time', Math.abs(await page.evaluate(() => AudioEngine.getPlaybackInfo().currentTime) - paused) < .15);
    check('Resume label correct', await page.$eval('#btn-playback-pause', e => e.getAttribute('aria-label') === 'Tiếp tục'));
    await page.click('#btn-playback-pause');
    await page.waitForFunction(() => AudioEngine.getCurrentPlaybackState() === 'playing');
    await page.waitForFunction(paused => AudioEngine.getPlaybackInfo().currentTime > paused + .2, {}, paused);
    check('Resume continues playback', true);
    const slider = await page.$('#playback-seek-slider'), box = await slider.boundingBox();
    await page.mouse.click(box.x + box.width * .65, box.y + box.height / 2);
    await page.waitForFunction(() => AudioEngine.getPlaybackInfo().currentTime > 30 && AudioEngine.getPlaybackInfo().currentTime < 50);
    check('Touch-sized seek slider moves real audio position', true);
    check('Elapsed and total duration shown', await page.evaluate(() => document.getElementById('playback-seek-current').textContent !== '0:00' && document.getElementById('playback-seek-duration').textContent === '1:00'));
    if (screenshots) await capture(path.join(out, 'seeked.png'));
    await page.evaluate(() => GdqMobile.switchPage('schedule'));
    check('Controls persist across tabs', await page.evaluate(() => getComputedStyle(document.getElementById('playback-control-bar')).display !== 'none' && AudioEngine.getCurrentPlaybackState() === 'playing'));
    await page.evaluate(() => {GdqMobile.switchPage('audio');document.activeElement?.blur();document.getElementById('mobile-heading').scrollIntoView({block:'start'});});
    await page.click('#btn-playback-stop');
    await page.waitForFunction(() => AudioEngine.getCurrentPlaybackState() === 'stopped' && getComputedStyle(document.getElementById('playback-control-bar')).display === 'none');
    check('Stop ends audio and hides controls', true);
    await page.evaluate(() => {window.currentMusicMode='vtv';window.isVtvPlaying=true;updateVtvPlaybackBar(true);});
    await page.evaluate(() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    check('Live source shows honest disabled seeking', await page.evaluate(() => document.getElementById('playback-seek-slider').disabled && document.querySelector('.mobile-player-hint').textContent.includes('Không hỗ trợ tua')));
    await page.evaluate(() => handleStopAll(true));
    await page.click('.music-track-row .music-play-btn-sm');
    await page.waitForFunction(() => AudioEngine.getCurrentPlaybackState()==='playing' || document.querySelector('#modal-overlay.active #btn-play-full-song') || (document.getElementById('modal-overlay').classList.contains('active')&&document.getElementById('btn-play-full-song')));
    if(await page.evaluate(()=>document.getElementById('modal-overlay').classList.contains('active')&&!!document.getElementById('btn-play-full-song'))){
      await page.waitForSelector('#btn-play-full-song',{visible:true});
      await page.click('#btn-play-full-song');
      check('Full-song / timer selection preserved',true);
    }
    await page.waitForFunction(() => AudioEngine.getCurrentPlaybackState()==='playing' && AudioEngine.getPlaybackInfo().duration>0, {timeout:30000});
    check('Compact play button starts real bundled MP3', await page.evaluate(async () => AudioEngine.getCurrentTrackId()===(await StorageManager.getAllSongs())[0].id && !document.getElementById('playback-seek-slider').disabled));
    if (screenshots) await capture(path.join(out, 'bundled-mp3.png'));
    await page.click('#btn-playback-stop');
    await page.waitForFunction(() => AudioEngine.getCurrentPlaybackState()==='stopped');
    check('No JavaScript errors', errors.length === 0, errors);
    return {checks, geometry, errors};
  } finally { await page.evaluate(() => window.handleStopAll?.(true)); page.off('pageerror', onError); }
}
module.exports = {exercisePlayer};
