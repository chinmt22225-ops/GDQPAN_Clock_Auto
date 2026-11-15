import {createApplication} from './server.js';
import {randomBytes} from 'node:crypto';
const app=createApplication();
try{
  const email=(process.env.ADMIN_EMAIL??'chinm.t2.2225@gmail.com').trim().toLowerCase();
  const password=randomBytes(24).toString('base64url');
  const result=await app.provisionAdmin(email,password);
  console.log(result.created?'Đã tạo tài khoản admin.':'Đã thay mật khẩu admin; các phiên admin cũ cần đăng nhập lại.');
  console.log('Email:',email);
  console.log('Mật khẩu mới:',password);
  console.log('Sao chép mật khẩu này để đăng nhập. Mỗi lần chạy npm run admin sẽ sinh mật khẩu mới.');
  console.log('Không chia sẻ mật khẩu hoặc ảnh cửa sổ này. Không gửi email thật.');
}catch{console.error('Không tạo/thay mật khẩu được. Kiểm tra cấu hình máy chủ, quyền ghi dữ liệu và email ADMIN_EMAIL. Email này phải chưa đăng ký hoặc thuộc tài khoản admin.');process.exitCode=1;}
finally{app.close();}
