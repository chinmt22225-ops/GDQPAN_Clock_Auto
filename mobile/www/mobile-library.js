/* Android-only navigation and library presentation; desktop source stays untouched. */
(() => {
  'use strict';
  const categories = [...window.GdqMusicCatalog.categories,'Nhạc truyền thống Trung tâm','Nhạc cách mạng','Nhạc quê hương','Nhạc trẻ'];
  function youtubeId(url) {
    const host=url.hostname.toLowerCase(),parts=url.pathname.split('/').filter(Boolean);
    if(!['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'].includes(host))return null;
    const id=host.endsWith('youtu.be')?parts[0]:parts[0]==='watch'?url.searchParams.get('v'):['shorts','live','embed'].includes(parts[0])?parts[1]:null;
    if(!id||!/^[\w-]{11}$/.test(id))throw Error('Hãy dán link của một video YouTube cụ thể.');
    return id;
  }
  function init() {
    if (!window.GdqMobile || !document.getElementById('account-open')) { setTimeout(init,30); return; }
    const main=document.querySelector('.main');


    const quick=document.querySelector('.mobile-quick');
    quick.innerHTML=[['daily','📢','Hiệu lệnh','Phát theo hoạt động'],['audio','♫','Nhạc','Thư viện theo danh mục'],['custom','↗','Nhạc tùy chọn','Phát từ đường dẫn'],['studio','🎙','Phòng thu','Thu âm · Ghép âm thanh']].map(([page,icon,title,detail])=>`<button type="button" data-destination="${page}"><span aria-hidden="true">${icon}</span><b>${title}</b><small>${detail}</small></button>`).join('');
    document.querySelector('.mobile-help').textContent='Chọn chức năng để bắt đầu. Lịch phát và các tiện ích luôn ở thanh điều hướng phía dưới.';
    const next=document.querySelector('.mobile-next');
    next.insertAdjacentHTML('beforeend','<button type="button" class="mobile-text-action" data-destination="schedule">Xem lịch phát <span aria-hidden="true">→</span></button>');
    const studio=document.querySelector('[data-mobile-page="studio"]');
    studio.querySelector('.panel-header > div').textContent='🎙 PHÒNG THU';
    studio.insertAdjacentHTML('afterbegin','<p class="mobile-section-intro">Đọc văn bản, thu giọng nói và ghép âm thanh trong một không gian riêng.</p>');
    const vtv=document.getElementById('music-mode-vtv-container');
    const vtvPage=document.createElement('section');vtvPage.className='panel mobile-page-hidden';vtvPage.dataset.mobilePage='vtv';
    vtvPage.innerHTML='<div class="panel-header">📺 THỜI SỰ VTV</div>';vtvPage.append(vtv);main.append(vtvPage);
    vtv.style.display='flex';
    document.getElementById('music-mode-tabs').hidden=true;
    document.getElementById('music-mode-tabs').style.setProperty('display','none','important');
    document.querySelector('.footerbar').insertAdjacentHTML('beforebegin','<section class="mobile-native-card mobile-page-hidden" data-mobile-page="more"><h2>Thời sự & truyền hình</h2><p>Mở kênh VTV và quản lý lịch thời sự.</p><button type="button" data-destination="vtv">📺 Mở thời sự VTV</button><button type="button" data-destination="studio">🎙 Mở Phòng thu</button></section>');
    const pills=document.getElementById('music-genre-pills');
    pills.innerHTML='<label class="mobile-library-label" for="mobile-music-category">Danh mục nhạc</label><select id="mobile-music-category"><option value="all">Tất cả bài hát</option>'+categories.map(c=>`<option>${c}</option>`).join('')+'<optgroup label="Danh mục hiện có"><option>Nhạc Bolero</option><option>Nhạc trữ tình</option><option>Nhạc khác</option></optgroup></select>';
    document.getElementById('mobile-music-category').onchange=e=>window.selectMusicPanelGenre(e.target.value);
    main.insertAdjacentHTML('beforeend','<section class="mobile-native-card mobile-page-hidden" data-mobile-page="custom"><h2>Nhạc từ đường dẫn</h2><p>Dán đường dẫn trực tiếp đến tệp MP3, WAV, M4A hoặc nguồn âm thanh. Cần kết nối mạng để phát.</p><form id="mobile-link-form"><label for="mobile-link-name">Tên hiển thị</label><input id="mobile-link-name" type="text" maxlength="160" placeholder="Ví dụ: Nhạc sinh hoạt"><label for="mobile-link-url">Đường dẫn âm thanh</label><input id="mobile-link-url" type="url" inputmode="url" required placeholder="https://…/bai-hat.mp3"><p id="mobile-link-status" role="status"></p><button type="submit">▶ Phát nhạc</button></form><p class="mobile-help">Link trang YouTube hoặc trang web không phải link tệp âm thanh trực tiếp.</p></section>');
    document.getElementById('mobile-link-form').onsubmit=async e=>{
      e.preventDefault();const status=document.getElementById('mobile-link-status');
      try {
        const url=new URL(document.getElementById('mobile-link-url').value.trim());
        if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Hãy nhập đường dẫn âm thanh HTTP hoặc HTTPS hợp lệ.');
        const videoId=youtubeId(url);
        const name=document.getElementById('mobile-link-name').value.trim()||'Nhạc tùy chọn';
        if(videoId){
          if(window.GdqAccount&&!await window.GdqAccount.authorize()) {status.textContent='Cần đăng nhập và kết nối máy chủ để phát.';return;}
          window.handleStopAll?.();
          if(window.Capacitor?.isNativePlatform?.()){
            await window.Capacitor.registerPlugin('GdqAlarm').openVtv({url:'https://www.youtube.com/watch?v='+videoId});
            status.textContent='Đã mở YouTube. Nhấn phát trong trình phát; dùng Quay lại GDQPAN để đóng.';
          } else {
            const frame=document.createElement('iframe');frame.title='Trình phát YouTube';frame.src='https://www.youtube.com/embed/'+videoId;frame.allow='autoplay; encrypted-media; fullscreen';frame.referrerPolicy='strict-origin-when-cross-origin';
            document.getElementById('mobile-youtube-player').replaceChildren(frame);
            status.textContent='Nhấn phát trong trình phát YouTube bên dưới.';
          }
          return;
        }
        document.getElementById('mobile-youtube-player').replaceChildren();
        status.textContent='Đang mở nguồn âm thanh. Dùng thanh phát phía dưới để dừng.';
        await AudioEngine.playAudioUrl(url.href,name,{trackId:'mobile-custom-link',isMusicTrack:true});
        status.textContent=window.GdqAccount?.blocked?'Cần đăng nhập để phát nhạc.':'Đã kết thúc phát.';
      } catch(error){status.textContent=error.message;}
    };
    const custom=document.querySelector('[data-mobile-page="custom"]');
    custom.querySelector('h2 + p').textContent='Dán link âm thanh trực tiếp hoặc link video YouTube. Cần kết nối mạng để phát.';
    custom.querySelector('.mobile-help').textContent='YouTube mở trình phát video riêng. Một số video yêu cầu đăng nhập hoặc không cho phép phát nhúng.';
    custom.insertAdjacentHTML('beforeend','<div id="mobile-youtube-player"></div>');
    const stop=window.handleStopAll;window.handleStopAll=(...args)=>{document.getElementById('mobile-youtube-player').replaceChildren();if(window.Capacitor?.isNativePlatform?.())window.Capacitor.registerPlugin('GdqAlarm').closeVtv().catch(()=>{});return stop?.(...args);};
    new MutationObserver(()=>{if(custom.classList.contains('mobile-page-hidden'))document.getElementById('mobile-youtube-player').replaceChildren();}).observe(custom,{attributes:true,attributeFilter:['class']});
    document.querySelectorAll('[data-destination]').forEach(button=>button.onclick=()=>window.GdqMobile.switchPage(button.dataset.destination));
    window.GdqMobile.switchPage('home',false);
    window.GdqMobile.libraryReady=true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
