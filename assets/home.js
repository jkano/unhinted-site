// Home page: the phone drifts a little with the scroll, and the tutorial plays as a timeline.
//
// The tutorial is one clock (T, in ms), and it plays while at least half of it is on screen (the page scrolls as normal).
// Each step goes: its title and card come in, its message is "written" letter by letter, and then a "Show me" button waits.
// Pressing it plays that step's animation on the card; when it ends the next step starts by itself. A "<" button goes back to the
// previous step, Pause / Resume stops the clock, and at the end "Repeat tutorial" shows.
// Without JavaScript, or with a reduced-motion setting, the page shows three static blocks instead.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => t * t * (3 - 2 * t);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = matchMedia('(min-width: 900px)');
  // Only touch a text when it changes: replacing the same text 60 times a second removes the text node under the mouse, and the click is lost.
  const set = (node, value) => { if (node.textContent !== value) node.textContent = value; };

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

  // The page's language (<html lang>): the texts the script writes come from here; the rest is in the page itself.
  const TEXT = {
    en: {
      steps: [
        ['Everyone sees the word. Except one.', 'Each round one player is the Seeker. Everyone else sees a secret word.'],
        ['Write one word.', "Type a single word that points to it. Don't say it out loud, and nothing too close to it."],
        ["Same word? It's gone.", 'Matching words cancel each other out. Only the unique ones survive.'],
        ['The Seeker guesses.', "They see only what's left, and try to find the word."],
        ['Everybody scores.', 'Find the word and the whole team wins together. Canceled or misleading words get no points.']
      ],
      echo: 'sand', secret: 'beach', send: 'Send', sent: 'Sent', guess: 'Guess', guessed: 'Guessed',
      stepOf: (n) => 'How to play · step ' + n + ' of 5', pause: 'Pause', resume: 'Resume', show: 'Show me',
      atGate: 'Press “Show me” to continue', back: 'Previous step',
      paused: 'Paused', pausedRead: 'Paused: take your time', playing: 'Playing', playsHere: 'Plays when you get here'
    },
    es: {
      steps: [
        ['Todos ven la palabra. Menos uno.', 'En cada ronda un jugador es el Buscador. Todos los demás ven una palabra secreta.'],
        ['Escribe una palabra.', 'Escribe una sola palabra que apunte a ella. No la digas en voz alta, ni nada muy parecido.'],
        ['¿Misma palabra? Desaparece.', 'Las palabras que coinciden se cancelan entre sí. Solo sobreviven las únicas.'],
        ['El Buscador adivina.', 'Solo ve lo que queda e intenta encontrar la palabra.'],
        ['Todos suman.', 'Si encuentran la palabra, todo el equipo gana junto. Las palabras canceladas o engañosas no dan puntos.']
      ],
      echo: 'arena', secret: 'playa', send: 'Enviar', sent: 'Enviado', guess: 'Adivinar', guessed: 'Adivinado',
      stepOf: (n) => 'Cómo jugar · paso ' + n + ' de 5', pause: 'Pausar', resume: 'Continuar', show: 'Muéstrame',
      atGate: 'Pulsa «Muéstrame» para continuar', back: 'Paso anterior',
      paused: 'En pausa', pausedRead: 'En pausa: tómate tu tiempo', playing: 'Reproduciendo', playsHere: 'Se reproduce al llegar aquí'
    }
  };
  const TX = TEXT[document.documentElement.lang === 'es' ? 'es' : 'en'];
  const STEPS = TX.steps;

  // The timeline (ms). For step i: S[i] it starts (title and card come in); the message is written from MSG[i] for TYPE[i];
  // G[i] is the gate where "Show me" waits; the animation then runs for ANIM[i] and the step ends at E[i] (= S[i+1]).
  const ANIM = [2500, 3900, 2800, 6200, 4700];           // how long each step's card animation lasts, with a short hold at the end
  const AUTO = [false, false, false, false, true];       // the last step has no "Show me": its animation starts by itself
  const TYPE = STEPS.map((s) => Math.min(3600, s[1].length * 26));
  const MSG = [], TA = [], G = [], S = [], E = [];   // TA[i]: the message has been written (the buttons start to show)
  STEPS.forEach((_, i) => {
    S[i] = i === 0 ? 0 : E[i - 1];
    MSG[i] = S[i] + 300;
    TA[i] = MSG[i] + TYPE[i];
    G[i] = TA[i] + (AUTO[i] ? 2000 : 400);              // the gate: a moment after the message ends, so the button has faded in (the last step waits 2 s)
    E[i] = G[i] + ANIM[i];
  });
  const END = E[4];
  const REPEAT_AT = END - 700;                           // the Repeat button shows in the last moments

  const COLORS = ['#FF5D4B', '#FFAC00', '#2A7AFF', '#1EBDAE', '#904EE2'];
  const cards = ['c1', 'c2', 'c3', 'c4', 'c5'].map($);
  const segs = Array.from(section.querySelectorAll('.segs i'));
  const barEls = Array.from($('resbars').children);
  const el = {
    stepno: $('stepno'), hint: $('hint'), repeat: $('repeat'), show: $('show'), back: $('back'), pause: $('pause'), pauselabel: $('pauselabel'), pauseicon: $('pauseicon'), playicon: $('playicon'),
    titles: $('titles'), prevtitle: $('prevtitle'), curtitle: $('curtitle'), message: $('message'), msgtyped: $('msgtyped'), msgrest: $('msgrest'),
    c1word: $('c1word'), c2typed: $('c2typed'), c2btn: $('c2btn'), c3a: $('c3a'), c3c: $('c3c'), c3stamp: $('c3stamp'),
    c4typed: $('c4typed'), c4btn: $('c4btn'), c4body: $('c4body'), c4win: $('c4win'), foot: $('foot'), rows: [$('r1'), $('r2'), $('r3')],
    status: section.querySelector('.status'), tap2: $('tap2'), tap4: $('tap4')
  };
  const BASE = [0.38, 0.78, 1, 0.62, 0.9, 0.5, 0.26];

  // Confetti for step 4: each piece flies up and out from the middle of the card, then falls (all computed from the clock, so rewinding works).
  const CONFETTI_COLORS = ['#FF5D4B', '#FFAC00', '#2A7AFF', '#1EBDAE', '#904EE2', '#FFD23F', '#8AC926', '#FF70A6'];
  const confetti = Array.from({ length: 36 }, (_, i) => {
    const ang = (-160 + (i * 53) % 140) * Math.PI / 180, speed = 380 + (i * 97) % 280;
    const node = document.createElement('i');
    const round = i % 4 === 0, w = 8 + (i % 3) * 3, h = round ? w : 10 + (i % 4) * 3;
    node.style.cssText = 'width:' + w + 'px;height:' + h + 'px;border-radius:' + (round ? '50%' : '2px') + ';background:' + CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    $('confetti').appendChild(node);
    return { node, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, rv: ((i * 71) % 720) - 360 };
  });

  // The hand that taps a button: it appears, glides to the button, presses it (the button presses at the same moment) and fades out.
  function tapHand(svg, btn, move0, move1, pressAt, fade0, fade1, u) {
    const bx = btn.offsetLeft + btn.offsetWidth * 0.5, by = btn.offsetTop + btn.offsetHeight * 0.55;
    const sx = bx + 150, sy = by + 110, p = ease(u(move0, move1));
    const x = sx + (bx - sx) * p, y = sy + (by - sy) * p;
    const press = u(pressAt, pressAt + 120) - u(pressAt + 120, pressAt + 260);
    const op = u(move0 - 250, move0) * (1 - u(fade0, fade1));
    svg.style.opacity = op.toFixed(2);
    svg.style.transform = 'translate(' + (x - 16.5).toFixed(1) + 'px,' + (y - 4).toFixed(1) + 'px) scale(' + (1 - 0.2 * press).toFixed(3) + ')';
  }

  let T = 0, paused = false, done = false, last = 0, raf = 0;
  let viewing = false, shownStep = -1;
  const shown = [false, false, false, false, false];     // which steps have had "Show me" pressed
  const cardsEl = $('cards');
  const stepAt = (t) => { let a = 0; for (let i = 0; i < 5; i++) if (t >= S[i]) a = i; return a; };

  function fit() {                                         // on a narrow screen the cards are drawn smaller to fit the width
    const s = wide.matches ? 1 : Math.min(1, Math.max(0.3, cardsEl.clientWidth / 490));
    cardsEl.style.setProperty('--s', s.toFixed(3));
    // centered under the text (the card and its shadow are 480 px wide)
    cardsEl.style.setProperty('--dx', wide.matches ? '0px' : Math.max(0, (cardsEl.clientWidth - 480 * s) / 2).toFixed(1) + 'px');
  }
  function fitText() {                                     // the title and message blocks are as tall as the step's own text
    el.titles.style.height = el.curtitle.firstElementChild.scrollHeight + 'px';
    el.message.style.height = el.message.firstElementChild.scrollHeight + 'px';
  }

  // The step whose gate the clock is stopped at ("Show me" not pressed yet), or -1.
  const waitingGate = () => { const a = stepAt(T); return (T >= G[a] && !shown[a] && !AUTO[a]) ? a : -1; };
  // The step whose "Show me" is on offer: the message is written and the button not pressed yet (from the moment it starts to fade in).
  const offering = () => { const a = stepAt(T); return (!AUTO[a] && T >= TA[a] && !shown[a]) ? a : -1; };

  function render() {
    const u = (a, b) => cl((T - a) / (b - a));
    const a = stepAt(T);
    const enter = [1, 1, 2, 3, 4].map((_, n) => (n === 0 ? 1 : ease(u(S[n], S[n] + 700))));
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
    const word = u(G[0], G[0] + 500);
    el.c1word.style.opacity = word.toFixed(2);
    el.c1word.style.transform = 'scale(' + (0.8 + 0.2 * word).toFixed(3) + ')';
    // card 2
    set(el.c2typed, TX.echo.slice(0, Math.floor(u(G[1], G[1] + 1000) * TX.echo.length + 0.001)));
    const press2 = u(G[1] + 2200, G[1] + 2450);
    el.c2btn.style.opacity = u(G[1] + 1200, G[1] + 1450).toFixed(2);
    el.c2btn.style.transform = 'translateY(' + (press2 * 4).toFixed(1) + 'px)';
    el.c2btn.style.boxShadow = '0 ' + (5 - press2 * 5).toFixed(1) + 'px 0 #0E0C1F';
    el.c2btn.style.background = press2 > 0.5 ? '#FFD23F' : '#FFAC00';
    set(el.c2btn, press2 > 0.5 ? TX.sent : TX.send);
    tapHand(el.tap2, el.c2btn, G[1] + 1300, G[1] + 2150, G[1] + 2200, G[1] + 2450, G[1] + 2750, u);
    // card 3
    const struck = T >= G[2] + 100;                       // not at the gate itself: "Show me" is what cancels the words
    [[el.c3a, '#FF5D4B', ''], [el.c3c, '#2A7AFF', '#FFEFD7']].forEach(([chip, bg, ink]) => {
      chip.style.background = struck ? '#F1E6D6' : bg;
      chip.style.color = struck ? '' : ink;
      chip.style.textDecoration = struck ? 'line-through' : 'none';
      chip.style.opacity = struck ? '0.4' : '1';
      chip.style.transform = struck ? 'scale(0.92)' : 'none';
    });
    const stamp = u(G[2] + 200, G[2] + 600);
    el.c3stamp.style.opacity = stamp.toFixed(2);
    el.c3stamp.style.transform = 'rotate(-6deg) scale(' + (1.2 - 0.2 * stamp).toFixed(3) + ')';
    // card 4
    set(el.c4typed, TX.secret.slice(0, Math.floor(u(G[3], G[3] + 1250) * TX.secret.length + 0.001)));
    const press4 = u(G[3] + 2700, G[3] + 2950);
    el.c4btn.style.opacity = u(G[3] + 1450, G[3] + 1700).toFixed(2);
    el.c4btn.style.transform = 'translateY(' + (press4 * 4).toFixed(1) + 'px)';
    el.c4btn.style.boxShadow = '0 ' + (5 - press4 * 5).toFixed(1) + 'px 0 #0E0C1F';
    set(el.c4btn, press4 > 0.5 ? TX.guessed : TX.guess);
    tapHand(el.tap4, el.c4btn, G[3] + 1650, G[3] + 2650, G[3] + 2700, G[3] + 2950, G[3] + 3250, u);
    el.c4body.style.opacity = (1 - u(G[3] + 3200, G[3] + 3600)).toFixed(2);
    const win = u(G[3] + 3400, G[3] + 3800);
    el.c4win.style.opacity = win.toFixed(2);
    el.c4win.style.transform = 'scale(' + (0.9 + 0.1 * win).toFixed(3) + ')';
    const ct = Math.max(0, (T - (G[3] + 3500)) / 1000);
    confetti.forEach((c) => {
      const x = c.vx * ct, y = c.vy * ct + 0.5 * 1300 * ct * ct;
      c.node.style.opacity = ct <= 0 ? '0' : (1 - cl((ct - 1.3) / 0.8)).toFixed(2);
      c.node.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (c.rv * ct).toFixed(0) + 'deg)';
    });
    // card 5
    const k5 = u(G[4], G[4] + 1200);
    barEls.forEach((bar, i) => { bar.style.height = Math.max(8, Math.round(BASE[i] * 120 * cl(k5 * 2.2 - i * 0.08))) + 'px'; });
    [[0, 800, 1100], [1, 1300, 1600], [2, 1800, 2100]].forEach(([i, x, y]) => { el.rows[i].style.opacity = u(G[4] + x, G[4] + y).toFixed(2); });
    el.foot.style.opacity = u(G[4] + 2400, G[4] + 2700).toFixed(2);

    // the title fades from the old step to the new one, and the message is "written" letter by letter
    const fade = a > 0 ? u(S[a], S[a] + 500) : 1;
    const prev = a > 0 ? a - 1 : 0;
    set(el.stepno, TX.stepOf(a + 1));
    set(el.curtitle.firstElementChild, STEPS[a][0]);
    set(el.prevtitle.firstElementChild, STEPS[prev][0]);
    el.curtitle.style.opacity = fade.toFixed(2);
    el.prevtitle.style.opacity = (a > 0 ? 1 - fade : 0).toFixed(2);
    const text = STEPS[a][1];
    const n = Math.floor(u(MSG[a], MSG[a] + TYPE[a]) * text.length + 0.001);
    set(el.msgtyped, text.slice(0, n));
    set(el.msgrest, text.slice(n));
    if (a !== shownStep) { shownStep = a; fitText(); }
    segs.forEach((seg, i) => { seg.style.width = (cl((T - S[i]) / (E[i] - S[i])) * 100).toFixed(1) + '%'; });

    // buttons and hint
    const typedAt = TA[a];
    // The last step has no buttons until the end, where only "Repeat tutorial" shows.
    const rowOp = a < 4 ? u(typedAt, typedAt + 400) * (1 - u(E[a] - 400, E[a])) : u(REPEAT_AT, REPEAT_AT + 400);
    el.status.style.opacity = rowOp.toFixed(2);
    el.status.style.visibility = rowOp > 0 ? 'visible' : 'hidden';
    const endShown = T >= REPEAT_AT;
    const atGate = offering() >= 0;
    el.show.classList.toggle('on', atGate && !endShown);
    set(el.show, TX.show);
    el.back.style.display = (a === 0 || endShown) ? 'none' : '';      // the first step has nothing before it
    el.back.setAttribute('aria-label', TX.back);
    el.pause.style.display = (endShown || atGate || a === 4) ? 'none' : '';
    el.hint.style.display = (endShown || a === 4) ? 'none' : '';
    el.pause.setAttribute('aria-pressed', paused ? 'true' : 'false');
    set(el.pauselabel, paused ? TX.resume : TX.pause);
    el.pauseicon.style.display = paused ? 'none' : '';
    el.playicon.style.display = paused ? '' : 'none';
    set(el.hint, atGate ? TX.atGate
      : paused ? TX.pausedRead
      : (viewing && !done ? TX.playing : (T <= 0 ? TX.playsHere : TX.paused)));
    el.repeat.classList.toggle('on', endShown);
  }

  // "Show me": opens the gate of the step whose button is on offer, so its animation plays.
  function showMe() {
    const g = offering();
    if (g < 0) return;
    shown[g] = true;
    paused = false; last = 0;
    kick();
    render();
  }

  // "<": back to the previous step, ready to be played again (its message written, "Show me" on offer).
  function goBack() {
    const a = stepAt(T);
    if (a === 0) return;
    T = G[a - 1];
    for (let i = a - 1; i < 5; i++) shown[i] = false;
    done = false; paused = false; last = 0;
    kick();
    render();
  }

  const running = () => !done && !paused && waitingGate() < 0 && viewing;

  function frame(now) {
    raf = 0;
    if (!running()) { last = 0; render(); return; }
    const dt = last ? Math.min(100, now - last) : 16;
    last = now;
    T = cl(T + dt, 0, END);
    // A gate that has not been opened stops the clock.
    for (let i = 0; i < 5; i++) {
      if (T < TA[i]) shown[i] = false;
      else if (!shown[i] && !AUTO[i] && T > G[i]) T = G[i];
    }
    render();
    if (T >= END) { done = true; render(); return; }
    raf = requestAnimationFrame(frame);
  }

  function kick() { if (!raf && (running() || waitingGate() >= 0)) raf = requestAnimationFrame(frame); }

  window.addEventListener('resize', () => { fit(); fitText(); kick(); });
  el.show.addEventListener('click', showMe);
  el.back.addEventListener('click', goBack);
  // Pause: the clock stops; Resume goes on from the same moment.
  el.pause.addEventListener('click', () => { paused = !paused; last = 0; kick(); render(); });
  el.repeat.addEventListener('click', () => { T = 0; done = false; paused = false; shown.fill(false); last = 0; render(); kick(); });

  // The tutorial plays while at least half of it is on screen, and waits when it is not.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { viewing = entries[0].isIntersecting; kick(); render(); }, { threshold: 0.45 }).observe(section);
  } else {
    viewing = true;
  }

  fit();
  render();
  fitText();
})();
