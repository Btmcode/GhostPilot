<div align="center">

# 👻 GhostPilot

**同步 AI 鼠标/键盘与桌面桥接**

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Türkçe-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Türkçe"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="English"></a>
  <a href="README.zh.md"><img src="https://img.shields.io/badge/中文-f59e0b?style=for-the-badge&labelColor=f59e0b&logoColor=111111" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/日本語-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="日本語"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/한국어-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="한국어"></a>
  <a href="README.vi.md"><img src="https://img.shields.io/badge/Tiếng%20Việt-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Tiếng Việt"></a>
  <a href="README.de.md"><img src="https://img.shields.io/badge/Deutsch-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Deutsch"></a>
  <a href="README.ms.md"><img src="https://img.shields.io/badge/Melayu-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Melayu"></a>
</p>

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.7.2-green.svg)]()
[![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()
[![Telemetry](https://img.shields.io/badge/telemetry-none-success.svg)](SECURITY.md)
[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95-Buy%20me%20a%20coffee-f59e0b?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/btmcode)

</div>

---

一个超轻量 AI 代理，用**虚拟输入**驱动浏览器、网页游戏和桌面窗口——**绝不会阻塞**你的物理鼠标或键盘。

> **开发者：** [BTM Code](https://github.com/Btmcode) · [网站](https://btmcode.vercel.app) · [博客](https://mnemark.blogspot.com)
>
> **隐私优先：** 无遥测 · 密钥仅保存在你的浏览器中 · 永不读取密码字段 → [SECURITY.md](SECURITY.md)

---

## 为什么选择 GhostPilot？

| 问题 | GhostPilot 如何解决 |
|---|---|
| 自动化工具会劫持你的真实光标 | 使用**虚拟/CDP 输入** —— 你的鼠标照常工作 |
| 工具会接管你打开的标签页 | 在**独立窗口**中运行 |
| 免费令牌用完就停止 | **自动切换提供商** |
| 重启后忘记任务 | **持久记忆** —— 从上次步骤继续 |
| 你需要写 20 条提示 | **只需写一个目标**，代理会规划并执行整条链路 |

## 功能亮点

| 功能 | 说明 |
|---|---|
| 🎯 **任务引擎** | 写下大目标；代理将其拆分为 4–10 步，通过查看页面验证每一步并持续执行 |
| 🗔 **独立窗口** | 任务在新窗口中运行 —— 你打开的标签页不受影响 |
| 🔁 **提供商故障转移** | 令牌用尽时自动切换提供商，任务不会中断 |
| 🧠 **持久记忆** | 每一步都写入磁盘；即使浏览器关闭也能从断点继续 |
| 🖱️ **幽灵光标** | 封闭 Shadow DOM + GPU 合成；可与物理鼠标同时工作 |
| 🖥️ **桌面桥接** | Windows `PostMessageW` · macOS `CGEventPostToPid` · Linux X11 MPX —— 真正的第二光标 |
| 🛑 **紧急停止** | `Alt+Shift+X` —— 立即切断所有 AI 输入并释放按住的按键 |
| 🔒 **访问控制** | 完全 / 只读 / 锁定 · 定时权限 · 标签页范围 · 审计日志 |

## 安装

1. **桌面桥接（可选）：** `python3 native-bridge/ghostpilot_daemon.py` —— 零依赖，无需 `pip install`
2. **Chrome/Edge/Brave：** `chrome://extensions` → 开发者模式 → **加载已解压的扩展程序** → `extension-chromium`
3. **Firefox：** `about:debugging#/runtime/this-firefox` → **临时载入附加组件** → `extension-firefox/manifest.json`
4. **下达任务：** 点击图标 → 写下目标 → **▶ 开始任务**

> 一键向导：`python3 kur.py` · Windows `kur.bat` · Linux/macOS `./kur.sh`

## 免费提供商（无需信用卡）

| 提供商 | 免费额度 |
|---|---|
| Google Gemini | 每天 20–500 次请求 |
| Groq | 30 次/分钟 · 1,000/天 |
| OpenRouter | `:free` 模型 · 50/天 |
| xKiro | 26 个免费模型 · 每天 500K 令牌 |
| ModelScope | 每天 2,000 次调用 |
| **Ollama / LM Studio** | **无限 · 完全本地 · 无需密钥** |

## 安全与隐私

| 项目 | 状态 |
|---|---|
| 遥测 / 分析 | ❌ 无 |
| 开发者运营的服务器 | ❌ 无 |
| API 密钥 | 🔒 仅 `chrome.storage.local` |
| 密码 / 银行卡 / 验证码字段 | 🚫 永不读取 |
| 桌面桥接 | `127.0.0.1` + 随机 48 字符令牌 + `0600` 权限 |
| CORS | 仅 `chrome-extension://` / `moz-extension://` |

自行验证：

```bash
grep -rn "fetch(\|WebSocket(" extension-chromium/ native-bridge/
```

## 支持项目

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95_Buy_me_a_coffee-buymeacoffee.com%2Fbtmcode-f59e0b?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/btmcode)
[![GitHub](https://img.shields.io/badge/%E2%AD%90_Star-github.com%2FBtmcode-181717?style=for-the-badge&logo=github)](https://github.com/Btmcode/GhostPilot)

</div>

GhostPilot 完全免费且开源。无广告、无遥测、无付费版。
如果它帮到了你，**[请我喝杯咖啡](https://buymeacoffee.com/btmcode)** ☕

> 💡 扩展在首次安装时显示一次礼貌的支持窗口，之后每周最多一次。点击**"不再显示"**后便永远不会出现。

## 许可证

```
Copyright (c) 2026 BTM Code — MIT License
https://github.com/Btmcode  ·  https://btmcode.vercel.app  ·  https://mnemark.blogspot.com
```

以 MIT 许可证发布：你可以复制、修改和再分发。唯一条件是**保留此版权声明**（见 [LICENSE](LICENSE)、[COPYRIGHT](COPYRIGHT)）。
无外部库 —— 除 Python 标准库外无任何依赖。

> 📖 桌面桥接、MCP 集成和 39 个 AI 提供商的完整表格，请参阅 [README.md](README.md)（土耳其语）和 [README.en.md](README.en.md)（英语）。

---

*© 2026 BTM Code · MIT · [github.com/Btmcode/GhostPilot](https://github.com/Btmcode/GhostPilot)*