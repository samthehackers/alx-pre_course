(function () {
  const cfg = window.FOLKLORE_VOICE;
  if (!cfg) return;

  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  if (!startBtn || !stopBtn) return;
  const frame = document.getElementById('media-frame');
  const placeholder = document.getElementById('media-placeholder');
  const meter = document.getElementById('audio-meter');
  const effectSelect = document.getElementById('effect-select');
  const durationEl = document.getElementById('duration-value');
  const consumedEl = document.getElementById('consumed-value');
  const balanceEl = document.getElementById('balance-value');
  const balanceFill = document.getElementById('balance-fill');

  const BAR_COUNT = 28;
  for (let i = 0; i < BAR_COUNT; i += 1) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    meter.appendChild(bar);
  }
  const bars = Array.from(meter.querySelectorAll('.bar'));

  let stream = null;
  let audioCtx = null;
  let analyser = null;
  let rafId = null;
  let startedAt = null;
  let timer = null;
  let stopping = false;

  function formatMoney(n) {
    return `$${n.toFixed(2)}`;
  }

  function formatDuration(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function renderBalance(remaining) {
    balanceEl.textContent = formatMoney(Math.max(0, remaining));
    const pct = cfg.remaining > 0 ? Math.max(0, Math.min(100, (remaining / cfg.remaining) * 100)) : 0;
    balanceFill.style.width = `${pct}%`;
  }

  function buildEffectChain(ctx, source, effect) {
    if (effect === 'robot') {
      const carrier = ctx.createOscillator();
      carrier.frequency.value = 32;
      carrier.start();
      const modulated = ctx.createGain();
      modulated.gain.value = 0;
      carrier.connect(modulated.gain);
      source.connect(modulated);
      return modulated;
    }
    if (effect === 'deep') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      const gain = ctx.createGain();
      gain.gain.value = 1.4;
      source.connect(filter);
      filter.connect(gain);
      return gain;
    }
    // bright
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 500;
    const gain = ctx.createGain();
    gain.gain.value = 1.3;
    source.connect(filter);
    filter.connect(gain);
    return gain;
  }

  function animateMeter() {
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const step = Math.floor(data.length / BAR_COUNT) || 1;
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const value = data[i * step] || 0;
      bars[i].style.height = `${Math.max(6, (value / 255) * 40)}px`;
    }
    rafId = requestAnimationFrame(animateMeter);
  }

  function tick() {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    const consumed = (elapsedSeconds / 60) * cfg.rate;
    durationEl.textContent = formatDuration(elapsedSeconds);
    consumedEl.textContent = formatMoney(consumed);
    renderBalance(cfg.remaining - consumed);

    if (consumed >= cfg.remaining) {
      window.folklore.toast('Credits exhausted — session ended automatically.', 'error');
      stopSession();
    }
  }

  async function startSession() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      window.folklore.toast('Microphone access was denied or unavailable.', 'error');
      return;
    }

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const effectOut = buildEffectChain(audioCtx, source, effectSelect.value);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    effectOut.connect(analyser);
    effectOut.connect(audioCtx.destination);

    effectSelect.disabled = true;
    placeholder.style.display = 'none';
    meter.style.display = 'flex';
    frame.classList.add('is-live');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    startedAt = Date.now();
    timer = setInterval(tick, 250);
    animateMeter();
  }

  async function stopSession() {
    if (stopping || !startedAt) return;
    stopping = true;
    clearInterval(timer);
    cancelAnimationFrame(rafId);
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    startedAt = null;

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }

    effectSelect.disabled = false;
    placeholder.style.display = '';
    meter.style.display = 'none';
    frame.classList.remove('is-live');
    startBtn.disabled = false;
    stopBtn.disabled = true;

    try {
      const data = await window.folklore.postJSON('/api/usage/record', { feature: 'voice', durationSeconds });
      cfg.remaining = data.summary.remaining.voice;
      renderBalance(cfg.remaining);
      consumedEl.textContent = formatMoney(data.session.creditsConsumed);
      durationEl.textContent = formatDuration(data.session.durationSeconds);
      window.folklore.toast('Session recorded.', 'success');
    } catch (err) {
      window.folklore.toast(err.message, 'error');
    }
    stopping = false;
  }

  startBtn.addEventListener('click', startSession);
  stopBtn.addEventListener('click', stopSession);
})();
