/* The site theme, shared with rokha.ai: system (the default — the OS
   decides), light, dark. The choice lives in this browser only
   (localStorage `rokha_site_theme`, a display preference, nothing else).
   Loaded synchronously in <head> so the stored choice lands before the
   first paint; after that it draws the switch into every [data-site-theme]. */
(function () {
  var KEY = 'rokha_site_theme';
  var root = document.documentElement;

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch (e) { return 'system'; }
  }
  function apply(t) {
    if (t === 'system') root.removeAttribute('data-manual-theme');
    else root.setAttribute('data-manual-theme', t);
  }
  function store(t) {
    try { t === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, t); } catch (e) {}
    apply(t);
    sync();
  }

  apply(read());

  var OPTIONS = [
    ['system', 'Match my system',
      '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor"/></svg>'],
    ['light', 'Light',
      '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'],
    ['dark', 'Dark',
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12.8 10.2A5.5 5.5 0 0 1 5.8 3.2a5.5 5.5 0 1 0 7 7z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>']
  ];

  function sync() {
    var cur = read();
    var buttons = document.querySelectorAll('[data-site-theme] button[data-theme]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-checked', buttons[i].getAttribute('data-theme') === cur ? 'true' : 'false');
    }
  }

  function mount() {
    var hosts = document.querySelectorAll('[data-site-theme]');
    for (var i = 0; i < hosts.length; i++) {
      var el = hosts[i];
      if (el.getAttribute('data-site-theme') === 'ready') continue;
      el.classList.add('site-theme');
      el.setAttribute('role', 'radiogroup');
      el.setAttribute('aria-label', 'Theme');
      var html = '';
      for (var j = 0; j < OPTIONS.length; j++) {
        var o = OPTIONS[j];
        html += '<button type="button" role="radio" data-theme="' + o[0] + '" aria-label="' + o[1] + '" title="' + o[1] + '">' + o[2] + '</button>';
      }
      el.innerHTML = html;
      el.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('button[data-theme]') : null;
        if (b) store(b.getAttribute('data-theme'));
      });
      el.setAttribute('data-site-theme', 'ready');
    }
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  window.addEventListener('storage', function (e) { if (e.key === KEY) { apply(read()); sync(); } });
})();
