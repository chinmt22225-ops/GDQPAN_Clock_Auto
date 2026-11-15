/* Android song prompt: idle starts the whole song; time-field interaction opts out. */
(() => {
  'use strict';
  let active = null;
  function open({overlay, sheet, content, getDuration, formatDuration, playFull, playTimed}) {
    active?.dispose();
    const root = content.firstElementChild;
    const inputs = ['h','m','s'].map(part => content.querySelector('#music-timer-' + part));
    const full = content.querySelector('#btn-play-full-song');
    const confirm = content.querySelector('#btn-confirm-music-timer');
    const error = content.querySelector('#music-timer-error-msg');
    const durationDisplay = content.querySelector('#music-timer-duration-display');
    const status = document.createElement('p');
    status.id = 'music-timer-idle-status'; status.setAttribute('role', 'status');
    status.style.cssText = 'margin:0;color:var(--primary-dark);font-size:12px;line-height:1.5;';
    full.parentElement.before(status);
    let duration = 0, disposed = false, editing = false, timeout, interval;
    const started = performance.now();
    const listeners = [];
    const current = () => !disposed && overlay.classList.contains('active') &&
      sheet.classList.contains('active') && content.firstElementChild === root;
    function stopCountdown() { clearTimeout(timeout); clearInterval(interval); }
    function dispose() {
      if (disposed) return;
      disposed = true; stopCountdown(); observer.disconnect();
      for (const [element, event, handler] of listeners) element.removeEventListener(event, handler);
      if (active?.dispose === dispose) active = null;
    }
    function listen(element, event, handler) {
      element.addEventListener(event, handler); listeners.push([element, event, handler]);
    }
    function cancelAutoPlay() {
      if (!current()) return;
      editing = true; stopCountdown();
      status.textContent = 'Đã dừng tự phát. Nhập thời gian rồi chọn Xác nhận hẹn giờ.';
    }
    function finish(callback) {
      if (!current()) return;
      dispose(); overlay.classList.remove('active'); sheet.classList.remove('active'); callback();
    }
    function renderCountdown() {
      const remaining = Math.max(1, Math.ceil((5000 - (performance.now() - started)) / 1000));
      status.textContent = `Tự động phát toàn bài sau ${remaining} giây. Chạm ô giờ, phút hoặc giây để hẹn giờ.`;
    }
    const observer = new MutationObserver(() => { if (!current()) dispose(); });
    observer.observe(overlay, {attributes:true, attributeFilter:['class']});
    observer.observe(sheet, {attributes:true, attributeFilter:['class']});
    observer.observe(content, {childList:true});
    active = {dispose};
    inputs.forEach((input, index) => {
      input.readOnly = false; input.disabled = false;
      input.inputMode = 'numeric'; input.setAttribute('enterkeyhint', index === 2 ? 'done' : 'next');
      input.setAttribute('aria-label', ['Giờ hẹn giờ','Phút hẹn giờ','Giây hẹn giờ'][index]);
      for (const event of ['pointerdown','touchstart','mousedown','focus','click','input','change']) listen(input, event, cancelAutoPlay);
      listen(input, 'keydown', event => {
        cancelAutoPlay();
        if (event.key === 'Enter') { event.preventDefault(); if (index < 2) inputs[index + 1].focus(); else confirm.click(); }
      });
    });
    listen(full, 'click', () => finish(playFull));
    listen(confirm, 'click', () => {
      cancelAutoPlay();
      const [h,m,s] = inputs.map(input => Number(input.value || '0'));
      let message = '';
      if (![h,m,s].every(Number.isInteger) || h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59)
        message = 'Nhập giờ từ 0–23, phút và giây từ 0–59.';
      const total = h * 3600 + m * 60 + s;
      if (!message && total <= 0) message = 'Vui lòng nhập thời gian hẹn giờ lớn hơn 00:00:00.';
      if (!message && duration > 0 && total >= duration) message = `Không thể hẹn giờ dài hơn độ dài bài hát (${formatDuration(duration)})`;
      error.textContent = message; error.style.display = message ? 'block' : 'none';
      if (!message) finish(() => playTimed(total));
    });
    renderCountdown(); interval = setInterval(renderCountdown, 1000);
    timeout = setTimeout(() => { if (!editing) finish(playFull); }, 5000);
    // Metadata must never delay input handlers or the five-second deadline.
    Promise.resolve().then(getDuration).then(value => {
      if (!current()) return;
      duration = Number.isFinite(value) && value > 0 ? value : 0;
      durationDisplay.textContent = 'Thời lượng: ' + (duration ? formatDuration(duration) : '--:--:--');
    }).catch(() => { if (current()) durationDisplay.textContent = 'Thời lượng: --:--:--'; });
  }
  window.GdqMusicTimerPrompt = {open};
})();
