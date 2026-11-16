<div align="center">

# 👻 GhostPilot

**同時AIマウス/キーボード＆デスクトップブリッジ**

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Türkçe-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Türkçe"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/English-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="English"></a>
  <a href="README.zh.md"><img src="https://img.shields.io/badge/中文-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/日本語-f59e0b?style=for-the-badge&labelColor=f59e0b&logoColor=111111" alt="日本語"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/한국어-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="한국어"></a>
  <a href="README.vi.md"><img src="https://img.shields.io/badge/Tiếng%20Việt-334155?style=for-the-badge&labelColor=334155&logoColor=ffffff" alt="Tiếng Việt"></a>
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

**仮想入力**でブラウザ・Webゲーム・デスクトップウィンドウを操作する超軽量AIエージェント。物理マウスやキーボードを**一切ブロックしません**。

> **開発者：** [BTM Code](https://github.com/Btmcode) · [ウェブサイト](https://btmcode.vercel.app) · [ブログ](https://mnemark.blogspot.com)
>
> **プライバシー優先：** テレメトリなし · キーはあなたのブラウザ内のみ · パスワード欄は決して読みません → [SECURITY.md](SECURITY.md)

---

## GhostPilotを選ぶ理由

| 課題 | GhostPilotの解決策 |
|---|---|
| 自動化ツールは本物のカーソルを奪う | **仮想/CDP入力**を使用 — マウスはそのまま使えます |
| 開いているタブを乗っ取る | **独立したウィンドウ**で実行 |
| 無料トークンが切れると停止 | **プロバイダーの自動切り替え** |
| 再起動でタスクを忘れる | **永続メモリ** — 最後のステップから再開 |
| 20個のプロンプトを書く必要がある | **目標を1つ書くだけ**、エージェントが全体を計画・実行 |

## 主な機能

| 機能 | 説明 |
|---|---|
| 🎯 **ミッションエンジン** | 大きな目標を書くと、エージェントが4〜10ステップに分割し、ページを見て各ステップを検証しながら実行し続けます |
| 🗔 **独立ウィンドウ** | タスクは新しいウィンドウで実行 — 開いているタブはそのまま |
| 🔁 **プロバイダー切り替え** | トークンが切れると自動で別プロバイダーへ。タスクは止まりません |
| 🧠 **永続メモリ** | 各ステップをディスクに保存。ブラウザを閉じても続きから再開 |
| 🖱️ **ゴーストカーソル** | クローズドShadow DOM + GPU合成。物理マウスと同時に動作 |
| 🖥️ **デスクトップブリッジ** | Windows `PostMessageW` · macOS `CGEventPostToPid` · Linux X11 MPX — 本物の第2カーソル |
| 🛑 **緊急停止** | `Alt+Shift+X` — すべてのAI入力を即座に遮断し、押下中のキーを解放 |
| 🔒 **アクセスゲート** | フル / 読み取り専用 / ロック · 時間制限 · タブ範囲 · 監査ログ |

## インストール

1. **デスクトップブリッジ（任意）：** `python3 native-bridge/ghostpilot_daemon.py` — 依存ゼロ、`pip install` 不要
2. **Chrome/Edge/Brave：** `chrome://extensions` → デベロッパーモード → **パッケージ化されていない拡張機能を読み込む** → `extension-chromium`
3. **Firefox：** `about:debugging#/runtime/this-firefox` → **一時的なアドオンを読み込む** → `extension-firefox/manifest.json`
4. **タスクを与える：** アイコンをクリック → 目標を入力 → **▶ タスク開始**

> ワンコマンドウィザード：`python3 kur.py` · Windows `kur.bat` · Linux/macOS `./kur.sh`

## 無料プロバイダー（カード不要）

| プロバイダー | 無料枠 |
|---|---|
| Google Gemini | 1日20〜500リクエスト |
| Groq | 毎分30 · 1日1,000 |
| OpenRouter | `:free` モデル · 1日50 |
| xKiro | 無料26モデル · 1日500Kトークン |
| ModelScope | 1日2,000コール |
| **Ollama / LM Studio** | **無制限 · 完全ローカル · キー不要** |

## セキュリティとプライバシー

| 項目 | 状態 |
|---|---|
| テレメトリ / 解析 | ❌ なし |
| 開発者が運営するサーバー | ❌ なし |
| APIキー | 🔒 `chrome.storage.local` のみ |
| パスワード / カード / OTP欄 | 🚫 決して読みません |
| デスクトップブリッジ | `127.0.0.1` + ランダム48文字トークン + `0600` 権限 |
| CORS | `chrome-extension://` / `moz-extension://` のみ |

ご自分で確認：

```bash
grep -rn "fetch(\|WebSocket(" extension-chromium/ native-bridge/
```

## プロジェクトを支援

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/%E2%98%95_Buy_me_a_coffee-buymeacoffee.com%2Fdevcloudpy-f59e0b?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/devcloudpy)
[![GitHub](https://img.shields.io/badge/%E2%AD%90_Star-github.com%2FBtmcode-181717?style=for-the-badge&logo=github)](https://github.com/Btmcode/GhostPilot)

</div>

GhostPilotは完全に無料でオープンソース。広告なし、テレメトリなし、有料版なし。
お役に立ったら**[コーヒーをご馳走ください](https://buymeacoffee.com/devcloudpy)** ☕

> 💡 拡張機能は初回インストール時とその後週に最大1回、控えめな支援ウィンドウを表示します。**「今後表示しない」**を押せば二度と表示されません。

## ライセンス

```
Copyright (c) 2026 BTM Code — MIT License
https://github.com/Btmcode  ·  https://btmcode.vercel.app  ·  https://mnemark.blogspot.com
```

MITライセンスで公開：コピー・改変・再配布が可能です。唯一の条件は**この著作権表示を保持すること**（[LICENSE](LICENSE)、[COPYRIGHT](COPYRIGHT) 参照）。
外部ライブラリなし — Python標準ライブラリ以外の依存はありません。

> 📖 デスクトップブリッジ、MCP統合、39プロバイダーの詳細表は [README.md](README.md)（トルコ語）と [README.en.md](README.en.md)（英語）をご覧ください。

---

*© 2026 BTM Code · MIT · [github.com/Btmcode/GhostPilot](https://github.com/Btmcode/GhostPilot)*