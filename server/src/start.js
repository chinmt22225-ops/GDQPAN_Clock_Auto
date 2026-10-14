import {createApplication} from './server.js';
import {fileURLToPath} from 'node:url';
export async function bootstrapAdmin(app,email,password){
  // Free demo storage can be replaced on restart. Seed only when there is no administrator.
  if(app.db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get())return {created:false};
  if(typeof password!=='string'||password.length<12||password.length>128)throw Error('Cấu hình ADMIN_BOOTSTRAP_PASSWORD 12–128 ký tự trong secret của hosting trước khi mở demo.');
  return app.provisionAdmin(email,password);
}
export async function startConfiguredServer(){
  const local=process.env.LOCAL_MODE==='1';
  const publicUrl=process.env.PUBLIC_URL||process.env.RENDER_EXTERNAL_URL||(local?'http://127.0.0.1:4180':undefined);
  const app=createApplication({publicUrl});
  try{
    if(!local||process.env.ADMIN_BOOTSTRAP_PASSWORD)await bootstrapAdmin(app,process.env.ADMIN_EMAIL||'chinm.t2.2225@gmail.com',process.env.ADMIN_BOOTSTRAP_PASSWORD);
    const port=Number(process.env.PORT||4180),host=local?'127.0.0.1':process.env.HOST||'0.0.0.0';
    await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(port,host,resolve);});
    console.log('GDQPAN account server ready. Email '+(process.env.SMTP_URL&&process.env.MAIL_FROM?'configured.':'not configured; registration unavailable outside local QA.'));
    return app;
  }catch(e){app.close();throw e;}
}
if(process.argv[1]===fileURLToPath(import.meta.url))startConfiguredServer().catch(e=>{console.error(e.message);process.exitCode=1;});
