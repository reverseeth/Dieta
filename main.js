/* Dieta — Gustavo Cota
   Vanilla port of the original app logic: daily meal check-off with
   midnight reset, animated totals, next-meal clock, shopping list,
   light/dark theme. State lives in localStorage. */

(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touchUI = window.matchMedia('(hover: none)').matches;

  var K = { day: 'dieta-gc:day', shop: 'dieta-gc:shop', theme: 'dieta-gc:theme' };
  var RESET_HOUR = 0;

  var DAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  /* meals are read from the DOM (single source of truth: index.html) */
  var MEALS = Array.prototype.map.call(document.querySelectorAll('.meal'), function (el) {
    return {
      id: el.dataset.meal,
      el: el,
      btn: el.querySelector('[data-toggle-meal]'),
      name: el.dataset.name,
      time: el.dataset.time,
      kcal: +el.dataset.kcal,
      p: +el.dataset.p,
      c: +el.dataset.c,
      g: +el.dataset.g
    };
  });
  var PLAN = MEALS.reduce(function (a, m) {
    return { kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, g: a.g + m.g };
  }, { kcal: 0, p: 0, c: 0, g: 0 });

  var pad = function (n) { return String(n).padStart(2, '0'); };
  var toMin = function (t) { var x = t.split(':'); return (+x[0]) * 60 + (+x[1]); };
  var hm = function (t) { return t.replace(':', 'h'); };
  var fmt = function (n) { return Math.round(n).toLocaleString('pt-BR'); };
  var pct = function (a, b) { return Math.round(100 * a / b) + '%'; };

  var load = function (k, fb) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; }
    catch (e) { return fb; }
  };
  var save = function (k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  };

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    theme: load(K.theme, 'light') === 'dark' ? 'dark' : 'light',
    dayKey: '',
    done: {},
    creatina: false,
    shop: load(K.shop, {}),
    anim: { kcal: 0, p: 0, c: 0, g: 0 },
    heroOut: false
  };

  var dayKeyOf = function (ts) {
    var d = new Date(ts);
    if (d.getHours() < RESET_HOUR) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  };
  var totals = function (done) {
    return MEALS.reduce(function (a, m) {
      return done[m.id]
        ? { kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, g: a.g + m.g }
        : a;
    }, { kcal: 0, p: 0, c: 0, g: 0 });
  };
  var saveDay = function () {
    save(K.day, { key: state.dayKey, done: state.done, creatina: state.creatina });
  };

  /* ── theme ─────────────────────────────────────────────── */
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var applyTheme = function (t) {
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
    if (themeMeta) themeMeta.setAttribute('content', t === 'dark' ? '#000000' : '#f2f2f2');
  };
  applyTheme(state.theme);

  $('theme-toggle').addEventListener('click', function () {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    save(K.theme, state.theme);
    applyTheme(state.theme);
  });

  /* ── kcal tween ────────────────────────────────────────── */
  var raf = 0;
  var tween = function (target) {
    cancelAnimationFrame(raf);
    if (reduce) { state.anim = target; renderTotals(); return; }
    var from = { kcal: state.anim.kcal, p: state.anim.p, c: state.anim.c, g: state.anim.g };
    var start = performance.now(), dur = 700;
    var step = function (t) {
      var k = Math.min(1, (t - start) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      for (var key in target) state.anim[key] = from[key] + (target[key] - from[key]) * e;
      renderTotals();
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  /* ── toast ─────────────────────────────────────────────── */
  var toastEl = $('toast'), toastTextEl = $('toast-text');
  var t1, t2;
  var showToast = function (text) {
    clearTimeout(t1); clearTimeout(t2);
    toastTextEl.textContent = text;
    toastEl.classList.remove('is-on');
    t1 = setTimeout(function () { toastEl.classList.add('is-on'); }, 20);
    t2 = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  };

  /* ── renders ───────────────────────────────────────────── */
  var renderTotals = function () {
    var a = state.anim;
    $('hero-kcal').textContent = fmt(a.kcal);
    $('nav-kcal').textContent = fmt(a.kcal) + ' kcal';
    $('kcal-pct').textContent = pct(a.kcal, PLAN.kcal);
    $('kcal-bar').style.width = pct(a.kcal, PLAN.kcal);
    $('p-done').textContent = Math.round(a.p);
    $('c-done').textContent = Math.round(a.c);
    $('g-done').textContent = Math.round(a.g);
    $('p-bar').style.width = pct(a.p, PLAN.p);
    $('c-bar').style.width = pct(a.c, PLAN.c);
    $('g-bar').style.width = pct(a.g, PLAN.g);
  };

  /* the wash palette follows the light outside */
  var washFor = function (h) {
    if (h >= 5 && h < 10) return 'dawn';
    if (h >= 10 && h < 15) return 'day';
    if (h >= 15 && h < 18) return 'afternoon';
    if (h >= 18 && h < 21) return 'dusk';
    return 'night';
  };

  var lastNextName = null;
  var renderDay = function () {
    var d = new Date();
    var minsNow = d.getHours() * 60 + d.getMinutes();
    document.documentElement.setAttribute('data-wash', washFor(d.getHours()));
    var done = state.done;
    var doneCount = MEALS.filter(function (m) { return done[m.id]; }).length;

    $('today-text').textContent = DAYS[d.getDay()] + ' · ' + d.getDate() + ' de ' + MONTHS[d.getMonth()];
    $('done-count').textContent = String(doneCount);

    var next = null;
    for (var i = 0; i < MEALS.length; i++) {
      var m = MEALS[i];
      if (!done[m.id] && toMin(m.time) + 90 > minsNow) { next = m; break; }
    }

    var nextLabel, nextName;
    if (next) {
      var diff = toMin(next.time) - minsNow;
      nextLabel = diff <= 0 ? 'Próxima refeição · agora'
        : diff < 60 ? 'Próxima refeição · em ' + diff + ' min'
        : 'Próxima refeição · em ' + Math.floor(diff / 60) + 'h' + pad(diff % 60);
      nextName = next.name + ' · ' + hm(next.time);
    } else if (doneCount === MEALS.length) {
      nextLabel = 'Dia completo';
      nextName = 'Todas as 7 refeições feitas';
    } else {
      nextLabel = 'Próxima refeição · amanhã';
      nextName = MEALS[0].name + ' · ' + hm(MEALS[0].time);
    }

    $('next-label').textContent = nextLabel;
    document.querySelector('#today-label .dot').hidden = !next;

    if (nextName !== lastNextName) {
      var inEl = $('next-name-in');
      inEl.textContent = nextName;
      /* replay the line-mask reveal on change */
      if (lastNextName !== null && !reduce) {
        var h1 = $('next-name');
        h1.classList.remove('is-in');
        void inEl.offsetHeight;
        h1.classList.add('is-in');
      }
      lastNextName = nextName;
    }

    MEALS.forEach(function (m) {
      var isDone = !!done[m.id];
      var isNext = !!next && next.id === m.id;
      m.el.classList.toggle('is-done', isDone);
      m.el.classList.toggle('is-next', isNext);
      m.btn.classList.toggle('is-on', isDone);
      m.btn.querySelector('span').textContent = isDone ? 'Feita' : 'Marcar';
    });

    var cBtn = $('creatina');
    cBtn.classList.toggle('is-on', state.creatina);
    cBtn.querySelector('span').textContent = state.creatina ? 'Feito' : 'Marcar';
  };

  var renderShop = function () {
    var allBtns = document.querySelectorAll('.check');
    var doneN = 0;
    allBtns.forEach(function (btn) {
      var on = !!state.shop[btn.dataset.shop];
      btn.classList.toggle('is-on', on);
      if (on) doneN++;
    });
    $('shop-count').textContent = doneN + ' de ' + allBtns.length;
  };

  /* ── day boot + midnight rollover ──────────────────────── */
  var boot = function () {
    var key = dayKeyOf(Date.now());
    var day = load(K.day, null);
    var same = day && day.key === key;
    state.dayKey = key;
    state.done = same ? (day.done || {}) : {};
    state.creatina = same ? !!day.creatina : false;
  };
  var tick = function () {
    var key = dayKeyOf(Date.now());
    if (key !== state.dayKey) {
      state.dayKey = key;
      state.done = {};
      state.creatina = false;
      saveDay();
      tween(totals({}));
    }
    renderDay();
  };

  boot();
  $('plan-kcal').textContent = fmt(PLAN.kcal);
  $('p-plan').textContent = PLAN.p;
  $('c-plan').textContent = PLAN.c;
  $('g-plan').textContent = PLAN.g;
  $('reset-note').textContent = RESET_HOUR === 0
    ? 'Refeições zeram à meia-noite'
    : 'Refeições zeram às ' + pad(RESET_HOUR) + 'h00';
  renderDay();
  renderShop();
  renderTotals();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { $('next-name').classList.add('is-in'); });
  });
  setTimeout(function () { tween(totals(state.done)); }, 250);

  setInterval(tick, 30000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') tick();
  });

  /* ── interactions ──────────────────────────────────────── */
  MEALS.forEach(function (m) {
    m.btn.addEventListener('click', function () {
      var was = !!state.done[m.id];
      state.done[m.id] = !was;
      saveDay();
      renderDay();
      tween(totals(state.done));
      showToast(m.name + ' · ' + (was ? '−' : '+') + fmt(m.kcal) + ' kcal');
    });
  });

  $('creatina').addEventListener('click', function () {
    state.creatina = !state.creatina;
    saveDay();
    renderDay();
    showToast(state.creatina ? 'Creatina · feito' : 'Creatina · desmarcada');
  });

  document.querySelectorAll('.check').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.dataset.shop;
      state.shop[name] = !state.shop[name];
      save(K.shop, state.shop);
      renderShop();
    });
  });

  $('shop-clear').addEventListener('click', function () {
    state.shop = {};
    save(K.shop, {});
    renderShop();
  });

  /* ── header kcal appears when the hero number leaves ───── */
  var heroKcal = $('hero-kcal');
  if ('IntersectionObserver' in window && heroKcal) {
    var hio = new IntersectionObserver(function (entries) {
      $('nav-kcal').classList.toggle('is-on', !entries[0].isIntersecting);
    }, { rootMargin: '-64px 0px 0px 0px', threshold: 0 });
    hio.observe(heroKcal);
  }

  /* ── scroll reveal (RVSE system) ───────────────────────── */
  var revealables = document.querySelectorAll('.reveal');

  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    revealables.forEach(function (el) {
      var step = parseFloat(el.dataset.d || '0');
      el.style.setProperty('--delay', (step * 0.09) + 's');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    revealables.forEach(function (el) { io.observe(el); });

    var sweep = function () {
      revealables.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    };
    window.addEventListener('load', function () {
      sweep();
      window.setTimeout(sweep, 260);
    });
  }

  /* ── touch: scroll position takes over from hover ──────── */
  if (touchUI && !reduce && 'IntersectionObserver' in window) {
    var fio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-focus', entry.isIntersecting);
      });
    }, { rootMargin: '-38% 0px -38% 0px', threshold: 0 });
    document.querySelectorAll('.meal').forEach(function (el) { fio.observe(el); });
  }
})();
