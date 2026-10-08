(function () {
  const cfg = window.CAFE_CONFIG || {};
  const base = (cfg.API_URL || '').replace(/\/$/, '');
  const PIN_KEY = 'cafe_staff_pin';

  const store = {
    get() { try { return localStorage.getItem(PIN_KEY) || ''; } catch { return ''; } },
    set(v) { try { localStorage.setItem(PIN_KEY, v); } catch {} },
    clear() { try { localStorage.removeItem(PIN_KEY); } catch {} },
  };

  async function api(path, { method = 'GET', body, staff = false } = {}) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (staff) headers['x-staff-pin'] = store.get();
    let res;
    try {
      res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      const e = new Error('Tidak bisa terhubung ke server. Periksa internet atau API_URL di config.js.');
      e.network = true;
      throw e;
    }
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const e = new Error((data && data.error) || `Terjadi kesalahan (${res.status})`);
      e.status = res.status;
      throw e;
    }
    return data;
  }

  const rupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let toastTimer;
  function toast(msg, isError) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.className = 'toast' + (isError ? ' error' : '');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 3200);
  }

  // Minta PIN staff kalau belum ada / salah. Resolve setelah PIN valid.
  function requireStaff() {
    return new Promise(async (resolve) => {
      if (store.get()) {
        try { await api('/api/login', { method: 'POST', staff: true }); return resolve(); }
        catch (e) { if (e.status !== 401) { toast(e.message, true); return resolve(); } store.clear(); }
      }
      const wrap = document.createElement('div');
      wrap.className = 'overlay';
      wrap.innerHTML = `
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="pin-title">
          <h2 id="pin-title">Masukkan PIN staff</h2>
          <p>PIN diberikan oleh pemilik cafe.</p>
          <div><label for="pin">PIN</label><input id="pin" type="password" inputmode="numeric" autocomplete="off"></div>
          <p class="err" id="pin-err" role="alert"></p>
          <button class="btn big" id="pin-ok">Masuk</button>
        </div>`;
      document.body.appendChild(wrap);
      const input = wrap.querySelector('#pin');
      const err = wrap.querySelector('#pin-err');
      input.focus();
      async function submit() {
        store.set(input.value.trim());
        try {
          await api('/api/login', { method: 'POST', staff: true });
          wrap.remove();
          resolve();
        } catch (e) {
          store.clear();
          err.textContent = e.status === 401 ? 'PIN salah. Coba lagi.' : e.message;
          input.select();
        }
      }
      wrap.querySelector('#pin-ok').addEventListener('click', submit);
      input.addEventListener('keydown', (ev) => ev.key === 'Enter' && submit());
    });
  }

  // Bunyi notifikasi sederhana (WebAudio). Harus diaktifkan lewat klik pengguna.
  let audioCtx = null;
  const sound = {
    enable() {
      try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); return true; }
      catch { return false; }
    },
    get on() { return !!audioCtx && audioCtx.state === 'running'; },
    chime(freqs = [880, 1175]) {
      if (!this.on) return;
      freqs.forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        const t = audioCtx.currentTime + i * 0.22;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        o.connect(g).connect(audioCtx.destination);
        o.start(t); o.stop(t + 0.75);
      });
    },
  };

  function header(active) {
    const name = esc(cfg.CAFE_NAME || 'Kafe');
    const link = (href, label, key) =>
      `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
    return `<header class="topbar">
      <span class="brand">${name}</span>
      <nav aria-label="Halaman">${link('kasir.html', 'Kasir', 'kasir')}${link('dapur.html', 'Dapur', 'dapur')}${link('layar.html', 'Layar antrian', 'layar')}</nav>
    </header>`;
  }

  window.Cafe = { cfg, api, rupiah, esc, toast, requireStaff, sound, header, store };
})();
