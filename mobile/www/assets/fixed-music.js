/* Fixed distribution library shared by Windows and Android. */
(() => {
  'use strict';
  const catalog=window.GdqMusicCatalog;
  const categories=[...catalog.categories,'Nhạc truyền thống Trung tâm','Nhạc cách mạng','Nhạc quê hương','Nhạc trẻ','Nhạc Bolero','Nhạc trữ tình','Nhạc khác'];
  const options=()=>['all',...new Set(categories)];
  function select(){
    const element=document.createElement('select');element.setAttribute('aria-label','Danh mục nhạc');
    for(const category of options()){const option=document.createElement('option');option.value=category;option.textContent=category==='all'?'Tất cả bài hát':category;element.append(option);}
    return element;
  }
  async function open(category){
    const overlay=document.getElementById('modal-overlay'),sheet=document.getElementById('modal-sheet'),content=document.getElementById('modal-content');
    document.getElementById('modal-title').textContent='Thư viện nhạc có sẵn';content.replaceChildren();
    const filter=select();filter.value=category==='Tất cả nhạc'?'all':category||'all';if(!filter.value)filter.value='all';
    const intro=document.createElement('p');intro.textContent='Bài hát được đóng gói cùng phần mềm. Chọn danh mục và bài để phát.';
    const list=document.createElement('div');list.id='modal-song-list';content.append(intro,filter,list);overlay.classList.add('active');sheet.classList.add('active');
    async function render(){
      const all=await StorageManager.getAllSongs(),songs=all.filter(s=>filter.value==='all'||s.category===filter.value);list.replaceChildren();
      if(!songs.length){const empty=document.createElement('p');empty.textContent='Chưa có bài hát trong danh mục này.';list.append(empty);}
      for(const song of songs){
        const row=document.createElement('div');row.className='sheet-action-item';
        const info=document.createElement('div');info.className='sheet-action-info';info.style.minWidth='0';info.style.flex='1';
        const title=document.createElement('div');title.className='sheet-action-title';title.textContent=song.name;title.style.overflowWrap='anywhere';
        const label=document.createElement('small');label.textContent=song.category;info.append(title,label);
        const play=document.createElement('button');play.type='button';play.className='sheet-action-btn-play';play.textContent='▶ Phát';play.setAttribute('aria-label','Phát '+song.name);
        play.onclick=()=>{window.closeModal?.();window.handleMusicPanelTrackClick(song,song.id||song.name);};row.append(info,play);list.append(row);
      }
    }
    filter.onchange=render;await render();
  }
  const studioInput=input=>!!input.closest('#tab-pane-tts,#tab-pane-record,#tab-pane-merge,#gdq-studio-library');
  function restrictUploads(){
    for(const input of document.querySelectorAll('input[type=file]')){
      if(studioInput(input)||/\.json/i.test(input.accept))continue;
      if(!input.disabled)input.disabled=true;
      if(!input.classList.contains('gdq-upload-removed'))input.classList.add('gdq-upload-removed');
      for(const button of document.querySelectorAll('button[onclick],label[for]')){
        if(!studioInput(button)&&((input.id&&button.getAttribute('onclick')?.includes(input.id))||button.htmlFor===input.id))button.classList.add('gdq-upload-removed');
      }
    }
  }
  function init(){
    document.head.insertAdjacentHTML('beforeend','<style>.gdq-upload-removed{display:none!important}#music-genre-pills select{max-width:100%;min-height:40px}#modal-content>select{width:100%;margin:10px 0;padding:8px;border:1px solid #afc9bd;border-radius:8px}#modal-song-list .sheet-action-btn-play{min-height:40px;padding:8px 12px;border:0;border-radius:8px;background:#0b5945;color:white;white-space:nowrap;font-weight:700;cursor:pointer}#modal-overlay{z-index:2000}#modal-sheet{z-index:2001}#gdq-studio-library{padding:12px;border-top:1px solid #c8ded5}#gdq-studio-library input{max-width:100%}</style>');
    const pills=document.getElementById('music-genre-pills');
    if(pills){const filter=select();filter.id='fixed-music-category';filter.onchange=()=>window.selectMusicPanelGenre(filter.value);pills.replaceChildren(filter);}
    const manage=document.getElementById('music-panel-manage-btn');if(manage){manage.textContent='♫ Thư viện';manage.title='Xem thư viện nhạc có sẵn';}
    for(const button of document.querySelectorAll('.music-panel-footer button')){button.textContent='♫ Xem thư viện';}
    for(const name of ['handleUploadSongs','handleSchAudioFileSelected','handleCustomAudioUpload'])if(typeof window[name]==='function')window[name]=()=>window.showToast?.('Chỉ Phòng thu được phép thêm âm thanh.','warning');
    const refresh=()=>{restrictUploads();};refresh();
    new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('gdqpan-shared',refresh);
    document.addEventListener('click',event=>{const input=event.target.closest?.('input[type=file]');if(input&&!studioInput(input)&&!/\.json/i.test(input.accept)){event.preventDefault();event.stopImmediatePropagation();}},true);
    window.GdqFixedMusic.ready=true;
  }
  window.GdqFixedMusic={open,categories:options};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
