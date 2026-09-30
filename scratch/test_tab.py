import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect where tab-pane-merge, tab-pane-record, tab-pane-tts are in the HTML
import re
print("Matches for tab-pane:")
for m in re.finditer(r'id=["\']tab-pane-[^"\']+["\']', content):
    line_no = content[:m.start()].count('\n') + 1
    print(f"Line {line_no}: {m.group(0)}")

print("\nMatches for switchNoticeTab:")
for m in re.finditer(r'switchNoticeTab\(.*?\)', content):
    line_no = content[:m.start()].count('\n') + 1
    print(f"Line {line_no}: {m.group(0)}")
