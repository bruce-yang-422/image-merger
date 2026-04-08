const fileInput = document.getElementById('file-input');
const themeChips = [...document.querySelectorAll('.theme-chip')];
const dropArea = document.getElementById('drop-area');
const imageListPanel = document.getElementById('image-list-panel');
const imageList = document.getElementById('image-list');
const imageCount = document.getElementById('image-count');
const sortBtn = document.getElementById('sort-btn');
const clearBtn = document.getElementById('clear-btn');
const directionSel = document.getElementById('direction');
const directionButtons = [...document.querySelectorAll('.direction-btn')];
const gridColsField = document.getElementById('grid-cols-field');
const gridColsInput = document.getElementById('grid-cols');
const sizeLabelEl = document.getElementById('size-label');
const sizeCustomInput = document.getElementById('size-custom');
const spacingRange = document.getElementById('spacing-range');
const spacingNum = document.getElementById('spacing-num');
const formatSel = document.getElementById('format');
const qualityField = document.getElementById('quality-field');
const qualityRange = document.getElementById('quality-range');
const qualityNum = document.getElementById('quality-num');
const bgColorPicker = document.getElementById('bg-color');
const bgColorText = document.getElementById('bg-color-text');
const cornerCustomInput = document.getElementById('corner-custom');
const physicalSizeEl = document.getElementById('physical-size');
const dpiSelect = document.getElementById('dpi-select');
const previewStageInner = document.getElementById('preview-stage-inner');
const previewSizePxEl = document.getElementById('preview-size-px');
const previewChunkCountEl = document.getElementById('preview-chunk-count');
const previewModeInput = document.getElementById('preview-mode');
const previewModeButtons = [...document.querySelectorAll('.preview-mode-btn')];
const autoSegmentChk = document.getElementById('auto-segment');
const maxHeightInput = document.getElementById('max-height');
const segmentModeInput = document.getElementById('segment-mode');
const segmentModeButtons = [...document.querySelectorAll('.segment-mode-btn')];
const previewCanvas = document.getElementById('preview-canvas');
const previewMeta = document.getElementById('preview-meta');
const warningBanner = document.getElementById('warning-banner');
const mergeBtn = document.getElementById('merge-btn');
const downloadBtn = document.getElementById('download-btn');
const statusBar = document.getElementById('status-bar');
const previewCtx = previewCanvas.getContext('2d');

const dom = {
  fileInput, themeChips, dropArea, imageListPanel, imageList, imageCount, sortBtn, clearBtn,
  directionSel, directionButtons, gridColsField, gridColsInput, sizeLabelEl, sizeCustomInput,
  spacingRange, spacingNum, formatSel, qualityField, qualityRange, qualityNum, bgColorPicker,
  bgColorText, cornerCustomInput, physicalSizeEl, dpiSelect, previewStageInner, previewSizePxEl,
  previewChunkCountEl, previewModeInput, previewModeButtons, autoSegmentChk, maxHeightInput,
  segmentModeInput, segmentModeButtons, previewCanvas, previewMeta, warningBanner, mergeBtn,
  downloadBtn, statusBar, previewCtx,
};

const THEME_STORAGE_KEY = 'image-merger-theme';
const SETTINGS_STORAGE_KEY = 'image-merger-settings';
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const THUMB_SIZE = 56;
const MAX_PREVIEW_RENDER_PIXELS = 6000000;
const SOFT_SEGMENT_HEIGHT = 10000;
const HARD_SEGMENT_HEIGHT = 16000;

const store = {
  images: [],
  nextId: 0,
  dragSrcId: null,
  outputBlobs: [],
  outputNames: [],
  previewTimer: null,
  settings: {
    direction: 'vertical', gridCols: 3, outputSize: null, spacing: 0, background: '#ffffff',
    format: 'jpg', quality: 90, cornerRadius: 0, dpi: 96, autoSegment: false,
    maxSegmentHeight: 10000, segmentMode: 'strict', previewMode: 'fill',
  },
};

function showStatus(message, type = '') {
  statusBar.textContent = message;
  statusBar.className = `status-bar ${type}`.trim();
}

export {
  dom, store, THEME_STORAGE_KEY, SETTINGS_STORAGE_KEY, systemThemeQuery, THUMB_SIZE,
  MAX_PREVIEW_RENDER_PIXELS, SOFT_SEGMENT_HEIGHT, HARD_SEGMENT_HEIGHT, showStatus,
};
