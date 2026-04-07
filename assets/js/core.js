/* Image Merger app.js */
'use strict';

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
const THEME_STORAGE_KEY = 'image-merger-theme';
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const THUMB_SIZE = 56;
const MAX_PREVIEW_PX = 800;
const SOFT_SEGMENT_HEIGHT = 10000;
const HARD_SEGMENT_HEIGHT = 16000;

let images = [];
let nextId = 0;
let dragSrcId = null;
let outputBlobs = [];
let outputNames = [];
let previewTimer = null;
let settings = {
  direction: 'vertical',
  gridCols: 3,
  outputSize: null,
  spacing: 0,
  background: '#ffffff',
  format: 'jpg',
  quality: 90,
  cornerRadius: 0,
  dpi: 96,
  autoSegment: false,
  maxSegmentHeight: 10000,
  segmentMode: 'strict',
  previewMode: 'fill',
};

function showStatus(message, type = '') {
  statusBar.textContent = message;
  statusBar.className = `status-bar ${type}`.trim();
}

function resolveThemeChoice(themeChoice) {
  if (themeChoice === 'light' || themeChoice === 'dark') return themeChoice;
  return systemThemeQuery.matches ? 'dark' : 'light';
}

function applyTheme(themeChoice) {
  const nextChoice = ['system', 'light', 'dark'].includes(themeChoice) ? themeChoice : 'system';
  const resolvedTheme = resolveThemeChoice(nextChoice);
  document.body.dataset.themeChoice = nextChoice;
  document.body.dataset.colorScheme = resolvedTheme;
  themeChips.forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.themeChoice === nextChoice);
  });
  localStorage.setItem(THEME_STORAGE_KEY, nextChoice);
}

function loadImg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`\u7121\u6cd5\u8f09\u5165\uff1a${file.name}`));
    };
    img.src = url;
  });
}

async function addFiles(fileList) {
  const accepted = [...fileList].filter((file) => /\.(jpe?g|png|webp)$/i.test(file.name));
  const skipped = fileList.length - accepted.length;

  if (images.length + accepted.length > 50) {
    showStatus("\u6700\u591a\u652f\u63f4 50 \u5f35\u5716\u7247", "warn");
    return;
  }

  for (const file of accepted) {
    try {
      const img = await loadImg(file);
      images.push({ id: nextId++, file, name: file.name, img });
    } catch (error) {
      showStatus(error.message, 'error');
    }
  }

  if (skipped > 0) {
    showStatus(`\u5df2\u8df3\u904e ${skipped} \u500b\u4e0d\u652f\u63f4\u683c\u5f0f\u7684\u6a94\u6848`, "warn");
  } else if (accepted.length > 0) {
    showStatus('');
  }

  sortByFilename();
  renderImageList();
  schedulePreview();
}

function sortByFilename() {
  images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}

function renderImageList() {
  const count = images.length;
  imageCount.textContent = String(count);
  imageListPanel.hidden = count === 0;
  mergeBtn.disabled = count === 0;

  if (count === 0) {
    previewMeta.textContent = '-';
    warningBanner.hidden = true;
    previewCanvas.width = 0;
    previewCanvas.height = 0;
    previewCanvas.hidden = true;
    previewSizePxEl.textContent = "0 \u00d7 0 px";
    physicalSizeEl.textContent = "0 \u00d7 0 cm";
    previewChunkCountEl.textContent = '1';
    outputBlobs = [];
    outputNames = [];
    downloadBtn.disabled = true;
  }

  imageList.innerHTML = '';
  for (const item of images) {
    imageList.appendChild(buildImageItem(item));
  }
}

function buildImageItem(item) {
  const li = document.createElement('li');
  li.className = 'image-item';
  li.dataset.id = String(item.id);
  li.draggable = true;

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '::';
  handle.title = 'Reorder';

  const thumb = document.createElement('canvas');
  thumb.className = 'thumb';
  thumb.width = THUMB_SIZE;
  thumb.height = THUMB_SIZE;
  const thumbCtx = thumb.getContext('2d');
  const scale = Math.min(THUMB_SIZE / item.img.width, THUMB_SIZE / item.img.height);
  const thumbW = item.img.width * scale;
  const thumbH = item.img.height * scale;
  thumbCtx.fillStyle = '#e8e4dc';
  thumbCtx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);
  thumbCtx.drawImage(item.img, (THUMB_SIZE - thumbW) / 2, (THUMB_SIZE - thumbH) / 2, thumbW, thumbH);

  const info = document.createElement('div');
  info.className = 'image-info';
  const nameEl = document.createElement('span');
  nameEl.className = 'image-name';
  nameEl.textContent = item.name;
  nameEl.title = item.name;
  const dimEl = document.createElement('span');
  dimEl.className = 'image-dim';
  dimEl.textContent = `${item.img.width} \u00d7 ${item.img.height} px`;
  info.append(nameEl, dimEl);

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'del-btn';
  delBtn.textContent = 'x';
  delBtn.title = 'Remove';
  delBtn.addEventListener('click', () => {
    images = images.filter((image) => image.id !== item.id);
    renderImageList();
    schedulePreview();
  });

  li.append(handle, thumb, info, delBtn);

  li.addEventListener('dragstart', (event) => {
    dragSrcId = item.id;
    setTimeout(() => li.classList.add('dragging'), 0);
    event.dataTransfer.effectAllowed = 'move';
  });

  li.addEventListener('dragend', () => {
    li.classList.remove('dragging');
    document.querySelectorAll('.image-item.drag-over').forEach((el) => el.classList.remove('drag-over'));
  });

  li.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragSrcId === item.id) return;
    document.querySelectorAll('.image-item.drag-over').forEach((el) => el.classList.remove('drag-over'));
    li.classList.add('drag-over');
  });

  li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
  li.addEventListener('drop', (event) => {
    event.preventDefault();
    li.classList.remove('drag-over');
    if (dragSrcId === item.id) return;
    const srcIdx = images.findIndex((image) => image.id === dragSrcId);
    const dstIdx = images.findIndex((image) => image.id === item.id);
    if (srcIdx < 0 || dstIdx < 0) return;
    const [moved] = images.splice(srcIdx, 1);
    images.splice(dstIdx, 0, moved);
    renderImageList();
    schedulePreview();
  });

  return li;
}

function readSettings() {
  settings.direction = directionSel.value;
  settings.gridCols = Math.max(1, parseInt(gridColsInput.value, 10) || 3);
  settings.spacing = Math.max(0, parseInt(spacingNum.value, 10) || 0);
  settings.background = bgColorPicker.value;
  settings.format = formatSel.value;
  settings.quality = Math.min(100, Math.max(60, parseInt(qualityNum.value, 10) || 90));

  const activeCorner = document.querySelector('.corner-btn.active');
  settings.cornerRadius = activeCorner ? parseInt(activeCorner.dataset.corner, 10) : 0;
  const customCorner = parseInt(cornerCustomInput.value, 10);
  if (cornerCustomInput.value && customCorner >= 0 && customCorner <= 500) {
    settings.cornerRadius = customCorner;
  }

  settings.autoSegment = autoSegmentChk.checked;
  settings.maxSegmentHeight = Math.max(1000, parseInt(maxHeightInput.value, 10) || 10000);
  settings.segmentMode = segmentModeInput.value === 'preserve' ? 'preserve' : 'strict';
  settings.previewMode = previewModeInput.value === 'contain' ? 'contain' : 'fill';

  const activeSize = document.querySelector('.preset-btn:not(.corner-btn).active');
  settings.outputSize = activeSize && activeSize.dataset.size !== 'auto' ? parseInt(activeSize.dataset.size, 10) : null;
  const customSize = parseInt(sizeCustomInput.value, 10);
  if (sizeCustomInput.value && customSize >= 100 && customSize <= 10000) {
    settings.outputSize = customSize;
  }

  settings.dpi = parseInt(dpiSelect.value, 10) || 96;
}

function syncDirectionControls() {
  directionButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.direction === settings.direction);
  });
}

function syncSegmentModeControls() {
  segmentModeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.segmentMode === settings.segmentMode);
    button.disabled = autoSegmentChk.disabled;
  });
}

function syncPreviewModeControls() {
  previewModeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.previewMode === settings.previewMode);
  });
  previewStageInner.classList.toggle('preview-mode-fill', settings.previewMode === 'fill');
  previewStageInner.classList.toggle('preview-mode-contain', settings.previewMode === 'contain');
}

function updateSizeLabel() {
  const labels = {
    vertical: "\u8f38\u51fa\u5bec\u5ea6\uff08px\uff09",
    horizontal: "\u7d71\u4e00\u9ad8\u5ea6\uff08px\uff09",
    grid: "Cell \u5c3a\u5bf8\uff08px\uff09",
  };
  sizeLabelEl.textContent = labels[settings.direction] || labels.vertical;
}

function onSettingChange() {
  readSettings();
  syncDirectionControls();
  syncSegmentModeControls();
  syncPreviewModeControls();
  gridColsField.hidden = settings.direction !== 'grid';
  qualityField.hidden = settings.format === 'png';
  updateSizeLabel();
  schedulePreview();
}

function parseColor(value) {
  const input = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(input)) {
    if (input.length === 4) return '#' + input[1] + input[1] + input[2] + input[2] + input[3] + input[3];
    return input.toLowerCase();
  }
  const rgbMatch = input.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!rgbMatch) return null;
  const [r, g, b] = rgbMatch.slice(1).map(Number);
  if ([r, g, b].every((channel) => channel <= 255)) {
    return '#' + [r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('');
  }
  return null;
}

function applyBackgroundColor(hex) {
  bgColorPicker.value = hex;
  bgColorText.value = hex;
  bgColorText.classList.remove('invalid');
  settings.background = hex;
  document.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === hex.toLowerCase());
  });
}

function computePositions() {
  if (!images.length) return [];
  const { direction, gridCols, spacing, outputSize } = settings;
  const imgs = images.map((item) => item.img);
  const positions = [];

  if (direction === 'vertical') {
    const refWidth = outputSize || Math.max(...imgs.map((img) => img.width));
    let y = 0;
    for (const img of imgs) {
      const h = Math.round(img.height * (refWidth / img.width));
      positions.push({ img, x: 0, y, w: refWidth, h });
      y += h + spacing;
    }
    return positions;
  }

  if (direction === 'horizontal') {
    const refHeight = outputSize || Math.max(...imgs.map((img) => img.height));
    let x = 0;
    for (const img of imgs) {
      const w = Math.round(img.width * (refHeight / img.height));
      positions.push({ img, x, y: 0, w, h: refHeight });
      x += w + spacing;
    }
    return positions;
  }

  const cols = Math.max(1, gridCols);
  const cellW = outputSize || Math.max(...imgs.map((img) => img.width));
  const cellH = outputSize || Math.max(...imgs.map((img) => img.height));
  imgs.forEach((img, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cellX = col * (cellW + spacing);
    const cellY = row * (cellH + spacing);
    const scale = Math.min(cellW / img.width, cellH / img.height);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    positions.push({
      img,
      x: cellX + Math.round((cellW - w) / 2),
      y: cellY + Math.round((cellH - h) / 2),
      w,
      h,
    });
  });
  return positions;
}

function computeCanvasSize(positions) {
  if (!positions.length) return { width: 0, height: 0 };
  return {
    width: Math.max(...positions.map((position) => position.x + position.w)),
    height: Math.max(...positions.map((position) => position.y + position.h)),
  };
}

function roundedRectPath(ctx, x, y, w, h, tl, tr, br, bl) {
  tl = Math.min(tl, w / 2, h / 2);
  tr = Math.min(tr, w / 2, h / 2);
  br = Math.min(br, w / 2, h / 2);
  bl = Math.min(bl, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

function drawToContext(ctx, canvasW, canvasH, positions, renderScale, segmentOffsetY, segmentIndex = 0, segmentTotal = 1) {
  ctx.fillStyle = settings.background;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const radius = Math.round((settings.cornerRadius || 0) * renderScale);

  for (const position of positions) {
    const dx = Math.round(position.x * renderScale);
    const dy = Math.round((position.y - segmentOffsetY) * renderScale);
    const dw = Math.round(position.w * renderScale);
    const dh = Math.round(position.h * renderScale);

    if (radius > 0) {
      ctx.save();
      roundedRectPath(ctx, dx, dy, dw, dh, radius, radius, radius, radius);
      ctx.clip();
      ctx.drawImage(position.img, dx, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(position.img, dx, dy, dw, dh);
    }
  }
}

function updatePhysicalSize(width, height) {
  const dpi = settings.dpi;
  const wCm = ((width / dpi) * 2.54).toFixed(1);
  const hCm = ((height / dpi) * 2.54).toFixed(1);
  physicalSizeEl.textContent = `${wCm} \u00d7 ${hCm} cm\n@${dpi} DPI`;
}

function updateWarningBanner(height) {
  if (height > HARD_SEGMENT_HEIGHT) {
    warningBanner.hidden = false;
    warningBanner.className = 'warning-banner error';
    warningBanner.textContent = `\u5408\u6210\u9ad8\u5ea6 ${height.toLocaleString()} px \u8d85\u904e\u5b89\u5168\u4e0a\u9650\uff0c\u5df2\u5f37\u5236\u958b\u555f\u81ea\u52d5\u5206\u6bb5\u3002`;
    autoSegmentChk.checked = true;
    autoSegmentChk.disabled = true;
    settings.autoSegment = true;
    syncSegmentModeControls();
    return;
  }

  autoSegmentChk.disabled = false;
  syncSegmentModeControls();

  if (height > SOFT_SEGMENT_HEIGHT && !settings.autoSegment) {
    warningBanner.hidden = false;
    warningBanner.className = 'warning-banner';
    warningBanner.textContent = `\u5716\u7247\u8f03\u9577\uff08${height.toLocaleString()} px\uff09\uff0c\u5efa\u8b70\u555f\u7528\u5206\u6bb5\u8f38\u51fa\u4ee5\u907f\u514d\u5408\u6210\u5931\u6557\u3002`;
    return;
  }

  warningBanner.hidden = true;
}

function computeStrictSegmentRanges(totalHeight) {
  const ranges = [];
  let start = 0;
  while (start < totalHeight) {
    const end = Math.min(start + settings.maxSegmentHeight, totalHeight);
    ranges.push([start, end]);
    start = end;
  }
  return ranges;
}

function computePreserveSegmentRanges(positions, totalHeight) {
  if (!positions.length) return [[0, totalHeight]];

  if (settings.direction === 'vertical') {
    const ranges = [];
    let segmentStart = 0;
    for (const position of positions) {
      const bottom = position.y + position.h;
      if (position.y > segmentStart && bottom - segmentStart > settings.maxSegmentHeight) {
        ranges.push([segmentStart, position.y]);
        segmentStart = position.y;
      }
    }
    const last = positions[positions.length - 1];
    ranges.push([segmentStart, last.y + last.h]);
    return ranges;
  }

  if (settings.direction === 'grid') {
    const maxCellHeight = settings.outputSize || Math.max(...images.map((item) => item.img.height));
    const rowStep = maxCellHeight + settings.spacing;
    const ranges = [];
    let rowStart = 0;
    let segmentStart = 0;
    while (rowStart < totalHeight) {
      const rowEnd = Math.min(rowStart + rowStep, totalHeight);
      if (rowEnd - segmentStart > settings.maxSegmentHeight && rowStart > segmentStart) {
        ranges.push([segmentStart, rowStart]);
        segmentStart = rowStart;
      }
      rowStart = rowEnd;
    }
    ranges.push([segmentStart, totalHeight]);
    return ranges;
  }

  return computeStrictSegmentRanges(totalHeight);
}

function computeSegmentRanges(positions, totalHeight) {
  if (totalHeight > HARD_SEGMENT_HEIGHT) {
    settings.autoSegment = true;
    autoSegmentChk.checked = true;
  }

  if (!settings.autoSegment || totalHeight <= settings.maxSegmentHeight) {
    return [[0, totalHeight]];
  }

  return settings.segmentMode === 'preserve' ? computePreserveSegmentRanges(positions, totalHeight) : computeStrictSegmentRanges(totalHeight);
}

function renderPreview() {
  if (!images.length) return;

  readSettings();
  const positions = computePositions();
  const { width, height } = computeCanvasSize(positions);
  if (!width || !height) return;

  updateWarningBanner(height);
  updatePhysicalSize(width, height);

  const stageWidth = Math.max(1, previewStageInner.clientWidth - 24);
  const stageHeight = Math.max(1, previewStageInner.clientHeight - 24);
  const previewScale = settings.previewMode === 'contain' ? Math.min(stageWidth / width, stageHeight / height) : stageWidth / width;
  const scale = Math.max(0.05, Math.min(previewScale, MAX_PREVIEW_PX / Math.max(width, height), 2));
  const previewWidth = Math.max(1, Math.round(width * scale));
  const previewHeight = Math.max(1, Math.round(height * scale));

  previewCanvas.hidden = false;
  previewCanvas.width = previewWidth;
  previewCanvas.height = previewHeight;
  drawToContext(previewCtx, previewWidth, previewHeight, positions, scale, 0);

  const segmentRanges = computeSegmentRanges(positions, height);
  previewSizePxEl.textContent = `${width} \u00d7 ${height} px`;
  previewChunkCountEl.textContent = String(segmentRanges.length);

  const pixels = width * height;
  const estimatedBytes = settings.format === 'jpg' ? pixels * 3 * (settings.quality / 100) * 0.1 : pixels * 0.6;
  const estimatedText = estimatedBytes >= 1024 * 1024 ? `~${(estimatedBytes / 1024 / 1024).toFixed(1)} MB` : `~${Math.round(estimatedBytes / 1024)} KB`;
  previewMeta.textContent = `${width} \u00d7 ${height} px\uff5c\u9810\u4f30 ${estimatedText}`;
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas \u8f49\u63db\u5931\u6557"));
    }, mimeType, quality);
  });
}

async function doMerge() {
  if (!images.length) return;

  readSettings();
  mergeBtn.disabled = true;
  downloadBtn.disabled = true;
  outputBlobs = [];
  outputNames = [];
  showStatus("\u6b63\u5728\u5408\u6210...", "");

  try {
    const positions = computePositions();
    const { width, height } = computeCanvasSize(positions);
    const segmentRanges = computeSegmentRanges(positions, height);
    const formatMap = { jpg: ['jpg', 'image/jpeg'], png: ['png', 'image/png'], webp: ['webp', 'image/webp'] };
    const [ext, mimeType] = formatMap[settings.format] || formatMap.jpg;
    const quality = settings.format !== 'png' ? settings.quality / 100 : undefined;

    for (let index = 0; index < segmentRanges.length; index += 1) {
      const [segmentStart, segmentEnd] = segmentRanges[index];
      const segmentHeight = segmentEnd - segmentStart;
      showStatus(`\u5408\u6210\u4e2d... ${index + 1} / ${segmentRanges.length}`, "");
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = segmentHeight;
      drawToContext(offscreen.getContext('2d'), width, segmentHeight, positions, 1, segmentStart, index, segmentRanges.length);
      outputBlobs.push(await canvasToBlob(offscreen, mimeType, quality));
      const suffix = segmentRanges.length > 1 ? `_${String(index + 1).padStart(2, '0')}` : '';
      outputNames.push(`merged${suffix}.${ext}`);
    }

    downloadBtn.disabled = false;
    showStatus(`\u5408\u6210\u5b8c\u6210\uff0c\u5171 ${outputBlobs.length} \u500b\u8f38\u51fa\u6a94\u6848`, "success");
  } catch (error) {
    showStatus(`\u5408\u6210\u5931\u6557\uff1a${error.message}`, "error");
  } finally {
    mergeBtn.disabled = images.length === 0;
  }
}

async function doDownload() {
  if (!outputBlobs.length) return;

  for (let index = 0; index < outputBlobs.length; index += 1) {
    const url = URL.createObjectURL(outputBlobs[index]);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputNames[index];
    link.click();
    if (index < outputBlobs.length - 1) await new Promise((resolve) => setTimeout(resolve, 400));
    URL.revokeObjectURL(url);
  }

  showStatus(`\u5df2\u4e0b\u8f09 ${outputBlobs.length} \u500b\u6a94\u6848`, "success");
}

function bindSliderPair(rangeEl, numberEl) {
  rangeEl.addEventListener('input', () => {
    numberEl.value = rangeEl.value;
    onSettingChange();
  });
  numberEl.addEventListener('input', () => {
    const value = Math.min(Number(numberEl.max), Math.max(Number(numberEl.min), Number(numberEl.value)));
    rangeEl.value = String(value);
    onSettingChange();
  });
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 180);
}

dropArea.addEventListener('click', () => fileInput.click());
dropArea.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  dropArea.classList.add('drag-over');
});
dropArea.addEventListener('dragleave', (event) => {
  if (!dropArea.contains(event.relatedTarget)) dropArea.classList.remove('drag-over');
});
dropArea.addEventListener('drop', (event) => {
  event.preventDefault();
  dropArea.classList.remove('drag-over');
  addFiles(event.dataTransfer.files);
});
fileInput.addEventListener('change', () => {
  addFiles(fileInput.files);
  fileInput.value = '';
});

sortBtn.addEventListener('click', () => {
  sortByFilename();
  renderImageList();
  schedulePreview();
});
clearBtn.addEventListener('click', () => {
  images = [];
  renderImageList();
  schedulePreview();
  showStatus('');
});

mergeBtn.addEventListener('click', doMerge);
downloadBtn.addEventListener('click', doDownload);

directionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    directionSel.value = button.dataset.direction;
    onSettingChange();
  });
});
directionSel.addEventListener('change', onSettingChange);
gridColsInput.addEventListener('input', onSettingChange);
formatSel.addEventListener('change', onSettingChange);
autoSegmentChk.addEventListener('change', onSettingChange);
maxHeightInput.addEventListener('input', onSettingChange);
segmentModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.disabled) return;
    segmentModeInput.value = button.dataset.segmentMode;
    onSettingChange();
  });
});
previewModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    previewModeInput.value = button.dataset.previewMode;
    onSettingChange();
  });
});

bindSliderPair(spacingRange, spacingNum);
bindSliderPair(qualityRange, qualityNum);

document.querySelectorAll('.preset-btn:not(.corner-btn)').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn:not(.corner-btn)').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    sizeCustomInput.value = '';
    onSettingChange();
  });
});
sizeCustomInput.addEventListener('input', () => {
  document.querySelectorAll('.preset-btn:not(.corner-btn)').forEach((button) => button.classList.remove('active'));
  onSettingChange();
});

document.querySelectorAll('.corner-btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.corner-btn').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    cornerCustomInput.value = '';
    onSettingChange();
  });
});
cornerCustomInput.addEventListener('input', () => {
  document.querySelectorAll('.corner-btn').forEach((button) => button.classList.remove('active'));
  onSettingChange();
});

dpiSelect.addEventListener('change', onSettingChange);

document.querySelectorAll('.swatch').forEach((swatch) => {
  swatch.addEventListener('click', () => {
    applyBackgroundColor(swatch.dataset.color);
    onSettingChange();
  });
});

bgColorPicker.addEventListener('input', () => {
  const hex = bgColorPicker.value;
  bgColorText.value = hex;
  bgColorText.classList.remove('invalid');
  document.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === hex.toLowerCase());
  });
  onSettingChange();
});

bgColorText.addEventListener('input', () => {
  const parsed = parseColor(bgColorText.value);
  if (!parsed) {
    bgColorText.classList.add('invalid');
    return;
  }
  bgColorText.classList.remove('invalid');
  bgColorPicker.value = parsed;
  document.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === parsed.toLowerCase());
  });
  settings.background = parsed;
  schedulePreview();
});

bgColorText.addEventListener('blur', () => {
  if (bgColorText.classList.contains('invalid')) {
    applyBackgroundColor(bgColorPicker.value);
  }
});

themeChips.forEach((chip) => {
  chip.addEventListener('click', () => applyTheme(chip.dataset.themeChoice));
});
systemThemeQuery.addEventListener('change', () => {
  if (document.body.dataset.themeChoice === 'system') applyTheme('system');
});

applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || document.body.dataset.themeChoice);
previewCanvas.hidden = true;
window.addEventListener('resize', schedulePreview);
readSettings();
onSettingChange();


