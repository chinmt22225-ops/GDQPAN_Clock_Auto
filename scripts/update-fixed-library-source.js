// One-time migration of both maintained HTML entry points to the shared fixed library.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const file of ['HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html','HE_THONG_THONG_BAO_TU_DONG_MOBILE.html']){
  const target=path.join(root,file);let text=fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n');
  if(!text.includes('assets/music-catalog.js'))text=text.replace('<script src="Sound/preset_sounds_data.js"></script>','<script src="assets/music-catalog.js"></script><script src="assets/fixed-music.js"></script>\n<script src="Sound/preset_sounds_data.js"></script>');
  if(!text.includes('...window.GdqMusicCatalog.songs'))text=text.replace('const DEFAULT_PRESET_SONGS = [','const DEFAULT_PRESET_SONGS = [\n    ...window.GdqMusicCatalog.songs,');
  if(!text.includes("throw new Error('Thư viện nhạc"))text=text.replace('async function saveSong(songMeta, fileBlob) {',"async function saveSong(songMeta, fileBlob) {\n    throw new Error('Thư viện nhạc được đóng gói sẵn; chỉ Phòng thu được phép thêm âm thanh.');");
  const start=text.indexOf('  async function renderMusicModal(category) {'),end=text.indexOf('  // --- MODAL: LỊCH SỬ HOẠT ĐỘNG ---',start);
  if(start<0||end<0)throw Error('Không tìm được vùng thư viện trong '+file);
  text=text.slice(0,start)+'  async function renderMusicModal(category) {\n    return window.GdqFixedMusic.open(category);\n  }\n\n'+text.slice(end);
  text=text.replace('Bấm "+ Tải nhạc lên" để thêm file MP3/WAV','Danh mục sẽ được bổ sung trong các bản cập nhật phần mềm');
  text=text.replace('+ Tải bài hát lên','♫ Xem thư viện');
  text=text.replace('title="Quản lý thư viện và bài hát">⚙ Quản lý','title="Xem thư viện nhạc có sẵn">♫ Thư viện');
  fs.writeFileSync(target,text);
}
