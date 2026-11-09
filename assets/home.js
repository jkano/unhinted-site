// Home page: the phone drifts a little with the scroll, and the tutorial plays as a timeline.
// The tutorial is one clock (T, in ms). When its section reaches the top of the window, scrolling stops and the clock runs by
// itself. Scrolling down fast-forwards it, scrolling up rewinds it. At the end the page is free again and "Repeat tutorial" shows.
// On a phone the page is not stopped: the tutorial plays by itself while it is on screen (and waits when it is not).
// Without JavaScript, or with a reduced-motion setting, the page shows three static blocks instead.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  // Only touch a text when it changes: replacing the same text 60 times a second removes the text node under the mouse, and the click is lost.
  const set = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => t * t * (3 - 2 * t);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = matchMedia('(min-width: 900px)');

  // ---- the phone ----
  const tilt = $('tilt');
  function drift() {
    if (reduced || !tilt) return;
    const sy = window.scrollY || 0;
    tilt.style.transform = 'translateY(' + (-sy * 0.1).toFixed(1) + 'px) rotate(' + (7 + sy * 0.006).toFixed(2) + 'deg)';
  }
  window.addEventListener('scroll', drift, { passive: true });
  drift();

  // ---- the tutorial ----
  const section = $('tutorial');
  if (!section || reduced) return;

  const END = 21000;
  const S = [0, 3600, 7900, 11400, 16300];      // where each of the 5 steps starts (ms)
  const E = [3600, 7900, 11400, 16300, 21000];   // and where it ends
  const STEPS = [
    ['Everyone sees the word. Except one.', 'Each round one player is the Seeker. Everyone else sees a secret word.'],
    ['Write one word.', "Type a single word that points to it. Don't say it out loud, and nothing too close to it."],
    ["Same word? It's gone.", 'Matching words cancel each other out. Only the unique ones survive.'],
    ['The Seeker guesses.', "They see only what's left, and try to find the word."],
    ['Everybody scores.', 'Find the word and the whole team wins together. Canceled or misleading words get no points.']
  ];
  const COLORS = ['#FF5D4B', '#FFAC00', '#2A7AFF', '#1EBDAE', '#904EE2'];
  const cards = ['c1', 'c2', 'c3', 'c4', 'c5'].map($);
  const segs = Array.from(section.querySelectorAll('.segs i'));
  const barEls = Array.from($('resbars').children);
  const el = {
    stepno: $('stepno'), hint: $('hint'), repeat: $('repeat'), pause: $('pause'), pauselabel: $('pauselabel'), pauseicon: $('pauseicon'), playicon: $('playicon'),
    prev: $('prevtext'), cur: $('curtext'),
    c1word: $('c1word'), c2typed: $('c2typed'), c2btn: $('c2btn'), c3a: $('c3a'), c3c: $('c3c'), c3stamp: $('c3stamp'),
    c4typed: $('c4typed'), c4btn: $('c4btn'), c4found: $('c4found'), foot: $('foot'), rows: [$('r1'), $('r2'), $('r3')]
  };
  const BASE = [0.38, 0.78, 1, 0.62, 0.9, 0.5, 0.26];

  let T = 0, locked = false, released = false, paused = false, done = false, boost = 0, dir = 1, last = 0, raf = 0;

  const active = () => getComputedStyle(section).display !== 'none';
  const locks = () => wide.matches && active();   // wide screens stop the page; phones just play while visible
  let viewing = false, shownStep = -1;
  const wordsEl = el.cur.parentElement;
  function fitText() {                              // on a narrow screen the text block is as tall as the step's text, so there is no gap
    wordsEl.style.height = wide.matches ? '' : el.cur.scrollHeight + 'px';
  }
  const cardsEl = $('cards');
  function fit() {                                   // on a narrow screen the cards are drawn smaller to fit the width
    const s = wide.matches ? 1 : Math.min(1, Math.max(0.3, cardsEl.clientWidth / 490));
    cardsEl.style.setProperty('--s', s.toFixed(3));
  }

  function render() {
    const u = (a, b) => cl((T - a) / (b - a));
    const enter = [1, ease(u(3600, 4300)), ease(u(7900, 8600)), ease(u(11400, 12100)), ease(u(16300, 17000))];
    cards.forEach((card, i) => {
      let b = 0;
      for (let j = i + 1; j < 5; j++) b += enter[j];          // the last card has nothing after it: it stays solid
      const e = enter[i];
      const ty = (1 - e) * 150 - b * (wide.matches ? 34 : 14), sc = 1 - b * 0.07, rot = (1 - e) * 5 - b * 1.5;
      card.style.transform = 'translateY(' + ty.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ') rotate(' + rot.toFixed(2) + 'deg)';
      card.style.opacity = (e * (1 - Math.min(b, 2.6) * 0.3)).toFixed(3);
      card.style.zIndex = i + 1;
      card.style.boxShadow = '10px 12px 0 ' + card.dataset.shadow;
    });

    // card 1
    const word = u(300, 800);
    el.c1word.style.opacity = word.toFixed(2);
    el.c1word.style.transform = 'scale(' + (0.8 + 0.2 * word).toFixed(3) + ')';
    // card 2
    set(el.c2typed, 'sand'.slice(0, Math.floor(u(4600, 5600) * 4 + 0.001)));
    const press2 = u(7200, 7450);
    el.c2btn.style.opacity = u(5800, 6050).toFixed(2);
    el.c2btn.style.transform = 'translateY(' + (press2 * 4).toFixed(1) + 'px)';
    el.c2btn.style.boxShadow = '0 ' + (5 - press2 * 5).toFixed(1) + 'px 0 #0E0C1F';
    el.c2btn.style.background = press2 > 0.5 ? '#FFD23F' : '#FFAC00';
    set(el.c2btn, press2 > 0.5 ? 'Sent' : 'Send');
    // card 3
    const struck = T >= 9400;
    [[el.c3a, '#FF5D4B', ''], [el.c3c, '#2A7AFF', '#FFEFD7']].forEach(([chip, bg, ink]) => {
      chip.style.background = struck ? '#F1E6D6' : bg;
      chip.style.color = struck ? '' : ink;
      chip.style.textDecoration = struck ? 'line-through' : 'none';
      chip.style.opacity = struck ? '0.4' : '1';
      chip.style.transform = struck ? 'scale(0.92)' : 'none';
    });
    const stamp = u(9600, 10000);
    el.c3stamp.style.opacity = stamp.toFixed(2);
    el.c3stamp.style.transform = 'rotate(-6deg) scale(' + (1.2 - 0.2 * stamp).toFixed(3) + ')';
    // card 4
    set(el.c4typed, 'beach'.slice(0, Math.floor(u(12400, 13650) * 5 + 0.001)));
    const press4 = u(15200, 15450);
    el.c4btn.style.opacity = u(13850, 14100).toFixed(2);
    el.c4btn.style.transform = 'translateY(' + (press4 * 4).toFixed(1) + 'px)';
    el.c4btn.style.boxShadow = '0 ' + (5 - press4 * 5).toFixed(1) + 'px 0 #0E0C1F';
    set(el.c4btn, press4 > 0.5 ? 'Guessed' : 'Guess');
    el.c4found.style.opacity = u(15700, 16000).toFixed(2);
    // card 5
    const k5 = u(17200, 18400);
    barEls.forEach((bar, i) => { bar.style.height = Math.max(8, Math.round(BASE[i] * 120 * cl(k5 * 2.2 - i * 0.08))) + 'px'; });
    [[0, 18000, 18300], [1, 18500, 18800], [2, 19000, 19300]].forEach(([i, a, b]) => { el.rows[i].style.opacity = u(a, b).toFixed(2); });
    el.foot.style.opacity = u(19600, 19900).toFixed(2);

    // text on the left: the old step fades out as the new one fades in
    let a = 0;
    for (let i = 0; i < 5; i++) if (T >= S[i]) a = i;
    const fade = a > 0 ? u(S[a], S[a] + 500) : 1;
    const prev = a > 0 ? a - 1 : 0;
    set(el.stepno, 'How to play · step ' + (a + 1) + ' of 5');
    set(el.cur.querySelector('h2'), STEPS[a][0]);
    set(el.cur.querySelector('p'), STEPS[a][1]);
    set(el.prev.querySelector('h2'), STEPS[prev][0]);
    set(el.prev.querySelector('p'), STEPS[prev][1]);
    if (a !== shownStep) { shownStep = a; fitText(); }
    el.cur.style.opacity = fade.toFixed(2);
    el.prev.style.opacity = (a > 0 ? 1 - fade : 0).toFixed(2);
    segs.forEach((seg, i) => { seg.style.width = (cl((T - S[i]) / (E[i] - S[i])) * 100).toFixed(1) + '%'; });

    const endShown = T >= 20300;
    el.hint.style.display = endShown ? 'none' : '';
    el.pause.style.display = endShown ? 'none' : '';
    el.pause.setAttribute('aria-pressed', paused ? 'true' : 'false');
    set(el.pauselabel, paused ? 'Resume' : 'Pause');
    el.pauseicon.style.display = paused ? 'none' : '';
    el.playicon.style.display = paused ? '' : 'none';
    set(el.hint, paused ? 'Paused: take your time'
      : locked ? 'Scroll to speed up or rewind'
      : wide.matches ? (T <= 0 ? 'Scroll down to play' : 'Paused')
      : (viewing && !done ? 'Playing' : (T <= 0 ? 'Plays when you get here' : 'Paused')));
    el.repeat.classList.toggle('on', endShown);
  }

  function push(amount) {
    const d = amount >= 0 ? 1 : -1;
    if (d !== dir) { dir = d; boost = 0; }
    boost = Math.min(12, boost + Math.abs(amount));
  }

  const running = () => !done && !paused && (locked || (!wide.matches && viewing));

  function frame(now) {
    raf = 0;
    if (!running()) { last = 0; render(); return; }
    const dt = last ? Math.min(100, now - last) : 16;
    last = now;
    // Forward: normal speed plus the boost. Rewinding: only while you keep scrolling up, at the boost's speed.
    const rate = dir < 0 ? -boost : 1 + boost;
    T = cl(T + dt * rate, 0, END);
    boost *= 0.92;
    if (dir < 0 && boost < 0.15) { dir = 1; boost = 0; }
    render();
    if (T <= 0 && dir < 0 && locked) {              // rewound to the very start: the page is free to scroll up again
      released = true; unlock(); return;
    }
    if (T >= END) { done = true; if (locked) unlock(); else render(); return; }
    raf = requestAnimationFrame(frame);
  }

  function kick() { if (!raf && running()) raf = requestAnimationFrame(frame); }

  function lock(keepTime) {
    locked = true; done = false; boost = 0; dir = 1; last = 0;
    if (!keepTime) T = 0;
    const target = section.getBoundingClientRect().top + window.scrollY;
    document.documentElement.style.overflow = 'hidden';
    window.scrollTo({ top: target, behavior: 'smooth' });
    kick();
  }

  function unlock() {
    locked = false;
    document.documentElement.style.overflow = '';
    render();
  }

  function check() {
    if (locked || done || paused || !locks()) return;
    const top = section.getBoundingClientRect().top;
    // After rewinding to the start the page stays free until you have scrolled up past the section; then it can lock again.
    if (released) { if (top > 300) released = false; return; }
    if (top <= 140 && top >= -300) lock(T > 0);   // keep the time if it was paused part way
  }

  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('wheel', (e) => { if (locked) push(e.deltaY / 45); }, { passive: true });
  let ty;
  window.addEventListener('touchmove', (e) => {
    if (!locked || !e.touches[0]) return;
    const y = e.touches[0].clientY;
    if (ty !== undefined) push((ty - y) / 25);   // finger up = scroll down = forward
    ty = y;
  }, { passive: true });
  window.addEventListener('touchend', () => { ty = undefined; }, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (!locked || (e.target.closest && e.target.closest('button'))) return;
    if ([' ', 'PageDown', 'ArrowDown', 'End'].includes(e.key)) { push(3); e.preventDefault(); }
    else if (['PageUp', 'ArrowUp', 'Home'].includes(e.key)) { push(-3); e.preventDefault(); }
  });
  window.addEventListener('resize', () => { fit(); fitText(); if (locked && !locks()) unlock(); kick(); });
  // Pause: the clock stops and, on a wide screen, the page is free again so there is time to read; Resume locks it again and goes on.
  el.pause.addEventListener('click', () => {
    if (!paused) { paused = true; if (locked) unlock(); render(); }
    else { paused = false; last = 0; if (locks() && section.getBoundingClientRect().top <= 140 && section.getBoundingClientRect().top >= -300) lock(true); else kick(); render(); }
  });
  el.repeat.addEventListener('click', () => { T = 0; done = false; released = false; paused = false; last = 0; render(); if (locks()) lock(); else kick(); });

  // On a phone: play while at least half of the tutorial is on screen, wait when it is not.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { viewing = entries[0].isIntersecting; kick(); render(); }, { threshold: 0.45 }).observe(section);
  }

  fit();
  render();
  check();
})();
