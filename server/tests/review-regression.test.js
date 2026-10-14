import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createApplication} from '../src/server.js';
test('malformed shared data never commits; password reset tokens are consumed atomically; registration is idempotent',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-regression-'));const app=createApplication({local:true,data:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
  const call=async(route,b,token,method='POST')=>{const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:b===undefined?undefined:JSON.stringify(b)});return {status:r.status,data:await r.json()};};
  try{
    await app.createAdmin('regression@example.test','Regression-only-password-123');const admin=(await call('/auth/login',{email:'regression@example.test',password:'Regression-only-password-123'})).data;
    const initial=(await call('/shared',undefined,admin.token,'GET')).data;
    for(const changes of [{settings:'bad'},{schedules:[null]},{customActions:[null]},{files:[null]},{settings:{volume:20}},{settings:{autoPlay:'false'}},{settings:{repeatTimes:1.5}},{disabledActions:[{}]},{extensions:{gdqpan_vtv_config:'{broken'}},{extensions:{gdqpan_vtv_schedules_v1:'[null]'}}]){
      assert.equal((await call('/shared',{...initial,...changes},admin.token,'PUT')).status,400);assert.deepEqual((await call('/shared',undefined,admin.token,'GET')).data,initial);
    }
    assert.equal((await call('/auth/login',null)).status,400);
    assert.equal((await call('/auth/login',{email:"' OR 1=1 --",password:'Injection-only-password-123'})).status,401);
    const userCount=app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    const sqlText="probe'); DELETE FROM users; --";
    assert.equal((await call('/shared',{...initial,schedules:[{id:sqlText,time:'23:58',days:[1],on:false,action:'Báo thức',text:sqlText}]},admin.token,'PUT')).status,200);
    assert.equal((await call('/shared',undefined,admin.token,'GET')).data.schedules[0].id,sqlText);assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,userCount);
    const registrations=await Promise.all(Array.from({length:4},()=>call('/auth/register',{email:'gdqpan-qa-concurrent@gmail.com',password:'Original-only-password-123'})));assert(registrations.every(r=>r.status===200));assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users WHERE email=?').get('gdqpan-qa-concurrent@gmail.com').n,1);assert.equal(app.inbox.length,1);
    const link=()=>new URL(app.inbox.at(-1).text.match(/http[^\s]+/)[0]);await call('/auth/verify',{token:link().searchParams.get('verify')});await call('/admin/users/'+app.db.prepare('SELECT id FROM users WHERE email=?').get('gdqpan-qa-concurrent@gmail.com').id,{approval:'approved'},admin.token,'PATCH');const session=(await call('/auth/login',{email:'gdqpan-qa-concurrent@gmail.com',password:'Original-only-password-123'})).data;
    await call('/auth/forgot',{email:'gdqpan-qa-concurrent@gmail.com'});const reset=link().searchParams.get('reset');
    const passwords=['New-first-password-123','New-second-password-456'];const responses=await Promise.all(passwords.map(password=>call('/auth/reset',{token:reset,password})));assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);
    assert.equal((await call('/auth/login',{email:'gdqpan-qa-concurrent@gmail.com',password:passwords[responses.findIndex(r=>r.status===200)]})).status,200);assert.equal((await call('/session',undefined,session.token,'GET')).status,401);
    assert.equal((await call('/auth/reset',{token:reset,password:'Third-only-password-123'})).status,400);
    let currentPassword=passwords[responses.findIndex(r=>r.status===200)];
    for(let i=0;i<3;i++){
      await call('/auth/forgot',{email:'gdqpan-qa-concurrent@gmail.com'});const next=link().searchParams.get('reset'),newPassword='Next-concurrent-password-'+i+'-123';
      const [changed,oldLogin]=await Promise.all([call('/auth/reset',{token:next,password:newPassword}),call('/auth/login',{email:'gdqpan-qa-concurrent@gmail.com',password:currentPassword})]);assert.equal(changed.status,200);
      if(oldLogin.status===200)assert.equal((await call('/session',undefined,oldLogin.data.token,'GET')).status,401);else assert.equal(oldLogin.status,401);currentPassword=newPassword;
    }
    assert.equal((await call('/auth/forgot',{email:'gdqpan-qa-concurrent@gmail.com'},undefined,'PUT')).status,404);
    assert.equal(app.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(app.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{await new Promise(r=>app.server.close(r));app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
