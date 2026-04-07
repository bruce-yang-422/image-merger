# 圖片合併工具

這是一個提供雙版本使用方式的圖片合併專案，可依需求選擇：

- `Python` 本機版：適合批次處理、自動化腳本整合與離線使用
- `GitHub Pages` 網頁版：適合直接在瀏覽器上傳圖片、即時預覽與下載結果

目前專案已建立基本骨架，後續會持續讓兩個版本共用相同的合併邏輯與操作概念，降低維護成本。

## 功能概述

- 支援多張圖片合併為單一輸出檔
- 支援垂直拼接與水平拼接
- 可調整圖片間距
- 可設定外圍留白
- 可指定背景顏色
- 可輸出為常見圖片格式

## 專案目錄

```text
image-merger/
├─ index.html          ← 網頁版入口（GitHub Pages 根目錄）
├─ assets/
│  ├─ css/
│  │  └─ style.css     ← 網頁版樣式
│  └─ js/
│     └─ app.js        ← 網頁版應用邏輯
├─ cli.py              ← Python CLI 執行入口
├─ requirements.txt    ← Python 套件需求清單
└─ src/
   └─ image_merger/    ← Python 核心邏輯
      ├─ __init__.py
      └─ merge.py
```

## Python 本機版

Python 版適合以下情境：

- 合併大量圖片
- 整合進既有工作流程或批次腳本
- 在沒有網路的環境中使用
- 未來擴充更多參數與自動化功能

### 安裝方式

建議先建立虛擬環境，再安裝所需套件：

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 使用範例

從輸入資料夾讀取圖片並垂直合併：

```bash
python cli.py --input-dir ./input --output-dir ./output --output-name merged_vertical --direction vertical
```

從輸入資料夾讀取圖片並水平合併：

```bash
python cli.py --input-dir ./input --output-dir ./output --output-name merged_horizontal --direction horizontal
```

設定間距、留白、背景色與輸出格式：

```bash
python cli.py --input-dir ./input --output-dir ./output --output-name product_sheet --output-format jpg --spacing 16 --padding 24 --background "#ffffff"
```

### 目前支援參數

- `--input-dir`：輸入資料夾路徑
- `--output-dir`：輸出資料夾路徑，預設為 `output`
- `--output-name`：輸出檔名主體，預設為 `merged_image`
- `--output-format`：輸出格式，可選 `png`、`jpg`、`jpeg`
- `--direction`：合併方向，可選 `vertical` 或 `horizontal`
- `--spacing`：圖片之間的間距
- `--padding`：畫布外圍留白
- `--background`：背景顏色，例如 `#ffffff`
- `--recursive`：遞迴搜尋輸入資料夾中的圖片

## 網頁版

網頁版以前端靜態檔為主，入口頁面是 [`index.html`](./index.html)，樣式與腳本則集中在 [`assets/`](./assets/) 目錄，方便整理與後續維護。

適合以下情境：

- 不想安裝 Python 環境
- 想快速上傳圖片後立即下載結果
- 想把工具部署成公開頁面供其他人使用

### 本機預覽

在專案根目錄執行以下指令，即可啟動本機伺服器：

```bash
python -m http.server
```

接著開啟下列網址：

```text
http://localhost:8000/
```

### 部署到 GitHub Pages

1. 將專案推送到 GitHub 儲存庫
2. 進入儲存庫的 `Settings`
3. 開啟 `Pages`
4. 在發布來源選擇 `Deploy from a branch`
5. 選擇要發布的分支，例如 `main`
6. 選擇資料夾 `/（root）`
7. 儲存設定並等待 GitHub 完成發布

發布完成後，即可透過 GitHub Pages 網址使用網頁版工具。

## 架構方向

本專案採用雙版本策略：

- `Python` 版負責穩定的檔案處理與批次作業
- `HTML + JavaScript` 版負責互動式操作與即時預覽
- 兩邊盡量維持一致的參數概念，例如方向、間距、留白與背景色

這樣的好處是：

- 使用者可依使用情境選擇合適版本
- 功能規格較容易同步
- 後續擴充時可以共用邏輯與設計思路

## 後續規劃

- 支援拖放排序圖片
- 自動依檔名排序
- 新增縮圖預覽
- 支援刪除單張圖片
- 增加縮放與對齊模式
- 支援輸出 `JPG` 與 `WebP`
- 支援整個資料夾批次處理
- 增加設定儲存功能

## 授權條款

本專案採用 [MIT 授權](./LICENSE)。
