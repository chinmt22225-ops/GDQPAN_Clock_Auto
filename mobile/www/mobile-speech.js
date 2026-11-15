/* Voice input is reviewed before it can change the announcement draft. */
(() => {
  function init() {
    const input=document.getElementById('tts-input-desktop');if(!input)return;
    input.insertAdjacentHTML('beforebegin','<div class="mobile-speech-toolbar"><button type="button" id="mobile-speech-start" class="btn dark">🎙 Nhập giọng nói</button><span id="mobile-speech-status" role="status" aria-live="polite"></span></div>');
    document.body.insertAdjacentHTML('beforeend','<dialog id="mobile-speech-review" class="mobile-review-dialog" aria-labelledby="mobile-speech-title"><h2 id="mobile-speech-title">Kiểm tra bản chép lời</h2><p>Bạn có thể sửa trước khi chèn vào nội dung thông báo.</p><label for="mobile-speech-text">Nội dung nhận dạng</label><textarea id="mobile-speech-text" rows="7"></textarea><div class="mobile-review-actions"><button type="button" id="mobile-speech-cancel" class="btn dark">Hủy</button><button type="button" id="mobile-speech-insert" class="btn green">Chèn vào nội dung</button></div></dialog>');
    const button=document.getElementById('mobile-speech-start'),status=document.getElementById('mobile-speech-status'),dialog=document.getElementById('mobile-speech-review'),transcript=document.getElementById('mobile-speech-text');
    let busy=false;
    const review=text=>{if(!text?.trim()){status.textContent='Chưa nhận được lời nói. Bạn có thể thử lại.';return;}transcript.value=text.trim();dialog.showModal();transcript.focus();status.textContent='Kiểm tra bản chép lời trước khi chèn.';};
    document.getElementById('mobile-speech-cancel').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{transcript.value='';status.textContent='';button.focus();});
    document.getElementById('mobile-speech-insert').onclick=()=>{
      const text=transcript.value.trim();if(!text){transcript.focus();return;}
      input.value=input.value+(input.value.trim()?'\n':'')+text;
      input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
      dialog.close();input.focus();status.textContent='Đã chèn bản chép lời. Bạn có thể tiếp tục chỉnh sửa.';
    };
    function webRecognize(){return new Promise((resolve,reject)=>{
      const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!Recognition){reject(new Error('Trình duyệt này chưa hỗ trợ nhập giọng nói. Hãy dùng chức năng trong APK Android.'));return;}
      const recognition=new Recognition();recognition.lang='vi-VN';recognition.continuous=false;recognition.interimResults=false;
      let text='',done=false;const timer=setTimeout(()=>{recognition.abort();finish(null,{cancelled:true});},45000);
      const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(result);};
      recognition.onresult=e=>{text=[...e.results].map(r=>r[0].transcript).join(' ');};
      recognition.onerror=e=>finish(new Error(e.error==='not-allowed'?'Cần cho phép microphone để nhập bằng giọng nói.':'Chưa nhận dạng được giọng nói. Kiểm tra microphone, mạng rồi thử lại.'));
      recognition.onend=()=>finish(null,{text,cancelled:!text});
      try{recognition.start();}catch(e){finish(e);}
    });}
    button.onclick=async()=>{
      if(busy)return;busy=true;button.disabled=true;status.textContent='Đang nhận giọng nói…';
      try{
        const result=window.Capacitor?.isNativePlatform?.()?await Capacitor.registerPlugin('GdqSpeech').recognize():await webRecognize();
        if(result.cancelled)status.textContent='Đã hủy nhập giọng nói.';else review(result.text);
      }catch(e){status.textContent=e.message||'Không thể nhập giọng nói. Vui lòng thử lại.';}
      finally{busy=false;button.disabled=false;}
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
