# -*- coding: utf-8 -*-
"""
Script tạo tài liệu Word (DOCX):
HƯỚNG DẪN SỬ DỤNG HỆ THỐNG THÔNG BÁO VÀ PHÁT THANH TỰ ĐỘNG GDQPAN
Dành cho người không rành về công nghệ thông tin
Trung tâm Giáo dục Quốc phòng và An ninh - ĐHQG-HCM
"""

import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
    """Set padding for a table cell (in twips: 20 twips = 1 pt)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin_name, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{margin_name}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    """Set background color of a cell."""
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)

def set_cell_left_border_only(cell, color_hex="0A4D3C", sz="36"):
    """Set thick left border, no top/bottom/right border (for callout box)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>\n'
        f'  <w:top w:val="none"/>\n'
        f'  <w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>\n'
        f'  <w:bottom w:val="none"/>\n'
        f'  <w:right w:val="none"/>\n'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)

def set_table_borders(table, color_hex="D1D5DB", sz="4"):
    """Set subtle outer and inner borders for data tables."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>\n'
        f'  <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>\n'
        f'  <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>\n'
        f'  <w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>\n'
        f'  <w:insideV w:val="none"/>\n'
        f'  <w:left w:val="none"/>\n'
        f'  <w:right w:val="none"/>\n'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def format_run(run, font_name="Times New Roman", size_pt=11, bold=False, italic=False, color_rgb=None):
    """Format font and color for a text run."""
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    if color_rgb:
        run.font.color.rgb = color_rgb

def add_styled_heading1(doc, text):
    """Add Heading 1 with military dark green color, bold, with borders."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    format_run(run, font_name="Times New Roman", size_pt=14, bold=True, color_rgb=RGBColor(10, 77, 60))
    return p

def add_styled_heading2(doc, text):
    """Add Heading 2 with crimson red / deep green."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    format_run(run, font_name="Times New Roman", size_pt=12.5, bold=True, color_rgb=RGBColor(192, 57, 43))
    return p

def add_styled_heading3(doc, text):
    """Add Heading 3 with charcoal color."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    format_run(run, font_name="Times New Roman", size_pt=11.5, bold=True, color_rgb=RGBColor(44, 62, 80))
    return p

def add_styled_paragraph(doc, text, bold_prefix="", space_after=5):
    """Add normal body paragraph."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.2
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        format_run(r_pre, font_name="Times New Roman", size_pt=11, bold=True, color_rgb=RGBColor(20, 20, 20))
    r_txt = p.add_run(text)
    format_run(r_txt, font_name="Times New Roman", size_pt=11, bold=False, color_rgb=RGBColor(35, 35, 35))
    return p

def add_callout(doc, title, text, box_type="info"):
    """
    Add a styled callout box (1x1 table)
    box_type: 'info' (green), 'warning' (red), 'tip' (yellow/amber), 'step' (blue)
    """
    colors = {
        'info': {'border': '0A4D3C', 'bg': 'F2F8F5', 'title_color': RGBColor(10, 77, 60), 'icon': '📌 '},
        'warning': {'border': 'C0392B', 'bg': 'FDF4F3', 'title_color': RGBColor(192, 57, 43), 'icon': '⚠️ '},
        'tip': {'border': 'D4AC0D', 'bg': 'FEFDF0', 'title_color': RGBColor(183, 149, 11), 'icon': '💡 '},
        'step': {'border': '1E3A8A', 'bg': 'F0F4FC', 'title_color': RGBColor(30, 58, 138), 'icon': '▶ '},
    }
    cfg = colors.get(box_type, colors['info'])
    
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_margins(cell, top=120, bottom=120, left=180, right=160)
    set_cell_shading(cell, cfg['bg'])
    set_cell_left_border_only(cell, cfg['border'], sz="36")
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    run_icon = p.add_run(cfg['icon'])
    format_run(run_icon, font_name="Times New Roman", size_pt=11, bold=True, color_rgb=cfg['title_color'])
    
    run_title = p.add_run(title + "\n")
    format_run(run_title, font_name="Times New Roman", size_pt=11, bold=True, color_rgb=cfg['title_color'])
    
    run_text = p.add_run(text)
    format_run(run_text, font_name="Times New Roman", size_pt=10.5, color_rgb=RGBColor(44, 62, 80))
    
    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(0)
    p_spacer.paragraph_format.space_after = Pt(3)

def create_user_guide():
    doc = docx.Document()
    
    # Page Setup: A4, standard Vietnamese margins
    section = doc.sections[0]
    section.page_width = Inches(8.27)   # 21.0 cm
    section.page_height = Inches(11.69) # 29.7 cm
    section.top_margin = Inches(0.79)    # 2.0 cm
    section.bottom_margin = Inches(0.79) # 2.0 cm
    section.left_margin = Inches(0.98)   # 2.5 cm
    section.right_margin = Inches(0.79)  # 2.0 cm
    
    # -------------------------------------------------------------
    # TRANG BÌA / PHẦN ĐẦU TÀI LIỆU
    # -------------------------------------------------------------
    tbl_header = doc.add_table(rows=1, cols=2)
    tbl_header.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_header.autofit = False
    
    c1, c2 = tbl_header.cell(0, 0), tbl_header.cell(0, 1)
    c1.width = Inches(3.25)
    c2.width = Inches(3.25)
    
    p1 = c1.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_after = Pt(2)
    r1 = p1.add_run("ĐẠI HỌC QUỐC GIA TP.HCM\n")
    format_run(r1, font_name="Times New Roman", size_pt=10, bold=True, color_rgb=RGBColor(60, 60, 60))
    r2 = p1.add_run("TRUNG TÂM GIÁO DỤC\nQUỐC PHÒNG VÀ AN NINH\n")
    format_run(r2, font_name="Times New Roman", size_pt=10, bold=True, color_rgb=RGBColor(10, 77, 60))
    r3 = p1.add_run("Số: 01/HD-GDQPAN")
    format_run(r3, font_name="Times New Roman", size_pt=9.5, italic=True)
    
    p2 = c2.paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.space_after = Pt(2)
    r4 = p2.add_run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n")
    format_run(r4, font_name="Times New Roman", size_pt=10, bold=True)
    r5 = p2.add_run("Độc lập - Tự do - Hạnh phúc\n")
    format_run(r5, font_name="Times New Roman", size_pt=10, bold=True, color_rgb=RGBColor(192, 57, 43))
    r6 = p2.add_run("TP. Hồ Chí Minh, ngày 21 tháng 09 năm 2026")
    format_run(r6, font_name="Times New Roman", size_pt=9.5, italic=True)
    
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(8)
    p_div.paragraph_format.space_after = Pt(12)
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_div = p_div.add_run("———————————— ★ ————————————")
    format_run(r_div, font_name="Times New Roman", size_pt=11, bold=True, color_rgb=RGBColor(10, 77, 60))
    
    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(6)
    p_title.paragraph_format.space_after = Pt(4)
    r_title1 = p_title.add_run("TÀI LIỆU HƯỚNG DẪN SỬ DỤNG\n")
    format_run(r_title1, font_name="Times New Roman", size_pt=17, bold=True, color_rgb=RGBColor(192, 57, 43))
    r_title2 = p_title.add_run("HỆ THỐNG THÔNG BÁO VÀ PHÁT THANH TỰ ĐỘNG GDQPAN\n")
    format_run(r_title2, font_name="Times New Roman", size_pt=15, bold=True, color_rgb=RGBColor(10, 77, 60))
    r_title3 = p_title.add_run("(Sổ tay thao tác trực quan, dễ hiểu - Dành riêng cho người không rành Công nghệ thông tin)")
    format_run(r_title3, font_name="Times New Roman", size_pt=11, italic=True, color_rgb=RGBColor(80, 80, 80))
    
    # Khẩu hiệu & Đối tượng
    add_callout(doc, "MỤC ĐÍCH TÀI LIỆU VÀ ĐỐI TƯỢNG SỬ DỤNG",
        "• Tài liệu này được biên soạn đặc biệt cho Cán bộ chỉ huy, Cán bộ trực ban cơ quan, Giảng viên quân sự và Cán bộ khung đại đội tại Trung tâm GDQPAN - ĐHQG-HCM.\n"
        "• Nguyên tắc biên soạn: Cực kỳ dễ hiểu, không sử dụng thuật ngữ công nghệ phức tạp, hướng dẫn từng bước bấm chuột/chạm tay rõ ràng (Bước 1 - Bước 2 - Bước 3), bất kỳ ai cũng có thể sử dụng thành thạo ngay sau 5 phút đọc tài liệu.",
        box_type="info")
    
    # -------------------------------------------------------------
    # PHẦN I: GIỚI THIỆU CHUNG & LỢI ÍCH CỦA HỆ THỐNG
    # -------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN I: GIỚI THIỆU CHUNG VÀ LỢI ÍCH THỰC TẾ CỦA HỆ THỐNG")
    
    add_styled_paragraph(doc, 
        "Trung tâm Giáo dục Quốc phòng và An ninh (ĐHQG-HCM) là môi trường rèn luyện kỷ cương quân đội nghiêm minh, với số lượng sinh viên học tập, sinh hoạt tập trung rất lớn. Việc duy trì giờ giấc chính quy và truyền đạt các mệnh lệnh, thông báo kịp thời là yếu tố sống còn trong quản lý sinh viên.",
        bold_prefix="1. Bối cảnh: ")
    
    add_styled_paragraph(doc, 
        "Hệ thống Phát thanh & Thông báo Tự động GDQPAN là trang web/phần mềm điều khiển thông minh được cài đặt tại Phòng Trực ban Chỉ huy và đồng bộ trên điện thoại của cán bộ. Hệ thống thay thế hoàn toàn các phương pháp thủ công cũ như: trực ban phải ngồi canh đồng hồ để bấm chuông, tìm đĩa CD để bật nhạc chào cờ, hay phải tự cầm micro đọc thông báo lặp đi lặp lại nhiều lần.",
        bold_prefix="2. Hệ thống này là gì? ")
    
    add_styled_paragraph(doc, "Khi đưa hệ thống vào vận hành, cán bộ sẽ nhận được các lợi ích thiết thực sau:", bold_prefix="3. Năm lợi ích vượt trội: ")
    
    benefits = [
        ("✔ Chuẩn hóa 100% nề nếp kỷ luật quân đội: ", "Không bao giờ lo quên giờ hay chậm trễ. Báo thức đúng 05h30, thể dục sáng, giờ ăn cơm, điểm danh 21h00, tắt đèn đi ngủ 21h30... hệ thống tự động đổ chuông và phát thanh viên nhắc nhở chính xác từng giây."),
        ("✔ Giảm tải tối đa áp lực cho Trực ban: ", "Cán bộ trực ban không cần ngồi túc trực bên micro để đọc thông báo khản cả cổ. Chỉ cần gõ vài dòng chữ, giọng đọc phát thanh viên chuẩn 3 miền sẽ tự động phát to, rõ ràng, truyền cảm toàn Trung tâm."),
        ("✔ Thao tác '1 Chạm là Xong': ", "Chào cờ, Báo động tác chiến, Báo thức, Điểm danh... tất cả đã được thiết kế sẵn thành các nút bấm lớn có biểu tượng rõ ràng. Bấm 1 cái là phát ngay lập tức."),
        ("✔ Hoạt động linh hoạt trên cả Máy tính và Điện thoại: ", "Tại phòng trực ban dùng máy tính để bàn để hẹn giờ tự động; khi cán bộ đi kiểm tra ngoài thao trường, giảng đường hay ký túc xá thì dùng điện thoại di động để phát lệnh từ xa rất tiện lợi."),
        ("✔ Hoạt động 100% không lo mất mạng Internet: ", "Toàn bộ tiếng còi báo động, còi tập hợp, kèn báo thức, nhạc chào cờ và danh sách bài hát đều được lưu trực tiếp trên máy, dù mất mạng Internet hệ thống vẫn hoạt động bình thường.")
    ]
    for b_prefix, b_text in benefits:
        add_styled_paragraph(doc, b_text, bold_prefix=b_prefix, space_after=3)
        
    # -------------------------------------------------------------
    # PHẦN II: HƯỚNG DẪN KHỞI ĐỘNG VÀ BẮT ĐẦU SỬ DỤNG
    # -------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN II: CÁCH KHỞI ĐỘNG VÀ BẮT ĐẦU SỬ DỤNG (1 PHÚT LÀ XONG)")
    
    add_styled_heading2(doc, "1. Cách mở hệ thống trên Máy tính để bàn (Phòng Trực ban Chỉ huy)")
    add_styled_paragraph(doc, "Trên máy tính để bàn hoặc laptop tại phòng trực ban, cán bộ thực hiện 1 trong 2 cách cực kỳ đơn giản sau:")
    
    add_callout(doc, "CÁCH 1: BẤM VÀO BIỂU TƯỢNG PHẦN MỀM TRÊN MÀN HÌNH CHÍNH (KHUYÊN DÙNG)",
        "• Bước 1: Nhìn ra màn hình chính của máy tính (Desktop), tìm biểu tượng có hình Cờ đỏ sao vàng hoặc logo GDQPAN mang tên 'GDQPAN' hoặc tệp 'chay_phan_mem_GDQPAN.bat'.\n"
        "• Bước 2: Bấm đúp chuột trái (nhấp nhanh 2 lần liên tiếp vào biểu tượng).\n"
        "• Bước 3: Cửa sổ phần mềm GDQPAN sẽ tự động mở lên toàn màn hình. Dịch vụ giọng đọc và âm thanh sẽ tự động khởi động ngầm trong 2-3 giây mà cán bộ không cần phải thao tác gì thêm.",
        box_type="step")
    
    add_callout(doc, "CÁCH 2: MỞ BẰNG TRÌNH DUYỆT WEB (GOOGLE CHROME, CỐC CỐC HOẶC MICROSOFT EDGE)",
        "• Bước 1: Mở trình duyệt web quen thuộc (Chrome, Cốc Cốc hoặc Edge).\n"
        "• Bước 2: Bấm vào thanh dấu trang (Bookmark) có lưu sẵn tên 'Hệ Thống Thông Báo GDQPAN' hoặc bấm đúp vào tệp 'HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html'.\n"
        "• Bước 3: Trang web sẽ hiển thị ngay lập tức với đầy đủ bảng điều khiển.",
        box_type="step")
    
    add_styled_heading2(doc, "2. Cách mở hệ thống trên Điện thoại di động (Khi đi Thao trường / Ký túc xá)")
    add_styled_paragraph(doc, "Khi cán bộ đi cơ động kiểm tra tại khu nội trú hoặc bãi tập, cán bộ có thể mở ứng dụng trên điện thoại di động:")
    add_styled_paragraph(doc, "Mở ứng dụng Zalo hoặc camera trên điện thoại, quét mã QR nội bộ của Trung tâm dán tại bàn trực ban, hoặc chạm vào đường liên kết do quản trị viên gửi qua tin nhắn.", bold_prefix="• Bước 1: ")
    add_styled_paragraph(doc, "Trang web di động GDQPAN sẽ hiện ra vừa vặn tuyệt đối với màn hình điện thoại.", bold_prefix="• Bước 2: ")
    add_styled_paragraph(doc, "Để tiện dùng hàng ngày không phải tìm lại link: Bấm vào nút 'Chia sẻ' trên iPhone (hoặc dấu 3 chấm góc trên bên phải trên máy Android) -> Chọn dòng chữ 'Thêm vào Màn hình chính' (Add to Home Screen). Lúc này điện thoại sẽ có một biểu tượng GDQPAN giống hệt như ứng dụng Facebook/Zalo, mỗi lần dùng chỉ cần chạm tay vào là mở ngay.", bold_prefix="• Mẹo hay (Tạo biểu tượng ngoài màn hình điện thoại): ")
    
    add_styled_heading2(doc, "3. Nhận biết các tín hiệu sẵn sàng ở góc trên màn hình")
    add_styled_paragraph(doc, "Ngay khi mở hệ thống lên, cán bộ chỉ cần liếc mắt nhìn lên góc trên màn hình để kiểm tra các thông tin quan trọng sau:")
    
    tbl_status = doc.add_table(rows=5, cols=3)
    tbl_status.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_status.autofit = False
    set_table_borders(tbl_status)
    
    headers = ["Bộ phận", "Hình ảnh hiển thị", "Ý nghĩa và Cách sử dụng"]
    for i, h in enumerate(headers):
        cell = tbl_status.cell(0, i)
        cell.width = [Inches(1.8), Inches(1.8), Inches(2.9)][i]
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        set_cell_shading(cell, "0A4D3C")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(h)
        format_run(run, font_name="Times New Roman", size_pt=10.5, bold=True, color_rgb=RGBColor(255, 255, 255))
        
    status_data = [
        ("Đồng hồ điện tử LED", "21:01:20\n(Số to màu đỏ)", "Hiển thị Giờ - Phút - Giây chuẩn xác của hệ thống, kèm ngày tháng năm. Đây là mốc giờ chuẩn để hệ thống tự động điểm chuông báo thức, giờ ăn, điểm danh."),
        ("Thanh chỉnh Âm lượng", "Biểu tượng Cái loa\nvà Thanh trượt ngang", "Dùng để chỉnh âm thanh to hoặc nhỏ:\n• Kéo chấm tròn sang PHẢI: Âm lượng to lên (tối đa 100%).\n• Kéo chấm tròn sang TRÁI: Âm lượng nhỏ lại (về 0% là tắt tiếng)."),
        ("Đèn báo Trạng thái", "• HỆ THỐNG SẴN SÀNG\n(Chấm tròn xanh lá)", "Báo hiệu toàn bộ dịch vụ phát thanh, còi báo động và giọng đọc AI đã sẵn sàng 100%. Nếu đang phát âm thanh, dòng chữ sẽ đổi thành thông báo tên nội dung đang phát."),
        ("Sóng nhạc động & Cảnh quan Hồ nước", "Ảnh khuôn viên Hồ Đá +\nDải sóng nhạc Equalizer", "Góc trên bên phải hiển thị phong cảnh Hồ Đá Trung tâm GDQPAN kết hợp dải sóng nhạc thông minh: Khi phát âm thanh (Nhạc, Còi hiệu, Giọng đọc AI), dải sóng sẽ tự động nhấp nhô sống động; khi dừng thì phẳng êm dịu, giúp cán bộ nhận biết ngay trạng thái loa đang phát từ xa.")
    ]
    for row_idx, data in enumerate(status_data, start=1):
        for col_idx, text in enumerate(data):
            cell = tbl_status.cell(row_idx, col_idx)
            cell.width = [Inches(1.8), Inches(1.8), Inches(2.9)][col_idx]
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            if row_idx % 2 == 1:
                set_cell_shading(cell, "F9FCFA")
            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_after = Pt(2)
            if col_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(text)
                format_run(run, font_name="Times New Roman", size_pt=10.5, bold=True)
            elif col_idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(text)
                format_run(run, font_name="Times New Roman", size_pt=10, bold=True, color_rgb=RGBColor(192, 57, 43))
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(text)
                format_run(run, font_name="Times New Roman", size_pt=10)
                
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(4)
    
    # -------------------------------------------------------------
    # PHẦN III: HÌNH ẢNH TOÀN CẢNH GIAO DIỆN & VỊ TRÍ CÁC KHU VỰC
    # -------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN III: HÌNH ẢNH TOÀN CẢNH GIAO DIỆN VÀ VỊ TRÍ CÁC KHU VỰC")
    
    add_styled_paragraph(doc, 
        "Hệ thống được thiết kế với giao diện đồ họa quân sự trang trọng (tông màu xanh áo lính phối đỏ thắm), các nút bấm to rõ ràng, có biểu tượng trực quan đi kèm để cán bộ dễ dàng nhận biết vị trí mà không sợ bấm nhầm.")
    
    add_styled_heading2(doc, "1. Bảng điều khiển toàn cảnh trên Máy tính để bàn (PC)")
    
    # Embed Desktop Image
    if os.path.exists("giao_dien_desktop.png"):
        p_img1 = doc.add_paragraph()
        p_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img1.paragraph_format.space_before = Pt(6)
        p_img1.paragraph_format.space_after = Pt(4)
        run_img1 = p_img1.add_run()
        run_img1.add_picture("giao_dien_desktop.png", width=Inches(6.4))
        
        p_cap1 = doc.add_paragraph()
        p_cap1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap1.paragraph_format.space_after = Pt(8)
        run_cap1 = p_cap1.add_run("Hình 1: Bảng điều khiển toàn cảnh Hệ thống Thông báo GDQPAN trên Máy tính để bàn")
        format_run(run_cap1, font_name="Times New Roman", size_pt=10, bold=True, italic=True, color_rgb=RGBColor(10, 77, 60))
        
    add_styled_paragraph(doc, "Quan sát trên Hình 1, toàn bộ màn hình được chia thành 7 khối làm việc khoa học:", bold_prefix="Cấu trúc giao diện máy tính: ")
    areas_pc = [
        ("• Khối 1 - CHÀO CỜ (Góc trên bên trái): ", "Gồm 3 nút: Quốc ca không lời, Quốc ca có lời, Duyệt đội ngũ."),
        ("• Khối 2 - BÁO ĐỘNG (Kế bên chào cờ): ", "Gồm 3 nút: Báo động tác chiến, Tập hợp, Tập hợp khẩn cấp."),
        ("• Khối 3 - SINH HOẠT (Chính giữa trên): ", "Gồm 9 nút nề nếp sinh hoạt nội vụ chuẩn quân ngũ (Báo thức, Chuẩn bị làm việc, Làm việc, Nghỉ giải lao, Hết giải lao, Hết làm việc, Ăn cơm, Điểm danh, Ngủ nghỉ)."),
        ("• Khối 4 - NHẠC (Góc trên bên phải): ", "Gồm các nút phát nhạc cách mạng, nhạc truyền thống Trung tâm, Bolero, nhạc trẻ."),
        ("• Khối 5 - THÔNG BÁO KHÁC (Góc dưới bên trái): ", "Ô soạn thảo văn bản để phát giọng nói thông minh bất kỳ kèm các nút [Phát ngay], [Dừng], [Lưu], [Xóa]."),
        ("• Khối 6 - LỰA CHỌN GIỌNG ĐỌC (Chính giữa dưới): ", "Chọn giọng đọc Nam/Nữ của 3 miền Bắc - Trung - Nam và nghe thử giọng."),
        ("• Khối 7 - LỊCH PHÁT TỰ ĐỘNG (Góc dưới bên phải): ", "Cài đặt giờ tự động điểm chuông và danh sách lịch phát trong ngày.")
    ]
    for a_pre, a_txt in areas_pc:
        add_styled_paragraph(doc, a_txt, bold_prefix=a_pre, space_after=3)
        
    add_styled_heading2(doc, "2. Giao diện ứng dụng trên Điện thoại di động (Mobile)")
    
    # Embed Mobile Image
    if os.path.exists("giao_dien_mobile.jpg"):
        p_img2 = doc.add_paragraph()
        p_img2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img2.paragraph_format.space_before = Pt(6)
        p_img2.paragraph_format.space_after = Pt(4)
        run_img2 = p_img2.add_run()
        run_img2.add_picture("giao_dien_mobile.jpg", width=Inches(3.3))
        
        p_cap2 = doc.add_paragraph()
        p_cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap2.paragraph_format.space_after = Pt(8)
        run_cap2 = p_cap2.add_run("Hình 2: Giao diện Ứng dụng GDQPAN trên Điện thoại Di động (Khi đi thao trường)")
        format_run(run_cap2, font_name="Times New Roman", size_pt=10, bold=True, italic=True, color_rgb=RGBColor(10, 77, 60))

    add_styled_paragraph(doc, "Trên điện thoại (Hình 2), các nút bấm được xếp thành 6 ô vuông lớn dễ chạm bằng ngón tay: Chào cờ, Báo động, Sinh hoạt, Nhạc, Thông báo khác, Lịch phát tự động. Phía dưới cùng có dải màu đỏ rực rỡ mang tên [PHÁT KHẨN CẤP] để bấm ngay khi có tình huống đột xuất.", bold_prefix="Đặc điểm trên điện thoại: ")

    # -------------------------------------------------------------
    # PHẦN IV: HƯỚNG DẪN CHI TIẾT TỪNG CHỨC NĂNG
    # -------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN IV: HƯỚNG DẪN SỬ DỤNG CHI TIẾT TỪNG CHỨC NĂNG (THEO BƯỚC 1-2-3)")
    
    # 1. Chào cờ
    add_styled_heading2(doc, "1. Nhóm Nghi lễ Chào cờ & Duyệt đội ngũ (Biểu tượng Cờ đỏ)")
    add_styled_paragraph(doc, "Dùng cho các buổi lễ Chào cờ đầu tuần, Khai giảng khóa học, Bế giảng, hoặc huấn luyện duyệt binh.", bold_prefix="• Mục đích: ")
    add_styled_paragraph(doc, "Bao gồm 3 nút chức năng riêng biệt:", bold_prefix="• Chi tiết 3 nút bấm: ")
    flags = [
        ("Nút 'Quốc ca không lời' (Icon VN): ", "Phát bản hòa tấu Quốc ca chuẩn nghi lễ quân đội trang nghiêm, âm lượng hùng tráng."),
        ("Nút 'Quốc ca có lời' (Icon Micro): ", "Phát bản Tiến quân ca có lời hát chuẩn mực phục vụ các buổi tập hát hoặc sinh hoạt tập thể."),
        ("Nút 'Duyệt đội ngũ' (Icon Mũ cối): ", "Phát bản nhạc hành khúc duyệt binh hào hùng phục vụ cho các khối sinh viên diễu duyệt qua lễ đài.")
    ]
    for f_pre, f_txt in flags:
        add_styled_paragraph(doc, f_txt, bold_prefix="  - " + f_pre, space_after=3)
        
    add_callout(doc, "CÁCH PHÁT VÀ DỪNG NHẠC CHÀO CỜ:",
        "• BƯỚC 1: Dùng chuột bấm 1 lần vào nút cần phát (ví dụ bấm nút 'Quốc ca không lời').\n"
        "• BƯỚC 2: Nhạc sẽ lập tức vang lên dõng dạc khắp toàn trường. Trên màn hình, nút bấm sẽ nhấp nháy sáng báo hiệu đang phát.\n"
        "• BƯỚC 3 (KHI MUỐN DỪNG): Nếu muốn dừng nhạc trước khi hết bài, chỉ cần bấm vào nút [■ DỪNG] màu xanh dương ở góc dưới, hoặc bấm chuột lại chính nút đó.",
        box_type="step")
        
    # 2. Báo động
    add_styled_heading2(doc, "2. Nhóm Hiệu lệnh Báo động tác chiến & Tập hợp (Biểu tượng Còi đèn hiệu)")
    add_styled_paragraph(doc, "Dùng trong các tình huống huấn luyện cơ động đêm, kiểm tra quân số đột xuất, hoặc tập hợp sinh viên khẩn cấp về sân chào cờ.", bold_prefix="• Mục đích: ")
    add_styled_paragraph(doc, "Bao gồm 3 nút hiệu lệnh cực kỳ uy lực:", bold_prefix="• Chi tiết 3 nút bấm: ")
    alarms = [
        ("Nút 'Báo động' (Icon Còi xoay đỏ): ", "Tự động phát tiếng còi báo động phòng không hú dài dồn dập, ngân vang xa khắp toàn khu quân sự, kích thích tinh thần cơ động khẩn trương."),
        ("Nút 'Tập hợp' (Icon Nhóm người tím): ", "Phát tiếng còi lệnh chỉ huy chuẩn mực, nhắc nhở toàn thể sinh viên nhanh chóng tập trung về vị trí quy định."),
        ("Nút 'Tập hợp khẩn cấp' (Icon Tam giác cảnh báo): ", "Phát tiếng còi giục dồn dập kèm khẩu lệnh yêu cầu toàn đơn vị khẩn trương cơ động vị trí trong thời gian ngắn nhất.")
    ]
    for a_pre, a_txt in alarms:
        add_styled_paragraph(doc, a_txt, bold_prefix="  - " + a_pre, space_after=3)
        
    add_callout(doc, "LƯU Ý QUAN TRỌNG KHI BẤM NÚT BÁO ĐỘNG:",
        "Tiếng còi báo động có âm lượng rất lớn và có tính chất hiệu lệnh quân sự nghiêm ngặt. Cán bộ trực ban chỉ bấm nút này khi có kế hoạch diễn tập hoặc khi nhận được lệnh chính thức từ Chỉ huy Trung tâm để tránh gây hoang mang cho sinh viên.",
        box_type="warning")

    # 3. 9 Chế độ sinh hoạt
    add_styled_heading2(doc, "3. Nhóm 9 Chế độ Sinh hoạt nề nếp Quân đội trong ngày")
    add_styled_paragraph(doc, "Đây là 'trái tim' của hệ thống quản lý sinh viên. Giúp toàn Trung tâm duy trì nề nếp chính quy, đúng giờ từng phút mà cán bộ trực ban không cần phải tốn công canh đồng hồ.", bold_prefix="• Mục đích: ")
    add_styled_paragraph(doc, "Khi bấm vào bất kỳ nút nào trong 9 chế độ này, hệ thống sẽ thực hiện theo đúng Quy trình kép 2 bước chuẩn mực: [Đổ 1 hồi chuông/còi hiệu trước 3 giây] ➔ [Giọng đọc phát thanh viên nhắc nhở nội dung ngắn gọn, rõ ràng].", bold_prefix="• Cơ chế phát thông minh: ")
    
    tbl_daily = doc.add_table(rows=10, cols=3)
    tbl_daily.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_daily.autofit = False
    set_table_borders(tbl_daily)
    
    headers_daily = ["STT & Tên Nút Lệnh", "Giờ chuẩn gợi ý", "Lời phát thanh viên đọc ra loa"]
    for i, h in enumerate(headers_daily):
        cell = tbl_daily.cell(0, i)
        cell.width = [Inches(1.8), Inches(1.3), Inches(3.4)][i]
        set_cell_margins(cell, top=100, bottom=100, left=100, right=100)
        set_cell_shading(cell, "0A4D3C")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(h)
        format_run(run, font_name="Times New Roman", size_pt=10, bold=True, color_rgb=RGBColor(255, 255, 255))
        
    daily_modes = [
        ("1. Báo thức\n(Icon Đồng hồ)", "05h30 sáng", "Hồi còi/kèn hiệu báo thức ➔ 'Báo thức! Đề nghị toàn thể sinh viên thức dậy và thực hiện chế độ thể dục sáng theo quy định.'"),
        ("2. Chuẩn bị làm việc\n(Icon Cặp tài liệu)", "06h45 sáng", "Tiếng chuông hiệu ➔ 'Đã đến giờ chuẩn bị học tập. Đề nghị sinh viên chỉnh đốn quân tư trang, chuẩn bị ra thao trường, giảng đường.'"),
        ("3. Làm việc\n(Icon Bàn làm việc)", "07h00 sáng / 13h30 chiều", "Tiếng chuông báo ➔ 'Đã đến giờ vào học. Đề nghị các đại đội ổn định tổ chức và bắt đầu buổi huấn luyện.'"),
        ("4. Nghỉ giải lao\n(Icon Tách cà phê)", "09h00 sáng / 15h00 chiều", "Hồi chuông vui tươi ➔ 'Đã đến giờ nghỉ giải lao giữa giờ.'"),
        ("5. Hết giờ giải lao\n(Icon Mũi tên cong)", "09h20 sáng / 15h20 chiều", "Hồi chuông thúc giục ➔ 'Đã hết giờ giải lao. Đề nghị sinh viên nhanh chóng trở lại vị trí học tập.'"),
        ("6. Hết giờ làm việc\n(Icon Cờ kết thúc)", "11h00 trưa / 17h00 chiều", "Tiếng chuông kết thúc ➔ 'Đã hết giờ học tập, huấn luyện. Các đơn vị tổ chức thu dọn thao trường và trở về đơn vị.'"),
        ("7. Ăn cơm\n(Icon Thìa đĩa)", "11h15 trưa / 17h30 chiều", "Hồi chuông vui nhộn ➔ 'Đã đến giờ ăn cơm. Đề nghị các đại đội xếp hàng hành quân vào nhà ăn theo kế hoạch.'"),
        ("8. Điểm danh\n(Icon Dấu tích xanh)", "21h00 tối", "Tiếng còi hiệu tập hợp ➔ 'Đã đến giờ điểm danh quân số. Đề nghị cán bộ khung và sinh viên tổ chức điểm danh tối.'"),
        ("9. Ngủ nghỉ\n(Icon Trăng khuyết)", "21h30 tối", "Khúc kèn êm dịu ➔ 'Đã đến giờ ngủ nghỉ. Toàn thể sinh viên thực hiện chế độ tắt đèn và giữ trật tự theo quy định.'")
    ]
    for row_idx, (m_name, m_time, m_voice) in enumerate(daily_modes, start=1):
        for col_idx, text in enumerate([m_name, m_time, m_voice]):
            cell = tbl_daily.cell(row_idx, col_idx)
            cell.width = [Inches(1.8), Inches(1.3), Inches(3.4)][col_idx]
            set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
            if row_idx % 2 == 1:
                set_cell_shading(cell, "F9FCFA")
            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_after = Pt(2)
            if col_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(text)
                format_run(run, font_name="Times New Roman", size_pt=9.5, bold=True, color_rgb=RGBColor(10, 77, 60))
            elif col_idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(text)
                format_run(run, font_name="Times New Roman", size_pt=9.5, bold=True, color_rgb=RGBColor(192, 57, 43))
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(text)
                format_run(run, font_name="Times New Roman", size_pt=9.5)
                
    p_sp2 = doc.add_paragraph()
    p_sp2.paragraph_format.space_before = Pt(4)

    # 4. Phát loa bằng giọng nói thông minh
    add_styled_heading2(doc, "4. Nhóm Phát loa Thông báo bằng Giọng nói AI Thông minh (Khung Thông Báo Khác)")
    add_styled_paragraph(doc, "Đây là tính năng hiện đại nhất của hệ thống. Thay vì trực ban phải cầm micro đọc thủ công, cán bộ chỉ cần gõ nội dung thông báo vào ô trống, giọng đọc phát thanh viên chuyên nghiệp sẽ tự động đọc thay cán bộ.", bold_prefix="• Mục đích: ")
    
    add_callout(doc, "HƯỚNG DẪN 5 BƯỚC PHÁT THÔNG BÁO BẰNG GIỌNG NÓI:",
        "• BƯỚC 1: Bấm chuột vào ô lớn có dòng chữ 'Nhập nội dung thông báo tại đây...'.\n"
        "• BƯỚC 2: Gõ nội dung cần thông báo bằng tiếng Việt có dấu. Ví dụ:\n"
        "   'Thông báo: Đúng 14 giờ chiều nay, tất cả sinh viên Đại đội 3 tập trung tại Hội trường 1 để nghe phổ biến quy chế thi. Đề nghị các trung đội trưởng đôn đốc quân số.'\n"
        "• BƯỚC 3 (CHỌN GIỌNG ĐỌC): Tại khung 'LỰA CHỌN GIỌNG ĐỌC' ở giữa màn hình, bấm chọn Miền Bắc, Miền Trung hoặc Miền Nam (chọn giọng Nam hoặc giọng Nữ tùy ý).\n"
        "• BƯỚC 4 (NGHE THỬ NẾU CẦN): Bấm nút [► NGHE THỬ] màu xanh dương để nghe trước qua loa vi tính xem giọng đọc có rõ ràng không.\n"
        "• BƯỚC 5 (PHÁT CHÍNH THỨC): Bấm nút [► PHÁT NGAY] màu xanh lá cây.\n"
        "   ➔ Hệ thống sẽ tự động đổ 1 hồi chuông 'Tùng tùng tùng' để sinh viên giữ trật tự lắng nghe, sau đó phát thanh viên sẽ đọc nội dung dõng dạc ra toàn bộ hệ thống loa của Trung tâm.",
        box_type="step")
        
    add_styled_paragraph(doc, "Các nút hỗ trợ tiện ích xung quanh ô thông báo:", bold_prefix="• Các nút bấm phụ trợ: ")
    sub_btns = [
        ("Nút [■ DỪNG] (Màu xanh dương): ", "Đang đọc dở mà muốn dừng lại thì bấm nút này, loa sẽ ngắt tiếng ngay lập tức."),
        ("Nút [💾 LƯU NỘI DUNG] (Màu tím/xám): ", "Lưu lại bài thông báo này vào bộ nhớ máy, lần sau cần dùng chỉ cần bấm chọn lại là xong, không phải mất công gõ lại từng chữ."),
        ("Nút [🗑 XÓA] (Màu đỏ): ", "Xóa sạch toàn bộ chữ trong ô để soạn thông báo mới tinh."),
        ("Mục 'Tốc độ' (Dropdown): ", "Có thể chọn 'Chậm' (nếu thông báo nhiều số điện thoại, danh sách tên cần nghe rõ), 'Bình thường' (mặc định), hoặc 'Nhanh'.")
    ]
    for sb_pre, sb_txt in sub_btns:
        add_styled_paragraph(doc, sb_txt, bold_prefix="  - " + sb_pre, space_after=3)

    # 5. Lập lịch phát tự động
    add_styled_heading2(doc, "5. Nhóm Lập lịch Phát tự động (Hẹn giờ điểm chuông tự động)")
    add_styled_paragraph(doc, "Tính năng 'Cài đặt một lần - Hệ thống tự chạy quanh năm suốt tháng'. Cán bộ cài đặt sẵn thời gian biểu trong tuần, cứ đến đúng giờ là hệ thống tự động phát chuông hoặc đọc thông báo mà không cần ai phải canh chừng bấm nút.", bold_prefix="• Mục đích: ")
    
    add_callout(doc, "CÁCH THÊM MỘT LỊCH HẸN GIỜ MỚI (CHỈ MẤT 30 GIÂY):",
        "• BƯỚC 1: Tại khung 'LỊCH PHÁT TỰ ĐỘNG' (bên phải màn hình), nhập Giờ và Phút cần phát (Ví dụ: 05:30).\n"
        "• BƯỚC 2: Bấm vào ô danh sách bên cạnh để chọn nội dung muốn phát (Ví dụ chọn: 'Báo thức', 'Quốc ca', 'Điểm danh' hoặc chọn đọc nội dung thông báo văn bản).\n"
        "• BƯỚC 3: Bấm nút [+ THÊM LỊCH] màu xanh dương.\n"
        "   ➔ Lịch mới sẽ xuất hiện ngay trong bảng danh sách phía dưới. Cứ đến đúng 05:30 sáng là chuông báo thức sẽ tự động đổ vang lừng!",
        box_type="step")
        
    add_styled_paragraph(doc, "Cách quản lý danh sách lịch đã cài đặt:", bold_prefix="• Cách điều chỉnh lịch: ")
    add_styled_paragraph(doc, "Bên cạnh mỗi dòng lịch có một công tắc tròn. Nếu công tắc bật sang màu XANH LÁ CÂY tức là lịch đang hoạt động. Nếu ngày lễ, chủ nhật không muốn phát mốc giờ đó, chỉ cần bấm nhẹ vào công tắc để chuyển sang màu XÁM (Tạm dừng), hôm sau muốn dùng lại thì bấm bật xanh trở lại rất nhanh.", bold_prefix="  - Công tắc Bật/Tắt (Màu xanh / Màu xám): ")
    add_styled_paragraph(doc, "Nếu muốn bỏ hẳn một mốc giờ không dùng nữa, chỉ cần bấm nút [Xóa] màu xám bên cạnh mốc giờ đó.", bold_prefix="  - Nút [Xóa]: ")
    
    add_callout(doc, "LƯU Ý ĐỂ HỆ THỐNG PHÁT TỰ ĐỘNG CẢ NGÀY LẪN ĐÊM KHÔNG BỊ TẮT:",
        "Hệ thống đã tích hợp sẵn tính năng 'Chống tắt màn hình' (WakeLock - Biểu tượng Trạm phát). Cán bộ chỉ cần để máy tính mở cửa sổ phần mềm, không cần thao tác gì thêm, máy tính sẽ không bị ngủ đông (Sleep), đảm bảo chuông báo luôn kêu đúng từng giây cả ngày lẫn đêm.",
        box_type="tip")

    # 6. Phát thanh âm nhạc
    add_styled_heading2(doc, "6. Nhóm Phát thanh Âm nhạc & Giải trí (Khung Nhạc)")
    add_styled_paragraph(doc, "Phục vụ phát nhạc giờ giải lao giữa các tiết học, nhạc thể dục buổi sáng, nhạc truyền thống nâng cao đời sống văn hóa tinh thần cho sinh viên sau những giờ thao trường nắng gió.", bold_prefix="• Mục đích: ")
    add_styled_paragraph(doc, "Bao gồm các thể loại phong phú:", bold_prefix="• Thể loại nhạc có sẵn: ")
    musics = [
        ("Nhạc cách mạng: ", "Các bài hát hào hùng: Tiến quân ca, Hát mãi khúc quân hành, Năm anh em trên một chiếc xe tăng, Bác đang cùng chúng cháu hành quân..."),
        ("Nhạc truyền thống Trung tâm: ", "Các ca khúc truyền thống của Trung tâm GDQPAN ĐHQG-HCM, ca ngợi mái trường quân ngũ bên hồ đá thân thương."),
        ("Nhạc Bolero & Nhạc trữ tình: ", "Các điệu nhạc nhẹ nhàng, sâu lắng thư giãn."),
        ("Nhạc trẻ sôi động: ", "Các bài hát truyền lửa nhiệt huyết tuổi trẻ thanh niên sinh viên.")
    ]
    for m_pre, m_txt in musics:
        add_styled_paragraph(doc, m_txt, bold_prefix="  - " + m_pre, space_after=3)
        
    add_callout(doc, "CÁCH TỰ TẢI THÊM BÀI HÁT MP3 TÙY THÍCH VÀO HỆ THỐNG:",
        "• BƯỚC 1: Bấm chuột vào nút 'Chọn thể loại nhạc' -> Bấm nút 'Quản lý Nhạc' hoặc 'Thêm bài hát'.\n"
        "• BƯỚC 2: Bấm nút 'Chọn tệp' để tìm đến bài hát MP3 có sẵn trong máy tính hoặc điện thoại của cán bộ.\n"
        "• BƯỚC 3: Chọn thể loại và bấm nút [Lưu bài hát].\n"
        "   ➔ Bài hát sẽ được lưu vĩnh viễn trong hệ thống, lần sau mở máy lên bài hát vẫn còn nguyên đó, không bao giờ bị mất!",
        box_type="step")

    # 7. Phát khẩn cấp
    add_styled_heading2(doc, "7. Nút Phát Khẩn Cấp / Ưu Tiên Cao Nhất (Dải màu đỏ (( 🔔 )))")
    add_styled_paragraph(doc, "Trên điện thoại và máy tính đều có dải nút màu đỏ rực rỡ viền vàng với biểu tượng chuông reo (( 🔔 )) PHÁT KHẨN CẤP. Đây là phím bấm có quyền ưu tiên tối thượng trong toàn bộ hệ thống.", bold_prefix="• Vị trí và Ý nghĩa: ")
    add_styled_paragraph(doc, "Khi xảy ra sự cố đột xuất (cháy nổ, bão gió, tập hợp lực lượng cứu hộ khẩn cấp), cán bộ chỉ cần bấm vào nút này. Hệ thống sẽ LẬP TỨC DỪNG MỌI BÀI NHẠC HOẶC THÔNG BÁO ĐANG PHÁT, ngay tức khắc hú còi báo động khẩn và phát thông điệp ưu tiên đặc biệt để toàn Trung tâm phản ứng trong thời gian nhanh nhất.", bold_prefix="• Cơ chế ưu tiên: ")

    # -------------------------------------------------------------
    # PHẦN V: CÀI ĐẶT NÂNG CAO VÀ TÙY BIẾN ÂM THANH
    # -------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN V: CÀI ĐẶT NÂNG CAO VÀ TÙY BIẾN ÂM THANH (CHO NGƯỜI QUẢN TRỊ)")
    
    add_styled_paragraph(doc, "Nếu cán bộ muốn điều chỉnh lại âm thanh cho phù hợp hơn với thói quen của đơn vị, cán bộ bấm vào biểu tượng bánh răng ⚙ (Cài đặt) trên giao diện:")
    
    adv_settings = [
        ("1. Thay đổi tiếng còi/kèn hiệu cho từng nút lệnh: ", "Nếu Trung tâm có bản thu âm tiếng kèn hiệu báo thức hoặc tiếng còi chuẩn riêng của đơn vị: Bấm vào mục 'Cài đặt âm thanh hiệu lệnh' -> Chọn tệp MP3 mới -> Bấm Lưu. Nút lệnh đó sẽ lập tức phát tiếng còi mới của đơn vị."),
        ("2. Khôi phục âm thanh gốc ban đầu: ", "Nếu lỡ tay chọn nhầm tệp âm thanh bị lỗi hoặc nghe không hay, cán bộ đừng lo lắng: Chỉ cần bấm vào nút [Khôi phục âm thanh gốc] màu đỏ, hệ thống sẽ tự động quay về tiếng còi chuẩn xuất xưởng ban đầu ngay lập tức."),
        ("3. Đổi số lần đọc thông báo: ", "Mặc định hệ thống đọc 1 lần. Nếu muốn thông báo được nhắc lại 2 lần để sinh viên nghe thật rõ, vào Cài đặt -> chọn mục 'Số lần lặp lại: 2 lần' -> Bấm Lưu."),
        ("4. Bật/Tắt chuông hiệu dạo đầu: ", "Có thể tích chọn bật hoặc tắt hồi chuông 'Tùng tùng tùng' trước khi phát thanh viên đọc giọng nói."),
        ("5. Sao lưu dữ liệu dự phòng (Xuất / Nhập cấu hình): ", "Bấm nút [Xuất cấu hình] để lưu toàn bộ danh sách lịch hẹn và cài đặt thành 1 file nhỏ vào máy tính. Khi thay máy tính mới hoặc muốn đồng bộ sang máy khác, chỉ cần bấm [Nhập cấu hình] là toàn bộ lịch trình được phục hồi 100%, không cần cài đặt lại từ đầu.")
    ]
    for as_pre, as_txt in adv_settings:
        add_styled_paragraph(doc, as_txt, bold_prefix="• " + as_pre, space_after=4)

    # -------------------------------------------------------------
    # PHẦN VI: BẢNG THỜI GIAN BIỂU CHUẨN GỢI Ý
    # -------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN VI: BẢNG THỜI GIAN BIỂU QUÂN ĐỘI CHUẨN GỢI Ý ĐỂ CÀI ĐẶT LỊCH")
    add_styled_paragraph(doc, "Dưới đây là bảng thời gian biểu mẫu chuẩn hóa nề nếp sinh hoạt quân đội tại Trung tâm GDQPAN. Cán bộ trực ban có thể tham khảo để cài đặt vào khung 'LỊCH PHÁT TỰ ĐỘNG':")
    
    tbl_schedule = doc.add_table(rows=13, cols=4)
    tbl_schedule.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_schedule.autofit = False
    set_table_borders(tbl_schedule)
    
    headers_sch = ["Giờ phát", "Tên chế độ / Hiệu lệnh", "Âm thanh phát ra", "Mục đích nhắc nhở sinh viên"]
    for i, h in enumerate(headers_sch):
        cell = tbl_schedule.cell(0, i)
        cell.width = [Inches(1.1), Inches(1.8), Inches(1.8), Inches(1.8)][i]
        set_cell_margins(cell, top=100, bottom=100, left=80, right=80)
        set_cell_shading(cell, "0A4D3C")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(h)
        format_run(run, font_name="Times New Roman", size_pt=9.5, bold=True, color_rgb=RGBColor(255, 255, 255))
        
    sch_data = [
        ("05:30", "Báo thức buổi sáng", "Còi/kèn hiệu + Giọng đọc", "Thức dậy, gấp chăn màn nội vụ vuông vức"),
        ("05:45", "Thể dục sáng", "Nhạc hành khúc thể dục", "Rèn luyện thể lực 4 bài thể dục buổi sáng"),
        ("06:30", "Ăn sáng", "Chuông hiệu + Giọng đọc", "Hành quân vào nhà ăn theo kế hoạch đại đội"),
        ("06:50", "Chuẩn bị học tập", "Chuông hiệu + Giọng đọc", "Chỉnh đốn trang phục, kiểm tra quân tư trang"),
        ("07:00", "Bắt đầu học buổi sáng", "Chuông hiệu học tập", "Vào tiết học chính thức tại giảng đường/bãi tập"),
        ("09:00", "Nghỉ giải lao sáng", "Chuông giải lao vui vẻ", "Sinh viên giải lao uống nước sau 2 tiết học"),
        ("09:20", "Hết giờ giải lao", "Chuông thúc giục + Lời nhắc", "Nhanh chóng trở lại vị trí lớp học"),
        ("11:00", "Hết giờ học sáng", "Chuông tan học", "Nghỉ học sáng, bảo quản vũ khí trang bị"),
        ("11:15", "Ăn cơm trưa", "Chuông hiệu + Giọng đọc", "Đại đội xếp hàng hành quân vào nhà ăn"),
        ("13:30", "Bắt đầu học buổi chiều", "Chuông hiệu học tập", "Bắt đầu ca huấn luyện chiều"),
        ("21:00", "Điểm danh quân số", "Còi hiệu tập hợp + Lời nhắc", "Kiểm tra quân số từng trung đội, đại đội"),
        ("21:30", "Ngủ nghỉ (Tắt đèn)", "Tiếng kèn ngủ êm dịu", "Tắt toàn bộ đèn phòng, giữ trật tự đi ngủ")
    ]
    for row_idx, row in enumerate(sch_data, start=1):
        for col_idx, text in enumerate(row):
            cell = tbl_schedule.cell(row_idx, col_idx)
            cell.width = [Inches(1.1), Inches(1.8), Inches(1.8), Inches(1.8)][col_idx]
            set_cell_margins(cell, top=60, bottom=60, left=70, right=70)
            if row_idx % 2 == 1:
                set_cell_shading(cell, "F9FCFA")
            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_after = Pt(2)
            if col_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(text)
                format_run(run, font_name="Times New Roman", size_pt=9.5, bold=True, color_rgb=RGBColor(192, 57, 43))
            elif col_idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(text)
                format_run(run, font_name="Times New Roman", size_pt=9.5, bold=True, color_rgb=RGBColor(10, 77, 60))
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(text)
                format_run(run, font_name="Times New Roman", size_pt=9)

    p_sp3 = doc.add_paragraph()
    p_sp3.paragraph_format.space_before = Pt(4)

    # -------------------------------------------------------------
    # PHẦN VII: BẢNG HỎI - ĐÁP VÀ XỬ LÝ SỰ CỐ THƯỜNG GẶP
    # -------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN VII: BẢNG HỎI - ĐÁP VÀ XỬ LÝ SỰ CỐ THƯỜNG GẶP (DỄ NHƯ ĂN KẸO)")
    add_styled_paragraph(doc, "Khi gặp vấn đề trong ca trực, cán bộ chỉ cần tra cứu nhanh bảng dưới đây để tự xử lý trong 10 giây:")
    
    faqs = [
        ("TÌNH HUỐNG 1: BẤM NÚT PHÁT MÀ KHÔNG NGHE THẤY TIẾNG KÊU GÌ CẢ?",
         "▶ Cách xử lý cực kỳ đơn giản (Kiểm tra 3 điểm):\n"
         "1. Nhìn vào thanh 'ÂM LƯỢNG' trên trang web: Chấm tròn có đang bị kéo về hết bên trái (0%) không? Hãy lấy chuột kéo nó sang phải lên mức 80% - 100%.\n"
         "2. Nhìn vào góc dưới bên phải màn hình máy tính (chỗ có hình cái loa của Windows): Kiểm tra xem loa máy tính có bị bấm nút Tắt tiếng (Mute có dấu gạch chéo đỏ) không. Bấm bật loa máy tính lên.\n"
         "3. Kiểm tra dây cắm loa ngoài phòng trực ban: Dây cắm tròn 3.5mm đã cắm chặt vào lỗ màu xanh lá của máy tính chưa, công tắc nguồn của amply/loa ngoài đã bật đèn đỏ chưa."),
        
        ("TÌNH HUỐNG 2: MUỐN DỪNG NGAY BÀI HÁT HOẶC THÔNG BÁO ĐANG PHÁT THÌ LÀM THẾ NÀO?",
         "▶ Cách xử lý:\n"
         "• Cách 1: Bấm ngay vào nút [■ DỪNG] màu xanh dương ở góc dưới màn hình.\n"
         "• Cách 2: Nhìn xuống góc dưới cùng bên phải màn hình máy tính (Khay hệ thống gần đồng hồ giờ), bấm chuột phải vào biểu tượng GDQPAN nhỏ xíu, chọn dòng chữ 'Dừng tất cả âm thanh'."),
         
        ("TÌNH HUỐNG 3: TẠI SAO GÕ VĂN BẢN VÀO Ô THÔNG BÁO LẠI KHÔNG RA TIẾNG VIỆT CÓ DẤU?",
         "▶ Cách xử lý:\n"
         "Do bộ gõ Unikey hoặc EVKey trên máy tính đang ở chế độ tiếng Anh (chữ E màu xanh). Hãy nhìn xuống góc phải dưới cùng màn hình máy tính, bấm vào chữ E để nó đổi thành chữ V màu đỏ. Bảng mã chọn 'Unicode' và kiểu gõ chọn 'Telex' là gõ tiếng Việt có dấu bình thường."),
         
        ("TÌNH HUỐNG 4: NẾU BỊ MẤT KẾT NỐI MẠNG INTERNET THÌ PHẦN MỀM CÓ HOẠT ĐỘNG KHÔNG?",
         "▶ Trả lời:\n"
         "Cán bộ hoàn toàn yên tâm 100%! Toàn bộ tiếng còi báo động, còi tập hợp, 9 chế độ sinh hoạt nề nếp, nhạc chào cờ và các bài hát đã tải lên đều được lưu sẵn trong ổ cứng máy tính. Dù có bão gió đứt cáp mất mạng Internet, hệ thống vẫn điểm chuông và phát thanh bình thường."),
         
        ("TÌNH HUỐNG 5: CÓ SỢ MÁY TÍNH TỰ ĐỘNG TẮT MÀN HÌNH HOẶC NGỦ ĐÔNG KHI ĐANG HẸN GIỜ ĐÊM KHÔNG?",
         "▶ Trả lời:\n"
         "Hệ thống đã tự động kích hoạt tính năng Trạm phát liên tục (WakeLock). Khi phần mềm đang mở, máy tính sẽ không bao giờ bị rơi vào trạng thái ngủ đông, đảm bảo điểm danh 21h00 và báo thức 05h30 sáng luôn phát chuẩn xác từng tích tắc."),
         
        ("TÌNH HUỐNG 6: MUỐN TẮT HOÀN TOÀN PHẦN MỀM ĐỂ TẮT MÁY TÍNH THÌ LÀM THẾ NÀO?",
         "▶ Cách xử lý:\n"
         "Bấm vào dấu nhân đỏ [✕] ở góc trên cùng bên phải cửa sổ phần mềm. Nếu muốn thoát triệt để, nhấp chuột phải vào biểu tượng loa ở khay hệ thống chọn 'Thoát hoàn toàn'.")
    ]
    for q_title, q_ans in faqs:
        add_callout(doc, q_title, q_ans, box_type="tip")

    # -------------------------------------------------------------
    # PHẦN VIII: QUY TRÌNH 5 BƯỚC BÀN GIAO CA TRỰC CHO CÁN BỘ
    # -------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN VIII: QUY TRÌNH 5 BƯỚC BÀN GIAO CA TRỰC CHO CÁN BỘ")
    add_styled_paragraph(doc, "Để đảm bảo tính liên tục và kỷ luật quân đội trong quản lý sinh viên, các ca trực ban thực hiện theo quy trình 5 bước sau:")
    
    steps_shift = [
        ("Bước 1 - Kiểm tra khi nhận ca: ", "Mở phần mềm, nhìn đồng hồ LED xem giờ có đúng không, nhìn đèn báo xem có hiện 'HỆ THỐNG SẴN SÀNG' màu xanh lá không."),
        ("Bước 2 - Kiểm tra âm lượng loa ngoài: ", "Kéo thử thanh âm lượng và bấm nút [Nghe thử] để chắc chắn loa ngoài phòng trực ban đang phát tiếng to rõ."),
        ("Bước 3 - Kiểm tra lịch phát tự động trong ngày: ", "Rà soát lại danh sách lịch trong ngày (Báo thức, Ăn cơm, Điểm danh), kiểm tra các công tắc xem đã bật màu xanh lá đầy đủ chưa."),
        ("Bước 4 - Phát thông báo khi có lệnh chỉ huy: ", "Nếu có thông báo đột xuất, gõ văn bản và bấm [Phát ngay] theo đúng quy định lễ tiết tác phong quân đội."),
        ("Bước 5 - Bàn giao cho ca trực tiếp theo: ", "Thông báo cho cán bộ ca sau về các mốc giờ đã phát và tình trạng hoạt động của hệ thống trước khi rời vị trí trực.")
    ]
    for s_pre, s_txt in steps_shift:
        add_styled_paragraph(doc, s_txt, bold_prefix=s_pre, space_after=4)

    # -------------------------------------------------------------
    # PHẦN IX: THÔNG TIN HỖ TRỢ KỸ THUẬT & KÝ DUYỆT
    # -------------------------------------------------------------
    add_styled_heading1(doc, "PHẦN IX: THÔNG TIN HỖ TRỢ KỸ THUẬT VÀ PHÊ DUYỆT")
    
    add_callout(doc, "ĐẦU MỐI HỖ TRỢ KỸ THUẬT 24/7:",
        "Trong quá trình vận hành, nếu cán bộ gặp bất kỳ vướng mắc nào hoặc muốn bổ sung thêm các bài hát, âm thanh mới vào hệ thống, xin vui lòng liên hệ ngay với Bộ phận Kỹ thuật Phần mềm của Trung tâm để được hỗ trợ tức thì:\n"
        "• Đơn vị: Bộ phận Công nghệ Thông tin - Trung tâm GDQPAN ĐHQG-HCM\n"
        "• Địa chỉ: Số 01 Lê Quý Đôn, Khu phố 6, P. Đông Hòa, TP. Dĩ An, Bình Dương\n"
        "• Số điện thoại hỗ trợ kỹ thuật trực ban: (028) 3724 2160 (Số máy lẻ Kỹ thuật)\n"
        "• Đường dây nóng hỗ trợ phần mềm: 24/7 luôn sẵn sàng phục vụ các ca trực.",
        box_type="info")
        
    p_div2 = doc.add_paragraph()
    p_div2.paragraph_format.space_before = Pt(12)
    p_div2.paragraph_format.space_after = Pt(8)
    
    tbl_sign = doc.add_table(rows=1, cols=2)
    tbl_sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_sign.autofit = False
    
    s_c1, s_c2 = tbl_sign.cell(0, 0), tbl_sign.cell(0, 1)
    s_c1.width = Inches(3.25)
    s_c2.width = Inches(3.25)
    
    sp1 = s_c1.paragraphs[0]
    sp1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sr1 = sp1.add_run("NGƯỜI LẬP TÀI LIỆU\n")
    format_run(sr1, font_name="Times New Roman", size_pt=10.5, bold=True)
    sr2 = sp1.add_run("(Ký, ghi rõ họ tên)\n\n\n\n\n")
    format_run(sr2, font_name="Times New Roman", size_pt=9.5, italic=True)
    sr3 = sp1.add_run("Đội ngũ Kỹ thuật Phần mềm GDQPAN")
    format_run(sr3, font_name="Times New Roman", size_pt=10.5, bold=True, color_rgb=RGBColor(10, 77, 60))
    
    sp2 = s_c2.paragraphs[0]
    sp2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sr4 = sp2.add_run("GIÁM ĐỐC TRUNG TÂM PHÊ DUYỆT\n")
    format_run(sr4, font_name="Times New Roman", size_pt=10.5, bold=True)
    sr5 = sp2.add_run("(Ký, đóng dấu và ghi rõ họ tên)\n\n\n\n\n")
    format_run(sr5, font_name="Times New Roman", size_pt=9.5, italic=True)
    sr6 = sp2.add_run(".............................................................")
    format_run(sr6, font_name="Times New Roman", size_pt=10.5, bold=True)
    
    output_filename = "HUONG_DAN_SU_DUNG_HE_THONG_THONG_BAO_GDQPAN.docx"
    doc.save(output_filename)
    print(f"Tạo thành công tệp: {output_filename}")

if __name__ == "__main__":
    create_user_guide()
