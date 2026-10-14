import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApplication,passwordHash} from '../src/server.js';
const password='QA-only-software-password-123';
async function fixture(options={}){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-approval-'));const app=createApplication({data:dir,local:true,...options});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;const call=async(route,body,token,method='POST')=>{const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};};return {dir,app,call,async close(){await new Promise(r=>app.server.close(r));app.close();fs.rmSync(dir,{recursive:true,force:true});}};}
test('new Gmail users need verification AND admin approval; rejection/reset cannot bypass gate',async()=>{const f=await fixture(),{app,call}=f;try{
  await app.createAdmin('qa-admin@example.test',password);const admin=(await call('/auth/login',{email:'qa-admin@example.test',password})).data;
  assert.equal((await call('/auth/register',{email:'no@example.test',password})).status,400);
  const email='gdqpan-qa-approval@gmail.com';assert.equal((await call('/auth/register',{email,password,verified:true,approval:'approved',role:'admin'})).status,200);
  const record=()=>app.db.prepare('SELECT * FROM users WHERE email=?').get(email);assert.equal(record().approval,'pending');assert.equal(record().role,'user');assert.equal(record().verified,0);
  assert.equal((await call('/auth/login',{email,password})).status,403);assert.equal((await call('/admin/users/'+record().id,{approval:'approved'},admin.token,'PATCH')).status,400);
  const link=kind=>new URL(app.inbox.at(-1).text.match(/http[^\s]+/)[0]).searchParams.get(kind);
  assert.equal((await call('/auth/verify',{token:link('verify')})).status,200);const pending=await call('/auth/login',{email,password});assert.equal(pending.status,403);assert.match(pending.data.error,/chờ admin duyệt/);
  await call('/auth/forgot',{email});assert.equal((await call('/auth/reset',{token:link('reset'),password:'QA-new-software-password-456'})).status,200);assert.equal(record().approval,'pending');assert.equal((await call('/auth/login',{email,password:'QA-new-software-password-456'})).status,403);
  assert.equal((await call('/admin/users/'+record().id,{approval:'approved'})).status,401);assert.equal((await call('/admin/users/'+record().id,{approval:'approved'},admin.token,'PATCH')).status,200);
  assert.equal(record().reviewed_by,admin.user.id);assert(record().reviewed_at>0);
  const login=await call('/auth/login',{email,password:'QA-new-software-password-456'});assert.equal(login.status,200);assert.equal(login.data.user.approval,'approved');
  assert.equal((await call('/admin/users/'+record().id,{approval:'approved'},login.data.token,'PATCH')).status,403);
  assert.equal((await call('/admin/users/'+record().id,{approval:'rejected'},admin.token,'PATCH')).status,200);assert.equal((await call('/session',undefined,login.data.token,'GET')).status,401);
  assert.equal((await call('/auth/login',{email,password:'QA-new-software-password-456'})).status,403);
  await call('/auth/register',{email,password});assert.equal(record().approval,'rejected');assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users WHERE email=?').get(email).n,1);
  const logs=await call('/logs',undefined,admin.token,'GET');assert(logs.data.some(l=>l.action==='Duyệt tài khoản'));assert(logs.data.some(l=>l.action==='Từ chối tài khoản'));
  assert.equal(app.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(app.db.prepare('PRAGMA foreign_key_check').all(),[]);
}finally{await f.close();}});
test('migration preserves old non-Gmail accounts and does not approve pending accounts after reopening',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-legacy-approval-'));let app;try{
  const db=new DatabaseSync(path.join(dir,'gdqpan.sqlite'));db.exec("CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',verified INTEGER DEFAULT 0,status TEXT DEFAULT 'active',expires INTEGER,created INTEGER NOT NULL)");db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?,?)').run('legacy','legacy@example.test',await passwordHash(password),'user',1,'active',null,Date.now());db.close();
  app=createApplication({local:true,data:dir});assert.equal(app.db.prepare('SELECT approval FROM users WHERE id=?').get('legacy').approval,'approved');await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'legacy@example.test',password})});assert.equal(login.status,200);
  await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'gdqpan-qa-reopen@gmail.com',password})});await new Promise(r=>app.server.close(r));app.close();app=createApplication({local:true,data:dir});assert.equal(app.db.prepare('SELECT approval FROM users WHERE email=?').get('gdqpan-qa-reopen@gmail.com').approval,'pending');assert.equal(app.db.prepare('SELECT approval FROM users WHERE id=?').get('legacy').approval,'approved');
}finally{app?.close();fs.rmSync(dir,{recursive:true,force:true});}});
test('public demo without email disables registration and recovery honestly, leaving database unchanged',async()=>{const f=await fixture({local:false,publicUrl:'https://demo.example.test',emailEnabled:false});try{const health=await f.call('/health',undefined,undefined,'GET');assert.equal(health.data.emailEnabled,false);for(const route of ['/auth/register','/auth/forgot','/auth/resend']){const result=await f.call(route,{email:'gdqpan-qa-disabled@gmail.com',password});assert.equal(result.status,503);}assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,0);assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM links').get().n,0);}finally{await f.close();}});
