/* Mobile layout and source state for the shared desktop audio controls. */
(() => {
  'use strict';
  function init() {
    if (!window.GdqMobile?.libraryReady) { setTimeout(init, 30); return; }
    const bar = document.getElementById('playback-control-bar');
    const nav = document.querySelector('.mobile-nav');
    const seekRow = document.getElementById('playback-seek-row');
    const slider = document.getElementById('playback-seek-slider');
    const pause = document.getElementById('btn-playback-pause');
    const hint = document.createElement('small');
    hint.className = 'mobile-player-hint'; hint.hidden = true; bar.append(hint);
    bar.classList.add('mobile-player');
    let audioActive = false, lastSource = '', pending = false;

    function measure() {
      const visible = getComputedStyle(bar).display !== 'none';
      document.body.classList.toggle('mobile-player-active', visible);
      document.documentElement.style.setProperty('--mobile-nav-space', nav.getBoundingClientRect().height + 'px');
      document.documentElement.style.setProperty('--mobile-player-space', (visible ? bar.getBoundingClientRect().height + 8 : 0) + 'px');
    }
    function refresh() {
      pending = false;
      const source = bar.dataset.nativePlaying ? 'alarm' : audioActive ? 'audio' :
        (window.currentMusicMode === 'vtv' || window.isVtvPlaying) ? 'live' : 'speech';
      if (bar.dataset.mobileSource !== source) bar.dataset.mobileSource = source;
      if (source !== 'audio' && lastSource !== source) {
        window.resetSeekBar?.();
      }
      if (source === 'audio') {
        // VTV may have hidden this row or left its mode/icon behind.
        window.currentMusicMode = 'music';
        seekRow.style.display = 'flex';
        document.getElementById('playback-icon').textContent = '♫';
        pause.disabled = false;
      }
      const canSeek = source === 'audio' && !slider.disabled;
      const message = source === 'alarm' ? 'Báo thức đang phát · Dùng nút Dừng để kết thúc' :
        source === 'live' ? 'Phát trực tiếp · Không hỗ trợ tua' :
        source === 'audio' ? 'Đang tải thời lượng âm thanh…' : 'Nguồn âm thanh này không hỗ trợ tua';
      hint.hidden = canSeek;
      if (hint.textContent !== message) hint.textContent = message;
      if (source === 'alarm') pause.disabled = true;
      lastSource = source;
      measure();
    }
    function schedule() {
      if (!pending) { pending = true; requestAnimationFrame(refresh); }
    }
    AudioEngine.onPlaybackChange((status, title, trackId) => {
      audioActive = !!trackId && (status === 'playing' || status === 'paused');
      if (audioActive && !bar.dataset.nativePlaying) {
        if (window.isVtvPlaying) window.pauseVtvPopoutStream?.();
        window.currentMusicMode = 'music';
        window.setPauseButtonState?.(status);
        if (title) document.getElementById('playback-title').textContent = title;
      }
      schedule();
    });
    AudioEngine.onTimeUpdate(schedule);
    new MutationObserver(schedule).observe(bar, {attributes: true, attributeFilter: ['style', 'data-native-playing']});
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(measure); observer.observe(nav); observer.observe(bar);
    }
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    // Ensure pause/resume always targets an active audio file after leaving video.
    const toggle = window.handleTogglePausePlayback;
    window.handleTogglePausePlayback = function (...args) {
      if (audioActive && !bar.dataset.nativePlaying) window.currentMusicMode = 'music';
      return toggle.apply(this, args);
    };
    refresh();
    window.GdqMobile.playerReady = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
