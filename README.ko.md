<div align="center">

# 👻 GhostPilot

**동시 AI 마우스/키보드 및 데스크톱 브리지**

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Türkçe-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Türkçe"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="English"></a>
  <a href="README.zh.md"><img src="https://img.shields.io/badge/中文-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/日本語-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="日本語"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/한국어-f59e0b?style=for-the-badge&labelColor=f59e0b&logoColor=111111" alt="한국어"></a>
  <a href="README.vi.md"><img src="https://img.shields.io/badge/Tiếng%20Việt-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Tiếng Việt"></a>
  <a href="README.de.md"><img src="https://img.shields.io/badge/Deutsch-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Deutsch"></a>
  <a href="README.ms.md"><img src="https://img.shields.io/badge/Melayu-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Melayu"></a>
</p>

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.8.0-green.svg)]()
[![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()
[![Telemetry](https://img.shields.io/badge/telemetry-none-success.svg)](SECURITY.md)
[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95-Buy%20me%20a%20coffee-f59e0b?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/btmcode)

</div>

---

**가상 입력**으로 브라우저, 웹 게임, 데스크톱 창을 제어하는 초경량 AI 에이전트 — 물리적 마우스와 키보드를 **절대 막지 않습니다**.

> **개발자:** [BTM Code](https://github.com/Btmcode) · [웹사이트](https://btmcode.vercel.app) · [블로그](https://mnemark.blogspot.com)
>
> **개인정보 우선:** 텔레메트리 없음 · 키는 브라우저에만 저장 · 비밀번호 필드는 절대 읽지 않음 → [SECURITY.md](SECURITY.md)

---

## 왜 GhostPilot인가?

| 문제 | GhostPilot의 해결책 |
|---|---|
| 자동화 도구가 실제 커서를 가로챕니다 | **가상/CDP 입력** 사용 — 마우스는 계속 작동 |
| 도구가 열린 탭을 점유합니다 | **별도 창**에서 실행 |
| 무료 토큰이 소진되면 멈춥니다 | **자동 공급자 전환** |
| 재시작하면 작업을 잊습니다 | **영구 메모리** — 마지막 단계부터 재개 |
| 프롬프트를 20개 써야 합니다 | **목표 하나만 작성**, 에이전트가 전체 체인을 계획·실행 |

## 주요 기능

| 기능 | 설명 |
|---|---|
| 🎯 **미션 엔진** | 큰 목표를 쓰면 에이전트가 4~10단계로 나누고, 페이지를 보며 각 단계를 검증하고 계속 실행합니다 |
| 🗔 **별도 창** | 작업은 새 창에서 실행 — 열린 탭은 그대로 |
| 🔁 **공급자 전환** | 토큰이 소진되면 자동으로 다른 공급자로 전환. 작업이 멈추지 않습니다 |
| 🧠 **영구 메모리** | 모든 단계를 디스크에 저장. 브라우저를 닫아도 이어서 재개 |
| 🖱️ **고스트 커서** | 닫힌 Shadow DOM + GPU 합성. 물리 마우스와 동시 작동 |
| 🖥️ **데스크톱 브리지** | Windows `PostMessageW` · macOS `CGEventPostToPid` · Linux X11 MPX — 진짜 두 번째 커서 |
| 🛑 **긴급 정지** | `Alt+Shift+X` — 모든 AI 입력을 즉시 차단하고 눌린 키를 해제 |
| 🔒 **접근 게이트** | 전체 / 읽기 전용 / 잠금 · 시간 제한 · 탭 범위 · 감사 로그 |

## 설치

1. **데스크톱 브리지(선택):** `python3 native-bridge/ghostpilot_daemon.py` — 의존성 없음, `pip install` 불필요
2. **Chrome/Edge/Brave:** `chrome://extensions` → 개발자 모드 → **압축해제된 확장 프로그램 로드** → `extension-chromium`
3. **Firefox:** `about:debugging#/runtime/this-firefox` → **임시 부가 기능 로드** → `extension-firefox/manifest.json`
4. **작업 지시:** 아이콘 클릭 → 목표 작성 → **▶ 작업 시작**

> 원클릭 마법사: `python3 kur.py` · Windows `kur.bat` · Linux/macOS `./kur.sh`

## 무료 공급자 (카드 불필요)

| 공급자 | 무료 한도 |
|---|---|
| Google Gemini | 하루 20~500회 요청 |
| Groq | 분당 30 · 하루 1,000 |
| OpenRouter | `:free` 모델 · 하루 50 |
| xKiro | 무료 모델 26개 · 하루 500K 토큰 |
| ModelScope | 하루 2,000회 호출 |
| **Ollama / LM Studio** | **무제한 · 완전 로컬 · 키 불필요** |

## 보안 및 개인정보

| 항목 | 상태 |
|---|---|
| 텔레메트리 / 분석 | ❌ 없음 |
| 개발자 운영 서버 | ❌ 없음 |
| API 키 | 🔒 `chrome.storage.local`에만 |
| 비밀번호 / 카드 / OTP 필드 | 🚫 절대 읽지 않음 |
| 데스크톱 브리지 | `127.0.0.1` + 무작위 48자 토큰 + `0600` 권한 |
| CORS | `chrome-extension://` / `moz-extension://`만 |

직접 확인하세요:

```bash
grep -rn "fetch(\|WebSocket(" extension-chromium/ native-bridge/
```

## 프로젝트 후원

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95_Buy_me_a_coffee-buymeacoffee.com%2Fbtmcode-f59e0b?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/btmcode)
[![GitHub](https://img.shields.io/badge/%E2%AD%90_Star-github.com%2FBtmcode-181717?style=for-the-badge&logo=github)](https://github.com/Btmcode/GhostPilot)

</div>

GhostPilot은 완전히 무료이며 오픈 소스입니다. 광고 없음, 텔레메트리 없음, 유료 등급 없음.
도움이 되었다면 **[커피 한 잔 사주세요](https://buymeacoffee.com/btmcode)** ☕

> 💡 확장 프로그램은 첫 설치 시 그리고 이후 주 1회 이하로 정중한 후원 창을 표시합니다. **"다시 표시 안 함"**을 누르면 다시는 나타나지 않습니다.

## 라이선스

```
Copyright (c) 2026 BTM Code — MIT License
https://github.com/Btmcode  ·  https://btmcode.vercel.app  ·  https://mnemark.blogspot.com
```

MIT 라이선스로 공개: 복사, 수정, 재배포가 가능합니다. 유일한 조건은 **이 저작권 고지를 유지하는 것**입니다 ([LICENSE](LICENSE), [COPYRIGHT](COPYRIGHT) 참조).
외부 라이브러리 없음 — Python 표준 라이브러리 외 의존성 없음.

> 📖 데스크톱 브리지, MCP 통합 및 39개 공급자 전체 표는 [README.md](README.md)(터키어)와 [README.en.md](README.en.md)(영어)를 참고하세요.

---

*© 2026 BTM Code · MIT · [github.com/Btmcode/GhostPilot](https://github.com/Btmcode/GhostPilot)*