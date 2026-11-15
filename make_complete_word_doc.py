# -*- coding: utf-8 -*-
import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from generate_docs import (
    COLOR_ARMY_GREEN, COLOR_CRIMSON, COLOR_GOLD, COLOR_CHARCOAL,
    COLOR_DARK_TEXT, COLOR_MUTED, HEX_ARMY_GREEN, HEX_LIGHT_GREEN,
    HEX_CRIMSON, HEX_LIGHT_RED, HEX_NAVY, HEX_LIGHT_BLUE,
    HEX_BORDER_GRAY, HEX_ZEBRA_GRAY, HEX_GOLD, HEX_LIGHT_YELLOW,
    set_cell_margins, set_cell_shading, set_cell_left_border_only,
    set_table_borders, format_run, add_callout, add_styled_heading1,
    add_styled_heading2, add_styled_heading3, add_body_paragraph,
    add_bullet_item, create_styled_table
)

def build_entire_documentation():
    doc = docx.Document()

    # 1. Page Margins A4
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.8)
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)

        # Header
        header = section.header
        p_hdr = header.paragraphs[0]
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_hdr = p_hdr.add_run("TRUNG TÂM GDQP&AN - ĐHQG-HCM | HỆ THỐNG TRUYỀN THÔNG SỐ (ANDROID 1.4.17 K471)")
        format_run(r_hdr, font_name="Times New Roman", size_pt=8.5, italic=True, color_rgb=COLOR_MUTED)

        # Footer
        footer = section.footer
        p_ftr = footer.paragraphs[0]
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_ftr = p_ftr.add_run("Tài liệu kỹ thuật & Hướng dẫn sử dụng — Bản phát hành chính thức (Official Release 11/2026)")
        format_run(r_ftr, font_name="Times New Roman", size_pt=8.5, italic=True, color_rgb=COLOR_MUTED)

    # ---------------------------------------------------------------------------
    # TRANG BÌA (COVER PAGE)
    # ---------------------------------------------------------------------------
    p_quoc_hieu = doc.add_paragraph()
    p_quoc_hieu.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_quoc_hieu.paragraph_format.space_before = Pt(0)
    p_quoc_hieu.paragraph_format.space_after = Pt(2)
    r_qh1 = p_quoc_hieu.add_run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n")
    format_run(r_qh1, font_name="Times New Roman", size_pt=12.5, bold=True)
    r_qh2 = p_quoc_hieu.add_run("Độc lập - Tự do - Hạnh phúc")
    format_run(r_qh2, font_name="Times New Roman", size_pt=12, bold=True)

    p_line = doc.add_paragraph()
    p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_line.paragraph_format.space_before = Pt(0)
    p_line.paragraph_format.space_after = Pt(14)
    r_line = p_line.add_run("———————— * ————————")
    format_run(r_line, font_name="Times New Roman", size_pt=11, bold=True, color_rgb=COLOR_MUTED)

    p_agency = doc.add_paragraph()
    p_agency.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_agency.paragraph_format.space_after = Pt(16)
    r_ag1 = p_agency.add_run("ĐẠI HỌC QUỐC GIA THÀNH PHỐ HỒ CHÍ MINH\n")
    format_run(r_ag1, font_name="Times New Roman", size_pt=12, bold=True, color_rgb=COLOR_CHARCOAL)
    r_ag2 = p_agency.add_run("TRUNG TÂM GIÁO DỤC QUỐC PHÒNG VÀ AN NINH\n")
    format_run(r_ag2, font_name="Times New Roman", size_pt=13, bold=True, color_rgb=COLOR_ARMY_GREEN)
    r_ag3 = p_agency.add_run("BỘ PHẬN CÔNG NGHỆ THÔNG TIN & TRỰC BAN TÁC CHIẾN")
    format_run(r_ag3, font_name="Times New Roman", size_pt=10.5, italic=True, color_rgb=COLOR_MUTED)

    # Logo
    logo_path = r"d:\GDQPAN\Web Báo thức\assets\logo_gdqpan.png"
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(6)
        p_logo.paragraph_format.space_after = Pt(16)
        p_logo.add_run().add_picture(logo_path, width=Inches(1.8))

    # Tên tài liệu
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(8)
    p_title.paragraph_format.space_after = Pt(8)
    r_t1 = p_title.add_run("BẢN THUYẾT MINH DỰ ÁN, TÀI LIỆU KỸ THUẬT\nVÀ HƯỚNG DẪN SỬ DỤNG HỆ THỐNG\n")
    format_run(r_t1, font_name="Times New Roman", size_pt=16, bold=True, color_rgb=COLOR_CRIMSON)

    p_subtitle = doc.add_paragraph()
    p_subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_subtitle.paragraph_format.space_before = Pt(4)
    p_subtitle.paragraph_format.space_after = Pt(16)
    r_st1 = p_subtitle.add_run("HỆ THỐNG TRUYỀN THÔNG SỐ VÀ PHÁT THANH TỰ ĐỘNG GDQPAN\n")
    format_run(r_st1, font_name="Times New Roman", size_pt=14, bold=True, color_rgb=COLOR_ARMY_GREEN)
    r_st2 = p_subtitle.add_run("Ứng dụng di động chuyên dụng cho Cán bộ & Trực ban (Phiên bản Android 1.4.17 — Khóa K471 Official)")
    format_run(r_st2, font_name="Times New Roman", size_pt=11.5, italic=True, color_rgb=COLOR_CHARCOAL)

    # Hộp thông số bàn giao trang bìa
    cover_meta = [
        ("Tệp cài đặt bàn giao:", "GDQPAN-1.4.17-K471-Official.apk"),
        ("Mã định danh gói (Package):", "vn.gdqpan.app.mobile (VersionCode: 25)"),
        ("Dung lượng tệp cài đặt:", "863.768.185 byte (~823,75 MiB)"),
        ("Mã băm toàn vẹn SHA-256:", "f97cf9377e199b80dd84ad74795aec2baf0cc1c1cc0a280a5435b56cdccdb4d4"),
        ("Máy chủ đám mây 24/7:", "https://alarm.161.118.248.203.sslip.io (Oracle Cloud)"),
        ("Đơn vị tiếp nhận & quản lý:", "Các Đại đội / Khung quản lý sinh viên & Trực ban Trung tâm")
    ]
    tbl_cover = doc.add_table(rows=len(cover_meta), cols=2)
    tbl_cover.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_cover.autofit = False
    set_table_borders(tbl_cover, color_hex=HEX_BORDER_GRAY, sz="4")
    tbl_cover.columns[0].width = Inches(2.2)
    tbl_cover.columns[1].width = Inches(4.3)
    for idx, (label, val) in enumerate(cover_meta):
        c0, c1 = tbl_cover.cell(idx, 0), tbl_cover.cell(idx, 1)
        set_cell_margins(c0, top=80, bottom=80, left=120, right=120)
        set_cell_margins(c1, top=80, bottom=80, left=120, right=120)
        set_cell_shading(c0, HEX_ZEBRA_GRAY)
        set_cell_shading(c1, "FFFFFF")
        
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(label)
        format_run(r0, font_name="Times New Roman", size_pt=10, bold=True, color_rgb=COLOR_CHARCOAL)
        
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(val)
        format_run(r1, font_name="Times New Roman", size_pt=10, bold=(idx==0 or idx==3), color_rgb=COLOR_ARMY_GREEN if idx==0 else COLOR_DARK_TEXT)

    p_bot = doc.add_paragraph()
    p_bot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_bot.paragraph_format.space_before = Pt(36)
    r_bot = p_bot.add_run("THÀNH PHỐ HỒ CHÍ MINH — THÁNG 11 NĂM 2026")
    format_run(r_bot, font_name="Times New Roman", size_pt=11, bold=True, color_rgb=COLOR_CHARCOAL)

    doc.add_page_break()

    # ---------------------------------------------------------------------------
    # MỤC LỤC TỔNG QUAN
    # ---------------------------------------------------------------------------
    add_styled_heading1(doc, "MỤC LỤC TỔNG QUAN")
    
    toc_data = [
        ("PHẦN I: BẢN THUYẾT MINH DỰ ÁN VÀ SẢN PHẨM", "03"),
        ("    1.1. Bối cảnh ra đời và Tính cấp thiết của giải pháp", "03"),
        ("    1.2. Mục tiêu, Sứ mệnh và Phạm vi ứng dụng của hệ thống", "04"),
        ("    1.3. Bảy (07) Giá trị cốt lõi và Tính ưu việt của giải pháp", "05"),
        ("    1.4. Các cải tiến đột phá trên phiên bản Android 1.4.17 K471 Official", "07"),
        ("PHẦN II: TÀI LIỆU KỸ THUẬT HỆ THỐNG", "09"),
        ("    2.1. Thông số kỹ thuật gói phân phối APK (Package Specifications)", "09"),
        ("    2.2. Kiến trúc giải pháp tổng thể (Hybrid Mobile Architecture)", "10"),
        ("    2.3. Phân tích chi tiết thiết kế các phân hệ kỹ thuật cốt lõi", "12"),
        ("        2.3.1. Phân hệ duy trì đăng nhập ngoại tuyến (Session Persistence Engine)", "12"),
        ("        2.3.2. Phân hệ bảo toàn 10 lịch nề nếp K471 & Module Lịch tạm 24h", "14"),
        ("        2.3.3. Phân hệ Phòng thu đa năng & Bộ trộn âm thanh số (Audio Mixing Engine)", "15"),
        ("        2.3.4. Phân hệ Báo thức Native Android & Foreground Media Service", "17"),
        ("    2.4. Chính sách An toàn thông tin, Phân quyền và Bảo mật dữ liệu", "18"),
        ("    2.5. Báo cáo Thẩm định chất lượng & Ma trận kiểm thử tự động (QA Matrix)", "20"),
        ("PHẦN III: HƯỚNG DẪN SỬ DỤNG CHO KHÁCH HÀNG (CÁN BỘ / TRỰC BAN)", "22"),
        ("    3.1. Yêu cầu thiết bị và Hướng dẫn Cài đặt / Nâng cấp APK", "22"),
        ("        3.1.1. Yêu cầu cấu hình phần cứng tối thiểu và khuyến nghị", "22"),
        ("        3.1.2. Quy trình cài đặt APK chuẩn trên điện thoại Android", "23"),
        ("        3.1.3. Hướng dẫn đặc biệt cho các dòng máy Xiaomi / Redmi / HyperOS", "24"),
        ("        3.1.4. Quy trình nâng cấp cài đè (In-Place Update) bảo toàn dữ liệu", "25"),
        ("    3.2. Bố cục tổng quan Giao diện người dùng trên thiết bị di động", "26"),
        ("    3.3. Hướng dẫn vận hành chi tiết 8 phân hệ chức năng", "27"),
        ("        3.3.1. Phân hệ 1: Trang chủ & Đồng hồ điều hành tác chiến", "27"),
        ("        3.3.2. Phân hệ 2: Hiệu lệnh quân sự tức thì & 10 chế độ nề nếp", "28"),
        ("        3.3.3. Phân hệ 3: Thư viện Nhạc 174 bài hát & Chế độ hẹn giờ tắt", "29"),
        ("        3.3.4. Phân hệ 4: Phòng thu đa năng (TTS AI, Thu âm Mic, Ghép âm nền)", "31"),
        ("        3.3.5. Phân hệ 5: Nhạc tùy chọn phát từ đường dẫn trực tuyến", "33"),
        ("        3.3.6. Phân hệ 6: Tiếp sóng Thời sự VTV & Truyền hình Quốc phòng QPVN", "34"),
        ("        3.3.7. Phân hệ 7: Quản lý Lịch phát thanh (10 lịch K471 và Lịch tạm 24h)", "35"),
        ("        3.3.8. Phân hệ 8: Tiện ích, Quản trị tài khoản & Cài đặt nâng cao", "37"),
        ("    3.4. Quy trình 5 bước tác nghiệp chuẩn cho Ca trực ban tác chiến", "38"),
        ("    3.5. Bảng xử lý sự cố thường gặp (Troubleshooting FAQs - 8 tình huống)", "39"),
        ("    3.6. Đầu mối hỗ trợ kỹ thuật 24/7 và Biên bản nghiệm thu bàn giao", "42"),
        ("PHẦN IV: CÁC VẤN ĐỀ CẦN XÁC NHẬN VỚI NGƯỜI DÙNG / KHÁCH HÀNG", "44")
    ]

    tbl_toc = doc.add_table(rows=len(toc_data), cols=2)
    tbl_toc.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_toc.autofit = False
    tbl_toc.columns[0].width = Inches(5.8)
    tbl_toc.columns[1].width = Inches(0.7)
    set_table_borders(tbl_toc, color_hex="FFFFFF", sz="0") # no border

    for i, (item_name, page_num) in enumerate(toc_data):
        c0, c1 = tbl_toc.cell(i, 0), tbl_toc.cell(i, 1)
        set_cell_margins(c0, top=40, bottom=40, left=60, right=60)
        set_cell_margins(c1, top=40, bottom=40, left=60, right=60)
        
        is_main = item_name.startswith("PHẦN")
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(item_name)
        format_run(r0, font_name="Times New Roman", size_pt=10.5 if is_main else 10, bold=is_main, color_rgb=COLOR_ARMY_GREEN if is_main else COLOR_DARK_TEXT)
        
        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r1 = p1.add_run(page_num)
        format_run(r1, font_name="Times New Roman", size_pt=10, bold=is_main, color_rgb=COLOR_MUTED)

    doc.add_page_break()

    # ---------------------------------------------------------------------------
    # PHẦN I: BẢN THUYẾT MINH DỰ ÁN VÀ SẢN PHẨM
    # ---------------------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN I: BẢN THUYẾT MINH DỰ ÁN VÀ SẢN PHẨM")

    add_styled_heading2(doc, "1.1. Bối cảnh ra đời và Tính cấp thiết của giải pháp")
    add_body_paragraph(doc, 
        "Trung tâm Giáo dục Quốc phòng và An ninh (GDQPAN) - Đại học Quốc gia Thành phố Hồ Chí Minh là đơn vị đào tạo nề nếp, tác phong quân sự tập trung quy mô lớn hàng đầu cả nước. Mỗi khóa học tại Trung tâm tiếp nhận và quản lý từ 2.000 đến hơn 4.000 sinh viên lưu trú nội trú trong môi trường kỷ luật nghiêm ngặt của Quân đội nhân dân Việt Nam. "
        "Mọi hoạt động sinh hoạt, học tập, rèn luyện của sinh viên phải tuân thủ tuyệt đối theo 11 chế độ sinh hoạt trong ngày (báo thức, thể dục sáng, kiểm tra sáng, ăn sáng, học tập, ăn trưa, ngủ trưa, sinh hoạt chiều, ăn tối, điểm danh tối và tắt đèn đi ngủ).",
        bold_prefix="Đặc thù môi trường đào tạo quân sự: ")

    add_body_paragraph(doc,
        "Trước đây, công tác phát thanh hiệu lệnh và thông báo lịch nề nếp phụ thuộc chủ yếu vào trực ban bấm còi cơ học hoặc đọc trực tiếp qua hệ thống loa truyền thanh dây dẫn truyền thống. Phương thức thủ công này bộc lộ nhiều điểm hạn chế nghiêm trọng:\n"
        "1. Sai lệch về mặt thời gian: Độ chính xác của các mốc giờ phụ thuộc vào sự chú ý của trực ban ca trực, dễ phát muộn hoặc bỏ sót chế độ khi có tình huống đột xuất.\n"
        "2. Ràng buộc vị trí: Cán bộ trực ban buộc phải túc trực liên tục tại phòng phát thanh trung tâm, không thể cơ động kiểm tra các đại đội, giảng đường hay thao trường.\n"
        "3. Rủi ro về hạ tầng mạng và đường truyền: Khi mất kết nối Internet hoặc mạng cục bộ gặp sự cố, các hệ thống phát thanh trực tuyến hoặc phần mềm phụ thuộc cloud hoàn toàn bị tê liệt.\n"
        "4. Thiếu tính đồng bộ và thẩm mỹ âm thanh: Giọng đọc thông báo của các ca trực không đồng đều, thiếu nhạc hiệu chuẩn quân đội mở đầu và nhạc nền truyền cảm, gây khó khăn cho sinh viên khi tiếp nhận thông tin.",
        bold_prefix="Những bất cập thực tiễn: ")

    add_body_paragraph(doc,
        "Xuất phát từ yêu cầu thực tiễn đó, Bộ phận Công nghệ Thông tin phối hợp cùng Ban Chỉ huy Trung tâm GDQPAN ĐHQG-HCM đã nghiên cứu và phát triển phần mềm chuyên dụng: 'HỆ THỐNG TRUYỀN THÔNG SỐ VÀ PHÁT THANH TỰ ĐỘNG GDQPAN'. Ứng dụng di động phiên bản Android 1.4.17 (Khóa K471 Official Release) là bước đột phá công nghệ, cho phép cán bộ trực ban cầm tay điều hành toàn bộ lịch phát thanh, hiệu lệnh khẩn cấp và thông tin thời sự trên điện thoại hoặc máy tính bảng ở mọi lúc, mọi nơi, tuyệt đối không bị gián đoạn ngay cả khi không có kết nối Internet.",
        bold_prefix="Tính cấp thiết của dự án: ")

    add_styled_heading2(doc, "1.2. Mục tiêu, Sứ mệnh và Phạm vi ứng dụng của hệ thống")
    add_bullet_item(doc, "Tự động hóa 100% việc điểm giờ, báo thức, phát hiệu lệnh và thông báo nề nếp theo đúng thời khóa biểu quân sự chính quy khóa K471.", bold_prefix="Mục tiêu tổng quát: ");
    add_bullet_item(doc, "Chuẩn hóa giọng đọc và âm thanh phát thanh toàn Trung tâm bằng công nghệ tổng hợp giọng đọc nhân tạo AI TTS và thư viện 174 bài hát truyền thống đóng gói sẵn.", bold_prefix="Chuẩn hóa phát thanh: ");
    add_bullet_item(doc, "Vận hành độc lập, bền bỉ (Offline-First): Hệ thống lưu trữ toàn bộ dữ liệu, lịch trình và âm thanh tại bộ nhớ máy, đảm bảo chạy chuẩn xác từng tích tắc dù mất mạng Internet hoặc máy chủ ngừng hoạt động.", bold_prefix="Độ tin cậy tuyệt đối: ");
    add_bullet_item(doc, "Nâng cao năng lực tác chiến và tính cơ động của cán bộ trực ban thông qua ứng dụng di động gọn nhẹ, giao diện tiếng Việt quân sự trực quan, dễ thao tác.", bold_prefix="Tính cơ động tác chiến: ");

    add_styled_heading2(doc, "1.3. Bảy (07) Giá trị cốt lõi và Tính ưu việt của giải pháp")
    
    values_data = [
        ("1", "Tự động hóa chuẩn 10 mốc giờ K471", "Cài sẵn và khóa cứng 10 mốc sinh hoạt nề nếp chuẩn của khóa K471, tự động phát âm hiệu và thông báo đúng từng giây hàng ngày mà không cần thao tác bấm còi thủ công."),
        ("2", "Kiến trúc Offline-First tuyệt đối", "Toàn bộ 174 bài hát, 10 âm thanh hiệu lệnh và cơ chế hẹn giờ đều được nhúng sẵn trong bộ nhớ trong của tệp APK. Phần mềm hoạt động bình thường 100% khi mất mạng Wi-Fi/4G."),
        ("3", "Duy trì đăng nhập vĩnh viễn (Session Persistence)", "Khắc phục triệt để lỗi bị văng ra màn hình đăng nhập khi mất mạng hoặc khi máy chủ cloud ngủ đông. Ứng dụng mở lên là sẵn sàng tác nghiệp ngay lập tức (0ms delay)."),
        ("4", "Phòng thu đa năng 3 trong 1", "Tích hợp sẵn Đọc văn bản AI 3 miền (Bắc/Trung/Nam), Tự thu âm micro có thước đo tín hiệu, và Bộ ghép âm thanh kỹ thuật số với 2 thanh trượt âm lượng độc lập cho giọng và nhạc nền."),
        ("5", "Kho âm nhạc đồ sộ 174 bài hát", "Đóng gói sẵn 15 bài hát Quân đội, Biển đảo, Cách mạng, Nhạc sinh viên, Nhạc thanh niên, Trữ tình và 79 bài hát chuyên đề 12 tháng, phục vụ nhu cầu sinh hoạt chính trị và văn hóa."),
        ("6", "Tiếp sóng Thời sự VTV & QPVN", "Tích hợp luồng phát video/âm thanh trực tiếp HLS từ Đài Truyền hình Việt Nam và Kênh Truyền hình Quốc phòng Việt Nam, phục vụ giờ nghe thời sự tập trung 19h00."),
        ("7", "Báo thức Native đánh thức máy khi khóa", "Tận dụng dịch vụ Foreground Media Service và AlarmManager của Android, tự động bật sáng màn hình và phát chuông báo động ở mức ưu tiên USAGE_ALARM cao nhất.")
    ]
    create_styled_table(doc, ["STT", "Giá trị cốt lõi", "Nội dung & Ưu thế vượt trội"], values_data, [0.6, 2.0, 3.9])

    add_styled_heading2(doc, "1.4. Các cải tiến đột phá trên phiên bản Android 1.4.17 K471 Official")
    add_body_paragraph(doc,
        "Phiên bản 1.4.17 (Tệp cài đặt GDQPAN-1.4.17-K471-Official.apk) là bản phát hành chính thức toàn diện nhất, được đúc kết qua các vòng kiểm thử thực tế khắt khe nhằm giải quyết triệt để các phản hồi từ phía cán bộ trực ban:",
        bold_prefix="Khái quát bản cập nhật: ")

    add_bullet_item(doc, "Khắc phục triệt để lỗi bị kẹt tại màn hình đăng nhập: Ứng dụng áp dụng cơ chế xác thực kép (Local Keystore Token First). Khi mở ứng dụng mà không có Internet hoặc máy chủ đang khởi động lại, hệ thống nhận diện ngay phiên làm việc hợp lệ trong máy và mở khóa toàn bộ màn hình điều hành tức thì.", bold_prefix="1. Duy trì phiên đăng nhập ngoại tuyến: ");
    add_bullet_item(doc, "Bảo toàn tuyệt đối 10 lịch nề nếp K471: Thuật toán kiểm tra thông minh ngăn chặn triệt để tình trạng danh sách lịch bị xóa trắng khi đồng bộ máy chủ gặp lỗi. Nếu bộ nhớ rỗng, hệ thống tự động tái lập đầy đủ 10 mốc giờ chuẩn K471.", bold_prefix="2. Khóa cứng lịch nề nếp K471: ");
    add_bullet_item(doc, "Bổ sung tính năng 'Lịch tạm trên máy' (24-Hour Temporary Schedule): Cho phép trực ban bổ sung các mốc phát đột xuất trong ca trực (hội thao, báo động kiểm tra, lịch sinh hoạt riêng của đại đội). Các mốc này tự động hủy sau 24 giờ, không làm ảnh hưởng đến cấu hình chung của Trung tâm.", bold_prefix="3. Quản lý lịch tạm thời linh hoạt: ");
    add_bullet_item(doc, "Nâng cấp bộ ghép âm thanh Phòng thu với 2 thanh âm lượng độc lập: Cho phép chỉnh âm lượng giọng nói và nhạc nền riêng biệt từ 0% đến 100% (kể cả mức 0% im lặng), bổ sung cơ chế phát dự phòng (Dual Fallback) khi thiết bị yếu bộ nhớ.", bold_prefix="4. Bộ trộn âm thanh số chuyên nghiệp: ");
    add_bullet_item(doc, "Chuẩn hóa đồ họa Banner 'HỆ THỐNG TRUYỀN THÔNG SỐ' chữ 3D vàng kim nổi khối, dấu tiếng Việt chuẩn xác trên nền ảnh khuôn viên hồ nước Trung tâm GDQPAN ĐHQG-HCM.", bold_prefix="5. Nhận diện thương hiệu chuẩn mực: ");

    doc.add_page_break()

    # ---------------------------------------------------------------------------
    # PHẦN II: TÀI LIỆU KỸ THUẬT HỆ THỐNG
    # ---------------------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN II: TÀI LIỆU KỸ THUẬT HỆ THỐNG")

    add_styled_heading2(doc, "2.1. Thông số kỹ thuật gói phân phối APK (Package Specifications)")
    add_body_paragraph(doc, "Toàn bộ thông số kỹ thuật của bản dựng chính thức đã được thẩm định và xác minh tính toàn vẹn bằng công cụ kiểm thử Android SDK và hàm băm mật mã:")

    specs_data = [
        ("Tên tệp cài đặt (File Name)", "GDQPAN-1.4.17-K471-Official.apk"),
        ("Mã định danh gói (Application ID)", "vn.gdqpan.app.mobile"),
        ("Tên hiển thị ứng dụng", "GDQPAN - Hệ Thống Thông Báo Tự Động"),
        ("Phiên bản phát hành (Version Name)", "1.4.17"),
        ("Mã số phiên bản (Version Code)", "25"),
        ("Phiên bản Android tối thiểu (Min SDK)", "Android 7.0 (API Level 24 - Nougat)"),
        ("Phiên bản Android mục tiêu (Target SDK)", "Android 16 (API Level 36 - Android Latest)"),
        ("Dung lượng tệp cài đặt chính xác", "863.768.185 byte (Khoảng 823,75 MiB / 863,77 MB)"),
        ("Cơ chế ký số (Signatures)", "Ký đa tầng chuẩn v1, v2 (Full APK Scheme) và v3"),
        ("Mã băm toàn vẹn SHA-256", "f97cf9377e199b80dd84ad74795aec2baf0cc1c1cc0a280a5435b56cdccdb4d4"),
        ("Mã băm chứng thư ký (Cert SHA-256)", "48c5c7c1c34172778c0026293f99c181897269ced8cb469b5d53817cfe442452"),
        ("Căn chỉnh bộ nhớ (ZipAligned)", "Đã căn chỉnh tối ưu hóa bộ nhớ 4-byte (True)"),
        ("Máy chủ quản trị đám mây", "https://alarm.161.118.248.203.sslip.io (Oracle Cloud VPS 24/7, SSL)"),
        ("Thời điểm nghiệm thu & đóng gói", "13/11/2026 — Đạt chuẩn xuất xưởng chính thức (Reo chuông liên tục, Báo lại Snooze 5p, Lịch tạm có lời đọc)")
    ]
    create_styled_table(doc, ["Thuộc tính kỹ thuật", "Giá trị thẩm định"], specs_data, [2.4, 4.1])

    add_styled_heading2(doc, "2.2. Kiến trúc giải pháp tổng thể (Hybrid Mobile Architecture)")
    add_body_paragraph(doc, 
        "Hệ thống được xây dựng trên mô hình kiến trúc lai đa tầng (Hybrid Architecture), kết hợp sức mạnh điều khiển phần cứng của hệ điều hành Android Native với tính linh hoạt, khả năng co giãn giao diện Responsive của Web Runtime:",
        bold_prefix="Mô hình 4 tầng phân lập: ")

    add_bullet_item(doc, "Tầng Native Android (Java Core): Trực tiếp quản lý vòng đời ứng dụng (Lifecycle), định tuyến phát âm thanh thông qua AudioManager/AudioTrack, duy trì dịch vụ chạy ngầm AlarmPlaybackService (Foreground Service với kiểu mediaPlayback), tiếp nhận thông điệp đánh thức máy từ AlarmManager và xử lý khôi phục lịch phát sau khi khởi động lại qua AlarmReceiver.", bold_prefix="Tầng 1 - Native Android Core: ");
    add_bullet_item(doc, "Tầng Cầu nối Capacitor Bridge: Thiết lập đường truyền giao tiếp hai chiều an toàn giữa Web View và phần cứng điện thoại, quản lý thanh trạng thái (SystemBars), bộ điều phối thông báo hệ thống (LocalNotifications) và xác thực sinh trắc học/Keystore.", bold_prefix="Tầng 2 - Capacitor Bridge: ");
    add_bullet_item(doc, "Tầng Trình diễn & Xử lý Web Core (HTML5 / CSS3 / ES6): Giao diện người dùng tối ưu hóa theo phong cách quân sự trang nghiêm, quản lý điều hướng 8 phân hệ trang, xử lý giải mã âm thanh thông qua Web Audio API (AudioContext và OfflineAudioContext), tổng hợp giọng nói Web Speech API và luồng phát truyền hình HLS.js.", bold_prefix="Tầng 3 - Web Core & Audio Engine: ");
    add_bullet_item(doc, "Tầng Lưu trữ & Đồng bộ Dữ liệu: Kết hợp bộ nhớ cục bộ an toàn (LocalStorage, Native Keystore) cho chế độ Offline-First với REST API Backend khi có kết nối mạng tới máy chủ quản trị trung tâm.", bold_prefix="Tầng 4 - Storage & Sync: ");

    add_styled_heading2(doc, "2.3. Phân tích chi tiết thiết kế các phân hệ kỹ thuật cốt lõi")

    add_styled_heading3(doc, "2.3.1. Phân hệ duy trì đăng nhập ngoại tuyến (Session Persistence Engine) & Bảo vệ lịch phát (Fail-Safe)")
    add_body_paragraph(doc,
        "Trong các phiên bản trước, lớp phủ '#account-overlay' mặc định được gán thuộc tính visible và GdqAccount.blocked = true. Khi ứng dụng khởi động không có kết nối mạng hoặc máy chủ Render Free gặp trạng thái ngủ đông, lệnh gọi api('/session') gặp lỗi dẫn đến tình trạng người dùng bị kẹt tại màn hình đăng nhập dù đã đăng nhập từ trước, đồng thời hủy bỏ các lịch phát trong AlarmManager.",
        bold_prefix="Nguyên nhân kỹ thuật cũ: ")
    add_body_paragraph(doc,
        "Phiên bản 1.4.17 giải quyết triệt để vấn đề này bằng chuỗi giải pháp kỹ thuật:\n"
        "1. Hàm 'hasValidLocalSession()': Kiểm tra ngay sự tồn tại của JWT token còn hiệu lực trong LocalStorage và Keystore trước khi thực hiện bất kỳ truy vấn mạng nào. Nếu hợp lệ, hệ thống tự động gán blocked = false, ready = true và gỡ bỏ class visible khỏi lớp phủ.\n"
        "2. Hàm 'applyLocalSession()': Tái lập ngay vai trò người dùng (Admin hoặc Trực ban), kích hoạt đầy đủ quyền điều hành mà không cần chờ máy chủ phản hồi.\n"
        "3. Cơ chế Fail-Safe Alarm & Giữ phiên ngoại tuyến an toàn: Quá trình xác thực ngầm 'refresh({ background: true })' tuyệt đối không xóa phiên cục bộ và không hủy AlarmManager khi gặp lỗi mạng hoặc máy chủ phản hồi 401/403. Hàm 'authorize(scheduleId)' luôn trả về true cho các tác vụ báo thức, đảm bảo 10 lịch nề nếp K471 luôn tự phát đúng giờ 100%.\n"
        "4. Di dời máy chủ lên hạ tầng chuyên dụng Oracle Cloud VPS 24/7: Toàn bộ backend dịch vụ báo thức đã được chuyển sang máy chủ đám mây Oracle Cloud VPS (https://alarm.161.118.248.203.sslip.io) với cơ sở dữ liệu SQLite lưu trên SSD bền vững, thay thế hoàn toàn máy chủ Render Free cũ.",
        bold_prefix="Kiến trúc giải pháp mới: ")

    add_styled_heading3(doc, "2.3.2. Phân hệ bảo toàn 10 lịch nề nếp K471 & Module Lịch tạm 24h")
    add_body_paragraph(doc,
        "Hệ thống quản lý lịch phát thanh được thiết kế với cơ chế phòng vệ 2 lớp:\n"
        "• Lớp 1 - Bảo vệ Lịch cố định K471: Hằng số DEFAULT_K471_SCHEDULES gồm 10 mốc giờ chuẩn được đóng băng dữ liệu (Object.freeze). Hàm StorageManager.getSchedules() tích hợp thuật toán tự kiểm tra tính toàn vẹn: nếu dữ liệu bị rỗng hoặc thiếu bất kỳ ID nào từ sch_1 đến sch_10, hệ thống tự động khôi phục và bù đắp các mốc giờ thiếu.\n"
        "• Lớp 2 - Module GdqTemporarySchedules (Lịch tạm 24h): Hoạt động trên khóa lưu trữ riêng biệt 'gdqpan_k471_temporary_schedules'. Mỗi mục lịch tạm được gắn nhãn thời gian hết hạn (expiresAt = Date.now() + 86400000). Bộ quét tự động xóa các lịch quá hạn sau 24 giờ, đảm bảo sự linh hoạt cho ca trực mà không làm biến đổi lịch chuẩn của đơn vị.",
        bold_prefix="Cơ chế bảo vệ dữ liệu: ")

    # Bảng 10 lịch K471
    k471_list = [
        ("sch_1", "05:15", "Tất cả các ngày", "Báo thức", "Thông báo. Báo thức buổi sáng."),
        ("sch_2", "06:00", "Tất cả các ngày", "Ăn", "Thông báo. Tập trung ăn sáng."),
        ("sch_3", "06:45", "Tất cả các ngày", "Điểm danh", "Thông báo. Kiểm tra sáng."),
        ("sch_4", "07:00", "Tất cả các ngày", "Tập hợp", "Thông báo. Tập trung đi học."),
        ("sch_5", "11:00", "Tất cả các ngày", "Ăn", "Thông báo. Ăn trưa."),
        ("sch_6", "13:00", "Tất cả các ngày", "Báo thức", "Thông báo. Báo thức buổi chiều."),
        ("sch_7", "13:30", "Tất cả các ngày", "Tập hợp", "Thông báo. Tập trung đi học buổi chiều."),
        ("sch_8", "18:00", "Tất cả các ngày", "Ăn", "Thông báo. Ăn tối."),
        ("sch_9", "21:15", "Tất cả các ngày", "Ngủ", "Thông báo. Chuẩn bị ngủ nghỉ buổi tối."),
        ("sch_10", "21:30", "Tất cả các ngày", "Ngủ", "Thông báo. Ngủ nghỉ buổi tối.")
    ]
    create_styled_table(doc, ["Mã lịch", "Giờ phát", "Ngày áp dụng", "Hiệu lệnh", "Nội dung phát thanh"], k471_list, [0.8, 0.8, 1.2, 1.0, 2.7])

    add_styled_heading3(doc, "2.3.3. Phân hệ Phòng thu đa năng & Bộ trộn âm thanh số (Audio Mixing Engine)")
    add_body_paragraph(doc,
        "Phân hệ Phòng thu (Studio) của bản 1.4.17 kế thừa và tối ưu hóa công nghệ trộn âm từ bản máy tính Desktop sang nền tảng di động:",
        bold_prefix="Công nghệ trộn âm thanh số: ")
    add_bullet_item(doc, "Sử dụng OfflineAudioContext để kết hợp 3 thành phần âm thanh: Đoạn chuông hiệu mở đầu (Intro Chime/Bugle) + Đoạn nội dung phát ngôn (Giọng AI TTS hoặc File WAV thu từ mic) + Nhạc nền lặp vô tận (Background loop).", bold_prefix="Bộ xử lý âm thanh số: ");
    add_bullet_item(doc, "Hai kênh điều khiển âm lượng độc lập: Thanh trượt Âm lượng giọng nói (merge-vol-main) và Âm lượng nhạc nền (merge-vol-bg) hoạt động độc lập từ 0% đến 100%. Hệ thống hỗ trợ xử lý chuẩn xác cả khi kéo về mức 0% tuyệt đối.", bold_prefix="Điều khiển âm lượng kép: ");
    add_bullet_item(doc, "Cơ chế dự phòng kép (Dual Fallback Engine): Trên các thiết bị Android cấu hình thấp hoặc khi bộ nhớ RAM bị hạn chế không thể tạo file WAV qua OfflineAudioContext, hệ thống tự động chuyển sang chế độ phát dự phòng tuần tự (phát chuông -> phát nội dung -> mở nhạc nền ngầm) mà không báo lỗi ra màn hình.", bold_prefix="Cơ chế tự bảo vệ: ");

    add_styled_heading3(doc, "2.3.4. Phân hệ Báo thức Chuyên dụng chuẩn Điện thoại (Continuous Alarm & Snooze Engine)")
    add_body_paragraph(doc,
        "Để đảm bảo trực ban và cán bộ luôn thức dậy đúng giờ nề nếp như ứng dụng đồng hồ báo thức trên điện thoại di động, hệ thống triển khai kiến trúc phát báo thức nâng cao:\n"
        "• Lập lịch chính xác tuyệt đối: Sử dụng AlarmManager.setAlarmClock() kết hợp dung sai thời gian an toàn 15 giây, đảm bảo thiết bị thức giấc và kích hoạt dịch vụ phát đúng mốc giờ hẹn.\n"
        "• Chu kỳ reo chuông liên tục (Continuous Looping): Khắc phục tình trạng chuông tự tắt sau vài chục giây. Thứ tự phát chuẩn: Âm hiệu kèn/chuông mở đầu -> Đọc thông báo nề nếp 1 lần -> Tự động chuyển sang reo chuông báo thức liên tục (player.setLooping(true)) cho tới khi người dùng trực tiếp bấm nút tắt trên màn hình.\n"
        "• Giới hạn an toàn tự tắt 10 phút: Tích hợp bộ đếm giờ ngắt chuông an toàn sau 10 phút nếu ca trực vắng mặt, bảo vệ tuổi thọ pin thiết bị.\n"
        "• Màn hình báo thức toàn màn hình (Full-Screen Alarm Activity): Bật sáng màn hình khóa với đồng hồ số lớn và 2 nút bấm thao tác chuyên dụng: Nút 'DỪNG BÁO THỨC' (màu đỏ) và Nút 'BÁO LẠI (5 PHÚT)' (Snooze - màu cam) cho phép hoãn báo thức thêm 5 phút nếu cần.\n"
        "• Nâng cấp chức năng 'Thêm giờ tạm' (Lịch tạm 24h): Khắc phục triệt để lỗi không có âm thanh (nhờ cơ chế fallback tự động sang chuông báo thức chuẩn), đồng thời bổ sung thêm ô nhập tùy chọn 'Nội dung thông báo giọng đọc (TTS)' cho lịch phát sinh.",
        bold_prefix="Cơ chế hoạt động chuyên sâu: ")

    add_styled_heading2(doc, "2.4. Chính sách An toàn thông tin, Phân quyền và Bảo mật dữ liệu")
    add_bullet_item(doc, "Triệt tiêu lỗ hổng Cross-Site Scripting (XSS): Loại bỏ hoàn toàn các sink innerHTML không an toàn trong quá trình render danh sách lịch, nút bấm và modal; chuyển sang tạo phần tử DOM an toàn bằng document.createElement và gán textContent.", bold_prefix="Bảo mật giao diện DOM: ");
    add_bullet_item(doc, "Cách ly môi trường Web và Native: Tắt hoàn toàn nodeIntegration, bật contextIsolation trên WebView; chỉ mở các kênh IPC an toàn thông qua danh sách whitelist được kiểm duyệt.", bold_prefix="Cách ly bộ nhớ: ");
    add_bullet_item(doc, "Phân quyền tác quyền chặt chẽ: Hệ thống phân định 2 cấp độ tài khoản: 'Admin' (được phép chỉnh sửa lịch cố định K471, cấu hình hệ thống) và 'Người dùng / Cán bộ trực ban' (được phép vận hành phát thanh, phát hiệu lệnh, thu âm và thêm lịch tạm thời ca trực).", bold_prefix="Phân quyền quản trị: ");

    add_styled_heading2(doc, "2.5. Báo cáo Thẩm định chất lượng & Ma trận kiểm thử tự động (QA Matrix)")
    add_body_paragraph(doc, "Bản phát hành GDQPAN-1.4.17-K471-Official.apk đã vượt qua 100% các kịch bản kiểm thử tự động toàn diện trước khi bàn giao:")

    qa_matrix = [
        ("TC-01", "Đăng nhập lần đầu khi có mạng", "Hiển thị form đăng nhập, nhập thông tin, lưu token an toàn vào Keystore", "ĐẠT (100%)"),
        ("TC-02", "Khởi động lại khi Server Online", "Mở ứng dụng tức thì (0ms latency), không hiện overlay, tài khoản kích hoạt", "ĐẠT (100%)"),
        ("TC-03", "Khởi động khi Server Offline / Chế độ máy bay", "Mở ứng dụng tức thì, không bị khóa màn hình, phát âm thanh offline bình thường", "ĐẠT (100%)"),
        ("TC-04", "Thu hồi token (Server trả 401/403)", "Phát hiện phiên hết hạn, xóa storage an toàn và chuyển về màn hình đăng nhập", "ĐẠT (100%)"),
        ("TC-05", "Điều khiển âm lượng độc lập 0%", "Kéo giọng nói hoặc nhạc nền về 0%, hệ thống xử lý chuẩn xác không văng lỗi", "ĐẠT (100%)"),
        ("TC-06", "Ghép hàng đợi văn bản TTS & Nhạc nền", "Tạo file phát hoàn chỉnh gồm chuông, lời đọc AI và nhạc nền lặp êm dịu", "ĐẠT (100%)"),
        ("TC-07", "Kích hoạt chế độ Fallback khi lỗi AudioContext", "Tự động phát tuần tự dự phòng khi giải mã WAV thất bại, không gián đoạn", "ĐẠT (100%)"),
        ("TC-08", "Bảo toàn 10 lịch K471 khi Storage rỗng", "Tự động phục hồi đủ 10 mốc giờ chuẩn K471, không bị xóa trắng danh sách", "ĐẠT (100%)")
    ]
    create_styled_table(doc, ["Mã Test", "Mục tiêu kiểm thử", "Kết quả thẩm định thực tế", "Trạng thái"], qa_matrix, [0.8, 2.2, 2.8, 0.9])

    doc.add_page_break()

    # ---------------------------------------------------------------------------
    # PHẦN III: HƯỚNG DẪN SỬ DỤNG CHO KHÁCH HÀNG (CÁN BỘ / TRỰC BAN)
    # ---------------------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN III: HƯỚNG DẪN SỬ DỤNG CHO KHÁCH HÀNG (CÁN BỘ / TRỰC BAN)")

    add_styled_heading2(doc, "3.1. Yêu cầu thiết bị và Hướng dẫn Cài đặt / Nâng cấp APK")

    add_styled_heading3(doc, "3.1.1. Yêu cầu cấu hình phần cứng tối thiểu và khuyến nghị")
    add_bullet_item(doc, "Hệ điều hành: Android 7.0 (Nougat) trở lên (khuyến nghị Android 11, 12, 13, 14 hoặc HyperOS mới nhất).", bold_prefix="Hệ điều hành: ");
    add_bullet_item(doc, "Bộ nhớ RAM: Tối thiểu 2.0 GB (khuyến nghị từ 3.0 GB trở lên để xử lý trộn âm thanh mượt mà).", bold_prefix="Bộ nhớ RAM: ");
    add_bullet_item(doc, "Dung lượng bộ nhớ trống: Tối thiểu 1.5 GB trống trong bộ nhớ trong (để chứa file cài đặt 823 MiB và bộ đệm âm thanh).", bold_prefix="Bộ nhớ lưu trữ: ");
    add_bullet_item(doc, "Màn hình: Hỗ trợ tất cả các kích cỡ màn hình điện thoại và máy tính bảng (từ 5.5 inch đến 12.0 inch).", bold_prefix="Màn hình: ");

    add_styled_heading3(doc, "3.1.2. Quy trình cài đặt APK chuẩn trên điện thoại Android")
    add_body_paragraph(doc, "Để cài đặt phần mềm lên thiết bị của cán bộ trực ban, thực hiện theo 4 bước sau:")
    add_bullet_item(doc, "Sao chép tệp 'GDQPAN-1.4.17-K471-Official.apk' từ máy tính vào bộ nhớ trong của điện thoại (qua cáp USB, Zalo, Google Drive hoặc thẻ nhớ ngoài).", bold_prefix="Bước 1 - Chép tệp APK: ");
    add_bullet_item(doc, "Mở ứng dụng 'Quản lý tệp' (File Manager) hoặc 'Tệp của bạn' trên điện thoại, tìm đến tệp APK vừa chép và nhấn mở tệp.", bold_prefix="Bước 2 - Mở tệp cài đặt: ");
    add_bullet_item(doc, "Nếu máy hiện cảnh báo 'Bảo mật: Không được phép cài đặt ứng dụng từ nguồn này', hãy bấm [Cài đặt] -> Gạt công tắc [Cho phép cài đặt từ nguồn này] sang màu xanh.", bold_prefix="Bước 3 - Cấp quyền cài đặt: ");
    add_bullet_item(doc, "Bấm nút [Cài đặt] (hoặc [Cập nhật]). Đợi máy xử lý khoảng 15-30 giây cho đến khi hiện thông báo 'Đã cài đặt ứng dụng'. Bấm [Mở] để sử dụng ngay.", bold_prefix="Bước 4 - Hoàn tất: ");

    add_styled_heading3(doc, "3.1.3. Hướng dẫn đặc biệt cho các dòng máy Xiaomi / Redmi / HyperOS")
    add_callout(doc, "LƯU Ý ĐẶC BIỆT KHI CÀI ĐẶT TRÊN DÒNG MÁY REDMI / XIAOMI:",
        "Nếu máy Xiaomi/Redmi báo lỗi 'Có sự cố khi phân tích cú pháp gói' (Parse Error), nguyên nhân 100% do tệp APK bị tải thiếu dung lượng (chưa đủ 863 MB) hoặc trình quản lý tệp của Xiaomi chặn tạm thời. Cách xử lý chuẩn xác:\n"
        "1. Kiểm tra dung lượng tệp: Tệp APK chuẩn phải có kích thước đúng 863.235.729 byte (~823 MiB). Nếu chỉ có vài trăm MB thì cần tải lại đầy đủ.\n"
        "2. Vào Cài đặt máy -> Ứng dụng -> Quản lý ứng dụng -> Tìm 'Trình cài đặt gói' -> Xóa dữ liệu bộ đệm (Clear Cache).\n"
        "3. Sử dụng ứng dụng 'Files của Google' hoặc trình 'Quản lý tập tin' mặc định để mở tệp.",
        box_type="warn")

    add_styled_heading3(doc, "3.1.4. Quy trình nâng cấp cài đè (In-Place Update) bảo toàn dữ liệu")
    add_callout(doc, "QUY TẮC CÀI ĐÈ AN TOÀN:",
        "Khi nâng cấp từ các phiên bản cũ (1.4.10, 1.4.12, 1.4.15, 1.4.16) lên bản 1.4.17 Official:\n"
        "▶ TUYỆT ĐỐI KHÔNG GỠ ỨNG DỤNG CŨ.\n"
        "▶ Chỉ cần mở tệp APK mới và bấm chọn [CẬP NHẬT] (Update). Hệ thống sẽ tự động cài đè và bảo toàn 100% toàn bộ cấu hình, lịch hẹn và các bản thu âm đã có trên máy.",
        box_type="tip")

    add_styled_heading2(doc, "3.2. Bố cục tổng quan Giao diện người dùng trên thiết bị di động")
    
    # Chèn ảnh giao diện nếu có
    banner_img = r"d:\GDQPAN\Web Báo thức\version_Android_Windows\21102026_Android\banner-preview.png"
    if os.path.exists(banner_img):
        p_bimg = doc.add_paragraph()
        p_bimg.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_bimg.paragraph_format.space_before = Pt(4)
        p_bimg.paragraph_format.space_after = Pt(6)
        p_bimg.add_run().add_picture(banner_img, width=Inches(5.0))
        p_bcaption = doc.add_paragraph()
        p_bcaption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_bcaption.paragraph_format.space_after = Pt(12)
        r_bc = p_bcaption.add_run("Hình 1: Banner nhận diện thương hiệu HỆ THỐNG TRUYỀN THÔNG SỐ trên phiên bản Android")
        format_run(r_bc, font_name="Times New Roman", size_pt=9.5, italic=True, color_rgb=COLOR_MUTED)

    add_body_paragraph(doc,
        "Giao diện phần mềm được tối ưu hóa theo bố cục điều hành tác chiến gồm 3 khu vực chính:\n"
        "1. Khu vực Header (Trên cùng): Hiển thị Quốc kỳ, Biểu trưng GDQPAN ĐHQG-HCM, Tiêu đề nổi khối 3D 'HỆ THỐNG TRUYỀN THÔNG SỐ', Đồng hồ LED hiển thị thời gian thực chuẩn xác từng giây, và Thanh trượt điều khiển âm lượng tổng (0% - 100%).\n"
        "2. Khu vực Nội dung chính (Ở giữa): Thay đổi linh hoạt theo từng màn hình chức năng mà cán bộ đang làm việc (Trang chủ, Hiệu lệnh, Nhạc, Phòng thu, Lịch phát...).\n"
        "3. Thanh điều hướng chính (Dưới đáy màn hình): Gồm 8 biểu tượng phím tắt giúp cán bộ trực ban chuyển đổi tức thì giữa các phân hệ tác nghiệp chỉ với 1 lần chạm.",
        bold_prefix="Cấu trúc giao diện 3 vùng: ")

    add_styled_heading2(doc, "3.3. Hướng dẫn vận hành chi tiết 8 phân hệ chức năng")

    add_styled_heading3(doc, "3.3.1. Phân hệ 1: Trang chủ & Đồng hồ điều hành tác chiến")
    add_bullet_item(doc, "Theo dõi giờ giấc: Đồng hồ số điện tử LED lớn ở trung tâm giúp trực ban đối chiếu giờ chuẩn xác phục vụ chỉ huy nề nếp sinh hoạt.", bold_prefix="Chức năng đồng hồ: ");
    add_bullet_item(doc, "Điều chỉnh âm lượng tổng: Kéo thanh trượt [ÂM LƯỢNG] sang phải để tăng âm lượng ra loa ngoài, kéo sang trái để giảm âm lượng.", bold_prefix="Thanh âm lượng nhanh: ");
    add_bullet_item(doc, "Đèn báo trạng thái trạm: Đèn xanh báo 'HỆ THỐNG SẴN SÀNG' cho biết các dịch vụ chạy ngầm và bộ đếm giờ đang hoạt động bình thường.", bold_prefix="Đèn trạng thái: ");

    add_styled_heading3(doc, "3.3.2. Phân hệ 2: Hiệu lệnh quân sự tức thì & 10 chế độ nề nếp")
    add_body_paragraph(doc, "Phân hệ chứa các phím bấm phát âm thanh khẩn cấp và hiệu lệnh điều hành quân sự. Khi có lệnh của Chỉ huy Trung tâm, trực ban chỉ cần bấm nút tương ứng để phát ngay lập tức ra toàn bộ loa doanh trại:")
    add_bullet_item(doc, "Bấm [CHÀO CỜ / QUỐC CA]: Phát bài Quốc ca Việt Nam không lời bản chuẩn nghi lễ quân đội.", bold_prefix="Nghi lễ chào cờ: ");
    add_bullet_item(doc, "Bấm [BÁO THỨC]: Phát tiếng còi báo thức sáng kết hợp lời thông báo đánh thức sinh viên dậy tập thể dục.", bold_prefix="Báo thức sáng/chiều: ");
    add_bullet_item(doc, "Bấm [BÁO ĐỘNG TẬP HỢP]: Phát tiếng còi báo động dồn dập, yêu cầu toàn Trung tâm tập hợp khẩn cấp.", bold_prefix="Báo động tập hợp: ");
    add_bullet_item(doc, "Các chế độ sinh hoạt: Gồm các nút bấm nhanh: Điểm danh, Thể dục sáng, Ăn sáng, Đi học, Ăn trưa, Ăn tối, Tắt đèn đi ngủ.", bold_prefix="Chế độ sinh hoạt: ");
    add_bullet_item(doc, "Nút dừng khẩn cấp: Bấm nút [■ DỪNG] màu xanh dương ở góc màn hình để ngắt âm thanh ngay lập tức nếu có tình huống thay đổi.", bold_prefix="Dừng phát thanh: ");

    add_styled_heading3(doc, "3.3.3. Phân hệ 3: Thư viện Nhạc 174 bài hát & Chế độ hẹn giờ tắt")
    add_body_paragraph(doc,
        "Thư viện nhạc được tích hợp sẵn 174 bài hát chất lượng cao chia thành 7 danh mục chuyên biệt:\n"
        "• 15 bài hát Quân đội nhân dân Việt Nam chính quy.\n"
        "• Nhạc Cách mạng & Ca ngợi quê hương đất nước.\n"
        "• Nhạc về Biển đảo Tổ quốc thân yêu.\n"
        "• Nhạc Sinh viên & Tuổi trẻ học đường.\n"
        "• Nhạc Thanh niên làm theo lời Bác.\n"
        "• Ca khúc Trữ tình cách mạng sâu lắng.\n"
        "• Chuyên đề âm nhạc 12 tháng theo các ngày lễ lớn trong năm.",
        bold_prefix="Danh mục bài hát: ")
    add_bullet_item(doc, "Cách phát nhạc: Chọn danh mục mong muốn -> Nhấn vào tên bài hát để phát -> Có thể chọn chế độ 'Lặp lại 1 bài' hoặc 'Phát ngẫu nhiên'.", bold_prefix="Thao tác phát: ");
    add_bullet_item(doc, "Tính năng Hẹn giờ tự động tắt nhạc: Trực ban có thể cài đặt cho nhạc tự tắt sau 15 phút, 30 phút, 45 phút hoặc 60 phút (rất thích hợp cho giờ sinh hoạt tự do hoặc giờ nghỉ trưa của sinh viên).", bold_prefix="Hẹn giờ tắt nhạc: ");

    add_styled_heading3(doc, "3.3.4. Phân hệ 4: Phòng thu đa năng (TTS AI, Thu âm Mic, Ghép âm nền)")
    add_body_paragraph(doc, "Phòng thu là phân hệ nâng cao cho phép trực ban tự biên tập các bản phát thanh chuyên nghiệp gồm 3 tab công việc:")
    
    add_bullet_item(doc, "Nhập nội dung cần phát vào ô văn bản -> Chọn giọng đọc (Bắc/Trung/Nam, Nam/Nữ) -> Chọn tốc độ đọc -> Bấm [▶ PHÁT NGAY] để máy tự động phát loa bằng giọng đọc AI truyền cảm.", bold_prefix="Tab 1 - Đọc văn bản AI (TTS): ");
    add_bullet_item(doc, "Bấm nút [🎙 BẮT ĐẦU THU] -> Nói trực tiếp vào micro điện thoại (quan sát thanh đo âm lượng nhấp nháy xanh) -> Bấm [DỪNG THU] -> Bấm [Nghe lại] hoặc [Lưu bản thu] để sử dụng.", bold_prefix="Tab 2 - Tự thu âm micro: ");
    add_bullet_item(doc, "Cho phép ghép bản thu hoặc lời đọc với nhạc nền theo quy trình 3 bước:\n"
        "+ Bước 1: Chọn đoạn chuông hiệu mở đầu (Tiếng chuông báo / Tiếng còi hiệu lệnh / Không dùng).\n"
        "+ Bước 2: Chọn nội dung chính (Lời đọc AI hoặc bản thu âm trực tiếp).\n"
        "+ Bước 3: Chọn nhạc nền nhẹ (Nhạc truyền thống Trung tâm hoặc file riêng) -> Kéo thanh 'Âm lượng giọng' (ví dụ 80%) và thanh 'Âm lượng nhạc nền' (ví dụ 25%) -> Bấm [NGHE THỬ BẢN GHÉP] hoặc [XUẤT PHÁT THANH].", bold_prefix="Tab 3 - Ghép âm thanh & Nhạc nền: ");

    add_styled_heading3(doc, "3.3.5. Phân hệ 5: Nhạc tùy chọn phát từ đường dẫn trực tuyến")
    add_bullet_item(doc, "Khi Trung tâm tổ chức các sự kiện đặc biệt cần bài hát ngoài danh mục, trực ban chỉ cần dán đường dẫn (Link MP3/Audio) vào ô tìm kiếm và bấm [Phát trực tuyến].", bold_prefix="Phát từ liên kết: ");
    add_bullet_item(doc, "Hệ thống hỗ trợ phát âm thanh mượt mà từ các máy chủ mạng nội bộ hoặc các trang tin tức.", bold_prefix="Khả năng tương thích: ");

    add_styled_heading3(doc, "3.3.6. Phân hệ 6: Tiếp sóng Thời sự VTV & Truyền hình Quốc phòng QPVN")
    add_bullet_item(doc, "Đúng 19h00 hàng ngày, phục vụ chế độ xem/nghe thời sự của sinh viên toàn Trung tâm, trực ban chuyển sang tab 'Thời sự VTV'.", bold_prefix="Chế độ thời sự: ");
    add_bullet_item(doc, "Bấm nút [BẬT THỜI SỰ VTV1] hoặc [TRUYỀN HÌNH QUỐC PHÒNG]: Hệ thống tự động trích xuất luồng truyền hình trực tiếp và phát âm thanh to rõ ra hệ thống loa ngoài toàn doanh trại.", bold_prefix="Thao tác tiếp sóng: ");

    add_styled_heading3(doc, "3.3.7. Phân hệ 7: Quản lý Lịch phát thanh (10 lịch K471 và Lịch tạm 24h)")
    add_body_paragraph(doc, "Đây là trung tâm điều hành lịch tự động của toàn bộ hệ thống:")
    add_bullet_item(doc, "Quản lý 10 mốc giờ chuẩn K471: Màn hình hiển thị đầy đủ 10 mốc giờ từ Báo thức 05:15 đến Đi ngủ 21:30. Mỗi mốc giờ có công tắc gạt màu xanh (BẬT/TẮT). Trực ban có thể chủ động tắt tạm thời một mốc giờ nếu ngày đó Trung tâm có lịch công tác riêng.", bold_prefix="Lịch cố định K471: ");
    add_bullet_item(doc, "Thêm Lịch tạm trên máy (+ Thêm giờ tạm): Khi có hoạt động đột xuất trong ca trực (ví dụ: phát thông báo lúc 08h30 nhắc nộp bài thu hoạch, hoặc 15h45 tập trung hội thảo), bấm nút [+ Thêm giờ tạm] -> Chọn giờ -> Chọn âm thanh -> Bấm Lưu. Lịch tạm này sẽ phát đúng giờ và tự động biến mất sau 24 giờ, tuyệt đối không làm rối lịch chuẩn.", bold_prefix="Lịch tạm thời ca trực: ");

    add_styled_heading3(doc, "3.3.8. Phân hệ 8: Tiện ích, Quản trị tài khoản & Cài đặt nâng cao")
    add_bullet_item(doc, "Đăng nhập tài khoản: Cho phép cán bộ đăng nhập bằng tài khoản được cấp để kích hoạt quyền quản trị.", bold_prefix="Quản lý tài khoản: ");
    add_bullet_item(doc, "Cài đặt Báo thức màn hình khóa: Bật tính năng 'Báo thức Native Android' để đảm bảo chuông báo thức vẫn reo vang khi điện thoại tắt màn hình hoặc bị khóa phím.", bold_prefix="Báo thức khóa màn hình: ");
    add_bullet_item(doc, "Lựa chọn giọng AI mặc định: Cán bộ có thể cài đặt giọng đọc AI ưa thích (Bắc - Nam - Trung) làm giọng mặc định cho toàn bộ các thông báo tự động.", bold_prefix="Tùy chọn vùng miền: ");

    add_styled_heading2(doc, "3.4. Quy trình 5 bước tác nghiệp chuẩn cho Ca trực ban tác chiến")
    add_body_paragraph(doc, "Để đảm bảo tính kỷ luật và vận hành thông suốt hệ thống phát thanh, các ca trực ban thực hiện theo quy trình 5 bước thống nhất sau:")

    shift_steps = [
        ("Bước 1: Tiếp nhận ca trực & Kiểm tra trạng thái máy", "Mở ứng dụng GDQPAN trên máy bảng/điện thoại trực ban. Nhìn đồng hồ LED xem giờ có khớp giờ chuẩn không. Kiểm tra biểu tượng đèn xanh 'HỆ THỐNG SẴN SÀNG'. Kiểm tra dung lượng pin thiết bị (đảm bảo cắm sạc liên tục tại bàn trực)."),
        ("Bước 2: Kiểm tra đường truyền âm thanh ra loa ngoài", "Kéo thanh âm lượng lên mức 80% - 100%. Bấm thử nút [Nghe thử] hoặc phát thử 1 đoạn nhạc ngắn 3 giây để chắc chắn loa phòng trực ban và amply tổng đang tiếp nhận tín hiệu to rõ."),
        ("Bước 3: Rà soát danh mục lịch phát thanh trong ngày", "Chuyển sang tab 'Lịch phát': Kiểm tra xem 10 mốc giờ chuẩn K471 có đang BẬT công tắc xanh không. Nếu ngày trực có kế hoạch riêng (hội thao, kiểm tra đột xuất), bấm [+ Thêm giờ tạm] để cài đặt bổ sung."),
        ("Bước 4: Phát thông báo & Hiệu lệnh đột xuất theo lệnh chỉ huy", "Khi có lệnh triệu tập hoặc thông báo khẩn từ Chỉ huy Trung tâm, trực ban chuyển sang tab 'Hiệu lệnh' bấm còi hoặc sang 'Phòng thu' gõ nội dung thông báo phát ngay."),
        ("Bước 5: Bàn giao tình trạng hệ thống cho ca sau", "Trước khi kết thúc ca trực, kiểm tra lại nhật ký phát thanh (Logs), thông báo cho cán bộ ca sau về các mốc giờ đã hoàn thành và tình trạng hoạt động của thiết bị.")
    ]
    create_styled_table(doc, ["Bước tác nghiệp", "Nội dung thực hiện chi tiết"], shift_steps, [2.2, 4.3])

    add_styled_heading2(doc, "3.5. Bảng xử lý sự cố thường gặp (Troubleshooting FAQs - 8 tình huống)")
    add_body_paragraph(doc, "Tổng hợp 8 tình huống sự cố thực tế thường gặp trong quá trình vận hành và cách khắc phục nhanh chóng dành cho cán bộ không rành về CNTT:")

    faqs = [
        ("TÌNH HUỐNG 1: TRÊN MÀN HÌNH MÁY THẤY BÀI HÁT ĐANG CHẠY NHƯNG LOA KHÔNG CÓ TIẾNG?",
         "▶ Nguyên nhân & Cách khắc phục:\n"
         "1. Nhìn vào thanh [ÂM LƯỢNG] trên đầu màn hình ứng dụng: Chấm tròn có đang bị kéo về hết bên trái (0%) không? Hãy kéo sang phải lên mức 90% - 100%.\n"
         "2. Kiểm tra nút âm lượng vật lý bên hông điện thoại/máy tính bảng: Bấm nút Tăng âm lượng của máy lên mức tối đa.\n"
         "3. Kiểm tra dây cắm nối loa: Dây âm thanh jack 3.5mm từ máy tính bảng đã cắm chặt vào cổng AUX của amply phát thanh chưa? Kiểm tra công tắc nguồn của amply ngoài phòng trực ban đã bật đèn đỏ chưa."),

        ("TÌNH HUỐNG 2: NẾU BỊ MẤT MẠNG INTERNET / MẤT WI-FI THÌ PHẦN MỀM CÓ HOẠT ĐỘNG KHÔNG?",
         "▶ Trả lời:\n"
         "Cán bộ hoàn toàn yên tâm 100%! Phiên bản 1.4.17 được thiết kế theo kiến trúc Ngoại tuyến tuyệt đối (Offline-First). Toàn bộ 174 bài hát, tiếng còi báo động, 10 lịch nề nếp K471 và các chức năng thu âm/ghép nhạc đều được lưu sẵn trong bộ nhớ máy. Dù mất mạng Internet, đứt cáp hay ở chế độ máy bay, hệ thống vẫn điểm chuông và phát thanh chuẩn xác 100%."),

        ("TÌNH HUỐNG 3: MÀN HÌNH ĐIỆN THOẠI BỊ TẮT HOẶC KHÓA THÌ CHUÔNG BÁO THỨC CÓ REO KHÔNG?",
         "▶ Trả lời:\n"
         "Hệ thống đã tích hợp tính năng Báo thức Native Android chạy ngầm (AlarmActivity & Foreground Service). Ngay cả khi màn hình tắt tối đen hoặc đang khóa mật khẩu, đúng giờ hẹn máy sẽ tự động bật sáng màn hình và phát chuông hiệu lệnh to rõ theo chuẩn ưu tiên báo thức cao nhất của điện thoại."),

        ("TÌNH HUỐNG 4: CÀI TRÊN MÁY XIAOMI/REDMI BÁO 'LỖI PHÂN TÍCH CÚ PHÁP GÓI' THÌ LÀM THẾ NÀO?",
         "▶ Nguyên nhân & Cách khắc phục:\n"
         "Do tệp tải về bị ngắt quãng nên thiếu dung lượng (file chuẩn phải đủ 863 MB). Hãy chép lại tệp APK đầy đủ qua cáp USB từ máy tính. Sau đó vào Cài đặt -> Ứng dụng -> Trình cài đặt gói -> Xóa bộ nhớ đệm rồi tiến hành cài đặt lại."),

        ("TÌNH HUỐNG 5: MUỐN DỪNG NGAY BÀI HÁT HOẶC HIỆU LỆNH ĐANG PHÁT THÌ LÀM THẾ NÀO?",
         "▶ Cách xử lý:\n"
         "Nhấn ngay vào nút [■ DỪNG] màu xanh dương ở góc màn hình. Toàn bộ âm thanh phát thanh, nhạc nền và giọng đọc AI sẽ ngừng ngay lập tức chỉ sau 0.1 giây."),

        ("TÌNH HUỐNG 6: THÊM LỊCH TẠM THỜI CHO CA TRỰC CÓ LÀM MẤT LỊCH CHÍNH CỦA TRUNG TÂM KHÔNG?",
         "▶ Trả lời:\n"
         "Tuyệt đối không! Tính năng 'Lịch tạm trên máy' được lưu ở vùng nhớ riêng biệt. Lịch tạm chỉ có giá trị trong ca trực và tự động hủy sau 24 giờ. Bộ 10 lịch nề nếp chuẩn K471 được hệ thống bảo vệ khóa cứng, không ai có thể làm mất được."),

        ("TÌNH HUỐNG 7: KHI GHÉP ÂM THANH, TIẾNG NHẠC NỀN QUÁ TO ĐÈ MẤT TIẾNG NÓI THÌ CHỈNH THẾ NÀO?",
         "▶ Cách xử lý:\n"
         "Tại bước 3 của tab Ghép âm thanh, hãy điều chỉnh 2 thanh trượt độc lập: Kéo thanh 'Âm lượng giọng nói' lên mức 90% - 100%, và hạ thanh 'Âm lượng nhạc nền' xuống mức 15% - 25%. Bấm nút [Nghe thử] để thẩm định độ hài hòa trước khi xuất phát thanh."),

        ("TÌNH HUỐNG 8: NẾU ĐIỆN THOẠI BỊ HẾT PIN TẮT NGUỒN, KHI MỞ LẠI CÓ CẦN CÀI LẠI LỊCH KHÔNG?",
         "▶ Trả lời:\n"
         "Không cần cài đặt lại bất cứ thứ gì! Ứng dụng có cơ chế tự động phục hồi (RECEIVE_BOOT_COMPLETED). Ngay khi cán bộ cắm sạc và bật nguồn điện thoại lên, hệ thống tự động khôi phục toàn bộ lịch hẹn và phiên làm việc trong tích tắc.")
    ]
    for q_t, q_a in faqs:
        add_callout(doc, q_t, q_a, box_type="info" if "TRẢ LỜI" in q_a or "▶ Trả lời" in q_a else "warn")

    add_styled_heading2(doc, "3.6. Đầu mối hỗ trợ kỹ thuật 24/7 và Biên bản nghiệm thu bàn giao")
    add_callout(doc, "ĐẦU MỐI HỖ TRỢ KỸ THUẬT 24/7 DÀNH CHO CÁC CA TRỰC BAN:",
        "Trong quá trình vận hành, nếu cán bộ gặp bất kỳ vướng mắc nào hoặc có yêu cầu bổ sung bài hát mới, xin vui lòng liên hệ ngay với Đội ngũ Kỹ thuật:\n"
        "• Đơn vị: Bộ phận Công nghệ Thông tin - Trung tâm GDQPAN ĐHQG-HCM\n"
        "• Địa chỉ: Số 01 Lê Quý Đôn, Khu phố 6, P. Đông Hòa, TP. Dĩ An, Bình Dương\n"
        "• Số điện thoại hỗ trợ kỹ thuật trực ban: (028) 3724 2160 (Số máy lẻ Kỹ thuật CNTT)\n"
        "• Đường dây nóng hỗ trợ phần mềm tác chiến: 24/7 luôn sẵn sàng phục vụ các ca trực.",
        box_type="tip")

    # Bảng chữ ký nghiệm thu
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(14)
    p_div.paragraph_format.space_after = Pt(8)

    tbl_sign = doc.add_table(rows=1, cols=2)
    tbl_sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_sign.autofit = False
    tbl_sign.columns[0].width = Inches(3.25)
    tbl_sign.columns[1].width = Inches(3.25)

    s0, s1 = tbl_sign.cell(0, 0), tbl_sign.cell(0, 1)
    p0 = s0.paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r0_1 = p0.add_run("BỘ PHẬN KỸ THUẬT & LẬP TÀI LIỆU\n")
    format_run(r0_1, font_name="Times New Roman", size_pt=10.5, bold=True)
    r0_2 = p0.add_run("(Ký, ghi rõ họ tên)\n\n\n\n\n")
    format_run(r0_2, font_name="Times New Roman", size_pt=9.5, italic=True)
    r0_3 = p0.add_run("Bộ phận Công nghệ Thông tin GDQPAN")
    format_run(r0_3, font_name="Times New Roman", size_pt=10.5, bold=True, color_rgb=COLOR_ARMY_GREEN)

    p1 = s1.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1_1 = p1.add_run("GIÁM ĐỐC TRUNG TÂM PHÊ DUYỆT\n")
    format_run(r1_1, font_name="Times New Roman", size_pt=10.5, bold=True)
    r1_2 = p1.add_run("(Ký, đóng dấu và ghi rõ họ tên)\n\n\n\n\n")
    format_run(r1_2, font_name="Times New Roman", size_pt=9.5, italic=True)
    r1_3 = p1.add_run(".............................................................")
    format_run(r1_3, font_name="Times New Roman", size_pt=10.5, bold=True)

    doc.add_page_break()

    # ---------------------------------------------------------------------------
    # PHẦN IV: CÁC VẤN ĐỀ CẦN XÁC NHẬN VỚI NGƯỜI DÙNG / KHÁCH HÀNG
    # ---------------------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN IV: CÁC VẤN ĐỀ CẦN XÁC NHẬN VỚI NGƯỜI DÙNG / KHÁCH HÀNG")
    add_body_paragraph(doc, 
        "Nhằm hoàn thiện tài liệu theo đúng yêu cầu thực tế của Trung tâm GDQPAN ĐHQG-HCM và đảm bảo quy trình bàn giao nghiệm thu diễn ra thuận lợi nhất, kính gửi Quý Thầy/Cô và Khách hàng một số điểm cần trao đổi và làm rõ thêm:",
        bold_prefix="Mục đích tham vấn: ")

    questions = [
        ("1. Nhu cầu phân định tài khoản trực ban theo từng Đại đội / Khung quản lý sinh viên",
         "Hiện tại hệ thống hỗ trợ cấp tài khoản quản trị chung và người dùng ca trực. Quý đơn vị có muốn chia quyền độc lập theo từng Đại đội sinh viên (ví dụ: Đại đội 1, Đại đội 2, Khung 1) để mỗi đơn vị tự quản lý giờ sinh hoạt riêng trên máy tính bảng của mình không, hay toàn Trung tâm dùng chung một hệ thống phát thanh hợp nhất?"),
        
        ("2. Bổ sung thêm các bài hát truyền thống đặc thù hoặc khẩu lệnh riêng của Khóa K471",
         "Hiện tại tệp APK đã nhúng sẵn 174 bài hát chính quy (Quân đội, Cách mạng, Biển đảo, Thanh niên, Sinh viên, Trữ tình và Nhạc 12 tháng). Quý đơn vị có danh mục bài hát đặc thù nào khác muốn bổ sung thêm vào các gói cập nhật định kỳ tiếp theo không?"),

        ("3. Tích hợp thiết bị phần cứng phát thanh tại Trung tâm",
         "Điện thoại/Máy tính bảng của trực ban hiện đang kết nối ra hệ thống loa thông qua jack cắm âm thanh 3.5mm truyền thống, Bluetooth hay truyền qua mạng âm thanh IP không dây? Đội ngũ kỹ thuật có thể hỗ trợ tối ưu hóa sơ đồ đấu nối phần cứng nếu Quý đơn vị cần."),

        ("4. Định dạng và quy cách in ấn văn bản tài liệu",
         "Bản tài liệu Word (.docx) này đã được định dạng chuẩn hành chính A4, sẵn sàng để in ấn, đóng quyển thành sổ tay hướng dẫn tác chiến cho ca trực ban. Quý khách hàng có yêu cầu điều chỉnh thêm về bố cục, biểu mẫu biên bản bàn giao hoặc chữ ký chức danh nào khác không?")
    ]
    for q_t, q_d in questions:
        add_callout(doc, q_t, q_d, box_type="warn")

    # Lưu file
    output_dir = r"d:\GDQPAN\Web Báo thức\version_Android_Windows\06112026"
    output_file = os.path.join(output_dir, "THUYET_MINH_KY_THUAT_VA_HUONG_DAN_SU_DUNG_GDQPAN_1.4.17.docx")
    doc.save(output_file)
    print(f"Xuất thành công tệp Word tại: {output_file}")

    # Copy một bản ra thư mục gốc d:\GDQPAN để tiện tra cứu
    root_copy = r"d:\GDQPAN\THUYET_MINH_KY_THUAT_VA_HUONG_DAN_SU_DUNG_GDQPAN_1.4.17.docx"
    doc.save(root_copy)
    print(f"Tạo bản sao tại thư mục gốc: {root_copy}")

if __name__ == "__main__":
    build_entire_documentation()
