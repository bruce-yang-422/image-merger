# Image Merger 開發文件

本文件記錄目前專案的實作現況、模組分工與後續維護方向。以 2026-04-08 的專案狀態來看，網頁版已是主產品，Python CLI 則維持為精簡但可用的批次工具。

正式網址：<https://image-merger.stack-base.com/>

## 1. 目前定位

專案採雙版本架構：

- 網頁版：`HTML + CSS + JavaScript + Canvas`
- Python 版：`Python + Pillow`

分工原則：

- 網頁版負責互動操作、排序、預覽、下載與主題介面
- Python 版負責資料夾輸入輸出與自動化場景

## 2. 目錄與模組分工

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
│  │  ├─ library.css
│  │  ├─ preview.css
│  │  ├─ responsive.css
│  │  └─ themes.css
│  └─ js/
│     ├─ app.js
│     ├─ core.js
│     └─ shared.js
├─ cli.py
├─ merge_config.yaml
├─ input/
│  └─ .gitkeep
├─ output/
│  └─ .gitkeep
├─ requirements.txt
├─ doc/
│  └─ development_notes.md
└─ src/
   └─ image_merger/
      ├─ __init__.py
      └─ merge.py
```

各檔案職責如下：

- `index.html`：前端主頁面、SEO meta、控制項結構
- `assets/css/style.css`：CSS 匯入入口與全域基礎規則
- `assets/css/foundation.css`：頁面骨架、Header、Footer、外層版面
- `assets/css/components.css`：設定面板、表單控制項、按鈕與通用元件
- `assets/css/library.css`：上傳區、圖片清單、拖曳排序列表樣式
- `assets/css/preview.css`：預覽區、資訊列、警告訊息與操作按鈕
- `assets/css/responsive.css`：桌機與行動裝置響應式規則
- `assets/css/themes.css`：淺色、深色、跟隨系統主題變數
- `assets/js/shared.js`：共享狀態、DOM 參考與常數
- `assets/js/core.js`：設定同步、排版計算、預覽、合成、下載核心邏輯
- `assets/js/app.js`：初始化、事件綁定、上傳流程、清單互動、主題切換
- `cli.py`：Python CLI 入口，支援讀取 YAML 設定檔
- `merge_config.yaml`：給非技術使用者編輯的設定檔
- `input/`：預設輸入資料夾
- `output/`：預設輸出資料夾
- `src/image_merger/merge.py`：Python 圖片讀取、合併與輸出核心

## 3. 網頁版實作現況

### 3.1 已完成功能

- 最多 50 張圖片上傳限制
- 支援 `JPG`、`PNG`、`WebP` 輸入
- 拖放上傳與點擊選檔
- 依檔名自然排序
- 拖曳排序
- 單張刪除與全部清除
- 三種排列模式：`vertical`、`horizontal`、`grid`
- 輸出尺寸預設值與自訂輸入
- `JPG`、`PNG`、`WebP` 輸出
- `JPG` 品質調整
- 背景色預設色票、自訂色、文字輸入
- 每張圖片圓角設定
- 間距設定
- `DPI` 下拉式選單
- 實體尺寸換算與顯示
- 兩種預覽模式：`fill`、`contain`
- 兩種切段模式：`strict`、`preserve`
- 自動分段開關與最大高度設定
- 高度超過 `10000px` 的警告提示
- 高度超過 `16000px` 時強制自動分段
- 多段輸出時自動打包為 ZIP 下載
- 預設檔名格式為 `image_merger_YYYYMMDDHH_001`
- 頁尾版權資訊 `© 2026 Bruce Yang. All rights reserved.`
- 主題切換：`system`、`light`、`dark`

### 3.2 重要邏輯說明

#### 預覽模式

- `fill`：以預覽區可用寬度為主，讓輸出圖撐滿左右兩側
- `contain`：等比例完整顯示在預覽區內，並置中呈現

#### 預覽清晰度

先前 `fill` 模式會出現高畫質長圖在預覽中反而模糊的情況，原因是預覽畫布先被縮得過小，再由 CSS 放大。現已改為優先以接近實際顯示尺寸的比例繪製，並啟用較高品質的平滑取樣，以改善高解析圖片預覽品質。

#### 分段模式

- `strict`：直接以最大高度為界切開
- `preserve`：若某張圖會讓目前段落超過上限，下一段從那張圖開始，避免把原圖切破

#### 強制分段規則

- 高度超過 `10000px`：顯示建議警告
- 高度超過 `16000px`：強制開啟 `autoSegment`

#### 圓角規則

目前圓角是套用在每張來源圖片上，不是合成後整張輸出圖的四角。這一點已在 `core.js` 修正，避免 UI 語意和結果不一致。

#### 下載規則

- 單一輸出檔：直接下載
- 多段輸出檔：自動打包成 ZIP 再下載
- 輸出檔名以 `image_merger_YYYYMMDDHH_001` 為基礎遞增

### 3.3 目前限制

- 預估檔案大小為近似值，不是精準編碼結果
- 大量超大圖仍需持續做壓力測試
- 前端字串與文件仍需持續保持同步
- ZIP 依賴 CDN 載入的 `JSZip`，若資源載入失敗，多檔打包會失效

## 4. Python CLI 實作現況

### 4.1 已完成功能

- `merge_config.yaml` 作為主要設定來源
- `--config` 指定 YAML 設定檔
- 命令列參數可覆蓋 YAML 設定檔中的同名欄位
- `--input-dir` 指定輸入資料夾
- `--output-dir` 指定輸出資料夾
- `--output-name` 指定輸出名稱
- `--output-format` 支援 `png`、`jpg`、`jpeg`
- `--direction` 支援 `vertical`、`horizontal`
- `--spacing` 圖片間距
- `--padding` 外圍留白
- `--background` 背景色
- `--recursive` 遞迴搜尋圖片
- `--no-recursive` 可在命令列強制關閉遞迴
- 自動建立輸出資料夾
- 依檔名排序輸入檔案

### 4.2 現有限制

- 尚未支援 `grid`
- 尚未支援 `webp` 輸出
- 尚未支援 `dpi`
- 尚未支援分段輸出
- 尚未支援預覽
- CLI 說明文字目前仍為英文，可在後續再本地化

另外，`python cli.py --help` 現在也依賴 `PyYAML` 已安裝，因為 CLI 啟動時會先載入 YAML 模組。

## 5. 依賴與環境

目前主要依賴：

```text
pillow==12.2.0
PyYAML==6.0.3
```

前端採純靜態架構，主要外部前端依賴為：

- `JSZip`：用於多段輸出 ZIP 打包下載

本機預覽可直接使用：

```bash
python -m http.server
```

## 6. 文件維護原則

後續更新 README 與本文件時，請以實際程式行為為準，避免再出現下列落差：

- UI 已取消的功能仍留在文件中
- 前端已完成的功能仍寫成規劃中
- Python 版未支援的功能被誤寫為已支援
- 介面文字與文件描述不一致
- 模組拆分後的結構沒有同步更新到文件

## 7. 建議後續優先順序

第一優先：

- 持續修整桌機版 UI 密度與互動一致性
- 針對大尺寸圖與大量圖片做穩定性驗證
- 補齊重要操作情境的手動測試紀錄

第二優先：

- 持續優化下載提示與多檔輸出體驗
- 強化錯誤提示與空狀態文案
- 評估是否要補透明背景邏輯提示

第三優先：

- 擴充 Python 版的 `grid`、`webp`、`dpi`、分段輸出
- 視需求整理前後端共用規則與命名

## 8. 結論

目前專案的真實狀態可以描述為：

- 網頁版已可實際對外使用，進入細修與驗證階段
- Python 版是可用的輔助工具，但功能範圍仍明顯少於網頁版
- 文件需要持續跟著實作同步，否則很容易再次失真
