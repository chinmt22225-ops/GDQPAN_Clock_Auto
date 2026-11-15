# -*- coding: utf-8 -*-
"""
Script tạo tài liệu Word tổng hợp toàn diện:
1. BẢN THUYẾT MINH DỰ ÁN VÀ SẢN PHẨM
2. TÀI LIỆU KỸ THUẬT HỆ THỐNG
3. HƯỚNG DẪN SỬ DỤNG CHO KHÁCH HÀNG (CÁN BỘ / TRỰC BAN)
Áp dụng cho bản phát hành: GDQPAN-1.4.17-K471-Official.apk
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

# Định nghĩa các mã màu chủ đạo phong cách Quân đội - ĐHQG-HCM
COLOR_ARMY_GREEN = RGBColor(10, 77, 60)       # #0A4D3C Xanh quân đội sẫm
COLOR_CRIMSON = RGBColor(192, 57, 43)         # #C0392B Đỏ cờ Tổ quốc
COLOR_GOLD = RGBColor(180, 130, 20)           # #B48214 Vàng đồng
COLOR_CHARCOAL = RGBColor(44, 62, 80)         # #2C3E50 Xám đậm
COLOR_DARK_TEXT = RGBColor(30, 41, 59)        # #1E293B Text nội dung chính
COLOR_MUTED = RGBColor(100, 116, 139)         # #64748B Chú thích mờ

HEX_ARMY_GREEN = "0A4D3C"
HEX_LIGHT_GREEN = "E8F5E9"
HEX_CRIMSON = "C0392B"
HEX_LIGHT_RED = "FDEDEC"
HEX_NAVY = "1B4F72"
HEX_LIGHT_BLUE = "EBF5FB"
HEX_BORDER_GRAY = "D1D5DB"
HEX_ZEBRA_GRAY = "F8FAFC"
HEX_GOLD = "B48214"
HEX_LIGHT_YELLOW = "FEF9E7"

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    """Đặt lề trong cho ô bảng (twips: 20 twips = 1 pt)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    """Đổ màu nền ô bảng."""
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)

def set_cell_left_border_only(cell, color_hex="0A4D3C", sz="36"):
    """Tạo viền dày bên trái ô cho Hộp ghi chú (Callout box)."""
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
    """Kẻ viền trang nhã cho bảng dữ liệu."""
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
    """Định dạng phông chữ, kích cỡ và màu sắc chuẩn."""
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    if color_rgb:
        run.font.color.rgb = color_rgb

def add_callout(doc, title, text, box_type="info"):
    """Tạo hộp ghi chú chuyên nghiệp viền nổi bên trái."""
    if box_type == "info":
        border_color, bg_color = HEX_NAVY, HEX_LIGHT_BLUE
        title_rgb = RGBColor(27, 79, 114)
    elif box_type == "tip":
        border_color, bg_color = HEX_ARMY_GREEN, HEX_LIGHT_GREEN
        title_rgb = COLOR_ARMY_GREEN
    elif box_type == "warn":
        border_color, bg_color = HEX_CRIMSON, HEX_LIGHT_RED
        title_rgb = COLOR_CRIMSON
    else:
        border_color, bg_color = HEX_GOLD, HEX_LIGHT_YELLOW
        title_rgb = COLOR_GOLD

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)

    cell = tbl.cell(0, 0)
    set_cell_left_border_only(cell, color_hex=border_color, sz="36")
    set_cell_shading(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    run_t = p.add_run(f"📌 {title}\n")
    format_run(run_t, font_name="Times New Roman", size_pt=11, bold=True, color_rgb=title_rgb)

    run_body = p.add_run(text)
    format_run(run_body, font_name="Times New Roman", size_pt=10.5, color_rgb=COLOR_DARK_TEXT)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(2)
    p_spacer.paragraph_format.space_after = Pt(4)

def add_styled_heading1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    format_run(run, font_name="Times New Roman", size_pt=14.5, bold=True, color_rgb=COLOR_ARMY_GREEN)
    return p

def add_styled_heading2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(13)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    format_run(run, font_name="Times New Roman", size_pt=12.5, bold=True, color_rgb=COLOR_CRIMSON)
    return p

def add_styled_heading3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(9)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    format_run(run, font_name="Times New Roman", size_pt=11.5, bold=True, color_rgb=COLOR_CHARCOAL)
    return p

def add_body_paragraph(doc, text, bold_prefix="", italic_prefix="", space_after=5):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.25
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        format_run(r_pre, font_name="Times New Roman", size_pt=11, bold=True, color_rgb=COLOR_DARK_TEXT)
    if italic_prefix:
        r_ipre = p.add_run(italic_prefix)
        format_run(r_ipre, font_name="Times New Roman", size_pt=11, italic=True, color_rgb=COLOR_MUTED)

    r_txt = p.add_run(text)
    format_run(r_txt, font_name="Times New Roman", size_pt=11, color_rgb=COLOR_DARK_TEXT)
    return p

def add_bullet_item(doc, text, bold_prefix=""):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.2
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        format_run(r_pre, font_name="Times New Roman", size_pt=11, bold=True, color_rgb=COLOR_DARK_TEXT)

    r_txt = p.add_run(text)
    format_run(r_txt, font_name="Times New Roman", size_pt=11, color_rgb=COLOR_DARK_TEXT)
    return p

print("Loaded module successfully")
