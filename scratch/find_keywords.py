import sys
sys.stdout.reconfigure(encoding='utf-8')
keywords = [
    'tts-input-desktop', 'sch-time-input', 'tab-pane-tts', 'tab-pane-record',
    'switchNoticeTab', 'initTTSAutosize', 'autosizeTTS', 'handleToggleRecord',
    'editSchedule', 'handleAddSchedule', 'renderScheduleTable', 'VoiceRecorder',
    'quickEditScheduleTime', 'cancelEditSchedule'
]
with open('HE_THONG_THONG_BAO_TU_DONG_DESKTOP.html', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        for kw in keywords:
            if kw in line:
                print(f'{idx} [{kw}]: {line.strip()[:100]}')
                break
