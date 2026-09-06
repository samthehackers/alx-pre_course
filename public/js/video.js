(function () {
  const cfg = window.FOLKLORE_VIDEO;
  if (!cfg) return;

  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  if (!startBtn || !stopBtn) return;
  const frame = document.getElementById('media-frame');
  const placeholder = document.getElementById('media-placeholder');
  const video = document.getElementById('preview');
  const durationEl = document.getElementById('duration-value');
  const consumedEl = document.getElementById('consumed-value');
  const balanceEl = document.getElementById('balance-value');
  const balanceFill = document.getElementById('balance-fill');

  let stream = null;
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
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (err) {
      window.folklore.toast('Camera access was denied or unavailable.', 'error');
      return;
    }
    video.srcObject = stream;
    placeholder.style.display = 'none';
    frame.classList.add('is-live');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    startedAt = Date.now();
    timer = setInterval(tick, 250);
  }

  async function stopSession() {
    if (stopping || !startedAt) return;
    stopping = true;
    clearInterval(timer);
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    startedAt = null;

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    video.srcObject = null;
    placeholder.style.display = '';
    frame.classList.remove('is-live');
    startBtn.disabled = false;
    stopBtn.disabled = true;

    try {
      const data = await window.folklore.postJSON('/api/usage/record', { feature: 'video', durationSeconds });
      cfg.remaining = data.summary.remaining.video;
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
