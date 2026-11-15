# Ngân sách dự trù hệ thống tài khoản và quản trị GDQPAN

Ngày tổng hợp: 10/10/2026. Phục vụ trao đổi trong nhóm, không phải báo giá cam kết hoặc xác nhận mua dịch vụ.

## Phạm vi

Tối đa 100 tài khoản/thiết bị mobile và desktop; một bộ dữ liệu chung do admin chỉnh sửa, tổng tệp âm thanh 2–3 GB. Hệ thống gồm đăng ký/đăng nhập, email xác minh/đặt lại mật khẩu, đồng bộ lịch/cài đặt/nội dung/tệp, nhật ký, trang quản trị tài khoản/thiết bị/thời hạn/phiên bản/thông báo. Trước mỗi lần phát lịch cần máy chủ xác nhận tài khoản hợp lệ.

Chưa chọn nhà cung cấp, mua tên miền hoặc thuê máy chủ. Người dùng sẽ thống nhất chi phí với nhóm sau.

## Hai mức cấu hình để so sánh

Giá VPS tham khảo DigitalOcean Basic Regular, không phải lựa chọn đã được phê duyệt. Đây là cấu hình xuất phát để thử tải, không là cam kết đáp ứng 100 thiết bị cùng lúc. Quy mô tài khoản không đồng nghĩa toàn bộ cùng kết nối/phát/tải âm thanh tại một thời điểm.

| Khoản | Phương án khởi đầu | Phương án có thêm RAM |
| --- | ---: | ---: |
| VPS | 1 vCPU, 2 GiB RAM, 50 GiB SSD | 2 vCPU, 4 GiB RAM, 80 GiB SSD |
| VPS mỗi tháng | 12 USD | 24 USD |
| Backup tuần, 20% giá VPS | 2,40 USD | 4,80 USD |
| Email giao dịch nếu trong hạn mức miễn phí | 0 USD | 0 USD |
| VPS + backup + email mỗi tháng | **14,40 USD** | **28,80 USD** |
| VPS + backup + email mỗi năm | **172,80 USD** | **345,60 USD** |
| Khoản dự trù tên miền/năm | 10–20 USD | 10–20 USD |
| Tổng cơ sở mỗi năm, gồm khoản dự trù tên miền | **182,80–192,80 USD** | **355,60–365,60 USD** |

Tên miền 10–20 USD/năm là khoản dự trù do người lập ước tính, chưa là giá của một tên/đuôi miền cụ thể; chưa chọn .com/.vn. Kiểm tra giá mua và gia hạn trước khi duyệt. Bảng chưa gồm thuế, chênh lệch tỷ giá, phí thanh toán, nhân sự vận hành hay phí lập trình/bảo trì.

Nguồn giá: [VPS DigitalOcean](https://www.digitalocean.com/pricing/droplets), [backup DigitalOcean](https://www.digitalocean.com/pricing/backups).

## Email, HTTPS và lưu trữ

Resend là một lựa chọn tham khảo cho email giao dịch: miễn phí 3.000 email/tháng, tối đa 100 email/ngày. Nếu 100 người cùng đăng ký trong một ngày, gửi lại xác minh và quên mật khẩu có thể làm vượt hạn mức ngày. Gói Pro tham khảo là 20 USD/tháng cho 50.000 email/tháng; chỉ cộng vào ngân sách nếu chọn gói trả phí. Không cần mặc định mua gói Pro cho 100 tài khoản. [Bảng giá Resend](https://resend.com/pricing).

Email admin dùng đăng nhập vẫn là chinm.t2.2225@gmail.com. Với Resend, tên miền gửi email cần được xác minh; địa chỉ admin Gmail không thay thế cho tên miền gửi của hệ thống. [Yêu cầu xác minh tên miền gửi](https://resend.com/docs/dashboard/domains/introduction).

Chứng chỉ HTTPS có thể dùng Let's Encrypt miễn phí; không cần mặc định mua chứng chỉ SSL trả phí. [Let's Encrypt](https://letsencrypt.org/about/).

Âm thanh chung 3 GB có thể nằm trên ổ VPS 50 GB ban đầu, chưa cần mua một ổ/dịch vụ lưu trữ riêng chỉ vì có tệp âm thanh. Cần chừa chỗ cho hệ điều hành, cơ sở dữ liệu, nhật ký, bản cập nhật và tệp tạm. Khi triển khai phải theo dõi dung lượng và thiết lập vòng đời nhật ký/tệp; chưa chốt thời gian lưu nhật ký.

Giả sử 100 thiết bị tải toàn bộ 3 GB một lần, lưu lượng tải ra khoảng 300 GB; đây là phép tính minh họa, không phải dự báo hàng tháng. Gói VPS 12 USD tham khảo có 2.000 GiB transfer. Tải lại thường xuyên, phát trực tiếp từ máy chủ hoặc phát hành APK/desktop lớn sẽ làm tăng lưu lượng; kiểm tra hạn mức và phí vượt trước khi mua. [Thông số transfer của VPS](https://www.digitalocean.com/pricing/droplets).

## Ngân sách nên trình nhóm

- **Khởi đầu: dự trù 15–20 USD/tháng**, phù hợp để thử nghiệm cấu hình 2 GiB và email miễn phí; tên miền thanh toán riêng mỗi năm. Chỉ chốt cấu hình sau kiểm thử tải.
- **Có thêm RAM: dự trù 30–35 USD/tháng**, dùng cấu hình 4 GiB, email vẫn trong gói miễn phí; tên miền thanh toán riêng mỗi năm.
- Nếu cần email Pro, **cộng thêm 20 USD/tháng**; đây là khoản có điều kiện.
- Backup ngày thay backup tuần: 30% thay 20% giá VPS, tương ứng tổng VPS + backup là 15,60 USD/tháng hoặc 31,20 USD/tháng; chưa được chọn. [Giá backup theo tần suất](https://www.digitalocean.com/pricing/backups).

Các khoảng 15–20 và 30–35 USD là dự trù, không phải giá dịch vụ cố định hoặc đảm bảo đủ cho mọi lưu lượng. Phí lập trình/bảo trì, AI đọc văn bản trả phí nếu có, bản quyền dịch vụ bên ngoài, thuế và phí vượt hạn mức chưa nằm trong tổng này. Chưa có đủ căn cứ để báo giá các khoản đó.

## Việc còn lại trước khi mua

Chốt nhà cung cấp/vị trí máy chủ, tên miền, cách gửi email, người sở hữu tài khoản thanh toán và ngân sách được nhóm duyệt. Kiểm thử đăng nhập, quyền admin/user, đồng bộ âm thanh, khóa/hết hạn và phát lịch khi khóa màn hình trên môi trường local trước. Vì quy tắc luôn online đã được chốt, máy chủ hoặc Internet không sẵn sàng sẽ khiến lịch bị bỏ qua; một VPS đơn lẻ không tạo thành hệ thống dự phòng nhiều máy chủ.
