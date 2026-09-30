import re

with open('HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Search for disabled or readonly on textarea:")
for idx, line in enumerate(lines, 1):
    if 'disabled' in line or 'readOnly' in line or 'readonly' in line:
        if 'tts' in line or 'input' in line or 'textarea' in line:
            print(f"{idx}: {line.strip()}")

print("\nSearch for pointer-events:")
for idx, line in enumerate(lines, 1):
    if 'pointer-events' in line or 'pointerEvents' in line:
        print(f"{idx}: {line.strip()}")

print("\nSearch for z-index:")
for idx, line in enumerate(lines, 1):
    if 'z-index' in line or 'zIndex' in line:
        print(f"{idx}: {line.strip()[:100]}")
