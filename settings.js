(function () {
  'use strict';

  const CARD_SHORT_EDGE_CM = 5.398; // bank card used as the calibration reference
  const BACKGROUND = '#1b1f3b';
  const SHAPE_LABELS = {
    circle: 'Circles',
    square: 'Squares',
    triangle: 'Triangles',
    diamond: 'Diamonds',
    star: 'Stars',
    pyramid: 'Pyramids'
  };

  let cfg = SenesConfig.load();

  const shapeGrid = document.getElementById('shape-grid');
  const shapeNote = document.getElementById('shape-note');
  const sizeInput = document.getElementById('sizeCm');
  const speedInput = document.getElementById('speed');
  const maxInput = document.getElementById('maxCircles');
  const soundInput = document.getElementById('sound');
  const calInput = document.getElementById('pxPerCm');
  const calBar = document.getElementById('calibration-bar');
  const sizeValue = document.getElementById('sizeCm-value');
  const speedValue = document.getElementById('speed-value');
  const maxValue = document.getElementById('maxCircles-value');
  const preview = document.getElementById('preview');
  const pctx = preview.getContext('2d');

  // Scales a canvas's backing store to the device pixel ratio.
  function sizeCanvas(canvas, ctx, w, h) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ----------------------------------------------------------- shape picker

  function drawIcon(canvas, value) {
    const ctx = canvas.getContext('2d');
    sizeCanvas(canvas, ctx, 56, 56);
    const i = SenesConfig.SHAPES.indexOf(value);
    SenesShapes.draw(ctx, value, 28, 28, 24, SenesShapes.COLORS[i % SenesShapes.COLORS.length], 0, false);
  }

  function onShapeToggle(e) {
    // The game needs at least one shape, so the last ticked box can't be cleared.
    if (selectedShapes().length === 0) {
      e.target.checked = true;
      shapeNote.textContent = 'At least one shape must stay ticked.';
      return;
    }
    shapeNote.textContent = 'Tick the shapes to include in the game.';
    save();
  }

  SenesConfig.SHAPES.forEach(value => {
    const label = document.createElement('label');
    label.className = 'shape-option';
    label.innerHTML = '<input type="checkbox" name="shapes"><span><canvas></canvas></span>';
    const input = label.querySelector('input');
    input.value = value;
    label.querySelector('span').append(SHAPE_LABELS[value] || value);
    drawIcon(label.querySelector('canvas'), value);
    input.addEventListener('change', onShapeToggle);
    shapeGrid.append(label);
  });

  document.getElementById('select-all').addEventListener('click', () => {
    for (const input of shapeGrid.querySelectorAll('input')) input.checked = true;
    shapeNote.textContent = 'Tick the shapes to include in the game.';
    save();
  });

  // ------------------------------------------------------------------ form

  function selectedShapes() {
    return Array.from(shapeGrid.querySelectorAll('input:checked'), input => input.value);
  }

  function fillForm(values) {
    sizeInput.value = values.sizeCm;
    speedInput.value = values.speed;
    maxInput.value = values.maxCircles;
    soundInput.checked = values.sound;
    calInput.value = values.pxPerCm;
    for (const input of shapeGrid.querySelectorAll('input')) {
      input.checked = values.shapes.indexOf(input.value) !== -1;
    }
  }

  function showValues() {
    sizeValue.textContent = cfg.sizeCm + ' cm';
    speedValue.textContent = 'about ' + (cfg.speed / cfg.pxPerCm).toFixed(1) + ' cm per second';
    maxValue.textContent = cfg.maxCircles;
    calBar.style.width = (CARD_SHORT_EDGE_CM * cfg.pxPerCm) + 'px';
    resizePreview();
  }

  function save() {
    cfg = SenesConfig.save({
      shapes: selectedShapes(),
      sizeCm: sizeInput.value,
      speed: speedInput.value,
      maxCircles: maxInput.value,
      sound: soundInput.checked,
      pxPerCm: calInput.value
    });
    showValues();
  }

  for (const input of [sizeInput, speedInput, maxInput, soundInput, calInput]) {
    input.addEventListener('input', save);
  }

  // Defaults reset the game values but keep the screen calibration.
  document.getElementById('reset').addEventListener('click', () => {
    fillForm(Object.assign({}, SenesConfig.DEFAULTS, { pxPerCm: cfg.pxPerCm }));
    save();
  });

  document.getElementById('play').addEventListener('click', () => {
    window.location.href = 'index.html' + SenesConfig.toHash(cfg);
  });

  // --------------------------------------------------------------- preview

  // One shape drifts across at the configured size and idle speed.
  const sample = { x: 0, shapeIndex: 0, colorIndex: 0 };
  let previewWidth = 0;
  let previewHeight = 0;
  let lastTime = performance.now();

  function diameterPx() {
    return cfg.sizeCm * cfg.pxPerCm;
  }

  function resizePreview() {
    previewWidth = preview.clientWidth;
    previewHeight = Math.min(Math.max(diameterPx() + 40, 140), 640);
    sizeCanvas(preview, pctx, previewWidth, previewHeight);
  }

  function sampleShape() {
    return cfg.shapes[sample.shapeIndex % cfg.shapes.length];
  }

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    const r = diameterPx() / 2;
    sample.x += cfg.speed * dt;
    if (sample.x - r > previewWidth) {
      sample.x = -r;
      sample.shapeIndex++;
      sample.colorIndex++;
    }

    pctx.fillStyle = BACKGROUND;
    pctx.fillRect(0, 0, previewWidth, previewHeight);
    SenesShapes.draw(pctx, sampleShape(), sample.x, previewHeight / 2, r,
      SenesShapes.COLORS[sample.colorIndex % SenesShapes.COLORS.length], 0, false);

    requestAnimationFrame(frame);
  }

  // ----------------------------------------------------------------- start

  fillForm(cfg);
  showValues();
  sample.x = previewWidth / 2;
  window.addEventListener('resize', resizePreview);
  requestAnimationFrame(frame);
})();
