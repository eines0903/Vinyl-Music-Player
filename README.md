# 🎵 線上黑膠音樂播放器與桌面應用程式 (Vinyl Music Player)

一個以黑膠唱片機為擬真視覺的跨平台音樂播放器與桌面應用程式。採用 React + TypeScript + Vite + Tailwind CSS，並結合 Tauri 提供極輕量的原生桌面體驗。

---

## 👥 主創團隊 (Core Authors & Creators)

> **Designed & Built by 温采穎 & 蔡懷萱**

| 主創成員 | 角色職責 |
| :--- | :--- |
| **温采穎** | 共同主創 (Co-Creator) / 產品架構與前端設計 |
| **蔡懷萱** | 共同主創 (Co-Creator) / 多媒體引擎與桌面整合 |

---

## ✨ 核心特色與亮點

- 💿 **擬真黑膠視覺與唱針動畫**：播放時唱針旋轉擺入、黑膠唱片平滑旋轉；暫停時平滑停駐，重現黑膠聽感儀式感。
- 🎨 **三套動態毛玻璃主題**：一鍵即時切換「午夜黑膠 (Midnight)」、「落日餘暉 (Sunset)」、「極光深綠 (Emerald)」。
- 📜 **雙模動態歌詞引擎**：高相容 LRC 歌詞解析，支援毫秒級即時滾動置中高亮，無時間標籤時自動優雅降級為純文字展示。
- ⚡ **高效能二進位 ID3 標籤解析**：零拷貝解析 MP3 內嵌封面與歌曲/歌手中繼資料，兼顧超快載入與極低記憶體消耗。
- 🔀 **無偏誤洗牌佇列 (Fisher-Yates)**：以 $O(n)$ 嚴格隨機排列，保留當前曲目播放順序並支援隨時切換。
- ⌨️ **全域無衝突快捷鍵**：空白鍵播放/暫停、左右鍵切換曲目，自動隔離文字輸入框防止誤觸。
- 🖥️ **跨平台原生桌面整合**：使用 Tauri (Rust) 打包，極致輕量、記憶體佔用極低。

---

## 🛠️ 技術棧 (Tech Stack)

- **前端框架**：React 19 + TypeScript + Vite
- **樣式引擎**：Tailwind CSS + PostCSS + CSS Hardware Acceleration
- **多媒體解析**：jsmediatags (ID3v2 TypedArray / Blob Parser)
- **桌面原生底層**：Tauri v2 (Rust + MSVC / Webview2)

---

## 🚀 快速開始

### 1. 安裝依賴
```bash
npm install
```

### 2. 本地開發 (Web 瀏覽器版)
```bash
npm run dev
```
啟動後打開瀏覽器訪問 `http://localhost:5173/` 即可立即體驗！

### 3. 原生桌面版開發 (Tauri 視窗版)
```bash
npm run tauri dev
```

### 4. 正式打包安裝檔 (.exe)
```bash
npm run tauri build
```
打包後的 Windows 原生安裝檔會輸出於 `src-tauri/target/release/bundle/nsis/`。

---

## 📄 版權宣告 (License & Copyright)

Copyright © 2026 **温采穎 & 蔡懷萱**. All rights reserved.
Licensed under the MIT License.
