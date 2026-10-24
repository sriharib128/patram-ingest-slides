/* v5: animations you can pause and scrub (Deck.player), the two blog demos, and the simpler static explainers */
(function () {
  const U = Deck.util, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  /* ───────── player: ▶/❚❚, replay and a scrubber, for anything that runs on its own ─────────
     o = { dur (ms), label, fmt(t, dur), render(t), auto }.  render(t) must draw the whole state for time t,
     so the slider can jump anywhere. Mounted into `host`; everything dies with the slide. */
  Deck.player = function (ctx, host, o) {
    let dur = o.dur; const fmt = o.fmt || (t => (t / 1000).toFixed(1) + ' s');
    host.classList.add('pl', 'mini');                 // always the quiet bar: it should never compete with the slide
    host.innerHTML = '<button type="button" class="pl-b main" tabindex="-1"></button><button type="button" class="pl-b" tabindex="-1">↻ Replay</button><span class="pl-l"></span><input class="pl-s" type="range" min="0" max="1000" step="1" value="0" tabindex="-1"><output class="pl-o"></output>';
    const [bp, br] = host.querySelectorAll('button'), sl = host.querySelector('input'), out = host.querySelector('output');
    host.querySelector('.pl-l').textContent = o.label || 'Time';
    let t = 0, playing = false;
    const draw = () => {
      sl.value = Math.round(t / dur * 1000); out.textContent = fmt(t, dur);
      bp.textContent = playing ? '❚❚  Pause' : (t >= dur ? '▶  Play again' : '▶  Play');
      o.render(t);
    };
    const ctl = {
      get t() { return t; }, get playing() { return playing; },
      play() { if (t >= dur) t = 0; playing = true; draw(); },
      pause() { playing = false; draw(); },
      replay() { t = 0; playing = true; draw(); },
      seek(v) { t = clamp(v, 0, dur); draw(); },
      restart(d) { dur = d; t = 0; playing = true; draw(); },   // same bar, a new animation of length d
    };
    bp.onclick = () => { playing ? ctl.pause() : ctl.play(); bp.blur(); };
    br.onclick = () => { ctl.replay(); br.blur(); };
    sl.oninput = () => { playing = false; t = sl.value / 1000 * dur; draw(); };
    sl.onchange = () => sl.blur();                      // hand the arrow keys back to the deck
    ctx.raf((_, dt) => { if (!playing) return; t = clamp(t + Math.max(0, dt), 0, dur); if (t >= dur) playing = false; draw(); });
    draw(); if (o.auto !== false) ctl.play();
    return ctl;
  };

  /* ───────── why the overhead stays small: highlight one reason at a time ───────── */
  Deck.on('cheap2', {
    step(ctx, s) {
      const c = ctx.q('#ch3'); ['h1', 'h2', 'h3'].forEach((k, i) => c.classList.toggle(k, s === i + 1));
      ctx.qa('.ch3r').forEach((r, i) => r.classList.toggle('cur', s === i + 1));
    },
  });

  /* ───────── the GPU is one step: serial vs overlapped, on one clock ───────── */
  Deck.on('gpu2', {
    enter(ctx) {
      const T = 20, sh = [], sg = [], oh = [], og = [];
      for (let k = 0; k < 4; k++) { sh.push([5 * k, 1, 'pre', 'prep'], [5 * k + 4, 1, 'fin', 'done']); sg.push([5 * k + 1, 3, 'gpu', 'model']); }
      for (let b = 0; b < 4; b++) { og.push([1 + 3 * b, 3, 'gpu', 'model']); if (b < 3) oh.push([1 + 3 * b, 1, 'pre', 'prep']); if (b >= 1) oh.push([2 + 3 * b, 1, 'fin', 'done']); }
      oh.unshift([0, 1, 'pre', 'prep']); oh.push([13, 1, 'fin', 'done']);
      const lanes = [['#gl-s-h', sh], ['#gl-s-g', sg], ['#gl-o-h', oh], ['#gl-o-g', og]].map(([sel, segs]) => {
        const el = ctx.q(sel); el.innerHTML = '';
        const bs = segs.map(([a, l, cls, label]) => { const b = U.html('b', { class: cls, text: label }, el); b.style.left = (a / T * 100) + '%'; b.style.width = (l / T * 100 - .3) + '%'; return { b, a, l }; });
        const head = U.html('i', { class: 'hdm' }, el);
        return { bs, head };
      });
      ctx.__gp = { T, lanes, end: U.html('span', { class: 'endm', text: '✓ all four batches done' }, ctx.q('#gl-o-g')) };
    },
    step(ctx, s, p) {
      if (s >= 1) {
        if (!ctx.__pl) ctx.__pl = Deck.player(ctx, ctx.q('#gl-pl'), {
          dur: 7000, label: 'Time', mini: true, fmt: (t, d) => t >= d ? 'finished' : '',
          render: t => {
            const { T, lanes, end } = ctx.__gp, u = t / 7000 * T;
            lanes.forEach(L => { L.bs.forEach(o => { const f = clamp((u - o.a) / o.l); o.b.style.transform = `scaleX(${f})`; o.b.style.opacity = f > 0 ? 1 : 0; }); L.head.style.left = (u / T * 100) + '%'; L.head.style.opacity = u > 0 && u < T ? 1 : 0; });
            end.classList.toggle('on', u >= 14);
          },
        });
        else if (p < 1) ctx.__pl.replay();
      } else if (ctx.__pl) ctx.__pl.pause();
    },
  });

  /* ───────── blog demo: stage by stage vs pipeline parallel ───────── */
  Deck.on('pp2', {
    enter(ctx) {
      const STAGES = ['Understand', 'Specialists', 'Questions', 'Finished output'];
      const SEG = { staged: i => [i * 25, i * 25 + 25], piped: i => [i * 3, 91 + i * 3] };
      const TOTAL = 1000000;
      const panels = ['staged', 'piped'].map(mode => {
        const p = ctx.q('#pp2-' + mode); let h = '';
        STAGES.forEach((s, i) => { const [a, b] = SEG[mode](i); h += `<span class="bp-lab${i === 3 ? ' last' : ''}">${s}</span><div class="bp-track${i === 3 ? ' out' : ''}"><div class="bp-seg${i === 3 ? ' last' : ''}" style="left:${a}%;width:${b - a}%"><i></i></div><span class="bp-head"></span></div>`; });
        p.querySelector('.bp-grid').innerHTML = h;
        return { p, mode, seg: SEG[mode], bars: [...p.querySelectorAll('.bp-seg i')], heads: [...p.querySelectorAll('.bp-head')], gos: [...p.querySelectorAll('.bp-go')], fin: p.querySelector('.bp-big.fin') };
      });
      const draw = t => {
        panels.forEach(P => {
          P.bars.forEach((bar, i) => { const [a, b] = P.seg(i); bar.style.width = clamp((t - a) / (b - a)) * 100 + '%'; });
          P.heads.forEach(h => { h.style.left = t + '%'; });
          const [a3, b3] = P.seg(3), fin = Math.round(clamp((t - a3) / (b3 - a3)) * TOTAL);
          P.fin.classList.toggle('zero', fin === 0);
          P.fin.querySelector('b').textContent = fin.toLocaleString('en-US');
          P.fin.querySelector('span').textContent = fin === 0 ? 'nothing usable yet' : 'ready to train on';
        });
      };
      ctx.__pl = Deck.player(ctx, ctx.q('#pp2-pl'), {
        dur: 5000, label: 'Stop the run at', mini: true, fmt: (t, d) => t >= d ? 'the end' : Math.round(t / d * 100) + '%',
        render: t => draw(t / 5000 * 100),
      });
    },
  });

  /* ───────── blog demo: machines claiming work from a queue, one crashes, another takes over ─────────
     The story is simulated once, in 50 ms steps, so the player can show any moment. */
  const QMC = { A: '#05539c', B: '#c2670a', C: '#6b4bb8', D: '#b5367a' }, QSLOT = { A: 0, B: 1, C: 1, D: 2 };
  let QSIM = null;
  function simQueue() {
    if (QSIM) return QSIM;
    const N = 128, TAKE = 8, DT = 50, PK = 550, WORK = { A: 1400, B: 2800, C: 2000, D: 1800 };
    const cells = Array.from({ length: N }, () => ({ s: 0, m: null, only: null }));
    const ms = [], frames = [], rings = [], logs = [];
    let t = 0, finished = false;
    const who = id => `<b style="color:${QMC[id]}">Node ${id}</b>`;
    const say = (k, h) => logs.push({ k, h });
    const ring = (ids, color, fill, dur) => rings.push({ t, ids: ids.slice(), color, fill, dur });
    const mk = id => { const m = { id, state: 'sleep', wait: 400, held: [], n: 0, batches: 0, e: 0, pk: 0, c: 0, crashed: false, status: 'idle', born: t, bar: 0, label: '', dead: false }; ms.push(m); return m; };
    const rest = () => { finished = true; say('done', 'Every image is done. <b>None lost, none done twice.</b>'); ms.forEach(m => { if (!m.dead) m.status = 'idle'; }); };
    const tick = m => {
      if (m.dead || finished) return;
      if (m.state === 'sleep') { m.wait -= DT; if (m.wait <= 0) m.state = 'claim'; return; }
      if (m.state === 'claim') {
        const got = [];
        for (let i = 0; i < N && got.length < TAKE; i++) if (cells[i].s === 0 && (!cells[i].only || cells[i].only === m.id)) got.push(i);
        if (!got.length) { m.status = 'waiting for work'; m.wait = 400; m.state = 'sleep'; return; }
        const rec = got.some(i => cells[i].only);
        got.forEach(i => { cells[i] = { s: 1, m: m.id, only: null }; });
        m.held = got;
        if (rec) { say('join', `${who(m.id)} arrives and claims those same ${got.length} images.`); ring(got, QMC[m.id], null, 1700); }
        m.status = 'receiving ' + got.length + ' images'; m.state = 'recv'; m.pk = 0; m.label = got.length + ' images'; return;
      }
      if (m.state === 'recv') { m.pk += DT / PK; if (m.pk >= 1) { m.pk = 1; m.state = 'work'; m.e = 0; m.status = 'working on ' + m.held.length + ' images'; } return; }
      if (m.state === 'work') {
        if (m.crashed) {
          m.state = 'crash1'; m.c = 0; m.status = '✕ crashed'; m.bar = 0; m.lost = m.held; m.held = [];
          say('crash', `${who(m.id)} crashes in the middle of its batch.`); ring(m.lost, '#b42318', 'rgba(180,35,24,.4)', 1400); return;
        }
        m.e += DT; m.bar = Math.min(1, m.e / WORK[m.id]);
        if (m.e >= WORK[m.id]) { m.state = 'send'; m.pk = 0; m.label = 'results ✓'; m.status = 'sending results back'; }
        return;
      }
      if (m.state === 'send') {
        m.pk += DT / PK;
        if (m.pk >= 1) {
          m.bar = 0; m.batches++;
          const bad = m.id === 'D' && m.batches === 1 ? m.held[3] : -1;
          m.held.forEach(i => { cells[i] = { s: i === bad ? 3 : 2, m: m.id, only: null }; });
          m.n += m.held.length - (bad >= 0 ? 1 : 0); m.held = [];
          if (bad >= 0) { say('fail', 'One unreadable image is marked failed. The rest carry on.'); ring([bad], '#b42318', null, 1600); }
          if (cells.every(c => c.s >= 2)) { rest(); return; }
          m.state = 'claim'; m.pk = 0;
        }
        return;
      }
      if (m.state === 'crash1') {
        m.c += DT;
        if (m.c >= 1300) { m.lost.forEach(i => { cells[i] = { s: 0, m: null, only: 'C' }; }); ring(m.lost, '#5b6b7a', null, 1000); say('recover', `Its ${m.lost.length} images go back to waiting. <b>Nothing is lost.</b>`); m.state = 'crash2'; m.c = 0; }
        return;
      }
      if (m.state === 'crash2') { m.c += DT; if (m.c >= 2000) { m.state = 'crash3'; m.c = 0; } return; }
      if (m.state === 'crash3') { m.c += DT; if (m.c >= 500) m.dead = true; return; }
    };
    const A = mk('A'), B = mk('B'); let C = null, D = null;
    say('start', `${who('A')} and ${who('B')} each ask the queue for ${TAKE} images.`);
    let tail = 0;
    for (let k = 0; k < 2400; k++) {
      t = k * DT;
      if (t === 3100) B.crashed = true;
      if (t === 6400) C = mk('C');
      if (t === 11200) { say('join', `${who('D')} joins too. Each image still has exactly one owner.`); D = mk('D'); }
      ms.forEach(tick);
      frames.push({
        log: logs.length - 1,
        cs: cells.map(c => c.s), co: cells.map(c => c.m),
        ms: ms.map(m => ({ id: m.id, status: m.status, bar: m.bar, n: m.n, crash: /^crash/.test(m.state), dead: m.dead, vis: m.dead ? 0 : Math.min(1, (t - m.born) / 600) * (m.state === 'crash3' ? 1 - Math.min(1, m.c / 500) : 1), pk: m.state === 'recv' || m.state === 'send' ? { f: clamp(m.pk), fwd: m.state === 'recv', label: m.label, color: m.state === 'send' ? '#0e7c61' : QMC[m.id] } : null })),
      });
      if (finished && ++tail > 24) break;
    }
    QSIM = { frames, rings, logs, dur: frames.length * DT, DT, N };
    return QSIM;
  }

  Deck.on('queue2', {
    enter(ctx) {
      const sim = simQueue(), NS = 'http://www.w3.org/2000/svg';
      const svg = ctx.q('#q2-svg'), log = ctx.q('#q2-log'); svg.innerHTML = '';
      const el = (tag, a, parent = svg) => U.svg(tag, a, parent);
      const COLS = 16, ROWS = 8, CELL = 18, GAP = 3, TX = 20, TY = 44, PAD = 8, SLOT = 84, DB = { x: 500, y: 135 };
      const PW = COLS * (CELL + GAP) - GAP + 2 * PAD, PH = ROWS * (CELL + GAP) - GAP + 2 * PAD;
      el('text', { x: TX, y: 30, class: 'q-cap2' }).textContent = 'IMAGES TABLE: ONE BOX PER IMAGE';
      el('text', { x: 660, y: 30, class: 'q-cap2' }).textContent = 'NODES';
      el('rect', { x: TX, y: TY, width: PW, height: PH, rx: 12, class: 'q-panel' });
      const cellEls = [];
      for (let i = 0; i < sim.N; i++) cellEls.push(el('rect', { x: TX + PAD + (i % COLS) * (CELL + GAP), y: TY + PAD + Math.floor(i / COLS) * (CELL + GAP), width: CELL, height: CELL, rx: 4, class: 'q-c wait' }));
      const LEG = [['wait', 'waiting'], ['claim', 'claimed'], ['done', 'done'], ['fail', 'failed']], counts = [];
      LEG.forEach(([k, label], j) => {
        const x = TX + j * 100, y = TY + PH + 24;
        const sw = el('rect', { x, y: y - 12, width: 14, height: 14, rx: 4, class: 'q-c ' + k });
        if (k === 'claim') { sw.style.fill = '#05539c47'; sw.style.stroke = '#05539c'; }
        const t = el('text', { x: x + 20, y, class: 'q-small' }); t.textContent = label + ' ';
        const n = el('tspan', { class: 'q-n' }, t); n.textContent = '0'; counts.push(n);
      });
      el('path', { d: `M${TX + PW} ${DB.y} H${DB.x - 60}`, class: 'q-link' });
      const cyl = el('g', { class: 'q-db' });
      el('path', { d: `M${DB.x - 60} ${DB.y - 60} V${DB.y + 60} A60 16 0 0 0 ${DB.x + 60} ${DB.y + 60} V${DB.y - 60}`, class: 'body' }, cyl);
      el('ellipse', { cx: DB.x, cy: DB.y - 60, rx: 60, ry: 16, class: 'top' }, cyl);
      el('text', { x: DB.x, y: DB.y - 2, class: 'q-dbt', 'text-anchor': 'middle' }, cyl).textContent = 'DB';
      el('text', { x: DB.x, y: DB.y + 18, class: 'q-small', 'text-anchor': 'middle' }, cyl).textContent = 'the queue';
      const linkLayer = el('g'), machLayer = el('g'), packLayer = el('g'), ringLayer = el('g');
      const M = {};
      ['A', 'B', 'C', 'D'].forEach(id => {
        const c = QMC[id], y = 44 + QSLOT[id] * SLOT;
        const wire = el('path', { d: `M${DB.x + 60} ${DB.y} C 610 ${DB.y}, 610 ${y + 33}, 660 ${y + 33}`, class: 'q-wire' }, linkLayer);
        const g = el('g', { class: 'q-m' }, machLayer);
        el('rect', { x: 660, y, width: 280, height: 66, rx: 12, class: 'q-mbox', stroke: c }, g);
        el('rect', { x: 678, y: y + 12, width: 14, height: 14, rx: 4, fill: c + '47', stroke: c, 'stroke-width': 1.5 }, g);
        el('text', { x: 700, y: y + 24, class: 'q-mt', fill: c }, g).textContent = 'Node ' + id;
        const done = el('text', { x: 924, y: y + 24, class: 'q-small', 'text-anchor': 'end' }, g);
        const status = el('text', { x: 678, y: y + 43, class: 'q-small' }, g);
        el('rect', { x: 678, y: y + 51, width: 244, height: 6, rx: 3, class: 'q-track' }, g);
        const bar = el('rect', { x: 678, y: y + 51, width: 0, height: 6, rx: 3, fill: c }, g);
        const pk = el('g', {}, packLayer), pkr = el('rect', { y: -12, height: 24, rx: 12, fill: c }, pk), pkt = el('text', { x: 0, y: 4.5, class: 'q-pk', 'text-anchor': 'middle' }, pk);
        M[id] = { id, c, wire, g, done, status, bar, pk, pkr, pkt, len: wire.getTotalLength() };
      });
      const STATE = ['wait', 'claim', 'done', 'fail'], TAGS = { start: ['Start', '#16222e'], crash: ['Crash', '#b42318'], recover: ['Recover', '#c2670a'], join: ['Join', '#6b4bb8'], fail: ['Failed', '#b42318'], done: ['Done', '#0e7c61'] };
      let lastFi = -1, lastLog = null;
      const render = t => {
        const fi = clamp(Math.floor(t / sim.DT), 0, sim.frames.length - 1), f = sim.frames[fi];
        if (fi !== lastFi) {
          lastFi = fi;
          const n = [0, 0, 0, 0];
          cellEls.forEach((r, i) => {
            const s = f.cs[i]; n[s]++; r.setAttribute('class', 'q-c ' + STATE[s]);
            if (s === 1) { const col = QMC[f.co[i]]; r.style.fill = col + '47'; r.style.stroke = col; } else { r.style.fill = ''; r.style.stroke = ''; }
          });
          counts.forEach((c, k) => { c.textContent = n[k]; });
          Object.values(M).forEach(m => {
            const d = f.ms.find(x => x.id === m.id);
            if (!d || d.vis <= 0) { m.g.style.display = m.wire.style.display = m.pk.style.display = 'none'; return; }
            m.g.style.display = m.wire.style.display = ''; m.g.style.opacity = m.wire.style.opacity = d.vis;
            m.g.setAttribute('transform', `translate(${(1 - d.vis) * 40} 0)`);
            m.g.classList.toggle('dead', d.crash); m.wire.style.stroke = d.crash ? '#b42318' : '';
            m.done.textContent = d.n + ' done'; m.status.textContent = d.status; m.bar.setAttribute('width', (244 * d.bar).toFixed(1));
            if (d.pk) {
              const w = d.pk.label.length * 7 + 22, p = m.wire.getPointAtLength((.2 + .7 * (d.pk.fwd ? d.pk.f : 1 - d.pk.f)) * m.len);
              m.pk.style.display = ''; m.pkr.setAttribute('x', -w / 2); m.pkr.setAttribute('width', w); m.pkr.setAttribute('fill', d.pk.color); m.pkt.textContent = d.pk.label;
              m.pk.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
            } else m.pk.style.display = 'none';
          });
          const L = sim.logs[f.log];
          if (L !== lastLog) { lastLog = L; log.style.setProperty('--tc', TAGS[L.k][1]); log.innerHTML = `<span class="tag">${TAGS[L.k][0]}</span><span>${L.h}</span>`; }
        }
        ringLayer.innerHTML = '';
        sim.rings.forEach(r => {
          const a = (t - r.t) / r.dur; if (a < 0 || a > 1) return;
          const op = a < .15 ? a / .15 : a < .75 ? 1 : (1 - a) / .25;
          r.ids.forEach(i => { const c = cellEls[i], e = el('rect', { x: +c.getAttribute('x') - 2.5, y: +c.getAttribute('y') - 2.5, width: CELL + 5, height: CELL + 5, rx: 6, class: 'q-ring', stroke: r.color, opacity: op.toFixed(2) }, ringLayer); if (r.fill) e.setAttribute('fill', r.fill); });
        });
      };
      /* four clickable steps, each one slice of the story: [sim start, sim end, speed]; the crash and the take-over play slowest */
      ctx.__qr = render;
      ctx.__qseg = { 1: [0, 3000, 1.3], 2: [3000, 6400, 0.8], 3: [6400, 11200, 1.0], 4: [11200, sim.dur, 1.7] };
      if (!ctx.el.__q2wired) {
        ctx.el.__q2wired = true;
        ctx.qa('.q2-steps button').forEach(b => b.addEventListener('click', e => {      // a step always plays from its start, wherever the bar is
          e.stopPropagation(); +b.dataset.k === Deck.state.step ? ctx.el.__q2replay() : Deck.go(Deck.state.i, +b.dataset.k); b.blur();
        }));
      }
      ctx.el.__q2replay = () => ctx.__pl && ctx.__pl.replay();
      render(0);
    },
    step(ctx, s) {
      if (!ctx.__qseg) return;
      const g = ctx.__qseg[s];
      if (!g) { if (ctx.__pl) ctx.__pl.pause(); ctx.__qr(0); return; }          // step 0: the table before anything starts
      const [a, b, v] = g, len = (b - a) / v; ctx.__qa = a; ctx.__qv = v;
      if (!ctx.__pl) ctx.__pl = Deck.player(ctx, ctx.q('#q2-pl'), { dur: len, label: 'Time', mini: true, fmt: (t, d) => t >= d ? 'finished' : '', render: u => ctx.__qr(ctx.__qa + u * ctx.__qv) });
      else ctx.__pl.restart(len);
    },
    leave(ctx) { ctx.__pl = null; },
  });
})();
