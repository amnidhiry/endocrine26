/* ==========================================================================
   HSHD1 Endocrine Course Companion — shared shell behavior
   - single source of truth for site navigation
   - accessible mobile drawer (Escape, focus trap, backdrop, focus restore)
   - local section navigation + scroll-spy
   - generic disclosure wiring (aria-expanded / aria-controls)
   - site-wide and current-page search
   All paths are relative so the site works from a repository subdirectory.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- nav ---- */
  var NAV = [
    { id: 'home',      href: 'index.html',        label: 'Home',                   group: 'Start' },
    { id: 'pituitary', href: 'pituitary.html',    label: 'Hypothalamus & Pituitary', group: 'Lectures' },
    { id: 'thyroid',   href: 'thyroid.html',      label: 'Thyroid Disorders',      group: 'Lectures' },
    { id: 'type1',     href: 'type1.html',        label: 'T1DM',        group: 'Lectures' },
    { id: 'type2',     href: 'type2.html',        label: 'T2DM',        group: 'Lectures' },
    { id: 'insulin',   href: 'insulin.html',      label: 'Insulin Therapy Lab',    group: 'Lectures' },
    { id: 'practice',  href: 'practice.html',     label: 'Cumulative Practice',    group: 'Practice' },
    { id: 'rapid',     href: 'rapid-review.html', label: 'Rapid Review',           group: 'Practice' }
  ];

  var SHORT = { pituitary: 'Pituitary', thyroid: 'Thyroid', type1: 'T1DM', type2: 'T2DM', insulin: 'Insulin Lab', practice: 'Practice', rapid: 'Rapid Review' };

  var current = document.body.getAttribute('data-page') || 'home';

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  var CHEV = '<svg class="card-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function buildHeader() {
    var host = document.getElementById('site-header');
    if (!host) return;

    var brand = el('a', { class: 'brand', href: 'index.html' });
    brand.appendChild(el('span', { class: 'brand-mark', text: 'HSHD1 Endocrine' }));
    brand.appendChild(el('span', { class: 'brand-sub', text: 'Course Companion' }));

    var HOME_ICON = '<svg class="nav-home-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
      '<path d="M2 7.5L8 2l6 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M3.5 6.8V13.5h9V6.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';

    var ul = el('ul');
    NAV.forEach(function (item) {
      var a = item.id === 'home'
        ? el('a', { href: item.href, 'aria-label': item.label, html: HOME_ICON })
        : el('a', { href: item.href, text: SHORT[item.id] || item.label });
      if (item.id === current) { a.setAttribute('aria-current', 'page'); }
      ul.appendChild(el('li', null, [a]));
    });
    var nav = el('nav', { class: 'primary-nav', 'aria-label': 'Primary' }, [ul]);

    var searchBtn = el('button', {
      type: 'button', class: 'icon-btn search-btn', id: 'search-open',
      'aria-haspopup': 'dialog',
      html: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.4 10.4L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
            '<span class="search-label">Search</span><span class="search-hint" aria-hidden="true">/</span>'
    });
    searchBtn.setAttribute('aria-label', 'Search this site');

    var menuBtn = el('button', {
      type: 'button', class: 'icon-btn menu-btn', id: 'drawer-open',
      'aria-expanded': 'false', 'aria-controls': 'site-drawer',
      'aria-label': 'Open navigation menu',
      html: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
    });

    var actions = el('div', { class: 'header-actions' }, [searchBtn, menuBtn]);
    host.appendChild(el('div', { class: 'header-inner' }, [brand, nav, actions]));

    /* drawer ---------------------------------------------------------- */
    var backdrop = el('div', { class: 'drawer-backdrop', id: 'drawer-backdrop', hidden: 'hidden' });
    var closeBtn = el('button', {
      type: 'button', class: 'icon-btn', id: 'drawer-close', 'aria-label': 'Close navigation menu',
      html: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
    });
    var head = el('div', { class: 'drawer-head' }, [el('span', { class: 'drawer-title', text: 'Navigate' }), closeBtn]);

    var dnav = el('nav', { 'aria-label': 'Site sections' });
    var lastGroup = null, dul = null;
    NAV.forEach(function (item) {
      if (item.group !== lastGroup) {
        dnav.appendChild(el('div', { class: 'drawer-group-label', text: item.group }));
        dul = el('ul'); dnav.appendChild(dul); lastGroup = item.group;
      }
      var a = el('a', { href: item.href, text: item.label });
      if (item.id === current) a.setAttribute('aria-current', 'page');
      dul.appendChild(el('li', null, [a]));
    });

    var drawer = el('aside', { class: 'drawer', id: 'site-drawer', 'aria-label': 'Navigation menu', hidden: 'hidden' }, [head, dnav]);
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    wireDrawer(menuBtn, drawer, backdrop, closeBtn);
  }

  function wireDrawer(openBtn, drawer, backdrop, closeBtn) {
    var lastFocus = null;

    function focusables() {
      return Array.prototype.filter.call(
        drawer.querySelectorAll('a[href], button:not([disabled])'),
        function (n) { return n.offsetParent !== null; }
      );
    }
    function open() {
      lastFocus = document.activeElement;
      drawer.hidden = false; backdrop.hidden = false;
      // allow the browser a frame so the transition runs
      requestAnimationFrame(function () { drawer.classList.add('open'); backdrop.classList.add('open'); });
      openBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var f = focusables(); if (f.length) f[0].focus();
      document.addEventListener('keydown', onKey, true);
    }
    function close() {
      drawer.classList.remove('open'); backdrop.classList.remove('open');
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey, true);
      window.setTimeout(function () {
        if (!drawer.classList.contains('open')) { drawer.hidden = true; backdrop.hidden = true; }
      }, 220);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!drawer.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
  }

  /* ------------------------------------------------- local section nav ---- */
  function buildToc() {
    var host = document.getElementById('page-toc');
    var sections = Array.prototype.slice.call(document.querySelectorAll('main .section[id][data-toc]'));
    if (!sections.length) return;

    if (host) {
      var ol = el('ol');
      var lastPhase = null;
      sections.forEach(function (s) {
        var phase = s.getAttribute('data-phase');
        if (phase && phase !== lastPhase) {
          ol.appendChild(el('li', null, [el('div', { class: 'toc-phase', text: phase })]));
          lastPhase = phase;
        }
        var a = el('a', { href: '#' + s.id, text: s.getAttribute('data-toc') });
        ol.appendChild(el('li', null, [a]));
      });
      host.appendChild(el('div', { class: 'toc-label', text: 'On this page' }));
      host.appendChild(ol);
      spy(sections, host);
    }

    var mob = document.getElementById('page-toc-mobile');
    if (mob) {
      var sel = el('select', { id: 'toc-select' });
      sel.appendChild(el('option', { value: '', text: 'Jump to a section…' }));
      sections.forEach(function (s) {
        sel.appendChild(el('option', { value: s.id, text: (s.getAttribute('data-phase') ? s.getAttribute('data-phase') + ' — ' : '') + s.getAttribute('data-toc') }));
      });
      var lab = el('label', { for: 'toc-select', text: 'On this page' });
      mob.appendChild(lab); mob.appendChild(sel);
      sel.addEventListener('change', function () {
        if (!sel.value) return;
        var t = document.getElementById(sel.value);
        if (t) { window.location.hash = sel.value; t.focus({ preventScroll: true }); }
        sel.value = '';
      });
    }
  }

  function spy(sections, host) {
    var links = {};
    Array.prototype.forEach.call(host.querySelectorAll('a[href^="#"]'), function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });
    var visible = {};
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      var chosen = null;
      for (var i = 0; i < sections.length; i++) {
        if (visible[sections[i].id]) { chosen = sections[i].id; break; }
      }
      Object.keys(links).forEach(function (id) {
        if (id === chosen) links[id].setAttribute('aria-current', 'true');
        else links[id].removeAttribute('aria-current');
      });
    }, { rootMargin: '-72px 0px -60% 0px', threshold: 0 });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* -------------------------------------------------------- disclosures --- */
  var uid = 0;
  function wireDisclosures(root) {
    var scope = root || document;
    Array.prototype.forEach.call(scope.querySelectorAll('[data-disclosure]'), function (wrap) {
      var btn = wrap.querySelector('[data-disclosure-toggle]');
      var body = wrap.querySelector('[data-disclosure-body]');
      if (!btn || !body || btn.dataset.wired) return;
      btn.dataset.wired = '1';
      if (!body.id) body.id = 'disc-' + (++uid);
      btn.setAttribute('aria-controls', body.id);
      var openInit = wrap.hasAttribute('data-open');
      btn.setAttribute('aria-expanded', openInit ? 'true' : 'false');
      body.hidden = !openInit;
      btn.addEventListener('click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        body.hidden = isOpen;
      });
    });
  }
  window.EndoWireDisclosures = wireDisclosures;

  /* ----- open a collapsed card when the URL points inside it -------------- */
  function revealTarget() {
    var id = decodeURIComponent(window.location.hash.replace('#', ''));
    if (!id) return;
    var t = document.getElementById(id);
    if (!t) return;
    var node = t;
    while (node && node !== document.body) {
      if (node.hasAttribute && node.hasAttribute('data-disclosure-body') && node.hidden) {
        var btn = node.parentElement.querySelector('[data-disclosure-toggle]');
        if (btn) btn.click();
      }
      node = node.parentElement;
    }
    window.setTimeout(function () { t.scrollIntoView({ block: 'start' }); }, 30);
  }

  /* ------------------------------------------------------------ search ---- */
  var searchIndex = null, indexPromise = null;

  function loadIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = fetch('assets/data/search-index.json')
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (d) { searchIndex = d.entries || []; return searchIndex; })
      .catch(function () { searchIndex = null; return null; });
    return indexPromise;
  }

  function buildSearch() {
    var openBtn = document.getElementById('search-open');
    if (!openBtn) return;

    var dlg = el('dialog', { class: 'search-dialog', 'aria-label': 'Search the course companion' });
    dlg.innerHTML =
      '<div class="search-panel">' +
        '<div class="search-top">' +
          '<label class="visually-hidden" for="search-input">Search terms</label>' +
          '<input id="search-input" type="search" autocomplete="off" placeholder="Search headings and content…">' +
          '<button type="button" class="icon-btn" id="search-close" aria-label="Close search">' +
            '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="search-scope" role="group" aria-label="Search scope">' +
          '<button type="button" class="toggle-chip" data-scope="site" aria-pressed="true">Whole site</button>' +
          '<button type="button" class="toggle-chip" data-scope="page" aria-pressed="false">This page only</button>' +
        '</div>' +
        '<div class="search-status" id="search-status" role="status">Type at least two characters.</div>' +
        '<div class="search-results" id="search-results"></div>' +
      '</div>';
    document.body.appendChild(dlg);

    var input = dlg.querySelector('#search-input');
    var status = dlg.querySelector('#search-status');
    var results = dlg.querySelector('#search-results');
    var scope = 'site';

    Array.prototype.forEach.call(dlg.querySelectorAll('[data-scope]'), function (b) {
      b.addEventListener('click', function () {
        scope = b.getAttribute('data-scope');
        Array.prototype.forEach.call(dlg.querySelectorAll('[data-scope]'), function (o) {
          o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
        });
        run();
      });
    });

    function esc(s) { return s.replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

    // Matches are wrapped in control-character sentinels, the fragment is then
    // HTML-escaped, and only afterwards are the sentinels swapped for <mark>.
    // This keeps user input from ever injecting markup.
    var OPEN = '\u0001', CLOSE = '\u0002';
    function snippet(text, terms) {
      var lower = text.toLowerCase();
      var at = -1;
      for (var i = 0; i < terms.length; i++) { at = lower.indexOf(terms[i]); if (at > -1) break; }
      if (at < 0) at = 0;
      var start = Math.max(0, at - 60);
      var frag = (start > 0 ? '…' : '') + text.slice(start, start + 190) + (text.length > start + 190 ? '…' : '');
      terms.forEach(function (t) {
        if (!t) return;
        frag = frag.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), OPEN + '$1' + CLOSE);
      });
      return esc(frag).split(OPEN).join('<mark>').split(CLOSE).join('</mark>');
    }

    function run() {
      var q = input.value.trim().toLowerCase();
      results.innerHTML = '';
      if (q.length < 2) { status.textContent = 'Type at least two characters.'; return; }
      if (!searchIndex) { status.textContent = 'Search index unavailable. If you opened these files directly from disk, start a local web server (see the README).'; return; }

      var terms = q.split(/\s+/).filter(Boolean);
      var pool = searchIndex.filter(function (e) { return scope === 'site' || e.page === current; });
      var hits = [];
      pool.forEach(function (e) {
        var hayT = (e.title || '').toLowerCase();
        var hayB = (e.text || '').toLowerCase();
        var score = 0, all = true;
        terms.forEach(function (t) {
          var inT = hayT.indexOf(t) > -1, inB = hayB.indexOf(t) > -1;
          if (!inT && !inB) all = false;
          if (inT) score += 12;
          if (inB) score += 2;
        });
        if (all) hits.push({ e: e, score: score });
      });
      hits.sort(function (a, b) { return b.score - a.score; });
      hits = hits.slice(0, 40);

      if (!hits.length) {
        status.textContent = 'No matches' + (scope === 'page' ? ' on this page.' : ' on this site.');
        return;
      }
      status.textContent = hits.length + (hits.length === 1 ? ' match' : ' matches') + (scope === 'page' ? ' on this page.' : '.');
      var ul = document.createElement('ul');
      hits.forEach(function (h) {
        var li = document.createElement('li');
        li.innerHTML = '<a href="' + esc(h.e.href) + '">' +
          '<span class="search-hit-page">' + esc(h.e.pageLabel) + '</span>' +
          '<span class="search-hit-title">' + esc(h.e.title) + '</span>' +
          '<span class="search-hit-snippet">' + snippet(h.e.text || '', terms) + '</span></a>';
        ul.appendChild(li);
      });
      results.appendChild(ul);
    }

    var debounce;
    input.addEventListener('input', function () {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(run, 120);
    });

    dlg.querySelector('#search-close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    results.addEventListener('click', function (e) { if (e.target.closest('a')) dlg.close(); });

    function openSearch() {
      loadIndex().then(run);
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      input.focus(); input.select();
    }
    openBtn.addEventListener('click', openSearch);
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (e.key === '/' && tag !== 'input' && tag !== 'textarea' && tag !== 'select' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault(); openSearch();
      }
    });
  }

  /* -------------------------------------------------------------- init --- */
  function init() {
    buildHeader();
    buildToc();
    wireDisclosures(document);
    buildSearch();
    revealTarget();
    window.addEventListener('hashchange', revealTarget);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
