# PROMPT CHO AGENT: GHÉP ÂM THANH TRONG LÚC NÓI (MỤC "THÔNG BÁO KHÁC & PHÒNG THU")

> **Phiên bản 2** (đã cập nhật theo trả lời mới nhất của người dùng).
> Dán toàn bộ nội dung dưới dòng kẻ này vào agent (Claude Code / Cursor / ...). Đặt agent làm việc trong thư mục gốc của repo `GDQPAN_Clock_Auto`.
> Các mục **[CẦN HỎI]** là chỗ khách hàng chưa quyết: agent phải **hỏi người dùng** trước khi code, **không tự chọn**.

---

## 1. VAI TRÒ & BỐI CẢNH

Bạn là kỹ sư phần mềm full-stack giàu kinh nghiệm (Electron, HTML/CSS/JS, Web Audio API). Bạn đang cập nhật **Hệ Thống Thông Báo Tự Động** của Trung tâm GDQP-AN ĐHQG-HCM (repo `chinmt22225-ops/GDQPAN_Clock_Auto`). Người dùng cuối là **thầy cô trực ban, không rành kỹ thuật**.

Thông tin nền, lấy từ file giao diện desktop `HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html` do người dùng cung cấp (**hãy tự đọc code để xác minh, số dòng có thể lệch**):

- ⚠️ **File rất lớn** (~11.300 dòng, ~1,6 MB) và có **vài dòng cực dài chứa dữ liệu nhúng (base64)**. **Không in cả file ra màn hình.** Dùng `grep -n`, `sed -n 'a,bp'` kèm `cut -c1-200` để đọc từng đoạn.
- Mục giao diện: `<section class="panel">` có tiêu đề **"THÔNG BÁO KHÁC & PHÒNG THU"** (khoảng dòng 2849), gồm **3 tab**, chuyển bằng `switchNoticeTab(...)`:
  1. **📝 Đọc Văn Bản** (`tab-pane-tts`): ô nhập `tts-input-desktop`, chọn giọng `voice-select-desktop`, tốc độ `rate-select-desktop`, lặp `tts-repeat-select` (1/2/3 lần hoặc liên tục), trạng thái dịch vụ AI, nút `▶ PHÁT NGAY` (`handleSpeakText('desktop')`), `💾 LƯU`, `🗑 XÓA`, `⚙ GÁN AI / LỊCH`. Hỗ trợ giọng AI cục bộ ("Phòng Thu AI") với dự phòng Web Speech (`speechSynthesis` / `SpeechSynthesisUtterance`).
  2. **🎙 Tự Thu Âm** (`tab-pane-record`): `handleToggleRecord()`, thước đo mic, `MediaRecorder` (ưu tiên webm/opus), phát lại `handlePlayRecorded()`, lưu `.wav` `handleSaveRecorded()`, gán `handleAssignRecorded()`, chọn lặp `record-repeat-select`.
  3. **🔗 Ghép Âm Thanh** (`tab-pane-merge`), 3 bước: (1) đoạn mở đầu (chuông hiệu/còi/quốc ca hoặc tệp riêng); (2) hàng đợi nội dung chính (tệp từ máy / bản tự thu âm / TTS) với `handleAddMergeQueueItem()`; (3) **nhạc nền** (`merge-bg-check`, `merge-bg-select` có "Nhạc truyền thống Trung tâm" hoặc tệp riêng qua `handleMergeBgFile`), lặp, `handlePlayMerged()` và `handleExportMergedWav()`.
- Logic ghép hiện có nằm ở hàm `mergeAudioTracks({ introSource, bodySource(s), bgMusicSource, bgVolume = 0.15, pauseGap = 0.4 })` (khoảng dòng 5041): dùng `OfflineAudioContext`, xếp intro → khoảng nghỉ → các đoạn nội dung nối tiếp, rồi **trộn nhạc nền lặp (`loop = true`) ở mức cố định 15%** (nhãn giao diện ghi "Ducking 15%" nhưng thực chất là âm lượng cố định, có fade vào/ra), xuất qua `audioBufferToWav`.
- Phong cách giao diện: nghiêm túc, quân đội (xanh đậm, đỏ, vàng), tinh gọn, đã co giãn theo nhiều cỡ màn hình. **Header giữ nguyên.**
- Còn có các chức năng khác phải giữ nguyên: phát nhạc, lịch phát tự động, báo giờ nề nếp, chế độ Thông tin thời sự (popup, ô dán link, trích luồng bằng công cụ như yt-dlp), gán âm thanh vào hiệu lệnh/lịch.

## 2. NGUYÊN TẮC LÀM VIỆC (BẮT BUỘC)

1. **Đọc code trước**, tóm tắt cách hoạt động hiện tại của 3 tab (tối đa ~15 dòng) trước khi sửa.
2. **Hỏi, không tự quyết.** Với mọi mục **[CẦN HỎI]** (mục 5) và bất kỳ điểm mơ hồ nào, hãy hỏi người dùng (gom thành danh sách ngắn kèm phương án). Chỉ code sau khi có câu trả lời. Không "chọn mặc định hợp lý" thay họ.
3. **Phạm vi nghiêm ngặt:** chỉ làm đúng mục 3 và 4. **Chỉ sửa bản desktop** (`HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html` và phần Electron liên quan nếu thực sự cần), **không sửa bản mobile và không sửa thư mục `repository/`**. Không sửa header, bảng màu, các mục khác; không refactor lan man.
4. **Không làm hỏng cái đang chạy:** đọc văn bản (TTS), thu âm, ghép/xuất `.wav`, gán vào lịch/hiệu lệnh, lặp, phát nhạc, lịch tự động, thời sự phải hoạt động y như trước khi người dùng không bật tính năng mới.
5. **Thân thiện với người không rành kỹ thuật:** nhãn tiếng Việt đơn giản, nút lớn, ít bước, có thông báo rõ ràng. Không bắt sửa file cấu hình.
6. **Làm theo mẫu code hiện có** (cách đặt tên, cách lưu cấu hình, cách gọi IPC), không dựng cơ chế song song nếu không cần.
7. **Kiểm thử và báo cáo** theo mục 6, 7.

## 3. CÁC QUYẾT ĐỊNH ĐÃ CHỐT (KHÔNG HỎI LẠI)

| # | Nội dung | Quyết định của người dùng |
|---|---|---|
| D1 | Phạm vi | Làm ở **cả 3 tab**: Đọc Văn Bản, Tự Thu Âm, Ghép Âm Thanh |
| D2 | Loại âm thanh ghép vào giọng nói | **Nhạc, podcast, âm thanh nền** (âm thanh dài). **Không** phải hiệu ứng ngắn (còi, chuông) chèn đúng thời điểm |
| D3 | **Điều khiển âm lượng** | **Thủ công, cho CẢ HAI PHÍA:** có thanh chỉnh riêng cho **giọng nói** và cho **âm thanh nền**, để người dùng tùy ý muốn bên nào to hơn. **Không** làm tự động hạ nhỏ (auto-ducking) |
| D4 | Nguồn âm thanh nền | **Tất cả các loại, để phần mềm linh hoạt:** (i) thư viện có sẵn trong thư mục `Sound/`; (ii) tệp tải từ máy (.mp3/.wav/.m4a...); (iii) podcast/nhạc qua đường link; (iv) có thể dùng kết hợp |
| D5 | Khi đọc xong, nền xử lý thế nào | **Thủ công, do người dùng điều khiển tùy ý** (không tự quyết thay) |
| D6 | Thiết bị nghe | Thường dùng **tai nghe**, **cũng có thể dùng loa ngoài** → phải hỗ trợ cả hai, đặc biệt ở tab Tự Thu Âm |
| D7 | Gán vào lịch/hiệu lệnh (`⚙ GÁN AI / LỊCH`, gán bản thu) | **Có kèm nhạc nền** và các mức âm lượng đã chọn |
| D8 | Nền tảng | **Chỉ bản desktop** |

## 4. YÊU CẦU

### 4.1. Yêu cầu chung (cả 3 tab)
- Khu điều khiển âm thanh nền **thống nhất giữa 3 tab** (cùng kiểu điều khiển, cùng tên gọi), tận dụng thành phần có sẵn của bước 3 tab Ghép Âm Thanh nếu phù hợp.
- Có **hai thanh âm lượng độc lập, thủ công**: **Giọng nói** và **Âm thanh nền**. Người dùng kéo bên nào cũng được, kể cả **trong lúc đang phát hoặc đang thu**, có hiệu lực ngay. Hiển thị rõ nhãn và phần trăm hiện tại của mỗi thanh.
- Phải có **cách bảo vệ khỏi méo tiếng (clipping)** khi cả hai thanh cùng kéo cao (ví dụ ràng buộc tổng hoặc bộ giới hạn). Cách làm là [CẦN HỎI] A6; **không** tự hạ âm lượng người dùng đã chọn nếu chưa được duyệt.
- Nguồn nền nhận cả **thư viện `Sound/`**, **tệp từ máy** và **đường link podcast/nhạc** (D4). Với link, agent phải **đọc cách chế độ Thông tin thời sự đang lấy luồng từ link** để tái sử dụng và nêu rõ định dạng link nào hỗ trợ/không hỗ trợ, báo lỗi thân thiện khi không phát được.
- Điều khiển nền dùng chung cần có: bật/tắt nền, chọn nguồn, thanh âm lượng nền, nút **dừng nền thủ công** (D5).

### 4.2. Tab "Đọc Văn Bản"
- Khi bấm **PHÁT NGAY**, giọng đọc AI/TTS đọc nội dung **đồng thời** với âm thanh nền đã chọn.
- Thanh **Giọng nói** điều khiển âm lượng giọng đọc; thanh **Nền** điều khiển âm thanh nền; cả hai chỉnh được khi đang phát.
- Sau khi đọc xong: **không tự quyết** số phận của nền; theo D5 người dùng **tự điều khiển** (ví dụ nền vẫn phát cho đến khi bấm dừng hoặc theo một lựa chọn do người dùng đặt). Agent hỏi chi tiết ở B1.
- Tương thích các chế độ hiện có: giọng AI cục bộ, dự phòng Web Speech, tốc độ đọc, **lặp 1/2/3 lần hoặc liên tục**, dừng/tạm dừng, và `⚙ GÁN AI / LỊCH` (**phải lưu kèm nền và hai mức âm lượng**, D7).
- Lưu ý kỹ thuật cần agent kiểm tra: đầu ra của `speechSynthesis` (Web Speech) **thường không thể thu/trộn vào Web Audio**, nên với chế độ dự phòng này chỉ phát **đồng thời** (nhạc nền một luồng, giọng đọc một luồng; âm lượng giọng chỉnh bằng `utterance.volume`), không xuất được file trộn. Với giọng AI cục bộ (nếu trả về âm thanh) có thể trộn được. Nêu rõ giới hạn cho người dùng và đề xuất cách xử lý khi gán vào lịch, **không tự quyết**.

### 4.3. Tab "Tự Thu Âm"
- Thầy cô **vừa nói vào mic vừa phát nền**, và bản thu lưu ra là **một bản đã trộn** (giọng + nền), nghe lại/lưu/gán được như bản thu hiện nay (gán **kèm nền**, D7).
- Thanh **Giọng nói** ở tab này là **mức thu của mic (độ nhạy/gain)** và thanh **Nền** là mức nền trong bản trộn; cả hai chỉnh được **khi đang thu**, bản thu phản ánh đúng. Thước đo mic vẫn hoạt động.
- **Hỗ trợ cả tai nghe lẫn loa ngoài (D6):**
  - Bản thu phải ghi nền bằng cách **trộn trực tiếp ở mức âm thanh số**, **không phụ thuộc loa phát ra rồi mic thu lại**.
  - Khi dùng **loa ngoài**, mic có thể thu lại tiếng từ loa (vang, hú). Agent phải đề xuất cách giảm (ví dụ bật khử vang của mic, cảnh báo/nhắc đeo tai nghe, chế độ "tai nghe/loa ngoài" do người dùng chọn). Không tự quyết cách làm, hỏi ở C1.
- Có **nghe thử nền** trước khi thu để chỉnh âm lượng (A4).

### 4.4. Tab "Ghép Âm Thanh"
- Bước 3 (**nhạc nền & xuất bản**): nguồn nền nhận nhạc/podcast/âm nền theo D4, **hai thanh âm lượng thủ công** (giọng/nội dung chính và nền) thay cho mức cố định 15%.
- Nhãn "Chèn nhạc nền nhẹ (Ducking 15%)" hiện **không đúng thực tế** → đổi nhãn cho đúng chức năng mới, sau khi người dùng duyệt nội dung nhãn (D3 trong nhóm hỏi).
- Bản ghép (nghe thử và `⬇ XUẤT .WAV`) phản ánh đúng **cả hai mức âm lượng** đã chọn. Xử lý đúng khi nền ngắn hơn/dài hơn phần giọng (hỏi ở nhóm D).
- Giữ nguyên cấu trúc 3 bước, hàng đợi, đoạn mở đầu, khoảng nghỉ, tùy chọn lặp hiện có.

## 5. CÁC ĐIỂM [CẦN HỎI] CÒN LẠI (HỎI NGƯỜI DÙNG TRƯỚC KHI CODE)

Đã chốt ở mục 3 thì **không hỏi lại**. Hỏi kèm phương án gợi ý (người dùng chọn, **bạn không tự chọn**). Có thể gộp hoặc bỏ câu nếu đọc code thấy đã có quy ước sẵn, nhưng nếu bỏ phải nói rõ lý do.

**Nhóm A: Âm lượng & nguồn nền (dùng chung)**
- **A1.** Khoảng điều chỉnh của **hai thanh** (0-100%? có cho vượt 100% không?), **giá trị mặc định** của giọng nói và của nền là bao nhiêu, và có **ghi nhớ lần chọn gần nhất** không?
- **A2.** Có cho lưu **danh sách nhạc nền yêu thích** để chọn nhanh, hay chọn lại tệp/link mỗi lần?
- **A3.** Với **link podcast/nhạc** (D4): hỗ trợ nguồn nào (YouTube, trang web, tệp mp3 trực tiếp...)? Phát trực tuyến hay tải về tạm? Có cần dùng lại cơ chế của chế độ thời sự không? Máy trực ban có thể **mất mạng**, cần hành vi dự phòng nào?
- **A4.** Có cần **nút nghe thử riêng** nhạc nền (không giọng) để chỉnh trước khi phát/thu không?
- **A5.** Khi giọng nói bắt đầu/kết thúc, nền có cần **tăng/giảm dần (fade)** cho êm không? (Không phải auto-ducking.) Thời lượng fade mong muốn?
- **A6.** **Chống méo tiếng** khi hai thanh cùng cao: cảnh báo trên giao diện, giới hạn tổng, hay bộ giới hạn âm tự động (không đổi mức người dùng đặt)?

**Nhóm B: Tab Đọc Văn Bản**
- **B1.** Theo D5 (nền do người dùng tự điều khiển): cụ thể sau khi đọc xong, **mặc định** nền (i) tiếp tục phát cho đến khi bấm dừng, (ii) dừng ngay, hay (iii) có công tắc để người dùng chọn mỗi lần? Có **nút dừng nền riêng** ngay trong tab không?
- **B2.** Khi **lặp nhiều lần/liên tục**: nền chạy **liền mạch suốt các lần lặp** hay **bắt đầu lại mỗi lần**?
- **B3.** Nếu nền là podcast/tệp dài hơn nhiều so với lời đọc: có **giới hạn thời lượng** hoặc **tự dừng** theo lời đọc không (đối chiếu với D5)?
- **B4.** Khi **gán vào lịch/hiệu lệnh có kèm nền** (D7) mà giọng đang dùng là Web Speech (không trộn được): xử lý thế nào (ví dụ phát đồng thời lúc đến giờ, hoặc chỉ cho gán khi dùng giọng AI cục bộ)?

**Nhóm C: Tab Tự Thu Âm**
- **C1.** Cách xử lý **loa ngoài** (D6): bật khử vang tự động, cảnh báo đeo tai nghe, hay nút chọn "Đang dùng: tai nghe / loa ngoài" (kèm hành vi khác nhau)?
- **C2.** Có cần cho **nghe lại giọng mình (giám sát mic)** khi đang thu không? (Dễ gây hú nếu dùng loa.)
- **C3.** Có cho **tạm dừng/tiếp tục** khi đang thu, hay chỉ bắt đầu/dừng như hiện nay?
- **C4.** Bản lưu: **chỉ một file đã trộn**, hay thêm lựa chọn lưu **riêng giọng** và **riêng nền** để chỉnh lại sau?

**Nhóm D: Tab Ghép Âm Thanh**
- **D1.** Nếu nền **ngắn hơn** phần giọng: lặp lại hay dừng? Nếu **dài hơn**: cắt đúng độ dài giọng (có fade cuối) hay giữ nguyên?
- **D2.** Có cho chọn **điểm bắt đầu của nền** (ví dụ cắt từ phút thứ N của podcast) hay luôn phát từ đầu?
- **D3.** Nội dung nhãn hiển thị sau khi bỏ chữ "Ducking 15%": bạn đề xuất sau khi đọc code, người dùng duyệt.

**Nhóm E: Chung**
- **E1.** Có cần cập nhật **tài liệu hướng dẫn sử dụng** (`.docx`, do `build_huong_dan_su_dung.py` sinh ra) và README không?
- **E2.** Có cần **đóng gói lại bản phát hành** sau khi sửa xong, hay chỉ cung cấp mã nguồn?
- **E3.** Văn bản thông báo/lỗi hiển thị cho thầy cô (câu chữ tiếng Việt): bạn đề xuất, người dùng có muốn duyệt trước không?

## 6. TIÊU CHÍ NGHIỆM THU & KỊCH BẢN KIỂM THỬ

Tự kiểm thử và báo từng mục (đạt/không đạt/không kiểm được vì sao). Kiểm thử cả với **tai nghe** và **loa ngoài**.

**Điều khiển âm lượng (chung)**
1. Hai thanh **Giọng nói** và **Nền** hoạt động **độc lập**: kéo thanh này không làm đổi thanh kia.
2. Kéo bất kỳ thanh nào **khi đang phát/đang thu**: có hiệu lực ngay, không đứt tiếng, không tiếng "lạch cạch".
3. Đặt nền to hơn giọng và ngược lại: nghe đúng ý; kéo cả hai lên cao: không méo tiếng (theo A6).
4. Giá trị ghi nhớ/mặc định đúng theo câu trả lời A1.

**Tab Đọc Văn Bản**
5. Bật nền, bấm PHÁT NGAY: **giọng đọc và nền cùng lúc**, chỉnh được từng bên.
6. Đổi nguồn nền: thư viện `Sound/`, tệp từ máy, link podcast/nhạc: phát đúng nguồn; link lỗi/mất mạng báo thân thiện, không treo.
7. Lặp 2/3 lần và liên tục: nền đúng theo B2; dừng/tạm dừng dừng **cả giọng lẫn nền** (hoặc đúng theo B1).
8. Đọc xong: nền xử lý đúng theo B1/D5 và người dùng dừng được bằng tay.
9. Cả giọng AI cục bộ lẫn Web Speech: hoạt động đúng, giới hạn hiển thị rõ nếu có.
10. Gán vào lịch/hiệu lệnh **kèm nền và hai mức âm lượng**; đến giờ chạy đúng, không mất báo thức/nề nếp khác.
11. Tắt nền: đọc văn bản **y như trước**.

**Tab Tự Thu Âm**
12. Vừa nói vừa phát nền, dừng thu: nghe lại có **cả giọng và nền**, đúng mức hai thanh đã chọn.
13. **Dùng tai nghe**: bản thu sạch, không vang/hú.
14. **Dùng loa ngoài**: bản thu không bị nền "thu qua mic" làm vang; cảnh báo/khử vang hoạt động theo C1.
15. Chỉnh hai thanh khi đang thu: bản thu phản ánh đúng; thước đo mic hoạt động.
16. Lưu `.wav`, phát lại, **gán kèm nền**, xóa: hoạt động đúng (D7).
17. Mic bị từ chối quyền/không có mic/nguồn nền lỗi: báo thân thiện, không treo.
18. Không dùng nền: thu âm **y như trước**.

**Tab Ghép Âm Thanh**
19. Ghép intro + hàng đợi + nền, nghe thử: đúng thứ tự và đúng hai mức âm lượng.
20. `⬇ XUẤT .WAV`: file có đủ giọng + nền, đúng mức, không méo/clipping.
21. Nền ngắn/dài hơn giọng: đúng theo D1/D2.
22. Không bật nền: ghép/xuất **y như trước**.

**Hồi quy (không được hỏng)**
23. Phát nhạc, lịch hẹn giờ, báo giờ nề nếp, chế độ thời sự (popup), gán hiệu lệnh, header, bố cục co giãn trên các cỡ màn hình.
24. Không có lỗi trong console; không rò rỉ `AudioContext`/luồng mic (bật/tắt nhiều lần vẫn ổn).
25. Âm thanh không đứt/giật khi chuyển tab trong mục này hoặc khi có âm thanh khác (lịch tự động, báo thức) chen vào, theo đúng ưu tiên hiện có.

## 7. CÁCH LÀM VÀ CÁCH BÁO CÁO

1. **Bước 0:** đọc code, tóm tắt hiện trạng 3 tab (tối đa ~15 dòng).
2. **Bước 1:** gửi **danh sách câu hỏi mục 5** (kèm phương án), chờ người dùng trả lời.
3. **Bước 2:** đề xuất **kế hoạch ngắn** (file/hàm sẽ sửa, cách trộn âm và điều khiển hai mức âm lượng trong từng tab, cách xử lý loa ngoài, cách lưu thiết lập, giới hạn của Web Speech) để người dùng duyệt nếu thay đổi lớn.
4. **Bước 3:** triển khai từng phần nhỏ (gợi ý: tab Ghép Âm Thanh → tab Tự Thu Âm → tab Đọc Văn Bản, hoặc theo đề xuất của bạn), commit rõ ràng.
5. **Bước 4:** chạy kiểm thử mục 6, sửa lỗi.
6. **Báo cáo cuối:** (a) file đã sửa/thêm và lý do; (b) quyết định đã áp dụng theo trả lời của người dùng; (c) kết quả từng kịch bản kiểm thử; (d) hạn chế còn lại (đặc biệt giới hạn của Web Speech và loa ngoài); (e) hướng dẫn ngắn cho thầy cô cách dùng tính năng mới bằng tiếng Việt đơn giản.

**Nhắc lại:** không tự quyết điểm [CẦN HỎI]; có **hai thanh âm lượng thủ công** (giọng và nền), **không** auto-ducking; **không** hiệu ứng chèn đúng thời điểm; **chỉ bản desktop**; không đổi header và phong cách; không làm hỏng chức năng đang chạy.
