(() => {
  'use strict';
  const lifetime = 24 * 60 * 60 * 1000;
  const storageKey = 'gdqpan_k471_temporary_schedules';
  const sounds = ['Báo thức', 'Tập hợp', 'Điểm danh', 'Ăn', 'Ngủ'];
  const format = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
  });
  let expiryTimer;

  function read(now = Date.now()) {
    let stored;
    try { stored = JSON.parse(localStorage.getItem(storageKey)); } catch {}
    if (!Array.isArray(stored)) return [];
    const active = stored.filter(entry => entry?.expiresAt > now);
    if (active.length !== stored.length) localStorage.setItem(storageKey, JSON.stringify(active));
    return active;
  }

  function getSchedules(now = Date.now()) {
    const owner = window.GdqAccount?.temporaryScheduleOwner;
    if (!owner) return [];
    return read(now).filter(entry => entry.owner === owner).map(({ owner, ...schedule }) => schedule);
  }

  window.GdqTemporarySchedules = { getSchedules, mount };

  function mount() {
    const toolbar = document.querySelector('.mobile-schedule-toolbar');
    if (!toolbar) return;
    toolbar.insertAdjacentHTML('beforeend',
      '<button type="button" id="k471-temp-add" class="btn dark">+ Thêm giờ tạm</button>');
    toolbar.insertAdjacentHTML('afterend', `
      <section id="k471-temp-section" hidden aria-label="Lịch tạm trên máy">
        <h3>Lịch tạm trên máy</h3>
        <div id="k471-temp-list"></div>
      </section>
      <p id="k471-temp-status" role="status"></p>`);
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="k471-temp-dialog" class="mobile-review-dialog mobile-schedule-dialog" aria-labelledby="k471-temp-title">
        <header class="mobile-form-header">
          <h2 id="k471-temp-title">Thêm giờ tạm</h2>
          <button type="button" id="k471-temp-close" aria-label="Đóng">✕</button>
        </header>
        <form id="k471-temp-form">
          <label for="k471-temp-time">Giờ phát</label>
          <input type="time" id="k471-temp-time" required>
          <label for="k471-temp-sound">Âm hiệu</label>
          <select id="k471-temp-sound"></select>
          <label for="k471-temp-text">Nội dung thông báo giọng đọc (tùy chọn)</label>
          <input type="text" id="k471-temp-text" placeholder="Để trống nếu chỉ phát chuông báo thức" maxlength="150" style="width:100%;padding:8px 10px;margin-top:4px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;">
          <p>Phát vào giờ đã chọn và reo chuông liên tục cho tới khi bấm Dừng. Lịch tự xóa sau 24 giờ kể từ lúc thêm.</p>
          <p id="k471-temp-error" role="alert"></p>
          <button type="submit" class="btn dark">Lưu giờ tạm</button>
        </form>
      </dialog>`);
    const byId = id => document.getElementById('k471-temp-' + id);
    const dialog = byId('dialog'), form = byId('form'), time = byId('time'), sound = byId('sound');
    const text = byId('text');
    const add = byId('add'), status = byId('status');
    for (const name of sounds) sound.add(new Option(name, name));

    function render() {
      clearTimeout(expiryTimer);
      const now = Date.now();
      const entries = getSchedules(now).sort((a, b) => a.triggerAt - b.triggerAt);
      const list = byId('list');
      list.replaceChildren();
      byId('section').hidden = !entries.length;
      for (const entry of entries) {
        const row = document.createElement('div');
        row.className = 'k471-temp-row';
        const detail = document.createElement('span');
        const textNote = entry.text ? ` · "${entry.text}"` : '';
        detail.textContent = `${format.format(entry.triggerAt)} · ${entry.action}${textNote} · ` +
          (entry.triggerAt <= now ? 'Đã qua giờ phát' : `Tự xóa lúc ${format.format(entry.expiresAt)}`);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn';
        remove.textContent = 'Hủy';
        remove.setAttribute('aria-label', 'Hủy lịch tạm ' + format.format(entry.triggerAt));
        remove.onclick = async () => {
          if (window.GdqAccount?.blocked) return;
          localStorage.setItem(storageKey, JSON.stringify(read().filter(s => s.id !== entry.id)));
          render();
          await sync('Đã hủy giờ tạm.');
        };
        row.append(detail, remove);
        list.append(row);
      }
      const nextChange = Math.min(...entries.flatMap(entry =>
        entry.triggerAt > now ? [entry.triggerAt, entry.expiresAt] : [entry.expiresAt]));
      if (Number.isFinite(nextChange)) expiryTimer = setTimeout(render, nextChange - now);
    }

    async function sync(message) {
      const result = await window.GdqMobile?.syncAlarms();
      const native = window.Capacitor?.isNativePlatform?.();
      status.textContent = native && !result
        ? message + ' Chưa cập nhật được bộ hẹn giờ Android. Hãy đồng bộ lại.'
        : native && !result.exact
          ? message + ' Cấp quyền Báo thức chính xác để phát khi khóa màn hình.'
          : message;
    }

    add.onclick = () => {
      if (window.GdqAccount?.blocked) return;
      form.reset();
      byId('error').textContent = '';
      dialog.showModal();
      time.focus();
    };
    byId('close').onclick = () => dialog.close();
    form.onsubmit = async event => {
      event.preventDefault();
      const owner = window.GdqAccount?.temporaryScheduleOwner;
      if (!owner || window.GdqAccount.blocked || !sounds.includes(sound.value)) return;
      const now = Date.now();
      const [hours, minutes] = time.value.split(':').map(Number);
      if (!/^\d{2}:\d{2}$/.test(time.value) || hours > 23 || minutes > 59) return;
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      if (target.getTime() <= now) target.setDate(target.getDate() + 1);
      const triggerAt = target.getTime(), expiresAt = now + lifetime;
      if (triggerAt >= expiresAt) {
        byId('error').textContent = 'Chọn giờ phát trong vòng 24 giờ tới.';
        return;
      }
      const textVal = (text?.value || '').trim();
      const entry = {
        id: 'k471-temp-' + crypto.randomUUID(), owner, triggerAt, expiresAt,
        time: time.value, action: sound.value, days: [], text: textVal, on: true,
      };
      localStorage.setItem(storageKey, JSON.stringify([...read(now), entry]));
      dialog.close();
      render();
      await sync('Đã lưu giờ tạm lúc ' + format.format(triggerAt) + '.');
    };
    document.addEventListener('gdqpan-runtime', render);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) render();
    });
    render();
  }

})();
