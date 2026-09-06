(function () {
  document.querySelectorAll('.purchase-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('is-loading')) return;
      btn.classList.add('is-loading');
      btn.disabled = true;
      try {
        await window.folklore.postJSON('/api/credits/purchase', { product: btn.dataset.product });
        window.folklore.toast('Purchase complete — credits added.', 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        window.folklore.toast(err.message, 'error');
        btn.classList.remove('is-loading');
        btn.disabled = false;
      }
    });
  });
})();
