"""Derive a separate no-add APK from the exact 1.4.12 release, before signing.

Only three web assets change. Native code, manifest, banner and music stay intact.
Run from the repository root; then zipalign/sign with the existing certificate.
"""
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'mobile/GDQPAN-1.4.12.apk'
OUT = ROOT / 'qa/no-add-1.4.12'
OUT.mkdir(parents=True, exist_ok=True)
assert hashlib.file_digest(BASE.open('rb'), 'sha256').hexdigest() == '86ca4e1d6fa9f8ef0ab9e3507200ac19c8dc89ac77c4331c6549d6d1242a4a51'

def replace(text, old, new):
    assert text.count(old) == 1, old
    return text.replace(old, new)

with zipfile.ZipFile(BASE) as archive:
    changed = {}
    html = archive.read('assets/public/index.html').decode('utf-8')
    # Remove controls even when their panels are rendered again.
    for name, container in [('Chao', 'chao'), ('Alarm', 'alarm'), ('Daily', 'daily')]:
        pattern = rf"      const add{name}Btn = document.createElement\('button'\);.*?      {container}Container.appendChild\(add{name}Btn\);"
        html, count = re.subn(pattern, '', html, flags=re.S)
        assert count == 1
    for handler in ["openModalSheet('vtv-schedule')", 'handleAddMergeQueueItem()', 'addScheduleMobile()', 'handleQuickAssignSchedule()']:
        pattern = r'<button\b[^>]*onclick="' + re.escape(handler) + r'"[^>]*>.*?</button>'
        html, count = re.subn(pattern, '', html, flags=re.S)
        assert count == 1, handler
    # Keep the existing schedule save control for editing only.
    html = replace(html, "window.handleAddSchedule = async function () {", "window.handleAddSchedule = async function () {\n    if (!editingScheduleId || !StorageManager.getSchedules().some(s => s.id === editingScheduleId)) return;")
    for name, declaration in [
        ('openAddActionModal', "function (group = 'daily')"),
        ('handleCreateCustomAction', 'async function ()'),
        ('handleAddMergeQueueItem', 'function ()'),
        ('handleQuickAssignSchedule', 'function ()'),
        ('addScheduleMobile', 'function ()'),
    ]:
        key = f'window.{name} = {declaration} {{'
        html = replace(html, key, key + '\n    return; // Creating new items is disabled in this edition.')
    html = replace(html, 'function openModalSheet(type, category = \'\') {', "function openModalSheet(type, category = '') {\n    if (type === 'add_action' || ((type === 'vtv-schedule' || type === 'vtv_schedule') && !vtvSchedules.some(s => s.id === category))) return;")
    html = replace(html, 'window.saveVtvScheduleModal = function (scheduleId) {', 'window.saveVtvScheduleModal = function (scheduleId) {\n    if (!vtvSchedules.some(s => s.id === scheduleId)) return;')
    html = html.replace('Hàng đợi đang trống. Chọn nguồn ở trên và bấm "+ Thêm đoạn vào hàng đợi".', 'Hàng đợi đang trống.')
    html = html.replace('Chưa có lịch phát thời sự nào. Bấm "+ Thêm lịch" để cài đặt.', 'Chưa có lịch phát thời sự nào.')
    html = replace(html, "btnAdd.innerHTML = '+ THÊM LỊCH';", "btnAdd.textContent = 'Lưu thay đổi';")
    html = replace(html, 'onclick="handleAddSchedule()">+ THÊM LỊCH</button>', 'onclick="handleAddSchedule()">Lưu thay đổi</button>')
    changed['assets/public/index.html'] = html.encode('utf-8')

    schedule = archive.read('assets/public/mobile-schedule.js').decode('utf-8')
    schedule = replace(schedule, '<button type="button" id="mobile-schedule-add" class="btn green">+ Thêm lịch</button>', '')
    schedule = replace(schedule, "toolbar.querySelector('button').onclick=()=>{window.cancelEditSchedule();open();};", '')
    schedule = replace(schedule, "document.getElementById('mobile-schedule-add').focus();", "document.querySelector('.mobile-nav button[data-page=\"schedule\"]')?.focus();")
    schedule = replace(schedule, 'const open=(id=null)=>{currentId=id;', 'const open=(id=null)=>{if(!StorageManager.getSchedules().some(s=>s.id===id))return;currentId=id;')
    schedule = schedule.replace('Chưa có lịch phát. Bấm + Thêm lịch để bắt đầu.', 'Chưa có lịch phát.')
    schedule = schedule.replace("id?'Sửa lịch phát':'Thêm lịch phát'", "'Sửa lịch phát'")
    schedule = schedule.replace('>Thêm lịch phát</h2>', '>Sửa lịch phát</h2>')
    changed['assets/public/mobile-schedule.js'] = schedule.encode('utf-8')

    ui = archive.read('assets/public/mobile-ui.js').decode('utf-8')
    ui = replace(ui, 'Thêm lịch trong mục Lịch phát', 'Xem lịch trong mục Lịch phát')
    changed['assets/public/mobile-ui.js'] = ui.encode('utf-8')
    for name, data in changed.items():
        target = OUT / 'patched' / name.removeprefix('assets/public/')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    with zipfile.ZipFile(OUT / 'unsigned.apk', 'w', allowZip64=False) as output:
        for info in archive.infolist():
            if info.filename.startswith('META-INF/'):
                continue  # Sign again after modifying the assets.
            output.writestr(info, changed.get(info.filename, archive.read(info)))
    (OUT / 'changes.json').write_text(json.dumps({'baseSha256': hashlib.file_digest(BASE.open('rb'), 'sha256').hexdigest(), 'changedEntries': list(changed)}, indent=2), encoding='utf-8')
print('Prepared exact 1.4.12 derivative; ready for zipalign and signing.')
