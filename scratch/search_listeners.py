import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        for pattern in ['addEventListener', 'onclick', 'onmousedown', 'onfocus', 'onpointer']:
            if pattern in line:
                if any(k in line for k in ['click', 'mouse', 'pointer', 'focus', 'document.', 'window.']):
                    print(f'{idx}: {line.strip()[:100]}')
                    break
