"""Create review-only source snapshots; never build installers or include secrets."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'source-review' / '2026-10-15'
OUT.mkdir(parents=True, exist_ok=True)
CORE = [
    'main.js', 'preload.js', 'desktop-security.cjs', 'fetch-page.cjs',
    'tts_server.js', 'tts_service.py', 'chay_dich_vu_giong_doc.bat',
    'package.json', 'package-lock.json', 'manifest.json', 'sw.js',
    'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html',
    'HE_THONG_THONG_BAO_TU_DONG_MOBILE.html', 'mobile-prototype.html',
    'vtv_player.html', 'BAO_CAO_DON_GIAN_TAI_KHOAN_2026-10-15.md',
    'BAO_CAO_BANNER_2026-10-15.md', 'NHAT_KY_CAP_NHAT.md',
]
SKIP_DIRS = {'node_modules', '.git', '.gradle', '.idea', 'build', 'data',
             '__pycache__', '.build-tools', 'qa', 'Sound'}
SKIP_SUFFIX = {'.apk', '.aab', '.exe', '.jks', '.keystore', '.pyc', '.p12', '.pem'}

def allowed(path):
    parts = path.relative_to(ROOT).parts
    return (not any(x in SKIP_DIRS for x in parts)
            and path.suffix.lower() not in SKIP_SUFFIX
            and not path.name.startswith('.env')
            and path.name not in {'local.properties', 'key.properties', 'keystore.properties'}
            and '.bak' not in path.name and '.backup' not in path.name
            and 'before-desktop' not in path.name
            and 'android/app/src/main/assets/public/' not in path.relative_to(ROOT).as_posix())

def digest(data):
    return hashlib.sha256(data).hexdigest()

summary = []
for target in ['Windows', 'Android']:
    files = {ROOT / name for name in CORE}
    for directory in ['assets', 'config', 'scripts', 'server', 'mobile']:
        for p in (ROOT / directory).rglob('*'):
            if not p.is_file() or not allowed(p):
                continue
            rel = p.relative_to(ROOT).as_posix()
            # Windows includes the web preview and QA dependencies; Android also includes Java/Gradle.
            if target == 'Windows' and rel.startswith('mobile/android/'):
                continue
            files.add(p)
    for rel in ['qa/audio-audit.json', 'qa/ui-review-account-settings.json',
                'qa/windows-source-review-after.json']:
        files.add(ROOT / rel)
    files.update(p for p in (ROOT / 'qa/account-simplified-2026-10-15').iterdir()
                 if p.is_file() and p.suffix in {'.html', '.png', '.json', '.log'})
    paths = sorted(files, key=lambda p: p.relative_to(ROOT).as_posix())
    for p in paths:
        if not p.is_file():
            raise FileNotFoundError(p)
    native = ('Mã Java: mobile/android/app/src/main/java/vn/gdqpan/app/. '
              'Dự án Android: mobile/android/. Mở bằng Android Studio sau khi cài dependency '
              'và cấu hình Android SDK/JDK của máy bạn.' if target == 'Android' else
              'Điểm vào Electron: main.js, cầu nối preload.js, giao diện HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html. '
              'Gói Windows không chứa dự án Java/Gradle Android; mobile/www có bản xem thử web và dependency QA.')
    readme = f'''# Mã nguồn {target} để kiểm tra — 15/10/2026

Đây là bản chụp mã nguồn đang sửa, CHƯA phát hành chính thức. Không có bộ cài mới.
package.json Windows vẫn 1.4.4, mobile/package.json vẫn 1.4.5; không coi đây là phiên bản phát hành mới.

## Đọc mã và xem giao diện

{native}
Phần dùng chung: assets/account.js, assets/account.css, assets/runtime.js.
Backend: server/src/server.js. Giao diện admin riêng: server/public/.
Báo cáo: BAO_CAO_DON_GIAN_TAI_KHOAN_2026-10-15.md.
Xem các màn tài khoản/Cài đặt bằng qa/account-simplified-2026-10-15/xem-thu-tai-khoan.html.
Đó là ảnh chụp kiểm thử, không phải form gửi tài khoản thật.

## Nếu muốn chạy mã nguồn

Cần Node.js 24 trở lên và npm. Gói KHÔNG chứa node_modules hoặc âm thanh Sound.
Trước khi chạy/phát nhạc/tạo lại web Android, sao chép nguyên thư mục Sound từ
D:/GDQPAN/Web Báo thức/Sound vào thư mục gốc đã giải nén (cạnh package.json).
Giữ đủ sáu thư mục gốc, bundled-music và âm thanh hiệu lệnh; audio-audit.json và catalog
được giữ để kiểm tra nguồn nhạc. Đây không phải gói độc lập để build khi thiếu Sound.
Nếu chạy Android web/native, sao chép thêm D:/GDQPAN/Web Báo thức/mobile/www/Sound
vào mobile/www/Sound của gói giải nén để giữ các âm thanh hiệu lệnh đang có; bộ tạo web
hiện chỉ tái tạo bundled-music và dùng lại phần âm thanh hiệu lệnh đã chuẩn bị sẵn.

Windows: chạy npm ci ở gốc, rồi npm start. Không chạy npm run dist hoặc các lệnh đóng gói khi chưa duyệt.
Android web: npm ci --prefix mobile, sau đó npm run build --prefix mobile và npm run preview --prefix mobile.
Mở http://127.0.0.1:4173 trên máy đang chạy preview. Build sẽ tạo lại tài nguyên web từ HTML desktop.
Android native (chỉ trong gói Android): sau bước web, chạy npx cap sync android trong mobile để sinh assets;
cấu hình SDK/JDK riêng trên máy. local.properties và khóa ký không được chia sẻ. Không dùng gói này
để cài đè bản đang dùng khi chưa có quy trình ký và kiểm thử APK phù hợp.

Máy chủ mặc định: https://hethongtruyenthongso-demo.onrender.com.
Không có mật khẩu admin trong gói; dùng mật khẩu đã tự đặt. Demo chưa bật gửi email thật.
Backend chỉ cần đọc/test nếu dùng server demo, không bắt buộc khởi động local.

## Phạm vi và kiểm thử

Luồng Đăng nhập/Đăng ký/Chờ duyệt, nhập lại mật khẩu, logout trong Cài đặt và công tắc chạy nền
mặc định BẬT đã nằm trong nguồn. Logout giữ màn Đăng nhập và dừng hoạt động nền.
104 kiểm tra luồng, 23 kiểm tra Electron và 9 kiểm tra backend đạt tại workspace.
Android Java compile đạt; CHƯA kiểm thử native mới trên thiết bị/giả lập. Chi tiết giới hạn trong báo cáo.
Các test có tài khoản/mật khẩu QA giả, chỉ dùng cơ sở dữ liệu tạm, không phải thông tin truy cập thật.

Đã loại .env, database người dùng, khóa ký, local.properties, cache/build, node_modules,
âm thanh dung lượng lớn và bộ cài cũ. Không sửa nội dung tệp nguồn khi đưa vào ZIP.
SOURCE_MANIFEST.json ghi SHA256 từng tệp để đối chiếu. Gói chỉ được lưu cục bộ, không tải lên dịch vụ ngoài.
'''
    entries = []
    dest = OUT / f'GDQPAN-{target}-source-review-2026-10-15.zip'
    with zipfile.ZipFile(dest, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for p in paths:
            data = p.read_bytes()
            rel = p.relative_to(ROOT).as_posix()
            archive.writestr(rel, data)
            entries.append({'path': rel, 'bytes': len(data), 'sha256': digest(data)})
        archive.writestr('DOC_TRUOC_KHI_KIEM_TRA.md', readme.encode('utf-8'))
        archive.writestr('SOURCE_MANIFEST.json', json.dumps(entries, ensure_ascii=False, indent=2).encode('utf-8'))
    # Verify stored bytes as well as the omission of private/build artifacts.
    with zipfile.ZipFile(dest) as archive:
        assert archive.testzip() is None
        for e in entries:
            assert digest(archive.read(e['path'])) == e['sha256']
        for name in archive.namelist():
            assert not any(part in {'node_modules', '.git', '.gradle', 'data', 'Sound'} for part in name.split('/'))
            assert Path(name).suffix.lower() not in SKIP_SUFFIX
            assert not Path(name).name.startswith('.env')
    (OUT / f'DOC_TRUOC_{target.upper()}.md').write_text(readme, encoding='utf-8')
    summary.append({'target': target, 'path': str(dest), 'files': len(entries),
                    'bytes': dest.stat().st_size, 'sha256': digest(dest.read_bytes())})
(OUT / 'packages.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
for e in summary:
    print(e['target'], e['files'], 'files', e['bytes'], 'bytes', e['sha256'])
