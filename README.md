# Image Merger

`Image Merger` 是一個以瀏覽器為主、同時保留 `Python CLI` 的圖片合併工具。你可以直接在網頁上傳多張圖片、調整排列與輸出設定、即時預覽後下載；也可以用命令列處理資料夾中的圖片。

正式網址：<https://image-merger.stack-base.com/>

## 專案定位

這個專案分成兩條使用路線：

- 網頁版：主版本，適合日常操作、手動排序、即時預覽與快速下載
- Python 版：輔助版本，適合離線批次處理與腳本整合

## 網頁版功能

目前網頁版已支援：

- 支援 `JPG`、`PNG`、`WebP` 圖片上傳
- 最多載入 50 張圖片
- 拖放上傳與點擊選檔
- 依檔名自然排序
- 手動拖曳排序、刪除單張、全部清除
- 三種拼接方向：`直向`、`橫向`、`網格`
- 輸出尺寸預設值與自訂尺寸
- `JPG`、`PNG`、`WebP` 輸出
- `JPG` 品質調整
- 背景色常用色票、自訂色與文字輸入
- 每張圖片圓角設定
- 圖片間距設定
- `DPI` 選單與實體尺寸換算
- 兩種預覽模式：`滿寬預覽`、`完整置中`
- 兩種分段模式：`固定切段`、`保留整圖`
- 高度超過 `10000px` 顯示建議警告
- 高度超過 `16000px` 時強制啟用自動分段
- 主題切換：`System 跟隨系統`、`Light 淺色`、`Dark 深色`

## Python CLI 功能

目前 Python 版已支援：

- 從輸入資料夾讀取圖片
- 將輸出結果寫入指定資料夾
- 支援 `vertical`、`horizontal` 兩種合併方向
- 支援間距、外圍留白、背景色
- 支援遞迴搜尋子資料夾圖片
- 依檔名排序圖片
- 輸出 `png`、`jpg`、`jpeg`

目前 Python 版尚未支援：

- `Grid` 模式
- `WebP` 輸出
- `DPI` 設定
- 分段輸出
- 即時預覽

## 專案結構

```text
image-merger/
├─ index.html
├─ assets/
│  ├─ brand/
│  │  ├─ favicon.ico
│  │  └─ logo.png
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
│  └─ development_notes.md
└─ src/
   └─ image_merger/
      ├─ __init__.py
      └─ merge.py
```

## 網頁版使用方式

### 直接使用

開啟正式站點即可：

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

## Python CLI 使用方式

### 安裝依賴

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 基本範例

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

### 參數說明

- `--input-dir`：輸入資料夾，必填
- `--output-dir`：輸出資料夾，預設為 `output`
- `--output-name`：輸出檔名主體，預設為 `merged_image`
- `--output-format`：輸出格式，可選 `png`、`jpg`、`jpeg`
- `--direction`：合併方向，可選 `vertical`、`horizontal`
- `--spacing`：圖片間距
- `--padding`：外圍留白
- `--background`：背景色，例如 `#ffffff`
- `--recursive`：遞迴搜尋子資料夾圖片

## 開發重點

目前開發重心在網頁版，包含：

- 介面密度與操作細節持續微調
- 大尺寸與大量圖片的穩定性驗證
- 文件與實作持續同步

如果你想看更偏內部維護的說明，請參考 [doc/development_notes.md](./doc/development_notes.md)。

## 授權

本專案採用 [MIT License](./LICENSE)。
