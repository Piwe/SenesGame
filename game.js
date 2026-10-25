(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const BACKGROUND = '#1b1f3b';

  const SIZE_VARIATION = 0.1;     // circles vary by up to 10% around the configured size
  const ACTIVE_SPEED_MULT = 3;    // how much faster a circle moves after the first touch
  const ACTIVE_SPIN = 1.5;        // radians per second a shape spins after the first touch
  const SPAWN_INTERVAL = 1.2;     // seconds between new circles
  const TOUCH_SLOP = 1.3;         // hit area is larger than the drawn circle for small fingers
  const SEPARATION_GAP = 12;      // pixels kept between circles
  const AVOID_RANGE = 1.6;        // start steering away at this multiple of the contact distance
  const AVOID_STRENGTH = 6;
  const HOLD_ZONE = 90;           // top-left corner size (px) for the settings long-press
  const HOLD_TIME = 3;            // seconds to hold before the settings page opens

  let cfg = SenesConfig.load();
  let width = 0;
  let height = 0;
  let circles = [];
  let particles = [];
  let spawnTimer = 0;
  let lastTime = performance.now();
  let holdPointer = null;
  let holdTime = 0;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function targetSpeed(c) {
    return cfg.speed * (c.state === 'active' ? ACTIVE_SPEED_MULT : 1);
  }

  // ---------------------------------------------------------------- canvas

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --------------------------------------------------------------- circles

  function spawnCircle() {
    const diameter = cfg.sizeCm * cfg.pxPerCm * rand(1 - SIZE_VARIATION, 1 + SIZE_VARIATION);
    const r = Math.min(diameter / 2, Math.min(width, height) * 0.4);
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -r : width + r;
    const y = rand(r, Math.max(r, height - r));

    // Don't spawn on top of a circle that is still entering at the same spot.
    for (const c of circles) {
      if (Math.hypot(c.x - x, c.y - y) < c.r + r + SEPARATION_GAP) return false;
    }

    const angle = rand(-Math.PI / 6, Math.PI / 6) + (fromLeft ? 0 : Math.PI);
    circles.push({
      x, y, r,
      vx: Math.cos(angle) * cfg.speed,
      vy: Math.sin(angle) * cfg.speed,
      color: SenesShapes.COLORS[Math.floor(Math.random() * SenesShapes.COLORS.length)],
      shape: cfg.shapes[Math.floor(Math.random() * cfg.shapes.length)],
      rotation: 0,
      spin: 0,
      state: 'idle',
      entered: false,
      pulse: 0
    });
    return true;
  }

  function activate(c) {
    const angle = rand(0, Math.PI * 2);
    c.state = 'active';
    c.vx = Math.cos(angle) * targetSpeed(c);
    c.vy = Math.sin(angle) * targetSpeed(c);
    c.spin = ACTIVE_SPIN * (Math.random() < 0.5 ? -1 : 1);
    c.pulse = 1;
    playTone(300, 520, 0.15);
  }

  function pop(c) {
    circles.splice(circles.indexOf(c), 1);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + rand(-0.2, 0.2);
      const speed = rand(150, 350);
      particles.push({
        x: c.x, y: c.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: c.r * rand(0.12, 0.22),
        color: c.color,
        life: 1
      });
    }
    playTone(500, 1400, 0.12);
  }

  function hitTest(x, y) {
    let best = null;
    let bestScore = Infinity;
    for (const c of circles) {
      const score = Math.hypot(c.x - x, c.y - y) / c.r;
      if (score < TOUCH_SLOP && score < bestScore) {
        best = c;
        bestScore = score;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- update

  function update(dt) {
    spawnTimer -= dt;
    if (spawnTimer <= 0 && circles.length < cfg.maxCircles) {
      // Retry quickly if the spawn spot was blocked.
      spawnTimer = spawnCircle() ? SPAWN_INTERVAL : 0.2;
    }

    // Steer circles away from each other, and separate any that still overlap.
    for (let i = 0; i < circles.length; i++) {
      const a = circles[i];
      for (let j = i + 1; j < circles.length; j++) {
        const b = circles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const contact = a.r + b.r + SEPARATION_GAP;
        const range = contact * AVOID_RANGE;
        if (dist >= range) continue;

        const nx = dx / dist;
        const ny = dy / dist;
        const k = (1 - dist / range) * AVOID_STRENGTH * dt;
        a.vx -= nx * k * targetSpeed(a);
        a.vy -= ny * k * targetSpeed(a);
        b.vx += nx * k * targetSpeed(b);
        b.vy += ny * k * targetSpeed(b);

        if (dist < contact) {
          const push = (contact - dist) / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }

    for (const c of circles) {
      // Ease speed back towards the target after steering changed it.
      const target = targetSpeed(c);
      const s = Math.hypot(c.vx, c.vy) || 1;
      const next = s + (target - s) * Math.min(1, dt * 2);
      c.vx = (c.vx / s) * next;
      c.vy = (c.vy / s) * next;

      c.x += c.vx * dt;
      c.y += c.vy * dt;

      if (!c.entered && c.x - c.r >= 0 && c.x + c.r <= width) c.entered = true;

      // Circles still entering may sit off-screen horizontally but are bounced back in.
      const minX = c.entered ? c.r : -c.r;
      const maxX = c.entered ? width - c.r : width + c.r;
      if (c.x < minX) { c.x = minX; c.vx = Math.abs(c.vx); }
      if (c.x > maxX) { c.x = maxX; c.vx = -Math.abs(c.vx); }
      if (c.y < c.r) { c.y = c.r; c.vy = Math.abs(c.vy); }
      if (c.y > height - c.r) { c.y = height - c.r; c.vy = -Math.abs(c.vy); }

      c.rotation += c.spin * dt;
      c.pulse = Math.max(0, c.pulse - dt * 3);
    }

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - dt * 3;
      p.vy *= 1 - dt * 3;
      p.life -= dt * 1.8;
    }
    particles = particles.filter(p => p.life > 0);

    if (holdPointer !== null) {
      holdTime += dt;
      if (holdTime >= HOLD_TIME) openSettings();
    }
  }

  // ---------------------------------------------------------------- render

  function render() {
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    for (const c of circles) {
      const r = c.r * (1 + 0.18 * Math.sin(c.pulse * Math.PI));
      SenesShapes.draw(ctx, c.shape, c.x, c.y, r, c.color, c.rotation, c.state === 'active');
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Settings long-press progress, shown only after a deliberate hold.
    if (holdPointer !== null && holdTime > 0.5) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(HOLD_ZONE / 2, HOLD_ZONE / 2, 24, -Math.PI / 2,
        -Math.PI / 2 + (holdTime / HOLD_TIME) * Math.PI * 2);
      ctx.stroke();
    }
  }

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ----------------------------------------------------------------- audio

  let audioCtx = null;

  function unlockAudio() {
    if (!audioCtx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioCtx = new AudioCtor();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playTone(startFreq, endFreq, duration) {
    if (!cfg.sound || !audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // ----------------------------------------------------------------- input

  function requestFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement || !el.requestFullscreen) return;
    el.requestFullscreen().catch(() => {});
  }

  function inHoldZone(e) {
    return e.clientX < HOLD_ZONE && e.clientY < HOLD_ZONE;
  }

  function cancelHold(e) {
    if (e.pointerId === holdPointer) {
      holdPointer = null;
      holdTime = 0;
    }
  }

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    unlockAudio();
    requestFullscreen();

    if (holdPointer === null && inHoldZone(e)) {
      holdPointer = e.pointerId;
      holdTime = 0;
    }

    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) return;
    if (hit.state === 'idle') activate(hit);
    else pop(hit);
  });

  canvas.addEventListener('pointermove', e => {
    if (e.pointerId === holdPointer && !inHoldZone(e)) cancelHold(e);
  });
  canvas.addEventListener('pointerup', cancelHold);
  canvas.addEventListener('pointercancel', cancelHold);

  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());

  // -------------------------------------------------------------- settings

  function openSettings() {
    holdPointer = null;
    window.location.href = 'settings.html' + SenesConfig.toHash(cfg);
  }

  // ------------------------------------------------------------------ start

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
