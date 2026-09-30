# -*- coding: utf-8 -*-
"""
Hệ Thống Thông Báo Tự Động GDQPAN - TTS Service
Dịch vụ phát âm AI Neural 3 miền Bắc - Trung - Nam
Chuẩn hóa theo hàm generate_ssml với Edge Neural Voices
"""

import io
import sys
import asyncio
from aiohttp import web
import edge_tts

# Đảm bảo mã hóa UTF-8 an toàn trên Windows Console
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def generate_ssml(text: str, region: str) -> str:
    # Cấu hình tham số giọng cho từng miền
    configs = {
        "bac": {
            "voice_name": "vi-VN-HoaiMyNeural",
            "rate": "+0%",
            "pitch": "+0%",
            "break_time": "250ms"
        },
        "nam": {
            "voice_name": "vi-VN-NamMinhNeural",
            "rate": "+6%",
            "pitch": "-3%",
            "break_time": "180ms"
        },
        "trung": {
            "voice_name": "vi-VN-CentralVoice", # Sử dụng voice ID miền Trung của engine hỗ trợ
            "rate": "-2%",
            "pitch": "-6%",
            "break_time": "150ms"
        }
    }
    
    cfg = configs.get(region.lower(), configs["bac"])
    
    # Tạo cấu trúc SSML chuẩn
    ssml = f"""
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="vi-VN">
        <voice name="{cfg['voice_name']}">
            <prosody rate="{cfg['rate']}" pitch="{cfg['pitch']}">
                {text}
                <break time="{cfg['break_time']}"/>
            </prosody>
        </voice>
    </speak>
    """.strip()
    return ssml

# Bảng ánh xạ giọng sang Edge-TTS engine
EDGE_TTS_MAPPING = {
    "bac": {
        "voice": "vi-VN-HoaiMyNeural",
        "rate": "+0%",
        "pitch": "+0Hz"
    },
    "bac_nam": {
        "voice": "vi-VN-NamMinhNeural",
        "rate": "-2%",
        "pitch": "+0Hz"
    },
    "nam": {
        "voice": "vi-VN-NamMinhNeural",
        "rate": "-2%",
        "pitch": "+0Hz"
    },
    "trung": {
        "voice": "vi-VN-HoaiMyNeural",  # Áp dụng trường độ miền Trung
        "rate": "-10%",
        "pitch": "+0Hz"
    }
}

async def handle_tts(request: web.Request) -> web.Response:
    text = request.query.get("text", "").strip()
    voice_param = request.query.get("voice", "").strip()
    region_raw = request.query.get("region", "bac").lower()
    
    # Chuẩn hóa region: ưu tiên match key đầy đủ trước (ví dụ 'bac_nam'),
    # nếu không có thì fallback về phần trước dấu gạch dưới (ví dụ 'bac')
    region = region_raw
    if region not in EDGE_TTS_MAPPING:
        region = region_raw.split("_")[0]
    if region not in EDGE_TTS_MAPPING:
        region = "bac"

    if not text:
        return web.Response(text="Vui lòng cung cấp nội dung cần đọc trong tham số 'text'.", status=400)

    cfg = EDGE_TTS_MAPPING[region]
    
    # Xác định giọng đọc ưu tiên (nếu có truyền voice cụ thể)
    selected_voice = cfg["voice"]
    if voice_param:
        vp_lower = voice_param.lower()
        if "namminh" in vp_lower or "nam minh" in vp_lower:
            selected_voice = "vi-VN-NamMinhNeural"
        elif "hoaimy" in vp_lower or "hoài my" in vp_lower:
            selected_voice = "vi-VN-HoaiMyNeural"
        elif voice_param.startswith("vi-VN-"):
            selected_voice = voice_param
        elif "an" in vp_lower or "microsoft" in vp_lower:
            # Microsoft An là giọng máy Windows cục bộ (SAPI5/Web Speech API)
            return web.Response(
                text="Microsoft An là giọng máy Windows cục bộ (SAPI5), vui lòng phát trực tiếp qua Web Speech API.",
                status=400,
                headers={"Access-Control-Allow-Origin": "*"}
            )

    # Cho phép ghi đè tốc độ nếu truyền qua query param
    # Căn cứ vào giọng Nữ (Hoài My) rất chuẩn mực ở rate=+0%:
    # Giọng Nam (Nam Minh) ở mặc định đọc hơi nhanh hơn ~2-3%.
    # Áp dụng offset -2% cho Nam Minh để trường độ, nhịp điệu và độ ngân từ tương đồng hoàn hảo với Hoài My.
    rate = request.query.get("rate", cfg["rate"])
    rate_str = cfg["rate"]
    if str(rate).endswith("%") and (str(rate).startswith("+") or str(rate).startswith("-")):
        rate_str = str(rate)
    else:
        try:
            rate_val = float(rate)
            offset = -2 if (selected_voice == "vi-VN-NamMinhNeural" or "nam" in selected_voice.lower()) else 0
            if rate_val <= 0.65:
                pct = -30 + offset
            elif rate_val <= 0.85:
                pct = -15 + offset
            elif rate_val >= 1.5:
                pct = 30 + offset
            elif rate_val >= 1.2:
                pct = 15 + offset
            else:
                pct = int((rate_val - 1.0) * 100) + offset

            rate_str = f"+{pct}%" if pct >= 0 else f"{pct}%"
        except Exception:
            rate_str = cfg["rate"]

    mp3_bytes = None
    last_err = None

    # Danh sách voice thử nghiệm: ưu tiên voice được chọn, nếu Bing lỗi trên câu này thì tự động chuyển voice AI còn lại
    voices_to_try = [selected_voice]
    if selected_voice == "vi-VN-HoaiMyNeural":
        voices_to_try.append("vi-VN-NamMinhNeural")
    elif selected_voice == "vi-VN-NamMinhNeural":
        voices_to_try.append("vi-VN-HoaiMyNeural")

    for v in voices_to_try:
        for attempt in range(2):
            try:
                # Dùng rate_str đã căn chỉnh trực tiếp trong Edge-TTS (xử lý ở cấp độ neural, âm thanh trong trẻo, không rè)
                communicate = edge_tts.Communicate(text, v, rate=rate_str, pitch="+0Hz")
                mp3_buffer = io.BytesIO()
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        mp3_buffer.write(chunk["data"])
                
                data = mp3_buffer.getvalue()
                if data:
                    mp3_bytes = data
                    break
            except Exception as exc:
                last_err = exc
                if attempt == 0:
                    await asyncio.sleep(0.2)
                    continue
        if mp3_bytes:
            break

    if not mp3_bytes:
        return web.Response(
            text=f"Lỗi tạo âm thanh AI: {str(last_err or 'Không nhận được dữ liệu âm thanh')}",
            status=500,
            headers={"Access-Control-Allow-Origin": "*"}
        )

    return web.Response(
        body=mp3_bytes,
        content_type="audio/mpeg",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Cache-Control": "public, max-age=86400"
        }
    )

async def handle_ssml(request: web.Request) -> web.Response:
    text = request.query.get("text", "").strip()
    region = request.query.get("region", "bac").lower()
    ssml_content = generate_ssml(text, region)
    return web.Response(
        text=ssml_content,
        content_type="application/xml; charset=utf-8",
        headers={"Access-Control-Allow-Origin": "*"}
    )

async def handle_status(request: web.Request) -> web.Response:
    return web.json_response(
        {
            "status": "online",
            "service": "GDQPAN Neural TTS",
            "voices": {
                "bac": "vi-VN-HoaiMyNeural (+0% rate, +0% pitch)",
                "nam": "vi-VN-NamMinhNeural (+6% rate, -3% pitch)",
                "trung": "vi-VN-CentralVoice / HoaiMy (-2% rate, -6% pitch)"
            }
        },
        headers={"Access-Control-Allow-Origin": "*"}
    )

async def handle_options(request: web.Request) -> web.Response:
    return web.Response(
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    )

def create_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/api/tts", handle_tts)
    app.router.add_post("/api/tts", handle_tts)
    app.router.add_options("/api/tts", handle_options)
    app.router.add_get("/api/ssml", handle_ssml)
    app.router.add_get("/api/status", handle_status)
    app.router.add_options("/api/status", handle_options)
    return app

if __name__ == "__main__":
    print("==================================================")
    print(" HỆ THỐNG THÔNG BÁO GDQPAN - DỊCH VỤ GIỌNG ĐỌC AI")
    print(" Đang khởi động tại: http://127.0.0.1:5050")
    print(" - Miền Bắc: vi-VN-HoaiMyNeural")
    print(" - Miền Nam: vi-VN-NamMinhNeural")
    print(" - Miền Trung: vi-VN-CentralVoice")
    print("==================================================")
    app = create_app()
    web.run_app(app, host="127.0.0.1", port=5050)
