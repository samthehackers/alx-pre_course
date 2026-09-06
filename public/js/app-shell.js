(function () {
  const toggle = document.getElementById('drawer-toggle');
  const drawer = document.getElementById('app-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!toggle || !drawer) return;

  function closeDrawer() {
    drawer.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  drawer.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeDrawer));
})();

window.folklore = {
  toast(message, type) {
    let el = document.getElementById('folklore-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'folklore-toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = 'toast is-visible' + (type ? ` toast-${type}` : '');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('is-visible'), 2600);
  },

  async postJSON(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }
    return data;
  },
};
