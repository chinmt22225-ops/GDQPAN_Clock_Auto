import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        if 'sch-time-input' in line:
            print(f"{idx}: {line.strip()[:140]}")
