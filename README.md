# 圖片合併工具

這是一個同時提供 `Python CLI` 與 `GitHub Pages` 網頁版的圖片合併專案。

目前網頁版是主要使用介面，適合直接在瀏覽器上傳圖片、排序、調整設定並下載結果；Python 版則適合離線處理、批次腳本與自動化流程。

## 正式網址

```text
https://image-merger.stack-base.com/
```

## 目前功能

### 網頁版

- 支援 `JPG`、`PNG`、`WebP` 上傳
- 最多可載入 50 張圖片
- 支援拖放上傳與點擊選檔
- 支援依檔名排序、手動拖曳排序、刪除單張、全部清除
- 支援垂直、水平、`Grid` 三種排列模式
- 支援輸出尺寸、間距、背景色、圓角、DPI、分段輸出設定
- 支援 `JPG`、`PNG`、`WebP` 輸出
- 可即時預覽輸出結果、顯示尺寸與預估大小
- 支援主題切換：`System 跟隨系統`、`Light 淺色`、`Dark 深色`

### Python 版

- 從輸入資料夾讀取圖片
- 將結果輸出到指定資料夾
- 支援垂直與水平合併
- 支援間距、留白、背景色
- 支援遞迴讀取子資料夾圖片
- 支援輸出 `png`、`jpg`、`jpeg`

## 專案目錄

```text
image-merger/
├─ index.html
├─ assets/
│  ├─ css/
│  │  ├─ style.css
│  │  ├─ foundation.css
│  │  ├─ components.css
│  │  ├─ responsive.css
│  │  └─ themes.css
│  └─ js/
│     ├─ app.js
│     └─ core.js
├─ cli.py
├─ requirements.txt
├─ doc/
│  └─ 開發文件.md
└─ src/
   └─ image_merger/
      ├─ __init__.py
      └─ merge.py
```

## 網頁版使用方式

### 線上版本

```text
https://image-merger.stack-base.com/
```

### 本機預覽

在專案根目錄執行：

```bash
python -m http.server
```

然後開啟：

```text
http://localhost:8000/
```

### GitHub Pages 部署

1. 將專案推送到 GitHub。
2. 到儲存庫的 `Settings` > `Pages`。
3. 發布來源選擇 `Deploy from a branch`。
4. 分支選擇 `main`，資料夾選擇 `/ (root)`。
5. 儲存後等待 GitHub Pages 發布完成。

## Python 版使用方式

### 安裝

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 範例

垂直合併：

```bash
python cli.py --input-dir ./input --output-dir ./output --output-name merged_vertical --direction vertical
```

水平合併：

```bash
python cli.py --input-dir ./input --output-dir ./output --output-name merged_horizontal --direction horizontal
```

設定背景、間距與留白：

```bash
python cli.py --input-dir ./input --output-dir ./output --output-name product_sheet --output-format jpg --spacing 16 --padding 24 --background "#ffffff"
```

### 目前支援參數

- `--input-dir`：輸入資料夾
- `--output-dir`：輸出資料夾，預設為 `output`
- `--output-name`：輸出檔名主體，預設為 `merged_image`
- `--output-format`：輸出格式，可選 `png`、`jpg`、`jpeg`
- `--direction`：合併方向，可選 `vertical`、`horizontal`
- `--spacing`：圖片間距
- `--padding`：外圍留白
- `--background`：背景色，例如 `#ffffff`
- `--recursive`：遞迴搜尋圖片

## 目前狀態

- 網頁版：已可實際使用，現階段重點是 UI 細修、文件同步與穩定性驗證
- Python 版：基礎可用，適合作為批次工具，但功能比網頁版精簡

## 後續方向

- 持續優化網頁版操作體驗與版面細節
- 補強大量圖片與大尺寸輸出的測試
- 視需求再擴充 Python 版的 `Grid`、品質控制或分段輸出能力

## 授權

本專案採用 [MIT 授權](./LICENSE)。
