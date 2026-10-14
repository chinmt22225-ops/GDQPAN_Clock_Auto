import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt), hash=s=>createHash('sha256').update(s).digest('hex');
const here=path.dirname(fileURLToPath(import.meta.url));
export async function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+Buffer.from(await derive(password,salt,64)).toString('hex');}
async function passwordOK(password,stored){const [salt,key]=stored.split(':');const actual=Buffer.from(await derive(password,salt,64));return key.length===128&&timingSafeEqual(actual,Buffer.from(key,'hex'));}
export function createApplication(options={}){
  const local=options.local??process.env.LOCAL_MODE==='1', data=path.resolve(options.data??process.env.DATA_DIR??'data');
  const publicUrl=options.publicUrl??process.env.PUBLIC_URL??'http://127.0.0.1:4180';
  if(!local&&!publicUrl.startsWith('https://'))throw Error('Production requires HTTPS PUBLIC_URL');
  const origins=new Set((options.origins??process.env.ALLOWED_ORIGINS??'').split(',').filter(Boolean));
  if(!local&&(origins.has('null')||origins.has('*')))throw Error('Production requires explicit origins; use desktop native HTTP bridge');
  fs.mkdirSync(path.join(data,'files'),{recursive:true});
  const db=new DatabaseSync(path.join(data,'gdqpan.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',verified INTEGER DEFAULT 0,status TEXT DEFAULT 'active',expires INTEGER,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),device_id TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS links(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),name TEXT,platform TEXT,version TEXT,seen INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS shared(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,payload TEXT NOT NULL);
    INSERT OR IGNORE INTO shared VALUES(1,0,'{"schedules":[],"settings":{},"savedText":"","customActions":[],"disabledActions":[],"files":[]}');
    CREATE TABLE IF NOT EXISTS revisions(revision INTEGER PRIMARY KEY,payload TEXT NOT NULL);
    INSERT OR IGNORE INTO revisions SELECT revision,payload FROM shared;
    CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS logs(id TEXT PRIMARY KEY,user_id TEXT,device_id TEXT,time INTEGER NOT NULL,action TEXT,details TEXT);
    CREATE TABLE IF NOT EXISTS notices(id TEXT PRIMARY KEY,title TEXT,body TEXT,version TEXT,url TEXT,created INTEGER NOT NULL);`);
  // Existing accounts remain approved. Only registration explicitly creates pending accounts.
  db.exec('BEGIN IMMEDIATE');try{
    const columns=new Set(db.prepare('PRAGMA table_info(users)').all().map(c=>c.name));
    for(const [name,definition] of [['approval',"TEXT NOT NULL DEFAULT 'approved'"],['reviewed_by','TEXT'],['reviewed_at','INTEGER']])if(!columns.has(name))db.exec('ALTER TABLE users ADD COLUMN '+name+' '+definition);
    db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');db.close();throw e;}
  const run=(sql,...args)=>db.prepare(sql).run(...args),one=(sql,...args)=>db.prepare(sql).get(...args),all=(sql,...args)=>db.prepare(sql).all(...args);
  const emailEnabled=options.emailEnabled??(local||!!options.mailer||!!(process.env.SMTP_URL&&process.env.MAIL_FROM));
  const inbox=[],limits=new Map(),adminEmail=(process.env.ADMIN_EMAIL??'chinm.t2.2225@gmail.com').toLowerCase();
  const safeUser=u=>({id:u.id,email:u.email,role:u.role,status:u.status,verified:!!u.verified,expires:u.expires,created:u.created,approval:u.approval,reviewedBy:u.reviewed_by,reviewedAt:u.reviewed_at});
  function fail(status,message){throw Object.assign(Error(message),{status});}
  async function mail(user,kind){
    const token=randomBytes(32).toString('hex'),expires=Date.now()+(kind==='verify'?86400000:900000);
    // Multiple requested links may coexist; consuming one invalidates all links of that kind.
    run('INSERT INTO links VALUES(?,?,?,?)',hash(token),user.id,kind,expires);
    const link=publicUrl+'/?'+new URLSearchParams({[kind]:token});
    const message={to:user.email,subject:kind==='verify'?'Xác minh tài khoản GDQPAN':'Đặt lại mật khẩu GDQPAN',text:`${kind==='verify'?'Xác minh email':'Đặt lại mật khẩu'} tại: ${link}\nNếu bạn không yêu cầu, hãy bỏ qua email này.`};
    try{
      if(options.mailer)await options.mailer(message);
      else if(local){inbox.push(message);fs.appendFileSync(path.join(data,'mailbox.ndjson'),JSON.stringify(message)+'\n',{mode:0o600});}
      else{
        if(!process.env.SMTP_URL||!process.env.MAIL_FROM)fail(503,'Chưa cấu hình gửi email.');
        const {default:nodemailer}=await import('nodemailer');
        await nodemailer.createTransport(process.env.SMTP_URL).sendMail({...message,from:process.env.MAIL_FROM});
      }
    }catch(e){run('DELETE FROM links WHERE hash=?',hash(token));throw e;}
  }
  async function body(req,max=1024*1024){let size=0,chunks=[];for await(const b of req){size+=b.length;if(size>max)fail(413,'Nội dung quá lớn.');chunks.push(b);}return Buffer.concat(chunks);}
  async function json(req){try{const value=JSON.parse((await body(req)).toString()||'{}');if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Dữ liệu cần là object JSON.');return value;}catch(e){if(e.status)throw e;fail(400,'Dữ liệu không hợp lệ.');}}
  function validUser(u){if(!u||u.status!=='active'||!u.verified||(u.expires!==null&&u.expires<=Date.now()))fail(403,'Tài khoản chưa xác minh, bị khóa hoặc hết hạn.');if(u.role!=='admin'&&u.approval!=='approved')fail(403,u.approval==='rejected'?'Yêu cầu đăng ký đã bị admin từ chối.':'Gmail đã xác minh. Tài khoản đang chờ admin duyệt.');}
  function auth(req){const token=(req.headers.authorization??'').replace(/^Bearer /,'');const s=one('SELECT * FROM sessions WHERE hash=?',hash(token));if(!s||s.expires<=Date.now())fail(401,'Vui lòng đăng nhập lại.');const u=one('SELECT * FROM users WHERE id=?',s.user_id);validUser(u);run('UPDATE devices SET seen=? WHERE id=?',Date.now(),s.device_id);return {u,s};}
  const admin=a=>{if(a.u.role!=='admin')fail(403,'Chỉ admin được chỉnh dữ liệu hoặc quản trị.');};
  function checkPassword(p){if(typeof p!=='string'||p.length<12||p.length>128)fail(400,'Mật khẩu cần 12–128 ký tự.');}
  function throttle(req){const key=req.socket.remoteAddress,now=Date.now();let v=limits.get(key);if(!v||v.until<now){v={count:0,until:now+60000};limits.set(key,v);}if(++v.count>30)fail(429,'Thử lại sau một phút.');if(limits.size>10000)for(const [k,x]of limits)if(x.until<now)limits.delete(k);}
  const snapshot=()=>{const row=one('SELECT * FROM shared WHERE id=1');return {revision:row.revision,...JSON.parse(row.payload)};};
  function validatePayload(p){
    const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
    const text=(v,max)=>typeof v==='string'&&v.length<=max;
    if(!object(p)||!Array.isArray(p.schedules)||!object(p.settings)||typeof p.savedText!=='string'||!Array.isArray(p.customActions)||!Array.isArray(p.disabledActions)||!Array.isArray(p.files))fail(400,'Bộ dữ liệu chung không đầy đủ.');
    if(p.schedules.length>1000||p.savedText.length>100000)fail(400,'Dữ liệu vượt giới hạn.');
    for(const key of ['autoPlay','chimeBeforeSpeech','wakeLockEnabled','musicTimerPromptEnabled'])if(key in p.settings&&typeof p.settings[key]!=='boolean')fail(400,'Cài đặt bật/tắt không hợp lệ.');
    if('volume' in p.settings&&(!Number.isFinite(p.settings.volume)||p.settings.volume<0||p.settings.volume>1))fail(400,'Âm lượng không hợp lệ.');
    if('rate' in p.settings&&(!Number.isFinite(p.settings.rate)||p.settings.rate<=0))fail(400,'Tốc độ đọc không hợp lệ.');
    if('repeatTimes' in p.settings&&(!Number.isSafeInteger(p.settings.repeatTimes)||p.settings.repeatTimes<1))fail(400,'Số lần lặp không hợp lệ.');
    for(const key of ['region','ttsProvider','apiKey'])if(key in p.settings&&!text(p.settings[key],10000))fail(400,'Cài đặt văn bản không hợp lệ.');
    const ids=new Set();for(const s of p.schedules){if(!object(s)||!text(s.id,200)||!s.id||ids.has(s.id)||typeof s.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)||!text(s.action,1000)||!Array.isArray(s.days)||!s.days.length||s.days.length>7||s.days.some(d=>!Number.isInteger(d)||d<0||d>6)||(s.on!==undefined&&typeof s.on!=='boolean')||(s.text!==undefined&&!text(s.text,100000))||(s.customAudioName!==undefined&&!text(s.customAudioName,1000)))fail(400,'Lịch không hợp lệ.');ids.add(s.id);}
    if(p.customActions.length>1000||p.disabledActions.length>1000||p.files.length>1000)fail(400,'Dữ liệu vượt giới hạn.');
    for(const a of p.customActions)if(!object(a)||!text(a.name,1000)||!a.name||(a.icon!==undefined&&!text(a.icon,200))||(a.group!==undefined&&!['chao','alarm','daily'].includes(a.group)))fail(400,'Hiệu lệnh không hợp lệ.');
    if(p.disabledActions.some(a=>!text(a,1000)))fail(400,'Hiệu lệnh ẩn không hợp lệ.');
    for(const f of p.files){if(!object(f)||!['custom_audio','schedule_audio','studio'].includes(f.kind)||!text(f.key,1000)||!text(f.id,64)||!one('SELECT id FROM files WHERE id=?',f.id)||(f.name!==undefined&&!text(f.name,1000)))fail(400,'Tệp âm thanh không tồn tại.');}
    // API keys are device/server secrets, never part of a shared snapshot.
    if(p.settings.apiKey)p.settings.apiKey='';
    if(p.extensions!==undefined&&!object(p.extensions))fail(400,'Cấu hình bổ sung không hợp lệ.');
    const extensions={};for(const key of ['gdqpan_vtv_config','gdqpan_vtv_schedules_v1','gdqpan_bg_voice_volume','gdqpan_bg_music_volume'])if(p.extensions?.[key]!==undefined){
      const value=p.extensions[key];if(!text(value,100000))fail(400,'Cấu hình bổ sung không hợp lệ.');
      if(key.includes('volume')){if(!value.trim()||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>100)fail(400,'Âm lượng nền không hợp lệ.');}
      else{
        let parsed;try{parsed=JSON.parse(value);}catch{fail(400,'JSON cấu hình VTV không hợp lệ.');}
        if(key==='gdqpan_vtv_config'){if(!object(parsed)||(parsed.streamUrl!==undefined&&!text(parsed.streamUrl,10000)))fail(400,'Cấu hình VTV không hợp lệ.');}
        else if(!Array.isArray(parsed)||parsed.length>1000||parsed.some(s=>!object(s)||!text(s.id,200)||!s.id||!text(s.name,1000)||typeof s.startTime!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.startTime)||typeof s.endTime!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.endTime)||!Array.isArray(s.days)||s.days.some(d=>!Number.isInteger(d)||d<0||d>6)||(s.enabled!==undefined&&typeof s.enabled!=='boolean')))fail(400,'Lịch VTV không hợp lệ.');
      }
      extensions[key]=value;
    }
    return {schedules:p.schedules,settings:p.settings,savedText:p.savedText,customActions:p.customActions,disabledActions:p.disabledActions,files:p.files,extensions};
  }
  const server=http.createServer(async(req,res)=>{
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
    const origin=req.headers.origin;
    if(origin){const own=new URL(publicUrl).origin,loopback=local?'http://127.0.0.1:'+server.address()?.port:null;if(!origins.has(origin)&&origin!==own&&origin!==loopback){res.writeHead(403,headers).end();return;}headers['Access-Control-Allow-Origin']=origin;headers.Vary='Origin';headers['Access-Control-Allow-Headers']='Authorization,Content-Type,X-File-Name';headers['Access-Control-Allow-Methods']='GET,POST,PUT,PATCH,DELETE,OPTIONS';}
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const reply=(status,obj)=>{res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(obj));};
    try{
      if(req.method==='OPTIONS'){res.writeHead(204,headers).end();return;}
      const url=new URL(req.url,'http://localhost'),route=url.pathname,method=req.method;
      if(route==='/api/health')return reply(200,{ok:true,local,emailEnabled});
      if(route.startsWith('/api/auth/')){
        throttle(req);const b=await json(req);
        if(route==='/api/auth/register'&&method==='POST'){
          const email=String(b.email??'').trim().toLowerCase();checkPassword(b.password);
          if(email.length>254||!/^[a-z0-9][a-z0-9.+_-]{0,63}@gmail\.com$/.test(email)||email===adminEmail)fail(400,'Đăng ký mới cần địa chỉ @gmail.com hợp lệ, không dùng email dành riêng cho quản trị.');
          if(!emailEnabled)fail(503,'Máy chủ demo chưa bật email. Đăng ký mới chưa sử dụng được.');
          if(!one('SELECT id FROM users WHERE email=?',email)){const u={id:randomUUID(),email},stored=await passwordHash(b.password);const inserted=run("INSERT INTO users(id,email,password,created,approval) VALUES(?,?,?,?,'pending') ON CONFLICT(email) DO NOTHING",u.id,email,stored,Date.now());if(inserted.changes)await mail(u,'verify');}
          return reply(200,{message:'Nếu Gmail có thể đăng ký, thư xác minh đã được gửi. Sau khi xác minh, cần admin duyệt trước khi đăng nhập. Kiểm tra cả thư rác.'});
        }
        if(route==='/api/auth/verify'&&method==='POST'){
          const l=one("SELECT * FROM links WHERE hash=? AND kind='verify'",hash(String(b.token??'')));if(!l||l.expires<Date.now())fail(400,'Liên kết không hợp lệ hoặc hết hạn.');
          run('UPDATE users SET verified=1 WHERE id=?',l.user_id);run("DELETE FROM links WHERE user_id=? AND kind='verify'",l.user_id);const user=one('SELECT * FROM users WHERE id=?',l.user_id);return reply(200,{message:user.approval==='approved'?'Đã xác minh. Bạn có thể đăng nhập.':user.approval==='rejected'?'Đã xác minh Gmail. Yêu cầu đăng ký đã bị admin từ chối.':'Đã xác minh Gmail. Vui lòng chờ admin duyệt tài khoản.'});
        }
        if((route==='/api/auth/resend'||route==='/api/auth/forgot')&&method==='POST'){
          if(!emailEnabled)fail(503,'Máy chủ demo chưa bật email. Chức năng này chưa sử dụng được.');
          const u=one('SELECT * FROM users WHERE email=?',String(b.email??'').trim().toLowerCase());
          if(u&&(route.endsWith('forgot')||!u.verified))await mail(u,route.endsWith('forgot')?'reset':'verify');
          return reply(200,{message:'Nếu tài khoản phù hợp, email đã được gửi.'});
        }
        if(route==='/api/auth/reset'&&method==='POST'){
          checkPassword(b.password);const l=one("SELECT * FROM links WHERE hash=? AND kind='reset'",hash(String(b.token??'')));if(!l||l.expires<Date.now())fail(400,'Liên kết không hợp lệ hoặc hết hạn.');
          const stored=await passwordHash(b.password);
          db.exec('BEGIN IMMEDIATE');try{
            const current=one("SELECT * FROM links WHERE hash=? AND kind='reset'",hash(String(b.token??'')));
            if(!current||current.expires<=Date.now())fail(400,'Liên kết không hợp lệ hoặc hết hạn.');
            run('UPDATE users SET password=? WHERE id=?',stored,current.user_id);run("DELETE FROM links WHERE user_id=? AND kind='reset'",current.user_id);run('DELETE FROM sessions WHERE user_id=?',current.user_id);db.exec('COMMIT');
          }catch(e){db.exec('ROLLBACK');throw e;}return reply(200,{message:'Đã đổi mật khẩu. Vui lòng đăng nhập lại.'});
        }
        if(route==='/api/auth/login'&&method==='POST'){
          if(typeof b.password!=='string'||b.password.length>128)fail(401,'Email hoặc mật khẩu không đúng.');
          const u=one('SELECT * FROM users WHERE email=?',String(b.email??'').trim().toLowerCase());
          if(!u||!await passwordOK(b.password,u.password))fail(401,'Email hoặc mật khẩu không đúng.');
          // Password verification yields to reset/admin updates. Never issue a session from a stale row.
          const current=one('SELECT * FROM users WHERE id=?',u.id);
          if(!current||current.password!==u.password)fail(401,'Email hoặc mật khẩu không đúng.');validUser(current);
          const id=randomUUID(),token=randomBytes(32).toString('hex'),expires=Date.now()+30*86400000;
          run('INSERT INTO devices VALUES(?,?,?,?,?,?)',id,u.id,String(b.device?.name??'Thiết bị').slice(0,100),String(b.device?.platform??'web').slice(0,30),String(b.device?.version??'').slice(0,30),Date.now());
          run('INSERT INTO sessions VALUES(?,?,?,?)',hash(token),u.id,id,expires);return reply(200,{token,deviceId:id,user:safeUser(current),expires});
        }
        fail(404,'Không tìm thấy thao tác.');
      }
      if(route.startsWith('/api/')){
        const a=auth(req);
        if(route==='/api/session'&&method==='GET')return reply(200,{user:safeUser(a.u),deviceId:a.s.device_id});
        if(route==='/api/logout'&&method==='POST'){run('DELETE FROM sessions WHERE hash=?',a.s.hash);return reply(200,{ok:true});}
        if(route==='/api/shared'&&method==='GET')return reply(200,snapshot());
        if(route==='/api/shared'&&method==='PUT'){
          admin(a);const b=await json(req),p=validatePayload(b),row=one('SELECT revision FROM shared WHERE id=1');
          if(b.revision!==row.revision)fail(409,'Dữ liệu đã được admin khác cập nhật. Tải lại trước khi lưu.');
          db.exec('BEGIN IMMEDIATE');try{run('UPDATE shared SET revision=revision+1,payload=? WHERE id=1',JSON.stringify(p));run('INSERT INTO revisions VALUES(?,?)',row.revision+1,JSON.stringify(p));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return reply(200,snapshot());
        }
        if(route==='/api/authorize'&&method==='POST'){
          const b=await json(req),s=snapshot();
          if(b.scheduleId){const saved=one('SELECT payload FROM revisions WHERE revision=?',Number.isInteger(b.revision)?b.revision:-1);const entry=saved?JSON.parse(saved.payload).schedules.find(x=>x.id===b.scheduleId):null;if(!entry||!entry.on)fail(409,'Lịch không thuộc bộ dữ liệu đã nhận. Mở ứng dụng để đồng bộ lại.');}
          return reply(200,{ok:true,user:safeUser(a.u),revision:s.revision});
        }
        if(route==='/api/files'&&method==='POST'){
          admin(a);const mime=String(req.headers['content-type']??'');if(!/^audio\/[a-z0-9.+-]+$/i.test(mime))fail(400,'Chỉ nhận tệp âm thanh.');
          const bytes=await body(req,100*1024*1024);
          const id=hash(bytes),name=String(req.headers['x-file-name']??'audio').slice(0,200);
          const existing=one('SELECT * FROM files WHERE id=?',id);if(existing)return reply(201,existing);
          const used=one('SELECT COALESCE(SUM(size),0) AS n FROM files').n;if(used+bytes.length>3*1024**3)fail(413,'Kho âm thanh vượt 3 GB.');
          fs.writeFileSync(path.join(data,'files',id),bytes);run('INSERT INTO files VALUES(?,?,?,?)',id,name,mime,bytes.length);return reply(201,{id,name,mime,size:bytes.length});
        }
        if(route.startsWith('/api/files/')&&method==='GET'){
          const f=one('SELECT * FROM files WHERE id=?',route.slice(11));if(!f)fail(404,'Không tìm thấy tệp.');
          if(a.u.role!=='admin'&&!snapshot().files.some(x=>x.id===f.id))fail(403,'Tệp chưa được admin công bố.');
          res.writeHead(200,{...headers,'Content-Type':f.mime,'Content-Length':f.size});fs.createReadStream(path.join(data,'files',f.id)).pipe(res);return;
        }
        if(route==='/api/logs'&&method==='POST'){const b=await json(req);run('INSERT INTO logs VALUES(?,?,?,?,?,?)',randomUUID(),a.u.id,a.s.device_id,Date.now(),String(b.action??'').slice(0,300),String(b.details??'').slice(0,3000));return reply(201,{ok:true});}
        if(route==='/api/logs'&&method==='GET')return reply(200,a.u.role==='admin'?all('SELECT * FROM logs ORDER BY time DESC LIMIT 500'):all('SELECT * FROM logs WHERE user_id=? ORDER BY time DESC LIMIT 150',a.u.id));
        if(route==='/api/notices'&&method==='GET')return reply(200,all('SELECT * FROM notices ORDER BY created DESC LIMIT 30'));
        if(route==='/api/notices'&&method==='POST'){admin(a);const b=await json(req);if(b.url&&!/^https:\/\//.test(b.url))fail(400,'Liên kết cập nhật cần HTTPS.');run('INSERT INTO notices VALUES(?,?,?,?,?,?)',randomUUID(),String(b.title??'').slice(0,200),String(b.body??'').slice(0,3000),String(b.version??'').slice(0,30),String(b.url??''),Date.now());return reply(201,{ok:true});}
        if(route==='/api/admin/users'&&method==='GET'){admin(a);return reply(200,all('SELECT * FROM users ORDER BY created DESC').map(safeUser));}
        if(route==='/api/admin/devices'&&method==='GET'){admin(a);return reply(200,all('SELECT devices.*,users.email FROM devices JOIN users ON users.id=devices.user_id ORDER BY seen DESC'));}
        if(route==='/api/admin/files'&&method==='GET'){admin(a);return reply(200,all('SELECT * FROM files'));}
        if(route.startsWith('/api/admin/users/')&&method==='PATCH'){
          admin(a);const id=route.slice(17),b=await json(req),u=one('SELECT * FROM users WHERE id=?',id);if(!u)fail(404,'Không tìm thấy tài khoản.');if(u.role==='admin')fail(400,'Không chỉnh tài khoản admin qua thao tác này.');
          const status=b.status??u.status,expires=b.expires===undefined?u.expires:b.expires;
          if(!['active','locked'].includes(status)||(expires!==null&&(!Number.isSafeInteger(expires)||expires<0)))fail(400,'Trạng thái/thời hạn không hợp lệ.');
          if(b.approval!==undefined&&!['approved','rejected'].includes(b.approval))fail(400,'Trạng thái duyệt không hợp lệ.');
          if(b.approval==='approved'&&!u.verified)fail(400,'Tài khoản cần xác minh email trước khi được duyệt.');
          const approval=b.approval??u.approval,changed=b.approval!==undefined&&approval!==u.approval;
          db.exec('BEGIN IMMEDIATE');try{
            run('UPDATE users SET status=?,expires=?,approval=?,reviewed_by=?,reviewed_at=? WHERE id=?',status,expires,approval,changed?a.u.id:u.reviewed_by,changed?Date.now():u.reviewed_at,id);
            if(changed){if(approval==='rejected')run('DELETE FROM sessions WHERE user_id=?',id);run('INSERT INTO logs VALUES(?,?,?,?,?,?)',randomUUID(),a.u.id,a.s.device_id,Date.now(),approval==='approved'?'Duyệt tài khoản':'Từ chối tài khoản',u.email);}
            db.exec('COMMIT');
          }catch(e){db.exec('ROLLBACK');throw e;}
          return reply(200,{ok:true,user:safeUser(one('SELECT * FROM users WHERE id=?',id))});
        }
        fail(404,'Không tìm thấy thao tác.');
      }
      if(method!=='GET')fail(405,'Không hỗ trợ thao tác.');
      const name=route==='/'?'index.html':route.slice(1);if(!['index.html','app.js','style.css'].includes(name))fail(404,'Không tìm thấy trang.');
      res.writeHead(200,{...headers,'Content-Type':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8'});fs.createReadStream(path.join(here,'../public',name)).pipe(res);
    }catch(e){if(!res.headersSent)reply(e.status??500,{error:e.status?e.message:'Máy chủ chưa xử lý được yêu cầu.'});else res.destroy();}
  });
  return {server,db,inbox,local,async createAdmin(email,password){checkPassword(password);const id=randomUUID();run("INSERT INTO users(id,email,password,role,verified,status,expires,created) VALUES(?,?,?,'admin',1,'active',NULL,?)",id,email.toLowerCase(),await passwordHash(password),Date.now());return id;},
    async provisionAdmin(email,password){
      checkPassword(password);email=email.trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Email không hợp lệ.');
      const stored=await passwordHash(password);
      db.exec('BEGIN IMMEDIATE');
      try{
        const existing=one('SELECT id,role FROM users WHERE email=?',email);
        if(existing&&existing.role!=='admin')throw Error('Không tự nâng quyền tài khoản người dùng.');
        const id=existing?.id??randomUUID();
        if(existing){run('UPDATE users SET password=? WHERE id=?',stored,id);run('DELETE FROM sessions WHERE user_id=?',id);run('DELETE FROM links WHERE user_id=?',id);}
        else run("INSERT INTO users(id,email,password,role,verified,status,expires,created) VALUES(?,?,?,'admin',1,'active',NULL,?)",id,email,stored,Date.now());
        db.exec('COMMIT');return {id,created:!existing};
      }catch(e){db.exec('ROLLBACK');throw e;}
    },close(){db.close();}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const app=createApplication(),host=app.local?'127.0.0.1':process.env.HOST??'0.0.0.0';
  app.server.listen(Number(process.env.PORT??4180),host,()=>console.log(`GDQPAN server: ${process.env.PUBLIC_URL??'http://127.0.0.1:4180'}${app.local?' — email mô phỏng, chưa gửi thật':''}`));
}
