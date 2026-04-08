import {
  dom, store, THUMB_SIZE, THEME_STORAGE_KEY, SETTINGS_STORAGE_KEY, systemThemeQuery, showStatus,
} from './shared.js';
import {
  applyBackgroundColor, bindSliderPair, doDownload, doMerge, onSettingChange,
  parseColor, readSettings, saveSettings, schedulePreview,
} from './core.js';

function resolveThemeChoice(themeChoice) {
  if (themeChoice === 'light' || themeChoice === 'dark') return themeChoice;
  return systemThemeQuery.matches ? 'dark' : 'light';
}

function applyTheme(themeChoice) {
  const nextChoice = ['system', 'light', 'dark'].includes(themeChoice) ? themeChoice : 'system';
  const resolvedTheme = resolveThemeChoice(nextChoice);
  document.body.dataset.themeChoice = nextChoice;
  document.body.dataset.colorScheme = resolvedTheme;
  dom.themeChips.forEach((chip) => {
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

function sortByFilename() {
  store.images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
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
    store.images = store.images.filter((image) => image.id !== item.id);
    renderImageList();
    schedulePreview();
  });

  li.append(handle, thumb, info, delBtn);

  li.addEventListener('dragstart', (event) => {
    store.dragSrcId = item.id;
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
    if (store.dragSrcId === item.id) return;
    document.querySelectorAll('.image-item.drag-over').forEach((el) => el.classList.remove('drag-over'));
    li.classList.add('drag-over');
  });

  li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
  li.addEventListener('drop', (event) => {
    event.preventDefault();
    li.classList.remove('drag-over');
    if (store.dragSrcId === item.id) return;
    const srcIdx = store.images.findIndex((image) => image.id === store.dragSrcId);
    const dstIdx = store.images.findIndex((image) => image.id === item.id);
    if (srcIdx < 0 || dstIdx < 0) return;
    const [moved] = store.images.splice(srcIdx, 1);
    store.images.splice(dstIdx, 0, moved);
    renderImageList();
    schedulePreview();
  });

  return li;
}

function renderImageList() {
  const count = store.images.length;
  dom.imageCount.textContent = String(count);
  dom.imageListPanel.hidden = count === 0;
  dom.mergeBtn.disabled = count === 0;

  if (count === 0) {
    dom.previewMeta.textContent = '-';
    dom.warningBanner.hidden = true;
    dom.previewCanvas.width = 0;
    dom.previewCanvas.height = 0;
    dom.previewCanvas.hidden = true;
    dom.previewSizePxEl.textContent = '0 \u00d7 0 px';
    dom.physicalSizeEl.textContent = '0 \u00d7 0 cm';
    dom.previewChunkCountEl.textContent = '1';
    store.outputBlobs = [];
    store.outputNames = [];
    dom.downloadBtn.disabled = true;
  }

  dom.imageList.innerHTML = '';
  for (const item of store.images) {
    dom.imageList.appendChild(buildImageItem(item));
  }
}

async function addFiles(fileList) {
  const accepted = [...fileList].filter((file) => /\.(jpe?g|png|webp)$/i.test(file.name));
  const skipped = fileList.length - accepted.length;

  if (store.images.length + accepted.length > 50) {
    showStatus('\u6700\u591a\u652f\u63f4 50 \u5f35\u5716\u7247', 'warn');
    return;
  }

  for (const file of accepted) {
    try {
      const img = await loadImg(file);
      store.images.push({ id: store.nextId++, file, name: file.name, img });
    } catch (error) {
      showStatus(error.message, 'error');
    }
  }

  if (skipped > 0) {
    showStatus(`\u5df2\u8df3\u904e ${skipped} \u500b\u4e0d\u652f\u63f4\u683c\u5f0f\u7684\u6a94\u6848`, 'warn');
  } else if (accepted.length > 0) {
    showStatus('');
  }

  sortByFilename();
  renderImageList();
  schedulePreview();
}

function bindUploadEvents() {
  dom.dropArea.addEventListener('click', () => dom.fileInput.click());
  dom.dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    dom.dropArea.classList.add('drag-over');
  });
  dom.dropArea.addEventListener('dragleave', (event) => {
    if (!dom.dropArea.contains(event.relatedTarget)) dom.dropArea.classList.remove('drag-over');
  });
  dom.dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    dom.dropArea.classList.remove('drag-over');
    addFiles(event.dataTransfer.files);
  });
  dom.fileInput.addEventListener('change', () => {
    addFiles(dom.fileInput.files);
    dom.fileInput.value = '';
  });
}

function bindToolbarEvents() {
  dom.sortBtn.addEventListener('click', () => {
    sortByFilename();
    renderImageList();
    schedulePreview();
  });
  dom.clearBtn.addEventListener('click', () => {
    store.images = [];
    renderImageList();
    schedulePreview();
    showStatus('');
  });
  dom.mergeBtn.addEventListener('click', doMerge);
  dom.downloadBtn.addEventListener('click', doDownload);
}

function bindSettingEvents() {
  dom.directionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      dom.directionSel.value = button.dataset.direction;
      onSettingChange();
    });
  });
  dom.directionSel.addEventListener('change', onSettingChange);
  dom.gridColsInput.addEventListener('input', onSettingChange);
  dom.formatSel.addEventListener('change', onSettingChange);
  dom.autoSegmentChk.addEventListener('change', onSettingChange);
  dom.maxHeightInput.addEventListener('input', onSettingChange);

  dom.segmentModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      dom.segmentModeInput.value = button.dataset.segmentMode;
      onSettingChange();
    });
  });

  dom.previewModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      dom.previewModeInput.value = button.dataset.previewMode;
      onSettingChange();
    });
  });

  bindSliderPair(dom.spacingRange, dom.spacingNum);
  bindSliderPair(dom.qualityRange, dom.qualityNum);

  document.querySelectorAll('.preset-btn:not(.corner-btn)').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn:not(.corner-btn)').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      dom.sizeCustomInput.value = '';
      onSettingChange();
    });
  });

  dom.sizeCustomInput.addEventListener('input', () => {
    document.querySelectorAll('.preset-btn:not(.corner-btn)').forEach((button) => button.classList.remove('active'));
    onSettingChange();
  });

  document.querySelectorAll('.corner-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.corner-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      dom.cornerCustomInput.value = '';
      onSettingChange();
    });
  });

  dom.cornerCustomInput.addEventListener('input', () => {
    document.querySelectorAll('.corner-btn').forEach((button) => button.classList.remove('active'));
    onSettingChange();
  });

  dom.dpiSelect.addEventListener('change', onSettingChange);

  document.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      applyBackgroundColor(swatch.dataset.color);
      onSettingChange();
    });
  });

  dom.bgColorPicker.addEventListener('input', () => {
    const hex = dom.bgColorPicker.value;
    dom.bgColorText.value = hex;
    dom.bgColorText.classList.remove('invalid');
    document.querySelectorAll('.swatch').forEach((swatch) => {
      swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === hex.toLowerCase());
    });
    onSettingChange();
  });

  dom.bgColorText.addEventListener('input', () => {
    const parsed = parseColor(dom.bgColorText.value);
    if (!parsed) {
      dom.bgColorText.classList.add('invalid');
      return;
    }
    dom.bgColorText.classList.remove('invalid');
    dom.bgColorPicker.value = parsed;
    document.querySelectorAll('.swatch').forEach((swatch) => {
      swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === parsed.toLowerCase());
    });
    store.settings.background = parsed;
    schedulePreview();
  });

  dom.bgColorText.addEventListener('blur', () => {
    if (dom.bgColorText.classList.contains('invalid')) applyBackgroundColor(dom.bgColorPicker.value);
  });
}

function restoreSettings() {
  let saved;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return;
    saved = JSON.parse(raw);
  } catch {
    return;
  }

  if (saved.direction) {
    dom.directionSel.value = saved.direction;
    dom.directionButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.direction === saved.direction));
  }
  if (saved.gridCols != null) dom.gridColsInput.value = saved.gridCols;
  if (saved.spacing != null) { dom.spacingNum.value = saved.spacing; dom.spacingRange.value = saved.spacing; }
  if (saved.format) dom.formatSel.value = saved.format;
  if (saved.quality != null) { dom.qualityNum.value = saved.quality; dom.qualityRange.value = saved.quality; }
  if (saved.background) applyBackgroundColor(saved.background);
  if (saved.dpi) dom.dpiSelect.value = saved.dpi;
  if (saved.autoSegment != null) dom.autoSegmentChk.checked = saved.autoSegment;
  if (saved.maxHeight != null) dom.maxHeightInput.value = saved.maxHeight;
  if (saved.segmentMode) {
    dom.segmentModeInput.value = saved.segmentMode;
    dom.segmentModeButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.segmentMode === saved.segmentMode));
  }
  if (saved.previewMode) {
    dom.previewModeInput.value = saved.previewMode;
    dom.previewModeButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.previewMode === saved.previewMode));
  }
  if (saved.sizeCustom) {
    dom.sizeCustomInput.value = saved.sizeCustom;
    document.querySelectorAll('.preset-btn:not(.corner-btn)').forEach((btn) => btn.classList.remove('active'));
  } else if (saved.sizePreset) {
    document.querySelectorAll('.preset-btn:not(.corner-btn)').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.size === saved.sizePreset);
    });
  }
  if (saved.cornerCustom) {
    dom.cornerCustomInput.value = saved.cornerCustom;
    document.querySelectorAll('.corner-btn').forEach((btn) => btn.classList.remove('active'));
  } else if (saved.cornerPreset != null) {
    document.querySelectorAll('.corner-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.corner === saved.cornerPreset);
    });
  }
  if (Array.isArray(saved.collapsedGroups)) {
    document.querySelectorAll('.group-title[data-group]').forEach((btn) => {
      btn.setAttribute('aria-expanded', saved.collapsedGroups.includes(btn.dataset.group) ? 'false' : 'true');
    });
  }
}

function bindCollapsibleGroups() {
  document.querySelectorAll('.group-title[data-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      saveSettings();
    });
  });
}

function bindThemeEvents() {
  dom.themeChips.forEach((chip) => {
    chip.addEventListener('click', () => applyTheme(chip.dataset.themeChoice));
  });
  systemThemeQuery.addEventListener('change', () => {
    if (document.body.dataset.themeChoice === 'system') applyTheme('system');
  });
}

function initApp() {
  bindUploadEvents();
  bindToolbarEvents();
  bindSettingEvents();
  bindThemeEvents();
  bindCollapsibleGroups();
  restoreSettings();
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || document.body.dataset.themeChoice);
  dom.previewCanvas.hidden = true;
  window.addEventListener('resize', schedulePreview);
  readSettings();
  onSettingChange();
}

initApp();
