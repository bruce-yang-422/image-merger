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

各檔案職責如下：

- `index.html`：前端主頁面、SEO meta、控制項結構
- `assets/css/style.css`：CSS 匯入入口
- `assets/css/foundation.css`：基礎版面、外層骨架、品牌區
- `assets/css/components.css`：面板、按鈕、表單、圖片清單等元件
- `assets/css/responsive.css`：桌機與行動裝置響應式規則
- `assets/css/themes.css`：淺色、深色、跟隨系統主題變數
- `assets/js/app.js`：前端模組入口
- `assets/js/core.js`：上傳、排序、預覽、合成、下載、分段、主題切換等核心邏輯
- `cli.py`：Python CLI 入口
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
- 合成後多檔分段下載
- 主題切換：`system`、`light`、`dark`
- 依主題切換的品牌 logo

### 3.2 重要邏輯說明

#### 預覽模式

- `fill`：以預覽區可用寬度為主，讓輸出圖撐滿左右兩側
- `contain`：等比例完整顯示在預覽區內，並置中呈現

#### 分段模式

- `strict`：直接以最大高度為界切開
- `preserve`：若某張圖會讓目前段落超過上限，下一段從那張圖開始，避免把原圖切破

#### 強制分段規則

- 高度超過 `10000px`：顯示建議警告
- 高度超過 `16000px`：強制開啟 `autoSegment`

#### 圓角規則

目前圓角是套用在每張來源圖片上，不是合成後整張輸出圖的四角。這一點已在 `core.js` 修正，避免 UI 語意和結果不一致。

### 3.3 目前限制

- 下載流程目前為逐檔下載，未打包 ZIP
- 預估檔案大小為近似值，不是精準編碼結果
- 大量超大圖仍需持續做壓力測試
- 前端字串與文件仍需持續保持同步

## 4. Python CLI 實作現況

### 4.1 已完成功能

- `--input-dir` 指定輸入資料夾
- `--output-dir` 指定輸出資料夾
- `--output-name` 指定輸出名稱
- `--output-format` 支援 `png`、`jpg`、`jpeg`
- `--direction` 支援 `vertical`、`horizontal`
- `--spacing` 圖片間距
- `--padding` 外圍留白
- `--background` 背景色
- `--recursive` 遞迴搜尋圖片
- 自動建立輸出資料夾
- 依檔名排序輸入檔案

### 4.2 現有限制

- 尚未支援 `grid`
- 尚未支援 `webp` 輸出
- 尚未支援 `dpi`
- 尚未支援分段輸出
- 尚未支援預覽
- CLI 說明文字目前仍為英文，可在後續再本地化

## 5. 依賴與環境

目前主要依賴：

```text
pillow==12.2.0
```

前端採純靜態架構，不依賴建置工具；本機預覽可直接使用：

```bash
python -m http.server
```

## 6. 文件維護原則

後續更新 README 與本文件時，請以實際程式行為為準，避免再出現下列落差：

- UI 已取消的功能仍留在文件中
- 前端已完成的功能仍寫成規劃中
- Python 版未支援的功能被誤寫為已支援
- 介面文字與文件描述不一致

## 7. 建議後續優先順序

第一優先：

- 持續修整桌機版 UI 密度與互動一致性
- 針對大尺寸圖與大量圖片做穩定性驗證
- 補齊重要操作情境的手動測試紀錄

第二優先：

- 改善下載體驗，例如 ZIP 打包或更清楚的多檔輸出提示
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
