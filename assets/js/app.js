/* ============================================================
   Image Merger — app.js
   Pure-frontend image merging tool (HTML + Canvas)
   ============================================================ */

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
const dpiCustomInput = document.getElementById('dpi-custom');
const physicalSizeEl = document.getElementById('physical-size');
const autoSegmentChk = document.getElementById('auto-segment');
const maxHeightInput = document.getElementById('max-height');
const previewCanvas = document.getElementById('preview-canvas');
const previewMeta = document.getElementById('preview-meta');
const warningBanner = document.getElementById('warning-banner');
const mergeBtn = document.getElementById('merge-btn');
const downloadBtn = document.getElementById('download-btn');
const statusBar = document.getElementById('status-bar');

const previewCtx = previewCanvas.getContext('2d');
const THEME_STORAGE_KEY = 'image-merger-theme';
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

let images = [];
let nextId = 0;
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
};
let outputBlobs = [];
let outputNames = [];
let previewTimer = null;

function showStatus(msg, type = '') {
  statusBar.textContent = msg;
  statusBar.className = 'status-bar ' + type;
}

function resolveThemeChoice(themeChoice) {
  if (themeChoice === 'light' || themeChoice === 'dark') {
    return themeChoice;
  }
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
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`無法載入: ${file.name}`)); };
    img.src = url;
  });
}

async function addFiles(fileList) {
  const accepted = [...fileList].filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name));
  const skipped = fileList.length - accepted.length;

  if (images.length + accepted.length > 50) {
    showStatus('最多支援 50 張圖片', 'warn');
    return;
  }

  for (const file of accepted) {
    try {
      const img = await loadImg(file);
      images.push({ id: nextId++, file, name: file.name, img });
    } catch (err) {
      showStatus(err.message, 'error');
    }
  }

  if (skipped > 0) showStatus(`已跳過 ${skipped} 個不支援格式的檔案`, 'warn');
  if (accepted.length > 0) showStatus('');

  sortByFilename();
  renderImageList();
  schedulePreview();
}

function sortByFilename() {
  images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}

const THUMB_SIZE = 56;
let dragSrcId = null;

function renderImageList() {
  const count = images.length;
  imageCount.textContent = count;
  imageListPanel.hidden = count === 0;
  mergeBtn.disabled = count === 0;

  if (count === 0) {
    previewMeta.textContent = '—';
    warningBanner.hidden = true;
    previewCanvas.width = 0;
    previewCanvas.height = 0;
    previewCanvas.hidden = true;
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
  li.dataset.id = item.id;
  li.draggable = true;

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '⠿';
  handle.title = '拖曳排序';

  const thumb = document.createElement('canvas');
  thumb.className = 'thumb';
  thumb.width = THUMB_SIZE;
  thumb.height = THUMB_SIZE;
  const tc = thumb.getContext('2d');
  const scl = Math.min(THUMB_SIZE / item.img.width, THUMB_SIZE / item.img.height);
  const tw = item.img.width * scl;
  const th = item.img.height * scl;
  tc.fillStyle = '#e8e4dc';
  tc.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);
  tc.drawImage(item.img, (THUMB_SIZE - tw) / 2, (THUMB_SIZE - th) / 2, tw, th);

  const info = document.createElement('div');
  info.className = 'image-info';
  const nameEl = document.createElement('span');
  nameEl.className = 'image-name';
  nameEl.textContent = item.name;
  nameEl.title = item.name;
  const dimEl = document.createElement('span');
  dimEl.className = 'image-dim';
  dimEl.textContent = `${item.img.width} × ${item.img.height} px`;
  info.append(nameEl, dimEl);

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'del-btn';
  delBtn.textContent = '×';
  delBtn.title = '移除此圖片';
  delBtn.addEventListener('click', () => {
    images = images.filter((i) => i.id !== item.id);
    renderImageList();
    schedulePreview();
  });

  li.append(handle, thumb, info, delBtn);

  li.addEventListener('dragstart', (e) => {
    dragSrcId = item.id;
    setTimeout(() => li.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
  });
  li.addEventListener('dragend', () => {
    li.classList.remove('dragging');
    document.querySelectorAll('.image-item.drag-over').forEach((el) => el.classList.remove('drag-over'));
  });
  li.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragSrcId === item.id) return;
    document.querySelectorAll('.image-item.drag-over').forEach((el) => el.classList.remove('drag-over'));
    li.classList.add('drag-over');
  });
  li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
  li.addEventListener('drop', (e) => {
    e.preventDefault();
    li.classList.remove('drag-over');
    if (dragSrcId === item.id) return;
    const srcIdx = images.findIndex((i) => i.id === dragSrcId);
    const dstIdx = images.findIndex((i) => i.id === item.id);
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

  const activeSize = document.querySelector('.preset-btn:not(.corner-btn).active');
  if (activeSize && activeSize.dataset.size !== 'auto') {
    settings.outputSize = parseInt(activeSize.dataset.size, 10);
  } else {
    settings.outputSize = null;
  }
  const customSize = parseInt(sizeCustomInput.value, 10);
  if (sizeCustomInput.value && customSize >= 100 && customSize <= 10000) {
    settings.outputSize = customSize;
  }

  const activeDpi = document.querySelector('.dpi-btn.active');
  settings.dpi = activeDpi ? parseInt(activeDpi.dataset.dpi, 10) : 300;
  const customDpi = parseInt(dpiCustomInput.value, 10);
  if (dpiCustomInput.value && customDpi >= 30 && customDpi <= 1200) {
    settings.dpi = customDpi;
  }
}

function onSettingChange() {
  readSettings();
  gridColsField.hidden = settings.direction !== 'grid';
  qualityField.hidden = settings.format === 'png';
  updateSizeLabel();
  schedulePreview();
}

function updateSizeLabel() {
  const labels = {
    vertical: '輸出寬度（px）',
    horizontal: '統一高度（px）',
    grid: 'Cell 尺寸（px）',
  };
  sizeLabelEl.textContent = labels[settings.direction] || labels.vertical;
}

function parseColor(value) {
  const v = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
    if (v.length === 4) {
      return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    }
    return v.toLowerCase();
  }
  const rgb = v.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (rgb) {
    const [, r, g, b] = rgb.map(Number);
    if (r <= 255 && g <= 255 && b <= 255) {
      return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
    }
  }
  return null;
}

function applyBackgroundColor(hex) {
  bgColorPicker.value = hex;
  bgColorText.value = hex;
  bgColorText.classList.remove('invalid');
  settings.background = hex;
  document.querySelectorAll('.swatch').forEach((s) => {
    s.classList.toggle('active', s.dataset.color.toLowerCase() === hex.toLowerCase());
  });
}

function computePositions() {
  if (!images.length) return [];

  const { direction, gridCols, spacing, outputSize } = settings;
  const imgs = images.map((i) => i.img);
  const positions = [];

  if (direction === 'vertical') {
    const refW = outputSize || Math.max(...imgs.map((img) => img.width));
    let y = 0;
    for (const img of imgs) {
      const h = Math.round(img.height * (refW / img.width));
      positions.push({ img, x: 0, y, w: refW, h });
      y += h + spacing;
    }
  } else if (direction === 'horizontal') {
    const refH = outputSize || Math.max(...imgs.map((img) => img.height));
    let x = 0;
    for (const img of imgs) {
      const w = Math.round(img.width * (refH / img.height));
      positions.push({ img, x, y: 0, w, h: refH });
      x += w + spacing;
    }
  } else if (direction === 'grid') {
    const cols = Math.max(1, gridCols);
    const useCellW = outputSize || Math.max(...imgs.map((img) => img.width));
    const useCellH = outputSize || Math.max(...imgs.map((img) => img.height));
    imgs.forEach((img, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = col * (useCellW + spacing);
      const cy = row * (useCellH + spacing);
      const scl = Math.min(useCellW / img.width, useCellH / img.height);
      const iw = Math.round(img.width * scl);
      const ih = Math.round(img.height * scl);
      const ox = cx + Math.round((useCellW - iw) / 2);
      const oy = cy + Math.round((useCellH - ih) / 2);
      positions.push({ img, x: ox, y: oy, w: iw, h: ih });
    });
  }

  return positions;
}

function computeCanvasSize(positions) {
  if (!positions.length) return { width: 0, height: 0 };
  return {
    width: Math.max(...positions.map((p) => p.x + p.w)),
    height: Math.max(...positions.map((p) => p.y + p.h)),
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

function drawToContext(ctx, canvasW, canvasH, positions, renderScale, segOffsetY, segIndex = 0, segTotal = 1) {
  ctx.fillStyle = settings.background;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const r = Math.round((settings.cornerRadius || 0) * renderScale);
  if (r > 0) {
    const isFirst = segIndex === 0;
    const isLast = segIndex === segTotal - 1;
    ctx.save();
    roundedRectPath(ctx, 0, 0, canvasW, canvasH, isFirst ? r : 0, isFirst ? r : 0, isLast ? r : 0, isLast ? r : 0);
    ctx.clip();
  }

  for (const p of positions) {
    const dx = Math.round(p.x * renderScale);
    const dy = Math.round((p.y - segOffsetY) * renderScale);
    const dw = Math.round(p.w * renderScale);
    const dh = Math.round(p.h * renderScale);
    ctx.drawImage(p.img, dx, dy, dw, dh);
  }

  if (r > 0) ctx.restore();
}

const MAX_PREVIEW_PX = 800;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 200);
}

function renderPreview() {
  if (!images.length) return;

  readSettings();
  const positions = computePositions();
  const { width, height } = computeCanvasSize(positions);
  if (!width || !height) return;

  updateWarningBanner(height);
  updatePhysicalSize(width, height);

  const scale = Math.min(1, MAX_PREVIEW_PX / Math.max(width, height));
  const pw = Math.max(1, Math.round(width * scale));
  const ph = Math.max(1, Math.round(height * scale));

  previewCanvas.hidden = false;
  previewCanvas.width = pw;
  previewCanvas.height = ph;
  drawToContext(previewCtx, pw, ph, positions, scale, 0);

  const pixels = width * height;
  const estBytes = settings.format === 'jpg' ? pixels * 3 * (settings.quality / 100) * 0.1 : pixels * 0.6;
  const estStr = estBytes >= 1024 * 1024 ? `~${(estBytes / 1024 / 1024).toFixed(1)} MB` : `~${Math.round(estBytes / 1024)} KB`;
  previewMeta.textContent = `${width} × ${height} px｜預估 ${estStr}`;
}

function updatePhysicalSize(width, height) {
  const dpi = settings.dpi;
  const wCm = ((width / dpi) * 2.54).toFixed(1);
  const hCm = ((height / dpi) * 2.54).toFixed(1);
  physicalSizeEl.textContent = `${wCm} × ${hCm} cm（@${dpi} DPI）`;
}

function updateWarningBanner(height) {
  if (height > 16000) {
    warningBanner.hidden = false;
    warningBanner.className = 'warning-banner error';
    warningBanner.textContent = `⚠ 合成高度 ${height.toLocaleString()} px 超過安全上限，已自動啟用分段輸出。`;
    autoSegmentChk.checked = true;
    settings.autoSegment = true;
  } else if (height > 10000 && !settings.autoSegment) {
    warningBanner.hidden = false;
    warningBanner.className = 'warning-banner';
    warningBanner.textContent = `圖片較長（${height.toLocaleString()} px），建議啟用分段輸出以避免合成失敗。`;
  } else {
    warningBanner.hidden = true;
  }
}

function computeSegmentRanges(positions, totalHeight) {
  const { autoSegment, maxSegmentHeight, direction, spacing } = settings;
  if (!autoSegment || totalHeight <= maxSegmentHeight) return [[0, totalHeight]];

  if (direction === 'vertical') {
    const ranges = [];
    let segStart = 0;
    for (const p of positions) {
      const bottom = p.y + p.h;
      if (p.y > segStart && bottom - segStart > maxSegmentHeight) {
        ranges.push([segStart, p.y]);
        segStart = p.y;
      }
    }
    const last = positions[positions.length - 1];
    ranges.push([segStart, last.y + last.h]);
    return ranges;
  }

  if (direction === 'grid') {
    const cellH = Math.max(...images.map((i) => i.img.height));
    const rowH = (settings.outputSize || cellH) + spacing;
    const ranges = [];
    let rowStart = 0;
    let segStart = 0;
    while (rowStart < totalHeight) {
      const rowEnd = Math.min(rowStart + rowH, totalHeight);
      if (rowEnd - segStart > maxSegmentHeight && rowStart > segStart) {
        ranges.push([segStart, rowStart]);
        segStart = rowStart;
      }
      rowStart = rowEnd;
    }
    ranges.push([segStart, totalHeight]);
    return ranges;
  }

  const ranges = [];
  let y = 0;
  while (y < totalHeight) {
    const end = Math.min(y + maxSegmentHeight, totalHeight);
    ranges.push([y, end]);
    y = end;
  }
  return ranges;
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas 轉換失敗'))), mimeType, quality);
  });
}

async function doMerge() {
  if (!images.length) return;

  readSettings();
  mergeBtn.disabled = true;
  downloadBtn.disabled = true;
  outputBlobs = [];
  outputNames = [];
  showStatus('正在合成...', '');

  try {
    const positions = computePositions();
    const { width, height } = computeCanvasSize(positions);
    const segRanges = computeSegmentRanges(positions, height);

    const fmtMap = { jpg: ['jpg', 'image/jpeg'], png: ['png', 'image/png'], webp: ['webp', 'image/webp'] };
    const [ext, mimeType] = fmtMap[settings.format] || fmtMap.jpg;
    const quality = settings.format !== 'png' ? settings.quality / 100 : undefined;

    for (let i = 0; i < segRanges.length; i += 1) {
      const [segStart, segEnd] = segRanges[i];
      const segH = segEnd - segStart;
      showStatus(`合成中… ${i + 1} / ${segRanges.length}`, '');

      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = segH;
      drawToContext(offscreen.getContext('2d'), width, segH, positions, 1, segStart, i, segRanges.length);

      outputBlobs.push(await canvasToBlob(offscreen, mimeType, quality));
      const suffix = segRanges.length > 1 ? `_${String(i + 1).padStart(2, '0')}` : '';
      outputNames.push(`merged${suffix}.${ext}`);
    }

    downloadBtn.disabled = false;
    showStatus(`合成完成！共 ${outputBlobs.length} 張${outputBlobs.length > 1 ? '（分段輸出）' : ''}`, 'success');
  } catch (err) {
    showStatus(`合成失敗：${err.message}`, 'error');
  } finally {
    mergeBtn.disabled = images.length === 0;
  }
}

async function doDownload() {
  if (!outputBlobs.length) return;
  for (let i = 0; i < outputBlobs.length; i += 1) {
    const url = URL.createObjectURL(outputBlobs[i]);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputNames[i];
    link.click();
    if (i < outputBlobs.length - 1) await new Promise((resolve) => setTimeout(resolve, 400));
    URL.revokeObjectURL(url);
  }
  showStatus(`已下載 ${outputBlobs.length} 個檔案`, 'success');
}

function bindSliderPair(rangeEl, numEl) {
  rangeEl.addEventListener('input', () => {
    numEl.value = rangeEl.value;
    onSettingChange();
  });
  numEl.addEventListener('input', () => {
    const v = Math.min(Number(numEl.max), Math.max(Number(numEl.min), Number(numEl.value)));
    rangeEl.value = v;
    onSettingChange();
  });
}

dropArea.addEventListener('click', () => fileInput.click());
dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  dropArea.classList.add('drag-over');
});
dropArea.addEventListener('dragleave', (e) => {
  if (!dropArea.contains(e.relatedTarget)) dropArea.classList.remove('drag-over');
});
dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.classList.remove('drag-over');
  addFiles(e.dataTransfer.files);
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

directionSel.addEventListener('change', onSettingChange);
gridColsInput.addEventListener('input', onSettingChange);
formatSel.addEventListener('change', onSettingChange);
autoSegmentChk.addEventListener('change', onSettingChange);
maxHeightInput.addEventListener('input', onSettingChange);

bindSliderPair(spacingRange, spacingNum);
bindSliderPair(qualityRange, qualityNum);

document.querySelectorAll('.preset-btn:not(.corner-btn)').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn:not(.corner-btn)').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    sizeCustomInput.value = '';
    onSettingChange();
  });
});

sizeCustomInput.addEventListener('input', () => {
  document.querySelectorAll('.preset-btn:not(.corner-btn)').forEach((b) => b.classList.remove('active'));
  onSettingChange();
});

document.querySelectorAll('.corner-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.corner-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    cornerCustomInput.value = '';
    onSettingChange();
  });
});

cornerCustomInput.addEventListener('input', () => {
  document.querySelectorAll('.corner-btn').forEach((b) => b.classList.remove('active'));
  onSettingChange();
});

document.querySelectorAll('.dpi-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dpi-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    dpiCustomInput.value = '';
    onSettingChange();
  });
});

dpiCustomInput.addEventListener('input', () => {
  document.querySelectorAll('.dpi-btn').forEach((b) => b.classList.remove('active'));
  onSettingChange();
});

document.querySelectorAll('.swatch').forEach((chip) => {
  chip.addEventListener('click', () => {
    applyBackgroundColor(chip.dataset.color);
    onSettingChange();
  });
});

bgColorPicker.addEventListener('input', () => {
  const hex = bgColorPicker.value;
  bgColorText.value = hex;
  bgColorText.classList.remove('invalid');
  document.querySelectorAll('.swatch').forEach((s) => {
    s.classList.toggle('active', s.dataset.color.toLowerCase() === hex.toLowerCase());
  });
  onSettingChange();
});

bgColorText.addEventListener('input', () => {
  const parsed = parseColor(bgColorText.value);
  if (parsed) {
    bgColorText.classList.remove('invalid');
    bgColorPicker.value = parsed;
    document.querySelectorAll('.swatch').forEach((s) => {
      s.classList.toggle('active', s.dataset.color.toLowerCase() === parsed.toLowerCase());
    });
    settings.background = parsed;
    schedulePreview();
  } else {
    bgColorText.classList.add('invalid');
  }
});

bgColorText.addEventListener('blur', () => {
  if (bgColorText.classList.contains('invalid')) {
    applyBackgroundColor(bgColorPicker.value);
  }
});

themeChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    applyTheme(chip.dataset.themeChoice);
  });
});

systemThemeQuery.addEventListener('change', () => {
  if (document.body.dataset.themeChoice === 'system') {
    applyTheme('system');
  }
});

applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || document.body.dataset.themeChoice);
previewCanvas.hidden = true;
readSettings();
onSettingChange();
