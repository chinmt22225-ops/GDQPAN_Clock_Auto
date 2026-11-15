// Disposable local audit; records observations without mutating production data.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApplication} from '../src/server.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gdqpan-review-'));
const app=createApplication({local:true,data:dir});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port;
const results={startedAt:new Date().toISOString(),scope:'disposable local backend/database',observations:[]};
const call=async(route,b,token,method='POST')=>{const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:b===undefined?undefined:JSON.stringify(b)});return {status:r.status,data:await r.json()};};
try{
  await app.createAdmin('probe@example.test','Probe-password-only-123');
  const login=await call('/auth/login',{email:'probe@example.test',password:'Probe-password-only-123'});const token=login.data.token;
  const initial=(await call('/shared',undefined,token,'GET')).data;
  for(const [name,change]of [['settings string',{settings:'invalid'}],['null schedule',{schedules:[null]}],['null custom action',{customActions:[null]}],['null file',{files:[null]}],['invalid volume',{settings:{volume:20,autoPlay:'false'}}],['null VTV schedule',{extensions:{gdqpan_vtv_schedules_v1:'[null]'}}],['broken VTV JSON',{extensions:{gdqpan_vtv_config:'{broken'}}]]){
    const snapshot=(await call('/shared',undefined,token,'GET')).data;
    const response=await call('/shared',{...snapshot,...change},token,'PUT');
    results.observations.push({name,status:response.status,error:response.data.error,accepted:response.status===200});
    if(response.status===200)await call('/shared',{...initial,revision:response.data.revision},token,'PUT');
  }
  const register=await Promise.all([call('/auth/register',{email:'gdqpan-qa-concurrent@gmail.com',password:'Initial-password-only-123'}),call('/auth/register',{email:'gdqpan-qa-concurrent@gmail.com',password:'Initial-password-only-123'})]);
  results.observations.push({name:'Concurrent registration',statuses:register.map(r=>r.status),users:app.db.prepare('SELECT COUNT(*) AS n FROM users WHERE email=?').get('gdqpan-qa-concurrent@gmail.com').n});
  const verify=new URL(app.inbox.find(m=>m.to==='gdqpan-qa-concurrent@gmail.com').text.match(/http[^\s]+/)[0]).searchParams.get('verify');await call('/auth/verify',{token:verify});
  await call('/auth/forgot',{email:'gdqpan-qa-concurrent@gmail.com'});
  const reset=new URL(app.inbox.at(-1).text.match(/http[^\s]+/)[0]).searchParams.get('reset');
  const resets=await Promise.all([call('/auth/reset',{token:reset,password:'Reset-password-one-123'}),call('/auth/reset',{token:reset,password:'Reset-password-two-456'})]);
  results.observations.push({name:'Concurrent use of same reset token',statuses:resets.map(r=>r.status)});
  let currentPassword=resets[0].status===200?'Reset-password-one-123':'Reset-password-two-456';
  for(let iteration=0;iteration<3;iteration++){
    await call('/auth/forgot',{email:'gdqpan-qa-concurrent@gmail.com'});const link=new URL(app.inbox.at(-1).text.match(/http[^\s]+/)[0]).searchParams.get('reset');const nextPassword='Concurrent-next-password-'+iteration+'-123';
    const [changed,oldLogin]=await Promise.all([call('/auth/reset',{token:link,password:nextPassword}),call('/auth/login',{email:'gdqpan-qa-concurrent@gmail.com',password:currentPassword})]);
    const acceptedAfterReset=oldLogin.status===200?(await call('/session',undefined,oldLogin.data.token,'GET')).status:null;
    results.observations.push({name:'Old password login racing reset',iteration,resetStatus:changed.status,loginStatus:oldLogin.status,sessionStatusAfterReset:acceptedAfterReset});currentPassword=nextPassword;
  }
  const methods=await call('/auth/forgot',{email:'gdqpan-qa-concurrent@gmail.com'},undefined,'PUT');results.observations.push({name:'Forgot endpoint accepts PUT',status:methods.status});
  results.database={integrity:app.db.prepare('PRAGMA integrity_check').all(),foreignKeys:app.db.prepare('PRAGMA foreign_key_check').all()};
}finally{
  results.endedAt=new Date().toISOString();fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/backend-review-'+(process.env.GDQ_REVIEW_PHASE||'before')+'.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
  await new Promise(r=>app.server.close(r));app.close();fs.rmSync(dir,{recursive:true,force:true});
}
