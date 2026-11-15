# -*- coding: utf-8 -*-
"""
Chương trình tạo tài liệu Word hoàn chỉnh:
THUYẾT MINH DỰ ÁN, TÀI LIỆU KỸ THUẬT VÀ HƯỚNG DẪN SỬ DỤNG HỆ THỐNG
Áp dụng cho bản phát hành: GDQPAN-1.4.17-K471-Official.apk
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

# Định nghĩa các mã màu phong cách Quân đội - ĐHQG-HCM
COLOR_ARMY_GREEN = RGBColor(10, 77, 60)       # #0A4D3C Xanh quân đội sẫm
COLOR_CRIMSON = RGBColor(192, 57, 43)         # #C0392B Đỏ cờ
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
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)

def set_cell_left_border_only(cell, color_hex="0A4D3C", sz="36"):
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
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    if color_rgb:
        run.font.color.rgb = color_rgb

def add_callout(doc, title, text, box_type="info"):
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
    p.paragraph_format.space_before = Pt(20)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    format_run(run, font_name="Times New Roman", size_pt=14.5, bold=True, color_rgb=COLOR_ARMY_GREEN)
    return p

def add_styled_heading2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    format_run(run, font_name="Times New Roman", size_pt=12.5, bold=True, color_rgb=COLOR_CRIMSON)
    return p

def add_styled_heading3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
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

def create_styled_table(doc, headers, data, col_widths=None):
    table = doc.add_table(rows=len(data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table, color_hex=HEX_BORDER_GRAY, sz="4")

    # Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_shading(hdr_cells[i], HEX_ARMY_GREEN)
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=140, right=140)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            format_run(r, font_name="Times New Roman", size_pt=10.5, bold=True, color_rgb=RGBColor(255, 255, 255))

    # Data Rows
    for r_idx, row_values in enumerate(data):
        row_cells = table.rows[r_idx + 1].cells
        bg_hex = HEX_ZEBRA_GRAY if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_values):
            row_cells[c_idx].text = str(val)
            set_cell_shading(row_cells[c_idx], bg_hex)
            set_cell_margins(row_cells[c_idx], top=100, bottom=100, left=140, right=140)
            p = row_cells[c_idx].paragraphs[0]
            # căn giữa cột số thứ tự hoặc trạng thái ngắn
            if c_idx == 0 and len(str(val)) <= 4:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                format_run(r, font_name="Times New Roman", size_pt=10, color_rgb=COLOR_DARK_TEXT)

    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Inches(w)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(2)
    p_spacer.paragraph_format.space_after = Pt(6)
    return table

print("Base helper loaded.")
