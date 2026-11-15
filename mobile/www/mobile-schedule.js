/* Compact schedule presentation reuses the desktop CRUD, file and selection logic. */
(() => {
  function init(){
    if(!window.GdqMobile){setTimeout(init,30);return;}
    const tbody=document.getElementById('schedule-tbody-desktop'),body=tbody.closest('.panel-body'),tableWrap=tbody.closest('table').parentElement;
    tableWrap.classList.add('mobile-old-schedules');
    const controls=document.getElementById('sch-time-input').parentElement,days=document.querySelector('.mobile-days'),file=document.getElementById('sch-custom-file-row'),alert=document.getElementById('schedule-alert');
    document.body.insertAdjacentHTML('beforeend','<dialog id="mobile-schedule-form" class="mobile-review-dialog mobile-schedule-dialog" aria-labelledby="mobile-schedule-form-title"><header class="mobile-form-header"><h2 id="mobile-schedule-form-title">Thêm lịch phát</h2><button type="button" id="mobile-schedule-close" aria-label="Đóng form lịch">✕</button></header><div id="mobile-schedule-fields"></div><button type="button" id="mobile-schedule-delete" class="btn red">Xóa lịch này</button></dialog>');
    const dialog=document.getElementById('mobile-schedule-form'),fields=document.getElementById('mobile-schedule-fields');
    [controls,days,file,alert].forEach(el=>fields.appendChild(el));controls.classList.add('mobile-schedule-controls');
    const audioDetails=document.createElement('details');audioDetails.className='mobile-schedule-audio';audioDetails.innerHTML='<summary>Âm thanh riêng (tùy chọn)</summary>';file.before(audioDetails);audioDetails.appendChild(file);
    const actions=document.createElement('div');actions.className='mobile-review-actions';actions.append(document.getElementById('btn-cancel-edit-schedule'),document.getElementById('btn-add-schedule'));fields.after(actions);
    for(const [id,label] of [['sch-time-input','Giờ phát'],['sch-action-select','Nội dung phát'],['sch-custom-name-input','Tên thông báo'],['sch-text-input','Văn bản đọc thêm (tùy chọn)']]){
      const element=document.getElementById(id);element.setAttribute('aria-label',label);
      if(id==='sch-time-input')element.insertAdjacentHTML('beforebegin','<label class="mobile-field-label" for="sch-time-input">Giờ phát</label>');
      if(id==='sch-action-select')element.insertAdjacentHTML('beforebegin','<label class="mobile-field-label" for="sch-action-select">Nội dung phát</label>');
    }
    const toolbar=document.createElement('div');toolbar.className='mobile-schedule-toolbar';toolbar.innerHTML='<span id="mobile-schedule-count"></span><button type="button" id="mobile-schedule-add" class="btn green">+ Thêm lịch</button>';body.prepend(toolbar);
    const list=document.createElement('div');list.id='mobile-schedule-list';list.setAttribute('aria-label','Danh sách lịch phát');tableWrap.before(list);
    const selectionLabel=document.createElement('label');selectionLabel.className='mobile-schedule-selection';selectionLabel.append(document.getElementById('sch-select-all'),document.createTextNode('Chọn tất cả'));
    const toolsRow=tableWrap.previousElementSibling.previousElementSibling;toolsRow.classList.add('mobile-schedule-tools');toolsRow.firstElementChild.firstElementChild.replaceWith(selectionLabel);
    let currentId=null;
    const oldEdit=window.editSchedule,oldCancel=window.cancelEditSchedule;
    const open=(id=null)=>{currentId=id;audioDetails.open=!!StorageManager.getSchedules().find(s=>s.id===id)?.hasCustomAudio;document.getElementById('mobile-schedule-form-title').textContent=id?'Sửa lịch phát':'Thêm lịch phát';document.getElementById('mobile-schedule-delete').hidden=!id;if(!dialog.open)dialog.showModal();document.getElementById('sch-time-input').focus();};
    window.editSchedule=id=>{oldEdit(id);open(id);};
    window.cancelEditSchedule=(...args)=>{const result=oldCancel(...args);if(dialog.open)dialog.close();currentId=null;return result;};
    toolbar.querySelector('button').onclick=()=>{window.cancelEditSchedule();open();};
    document.getElementById('mobile-schedule-close').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{if(dialog.open)return;window.cancelEditSchedule();document.getElementById('mobile-schedule-add').focus();});
    document.getElementById('mobile-schedule-delete').onclick=async()=>{if(!currentId)return;const id=currentId;await window.deleteSchedule(id);if(!StorageManager.getSchedules().some(s=>s.id===id))dialog.close();};
    function render(){
      const schedules=StorageManager.getSchedules();document.getElementById('mobile-schedule-count').textContent=schedules.length+' lịch · '+schedules.filter(s=>s.on!==false).length+' đang bật';list.replaceChildren();
      if(!schedules.length){const empty=document.createElement('p');empty.className='mobile-schedule-empty';empty.textContent='Chưa có lịch phát. Bấm + Thêm lịch để bắt đầu.';list.appendChild(empty);}
      for(const s of schedules){
        const row=document.createElement('div');row.className='mobile-schedule-row'+(s.on===false?' is-disabled':'');row.dataset.scheduleId=s.id;
        const select=document.createElement('input');select.type='checkbox';select.className='mobile-schedule-select';select.setAttribute('aria-label','Chọn lịch '+s.time+' '+s.action);
        const original=[...tbody.querySelectorAll('.sch-check-item')].find(el=>el.value===String(s.id));select.checked=!!original?.checked;
        select.onchange=()=>{if(original)original.checked=select.checked;window.updateScheduleSelectionUI();};
        const edit=document.createElement('button');edit.type='button';edit.className='mobile-schedule-edit';edit.setAttribute('aria-label','Sửa lịch '+s.time+' '+s.action);edit.onclick=()=>window.editSchedule(s.id);
        const time=document.createElement('strong');time.textContent=s.time;const detail=document.createElement('span'),name=document.createElement('b'),daysText=document.createElement('small');name.textContent=s.action;
        const days=s.days?.length?s.days:[1,2,3,4,5,6,0];daysText.textContent=days.length===7?'Hằng ngày':days.map(d=>d===0?'CN':'T'+(d+1)).join(' · ');if(s.hasCustomAudio)daysText.textContent+=' · Tệp âm thanh riêng';detail.append(name,daysText);edit.append(time,detail);
        const toggle=document.createElement('button');toggle.type='button';toggle.className='mobile-schedule-toggle';toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(s.on!==false));toggle.setAttribute('aria-label','Bật/tắt lịch '+s.time+' '+s.action);toggle.textContent=s.on===false?'Tắt':'Bật';toggle.onclick=()=>window.toggleSchedule(s.id);
        const selection=document.createElement('label');selection.className='mobile-schedule-hit';selection.appendChild(select);
        row.append(selection,edit,toggle);list.appendChild(row);
      }
    }
    new MutationObserver(render).observe(tbody,{childList:true,subtree:true});
    document.getElementById('sch-select-all').addEventListener('change',render);
    window.GdqSchedule={close:()=>{if(dialog.open)dialog.close();},render};render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
