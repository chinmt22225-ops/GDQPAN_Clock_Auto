import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createApplication} from '../src/server.js';

test('admin command generates credentials without input, rotates existing admin and preserves users/data',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-admin-cli-'));
  const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const app=createApplication({data:dir,local:true});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+app.server.address().port;
  const call=async(route,body,token,method='POST')=>{const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
  const generate=()=>{const stdout=execFileSync(process.execPath,['src/admin.js'],{cwd,env:{...process.env,LOCAL_MODE:'1',DATA_DIR:dir,ADMIN_EMAIL:'cli-admin@example.test'},encoding:'utf8',windowsHide:true,timeout:10000});const password=stdout.match(/Mật khẩu mới: ([A-Za-z0-9_-]{32})/u)?.[1];assert(password,'Command must print a generated password without requesting input.');return password;};
  try{
    const first=generate();const admin=await call('/auth/login',{email:'cli-admin@example.test',password:first});assert.equal(admin.status,200);
    const shared=await call('/shared',null,admin.data.token,'GET');shared.data.savedText='Preserve common data';assert.equal((await call('/shared',shared.data,admin.data.token,'PUT')).status,200);
    await call('/auth/register',{email:'gdqpan-qa-cli-user@gmail.com',password:'User-only-password-123'});const verify=new URL(app.inbox.at(-1).text.match(/http[^\s]+/)[0]).searchParams.get('verify');await call('/auth/verify',{token:verify});await call('/admin/users/'+app.db.prepare('SELECT id FROM users WHERE email=?').get('gdqpan-qa-cli-user@gmail.com').id,{approval:'approved'},admin.data.token,'PATCH');const user=await call('/auth/login',{email:'gdqpan-qa-cli-user@gmail.com',password:'User-only-password-123'});assert.equal(user.status,200);
    await call('/auth/forgot',{email:'cli-admin@example.test'});const reset=new URL(app.inbox.at(-1).text.match(/http[^\s]+/)[0]).searchParams.get('reset');
    const second=generate();assert(first!==second,'Repeated commands must generate different passwords.');
    assert.equal((await call('/auth/login',{email:'cli-admin@example.test',password:first})).status,401);
    assert.equal((await call('/session',null,admin.data.token,'GET')).status,401);
    assert.equal((await call('/auth/reset',{token:reset,password:'Obsolete-reset-password-123'})).status,400);
    const current=await call('/auth/login',{email:'cli-admin@example.test',password:second});assert.equal(current.status,200);assert.equal(current.data.user.id,admin.data.user.id);
    assert.equal((await call('/shared',null,current.data.token,'GET')).data.savedText,'Preserve common data');
    assert.equal((await call('/session',null,user.data.token,'GET')).status,200);
    const stored=app.db.prepare('SELECT password FROM users WHERE email=?').get('cli-admin@example.test');assert(!stored.password.includes(second),'Database must store a hash.');
    await assert.rejects(app.provisionAdmin('gdqpan-qa-cli-user@gmail.com','Do-not-promote-user-123'));
    assert.equal((await call('/session',null,user.data.token,'GET')).data.user.role,'user');
  }finally{await new Promise(r=>app.server.close(r));app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
