<div align="center">

# 👻 GhostPilot

**Chuột/Bàn phím AI đồng thời & Cầu nối máy tính**

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Türkçe-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Türkçe"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="English"></a>
  <a href="README.zh.md"><img src="https://img.shields.io/badge/中文-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/日本語-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="日本語"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/한국어-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="한국어"></a>
  <a href="README.vi.md"><img src="https://img.shields.io/badge/Tiếng%20Việt-f59e0b?style=for-the-badge&labelColor=f59e0b&logoColor=111111" alt="Tiếng Việt"></a>
  <a href="README.de.md"><img src="https://img.shields.io/badge/Deutsch-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Deutsch"></a>
  <a href="README.ms.md"><img src="https://img.shields.io/badge/Melayu-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Melayu"></a>
</p>

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.1-green.svg)]()
[![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()
[![Telemetry](https://img.shields.io/badge/telemetry-none-success.svg)](SECURITY.md)
[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95-Buy%20me%20a%20coffee-f59e0b?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/devcloudpy)

</div>

---

Một tác nhân AI siêu nhẹ điều khiển trình duyệt, game web và cửa sổ máy tính bằng **đầu vào ảo** — **không bao giờ chặn** chuột hay bàn phím thật của bạn.

> **Nhà phát triển:** [BTM Code](https://github.com/Btmcode) · [Trang web](https://btmcode.vercel.app) · [Blog](https://mnemark.blogspot.com)
>
> **Ưu tiên quyền riêng tư:** không đo từ xa · khóa chỉ nằm trong trình duyệt của bạn · không bao giờ đọc trường mật khẩu → [SECURITY.md](SECURITY.md)

---

## Vì sao chọn GhostPilot?

| Vấn đề | GhostPilot giải quyết thế nào |
|---|---|
| Công cụ tự động chiếm con trỏ thật của bạn | Dùng **đầu vào ảo/CDP** — chuột của bạn vẫn hoạt động |
| Công cụ chiếm các tab đang mở | Chạy trong **cửa sổ riêng** |
| Hết token miễn phí là dừng | **Tự động chuyển nhà cung cấp** |
| Quên nhiệm vụ khi khởi động lại | **Bộ nhớ bền vững** — tiếp tục từ bước cuối |
| Bạn phải viết 20 câu lệnh | **Chỉ viết một mục tiêu**, tác nhân lập kế hoạch và thực thi toàn bộ chuỗi |

## Điểm nổi bật

| Tính năng | Mô tả |
|---|---|
| 🎯 **Động cơ nhiệm vụ** | Viết mục tiêu lớn; tác nhân chia thành 4–10 bước, xác minh từng bước bằng cách xem trang và tiếp tục không ngừng |
| 🗔 **Cửa sổ riêng** | Nhiệm vụ chạy trong cửa sổ mới — các tab đang mở không bị ảnh hưởng |
| 🔁 **Chuyển nhà cung cấp** | Hết token sẽ tự chuyển sang nhà cung cấp khác; nhiệm vụ không dừng |
| 🧠 **Bộ nhớ bền vững** | Mỗi bước được ghi vào đĩa; kể cả đóng trình duyệt vẫn tiếp tục được |
| 🖱️ **Con trỏ ma** | Shadow DOM đóng + tổng hợp GPU; hoạt động cùng lúc với chuột thật |
| 🖥️ **Cầu nối máy tính** | Windows `PostMessageW` · macOS `CGEventPostToPid` · Linux X11 MPX — con trỏ thứ hai thật sự |
| 🛑 **Dừng khẩn cấp** | `Alt+Shift+X` — cắt ngay mọi đầu vào AI và nhả các phím đang giữ |
| 🔒 **Cổng truy cập** | Đầy đủ / Chỉ đọc / Khóa · quyền theo thời gian · phạm vi tab · nhật ký kiểm toán |

## Cài đặt

1. **Cầu nối máy tính (tùy chọn):** `python3 native-bridge/ghostpilot_daemon.py` — không phụ thuộc, không cần `pip install`
2. **Chrome/Edge/Brave:** `chrome://extensions` → Chế độ nhà phát triển → **Tải tiện ích đã giải nén** → `extension-chromium`
3. **Firefox:** `about:debugging#/runtime/this-firefox` → **Tải tiện ích tạm thời** → `extension-firefox/manifest.json`
4. **Giao nhiệm vụ:** nhấp biểu tượng → viết mục tiêu → **▶ Bắt đầu nhiệm vụ**

> Trình hướng dẫn một lệnh: `python3 kur.py` · Windows `kur.bat` · Linux/macOS `./kur.sh`

## Nhà cung cấp miễn phí (không cần thẻ)

| Nhà cung cấp | Hạn mức miễn phí |
|---|---|
| Google Gemini | 20–500 yêu cầu/ngày |
| Groq | 30 yêu cầu/phút · 1.000/ngày |
| OpenRouter | mô hình `:free` · 50/ngày |
| xKiro | 26 mô hình miễn phí · 500K token/ngày |
| ModelScope | 2.000 cuộc gọi/ngày |
| **Ollama / LM Studio** | **Không giới hạn · hoàn toàn cục bộ · không cần khóa** |

## Bảo mật & quyền riêng tư

| Mục | Trạng thái |
|---|---|
| Đo từ xa / phân tích | ❌ không có |
| Máy chủ của nhà phát triển | ❌ không có |
| Khóa API | 🔒 chỉ `chrome.storage.local` |
| Trường mật khẩu / thẻ / OTP | 🚫 không bao giờ đọc |
| Cầu nối máy tính | `127.0.0.1` + token 48 ký tự ngẫu nhiên + quyền `0600` |
| CORS | chỉ `chrome-extension://` / `moz-extension://` |

Tự kiểm chứng:

```bash
grep -rn "fetch(\|WebSocket(" extension-chromium/ native-bridge/
```

## Ủng hộ dự án

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95_Buy_me_a_coffee-buymeacoffee.com%2Fdevcloudpy-f59e0b?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/devcloudpy)
[![GitHub](https://img.shields.io/badge/%E2%AD%90_Star-github.com%2FBtmcode-181717?style=for-the-badge&logo=github)](https://github.com/Btmcode/GhostPilot)

</div>

GhostPilot hoàn toàn miễn phí và mã nguồn mở. Không quảng cáo, không đo từ xa, không gói trả phí.
Nếu nó giúp ích cho bạn, hãy **[mời tôi một ly cà phê](https://buymeacoffee.com/devcloudpy)** ☕

> 💡 Tiện ích hiển thị một cửa sổ ủng hộ lịch sự khi cài lần đầu, sau đó tối đa một lần mỗi tuần. Nhấn **"Không hiển thị lại"** và nó sẽ không bao giờ xuất hiện nữa.

## Giấy phép

```
Copyright (c) 2026 BTM Code — MIT License
https://github.com/Btmcode  ·  https://btmcode.vercel.app  ·  https://mnemark.blogspot.com
```

Phát hành theo giấy phép MIT: bạn có thể sao chép, sửa đổi và phân phối lại. Điều kiện duy nhất là **giữ nguyên thông báo bản quyền này** (xem [LICENSE](LICENSE), [COPYRIGHT](COPYRIGHT)).
Không có thư viện bên ngoài — không phụ thuộc gì ngoài thư viện chuẩn Python.

> 📖 Để xem cầu nối máy tính, tích hợp MCP và bảng đầy đủ 39 nhà cung cấp, hãy đọc [README.md](README.md) (tiếng Thổ Nhĩ Kỳ) và [README.en.md](README.en.md) (tiếng Anh).

---

*© 2026 BTM Code · MIT · [github.com/Btmcode/GhostPilot](https://github.com/Btmcode/GhostPilot)*