import {
  dom, store, MAX_PREVIEW_RENDER_PIXELS, SOFT_SEGMENT_HEIGHT, HARD_SEGMENT_HEIGHT, showStatus,
} from './shared.js';

function readSettings() {
  const { settings } = store;
  settings.direction = dom.directionSel.value;
  settings.gridCols = Math.max(1, parseInt(dom.gridColsInput.value, 10) || 3);
  settings.spacing = Math.max(0, parseInt(dom.spacingNum.value, 10) || 0);
  settings.background = dom.bgColorPicker.value;
  settings.format = dom.formatSel.value;
  settings.quality = Math.min(100, Math.max(60, parseInt(dom.qualityNum.value, 10) || 90));

  const activeCorner = document.querySelector('.corner-btn.active');
  settings.cornerRadius = activeCorner ? parseInt(activeCorner.dataset.corner, 10) : 0;
  const customCorner = parseInt(dom.cornerCustomInput.value, 10);
  if (dom.cornerCustomInput.value && customCorner >= 0 && customCorner <= 500) settings.cornerRadius = customCorner;

  settings.autoSegment = dom.autoSegmentChk.checked;
  settings.maxSegmentHeight = Math.max(1000, parseInt(dom.maxHeightInput.value, 10) || 10000);
  settings.segmentMode = dom.segmentModeInput.value === 'preserve' ? 'preserve' : 'strict';
  settings.previewMode = dom.previewModeInput.value === 'contain' ? 'contain' : 'fill';

  const activeSize = document.querySelector('.preset-btn:not(.corner-btn).active');
  settings.outputSize = activeSize && activeSize.dataset.size !== 'auto' ? parseInt(activeSize.dataset.size, 10) : null;
  const customSize = parseInt(dom.sizeCustomInput.value, 10);
  if (dom.sizeCustomInput.value && customSize >= 100 && customSize <= 10000) settings.outputSize = customSize;

  settings.dpi = parseInt(dom.dpiSelect.value, 10) || 96;
}

function syncDirectionControls() {
  dom.directionButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.direction === store.settings.direction);
  });
}

function syncSegmentModeControls() {
  dom.segmentModeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.segmentMode === store.settings.segmentMode);
    button.disabled = false;
  });
}

function syncPreviewModeControls() {
  dom.previewModeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.previewMode === store.settings.previewMode);
  });
  dom.previewStageInner.classList.toggle('preview-mode-fill', store.settings.previewMode === 'fill');
  dom.previewStageInner.classList.toggle('preview-mode-contain', store.settings.previewMode === 'contain');
}

function updateSizeLabel() {
  const labels = {
    vertical: '\u8f38\u51fa\u5bec\u5ea6\uff08px\uff09',
    horizontal: '\u7d71\u4e00\u9ad8\u5ea6\uff08px\uff09',
    grid: 'Cell \u5c3a\u5bf8\uff08px\uff09',
  };
  dom.sizeLabelEl.textContent = labels[store.settings.direction] || labels.vertical;
}

function onSettingChange() {
  readSettings();
  syncDirectionControls();
  syncSegmentModeControls();
  syncPreviewModeControls();
  dom.gridColsField.hidden = store.settings.direction !== 'grid';
  dom.qualityField.hidden = store.settings.format === 'png';
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
  return [r, g, b].every((channel) => channel <= 255)
    ? '#' + [r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')
    : null;
}

function applyBackgroundColor(hex) {
  dom.bgColorPicker.value = hex;
  dom.bgColorText.value = hex;
  dom.bgColorText.classList.remove('invalid');
  store.settings.background = hex;
  document.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === hex.toLowerCase());
  });
}

function computePositions() {
  if (!store.images.length) return [];
  const { direction, gridCols, spacing, outputSize } = store.settings;
  const imgs = store.images.map((item) => item.img);
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
    positions.push({ img, x: cellX + Math.round((cellW - w) / 2), y: cellY + Math.round((cellH - h) / 2), w, h });
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

function drawToContext(ctx, canvasW, canvasH, positions, renderScale, segmentOffsetY) {
  ctx.fillStyle = store.settings.background;
  ctx.fillRect(0, 0, canvasW, canvasH);
  const radius = Math.round((store.settings.cornerRadius || 0) * renderScale);

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
  const dpi = store.settings.dpi;
  const wCm = ((width / dpi) * 2.54).toFixed(1);
  const hCm = ((height / dpi) * 2.54).toFixed(1);
  dom.physicalSizeEl.textContent = `${wCm} \u00d7 ${hCm} cm\n@${dpi} DPI`;
}

function updateWarningBanner(height) {
  if (height > HARD_SEGMENT_HEIGHT) {
    dom.warningBanner.hidden = false;
    dom.warningBanner.className = 'warning-banner error';
    dom.warningBanner.textContent = `\u5408\u6210\u9ad8\u5ea6 ${height.toLocaleString()} px \u8d85\u904e\u5b89\u5168\u4e0a\u9650\uff0c\u5df2\u5f37\u5236\u958b\u555f\u81ea\u52d5\u5206\u6bb5\u3002`;
    dom.autoSegmentChk.checked = true;
    dom.autoSegmentChk.disabled = true;
    store.settings.autoSegment = true;
    syncSegmentModeControls();
    return;
  }

  dom.autoSegmentChk.disabled = false;
  syncSegmentModeControls();

  if (height > SOFT_SEGMENT_HEIGHT && !store.settings.autoSegment) {
    dom.warningBanner.hidden = false;
    dom.warningBanner.className = 'warning-banner';
    dom.warningBanner.textContent = `\u5716\u7247\u8f03\u9577\uff08${height.toLocaleString()} px\uff09\uff0c\u5efa\u8b70\u555f\u7528\u5206\u6bb5\u8f38\u51fa\u4ee5\u907f\u514d\u5408\u6210\u5931\u6557\u3002`;
    return;
  }

  dom.warningBanner.hidden = true;
}

function computeStrictSegmentRanges(totalHeight) {
  const ranges = [];
  let start = 0;
  while (start < totalHeight) {
    const end = Math.min(start + store.settings.maxSegmentHeight, totalHeight);
    ranges.push([start, end]);
    start = end;
  }
  return ranges;
}

function computePreserveSegmentRanges(positions, totalHeight) {
  if (!positions.length) return [[0, totalHeight]];

  if (store.settings.direction === 'vertical') {
    const ranges = [];
    let segmentStart = 0;
    for (const position of positions) {
      const bottom = position.y + position.h;
      if (position.y > segmentStart && bottom - segmentStart > store.settings.maxSegmentHeight) {
        ranges.push([segmentStart, position.y]);
        segmentStart = position.y;
      }
    }
    const last = positions[positions.length - 1];
    ranges.push([segmentStart, last.y + last.h]);
    return ranges;
  }

  if (store.settings.direction === 'grid') {
    const maxCellHeight = store.settings.outputSize || Math.max(...store.images.map((item) => item.img.height));
    const rowStep = maxCellHeight + store.settings.spacing;
    const ranges = [];
    let rowStart = 0;
    let segmentStart = 0;
    while (rowStart < totalHeight) {
      const rowEnd = Math.min(rowStart + rowStep, totalHeight);
      if (rowEnd - segmentStart > store.settings.maxSegmentHeight && rowStart > segmentStart) {
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
    store.settings.autoSegment = true;
    dom.autoSegmentChk.checked = true;
  }
  if (!store.settings.autoSegment || totalHeight <= store.settings.maxSegmentHeight) return [[0, totalHeight]];
  return store.settings.segmentMode === 'preserve'
    ? computePreserveSegmentRanges(positions, totalHeight)
    : computeStrictSegmentRanges(totalHeight);
}

function renderPreview() {
  if (!store.images.length) return;
  readSettings();
  const positions = computePositions();
  const { width, height } = computeCanvasSize(positions);
  if (!width || !height) return;

  updateWarningBanner(height);
  updatePhysicalSize(width, height);

  const stageWidth = Math.max(1, dom.previewStageInner.clientWidth - 24);
  const stageHeight = Math.max(1, dom.previewStageInner.clientHeight - 24);
  const previewScale = store.settings.previewMode === 'contain'
    ? Math.min(stageWidth / width, stageHeight / height)
    : stageWidth / width;

  let scale = Math.max(0.05, Math.min(previewScale, 2));
  const scaledPixels = width * height * scale * scale;
  if (scaledPixels > MAX_PREVIEW_RENDER_PIXELS) {
    scale = Math.sqrt(MAX_PREVIEW_RENDER_PIXELS / (width * height));
  }

  const previewWidth = Math.max(1, Math.round(width * scale));
  const previewHeight = Math.max(1, Math.round(height * scale));

  dom.previewCanvas.hidden = false;
  dom.previewCanvas.width = previewWidth;
  dom.previewCanvas.height = previewHeight;
  dom.previewCtx.imageSmoothingEnabled = true;
  dom.previewCtx.imageSmoothingQuality = 'high';
  drawToContext(dom.previewCtx, previewWidth, previewHeight, positions, scale, 0);

  const segmentRanges = computeSegmentRanges(positions, height);
  dom.previewSizePxEl.textContent = `${width} \u00d7 ${height} px`;
  dom.previewChunkCountEl.textContent = String(segmentRanges.length);

  const pixels = width * height;
  const estimatedBytes = store.settings.format === 'jpg' ? pixels * 3 * (store.settings.quality / 100) * 0.1 : pixels * 0.6;
  const estimatedText = estimatedBytes >= 1024 * 1024 ? `~${(estimatedBytes / 1024 / 1024).toFixed(1)} MB` : `~${Math.round(estimatedBytes / 1024)} KB`;
  dom.previewMeta.textContent = `${width} \u00d7 ${height} px\uff5c\u9810\u4f30 ${estimatedText}`;
}

async function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas \u8f49\u63db\u5931\u6557')), mimeType, quality);
  });
}

function buildOutputBaseName() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
  ];
  return `image_merger_${parts.join('')}`;
}

async function doMerge() {
  if (!store.images.length) return;
  readSettings();
  dom.mergeBtn.disabled = true;
  dom.downloadBtn.disabled = true;
  store.outputBlobs = [];
  store.outputNames = [];
  showStatus('\u6b63\u5728\u5408\u6210...', '');

  try {
    const positions = computePositions();
    const { width, height } = computeCanvasSize(positions);
    const segmentRanges = computeSegmentRanges(positions, height);
    const formatMap = { jpg: ['jpg', 'image/jpeg'], png: ['png', 'image/png'], webp: ['webp', 'image/webp'] };
    const [ext, mimeType] = formatMap[store.settings.format] || formatMap.jpg;
    const quality = store.settings.format !== 'png' ? store.settings.quality / 100 : undefined;
    const baseName = buildOutputBaseName();

    for (let index = 0; index < segmentRanges.length; index += 1) {
      const [segmentStart, segmentEnd] = segmentRanges[index];
      const segmentHeight = segmentEnd - segmentStart;
      showStatus(`\u5408\u6210\u4e2d... ${index + 1} / ${segmentRanges.length}`, '');
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = segmentHeight;
      drawToContext(offscreen.getContext('2d'), width, segmentHeight, positions, 1, segmentStart);
      store.outputBlobs.push(await canvasToBlob(offscreen, mimeType, quality));
      const sequence = String(index + 1).padStart(3, '0');
      store.outputNames.push(`${baseName}_${sequence}.${ext}`);
    }

    dom.downloadBtn.disabled = false;
    showStatus(`\u5408\u6210\u5b8c\u6210\uff0c\u5171 ${store.outputBlobs.length} \u500b\u8f38\u51fa\u6a94\u6848`, 'success');
  } catch (error) {
    showStatus(`\u5408\u6210\u5931\u6557\uff1a${error.message}`, 'error');
  } finally {
    dom.mergeBtn.disabled = store.images.length === 0;
  }
}

async function doDownload() {
  if (!store.outputBlobs.length) return;

  if (store.outputBlobs.length === 1) {
    const url = URL.createObjectURL(store.outputBlobs[0]);
    const link = document.createElement('a');
    link.href = url;
    link.download = store.outputNames[0];
    link.click();
    URL.revokeObjectURL(url);
    showStatus(`\u5df2\u4e0b\u8f09 ${store.outputNames[0]}`, 'success');
    return;
  }

  if (typeof JSZip === 'undefined') {
    showStatus('ZIP \u6a21\u7d44\u8f09\u5165\u5931\u6557\uff0c\u7121\u6cd5\u6253\u5305\u4e0b\u8f09', 'error');
    return;
  }

  const zip = new JSZip();
  store.outputBlobs.forEach((blob, index) => {
    zip.file(store.outputNames[index], blob);
  });

  const archiveBase = store.outputNames[0].replace(/_\d{3}\.[^.]+$/, '');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = zipUrl;
  link.download = `${archiveBase}.zip`;
  link.click();
  URL.revokeObjectURL(zipUrl);
  showStatus(`\u5df2\u6253\u5305 ZIP \u4e26\u4e0b\u8f09 ${store.outputBlobs.length} \u500b\u6a94\u6848`, 'success');
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
  clearTimeout(store.previewTimer);
  store.previewTimer = setTimeout(renderPreview, 180);
}

export { applyBackgroundColor, bindSliderPair, doDownload, doMerge, onSettingChange, parseColor, readSettings, schedulePreview };
