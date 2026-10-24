(function () {
  const U = Deck.util, clamp = U.clamp;

  /* ── divider motif: hub and spokes ── */
  Deck.on('d4', {
    enter(ctx) {
      const svg = ctx.q('#d4-motif'); svg.innerHTML = '';
      const cx = 350, cy = 300;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 - Math.PI / 2, x = cx + Math.cos(a) * 230, y = cy + Math.sin(a) * 230;
        const l = U.svg('path', { class: 'draw d2', d: `M${cx} ${cy} L${x} ${y}`, stroke: i % 2 ? '#9DB3DC' : '#FFC078', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
        const r = U.svg('rect', { class: 'sq', x: x - 38, y: y - 38, width: 76, height: 76, rx: 16, fill: i % 2 ? '#9DB3DC' : '#FFC078', 'fill-opacity': .85 }, svg);
        r.style.animationDelay = (1.1 + i * .15) + 's';
      }
      U.svg('circle', { class: 'pop-dot', cx, cy, r: 46, fill: '#5FDDB2' }, svg);
    },
  });

  /* ── speed levers chart ── */
  const LV = [
    ['v1.0 baseline', 'one process, direct calls', 1.74, '#9DB3DC', 1], ['Own process', 'batch generate()', 1.77, '#9DB3DC', 1], ['+ shared memory', 'batch generate()', 1.80, '#9DB3DC', 2],
    ['Continuous batching', 'AsyncLLM, no shm', 2.23, '#F28C28', 3], ['+ shared memory', 'AsyncLLM, v1.5 default', 2.24, '#F28C28', 3],
  ];
  Deck.on('levers', {
    enter(ctx) {
      const host = ctx.q('#lv-chart'); host.innerHTML = '';
      const svg = U.svg('svg', { viewBox: '0 0 990 470', width: 990, height: 470 }, host);
      const x0 = 330, sc = 190, rh = 84, bh = 38;
      U.svg('line', { x1: x0, y1: 6, x2: x0, y2: 430, stroke: '#CBD5E8', 'stroke-width': 2 }, svg);
      ctx.__bars = LV.map(([l, s, v, col, step], i) => {
        const y = 14 + i * rh, g = U.svg('g', { class: 'lvb', style: 'transform-box:fill-box;transform-origin:left;transition:transform .9s cubic-bezier(.22,.9,.3,1),opacity .5s;' }, svg);
        const t = U.svg('text', { x: x0 - 18, y: y + 20, 'text-anchor': 'end', 'font-size': 25, 'font-weight': 600, fill: '#0E1A3A' }, g); t.textContent = l;
        const t2 = U.svg('text', { x: x0 - 18, y: y + 46, 'text-anchor': 'end', 'font-size': 20, fill: '#5B6785' }, g); t2.textContent = s;
        const w = v * sc, r = 10;
        U.svg('path', { d: `M${x0} ${y} h${w - r} a${r} ${r} 0 0 1 ${r} ${r} v${bh - 2 * r} a${r} ${r} 0 0 1 ${-r} ${r} h${-(w - r)} z`, fill: col }, g);
        const val = U.svg('text', { x: x0 + w + 14, y: y + 28, 'font-size': 28, 'font-weight': 700, fill: '#0E1A3A', 'font-family': 'IBM Plex Mono' }, g); val.textContent = v.toFixed(2);
        return { g, step };
      });
      const bx = x0 + 1.74 * sc;
      ctx.__gap = U.svg('g', { style: 'opacity:0;transition:opacity .6s' }, svg);
      U.svg('line', { x1: bx, y1: 6, x2: bx, y2: 440, stroke: '#C93C3C', 'stroke-width': 2.5, 'stroke-dasharray': '7 7' }, ctx.__gap);
      const lb = U.svg('text', { x: bx, y: 462, 'text-anchor': 'middle', 'font-size': 21, fill: '#C93C3C', 'font-weight': 600 }, ctx.__gap); lb.textContent = 'baseline 1.74';
      const bd = U.svg('g', { transform: `translate(${x0 + 2.24 * sc + 100} ${14 + 4 * rh - 66})` }, ctx.__gap);
      U.svg('rect', { x: 0, y: 0, width: 128, height: 58, rx: 29, fill: '#F28C28' }, bd);
      const bt = U.svg('text', { x: 64, y: 41, 'text-anchor': 'middle', 'font-size': 32, 'font-weight': 700, fill: '#fff', 'font-family': 'Sora' }, bd); bt.textContent = '+29%';
    },
    step(ctx, s) {
      ctx.__bars.forEach(b => { const on = s >= b.step; b.g.style.transform = on ? 'scaleX(1)' : 'scaleX(0)'; b.g.style.opacity = on ? 1 : 0; });
      ctx.__gap.style.opacity = s >= 3 ? 1 : 0;
    },
  });

  /* ── the system around vLLM ── */
  Deck.on('around', {
    enter(ctx) {
      const root = ctx.q('#ar-dia'); root.innerHTML = '';
      const svg = U.svg('svg', { width: 1040, height: 660, viewBox: '0 0 1040 660' }, root);
      const node = U.html('div', { class: 'node', style: 'left:0;top:120px;width:1040px;height:540px' }, root); node.innerHTML = '<b>one node</b>';
      const box = (cls, l, t, w, h, html) => U.html('div', { class: 'bx ' + cls, style: `left:${l}px;top:${t}px;width:${w}px;height:${h}px`, html }, root);
      const fsx = box('dark', 0, 0, 250, 84, 'shared FSx<small>all the data</small>'), reg = box('dark', 420, 0, 250, 84, 'registry<small>who is serving?</small>');
      const pool = box('', 40, 210, 270, 120, 'ingest pool<small>CPU only, no GPUs</small>'), nvme = box('', 40, 400, 270, 100, 'NVMe cache<small>local copies</small>');
      const dmn = box('', 40, 540, 270, 90, 'patram-fs daemon<small>reads records</small>'); dmn.style.opacity = 0;
      const mkSrv = (t, n) => { const b = box('', 640, t, 380, 150, `vLLM server ${n}<small>vision cache</small><div class="gp"><u></u><u></u><u></u><u></u></div>`); const c = U.html('div', { style: 'display:flex;gap:8px;margin-top:10px' }, b); const sl = [0, 1].map(() => U.html('i', { style: 'display:block;width:30px;height:30px;border-radius:8px;border:2.5px dashed #B4C2DF;transition:all .3s' }, c)); return { b, sl, cache: [] }; };
      const SA = mkSrv(190, 'A'), SB = mkSrv(380, 'B');
      const kv = U.html('div', { class: 'kv', text: 'cache hits  0%' }, root); kv.style.cssText = 'left:690px;top:560px;opacity:0;transition:opacity .4s';
      const P = (d, c, w, dash) => U.svg('path', { d, fill: 'none', stroke: c, 'stroke-width': w || 3, 'stroke-dasharray': dash || '', 'stroke-linecap': 'round' }, svg);
      const pFsx = P('M22 84 V450 H40', '#9DB3DC', 4, '8 8'), pReg = P('M545 84 V150 H175 V210', '#9DB3DC', 4, '8 8');
      const pA = P('M310 270 L640 265', '#C3CEE5', 3), pB = P('M310 270 L640 455', '#C3CEE5', 3);
      const pN1 = P('M310 450 L640 310', '#D8DFEE', 3, '3 8'), pN2 = P('M310 450 L640 480', '#D8DFEE', 3, '3 8');
      const pD1 = P('M310 585 L640 320', '#B9A2FF', 4), pD2 = P('M310 590 L640 500', '#B9A2FF', 4); pD1.style.opacity = pD2.style.opacity = 0;
      const COL = ['#2A63C9', '#F28C28', '#0E7C61', '#6B4BB8'];
      const dots = [], hist = [], rng = U.rng(23); let acc = 0, mode = 'scatter';
      const sv = [SA, SB], paths = [pA, pB];
      ctx.raf((t, dt) => {
        acc += dt; if (acc > 700) { acc = 0; const k = Math.floor(rng() * 4), sIdx = mode === 'hash' ? (k < 2 ? 0 : 1) : (rng() < .5 ? 0 : 1); dots.push({ k, s: sIdx, t: 0, el: U.svg('circle', { r: 11, fill: COL[k], stroke: '#fff', 'stroke-width': 3 }, svg) }); }
        for (let i = dots.length - 1; i >= 0; i--) {
          const d = dots[i]; d.t += dt / 1100; const p = paths[d.s], L = p.getTotalLength(), pt = p.getPointAtLength(Math.min(1, d.t) * L); d.el.setAttribute('cx', pt.x); d.el.setAttribute('cy', pt.y);
          if (d.t >= 1) {
            d.el.remove(); dots.splice(i, 1); const S = sv[d.s], hit = S.cache.includes(d.k);
            S.cache = S.cache.filter(x => x !== d.k); S.cache.push(d.k); if (S.cache.length > 2) S.cache.shift();
            S.sl.forEach((e, j) => { const c = S.cache[j]; e.style.background = c === undefined ? 'transparent' : COL[c]; e.style.border = c === undefined ? '2.5px dashed #B4C2DF' : '2.5px solid ' + COL[c]; });
            S.b.classList.remove('flash'); void S.b.offsetWidth; if (hit) S.b.classList.add('flash');
            hist.push(hit ? 1 : 0); if (hist.length > 16) hist.shift(); kv.textContent = 'cache hits  ' + Math.round(hist.reduce((a, b) => a + b, 0) / hist.length * 100) + '%';
          }
        }
      });
      ctx.__ar = { fsx, reg, pool, nvme, dmn, SA, SB, kv, node, pFsx, pReg, pN1, pN2, pD1, pD2, setMode: m => { mode = m; hist.length = 0; } };
    },
    step(ctx, s) {
      const A = ctx.__ar, all = [A.fsx, A.reg, A.pool, A.nvme, A.SA.b, A.SB.b];
      const hl = { 0: [], 1: [A.fsx, A.nvme, A.pool], 2: [A.pool, A.SA.b, A.SB.b], 3: [A.reg, A.pool], 4: [A.dmn, A.SA.b, A.SB.b] }[s];
      all.concat(A.dmn).forEach(e => { e.classList.toggle('hl', hl.includes(e) && s > 0); e.classList.toggle('dim', s > 0 && !hl.includes(e) && e !== A.dmn); });
      A.setMode(s >= 2 ? 'hash' : 'scatter'); A.kv.style.opacity = s >= 2 ? 1 : 0;
      A.pFsx.style.opacity = s >= 1 ? 1 : .25; A.pReg.style.opacity = s >= 3 ? 1 : .15;
      A.dmn.style.opacity = s >= 4 ? 1 : 0; A.pD1.style.opacity = A.pD2.style.opacity = s >= 4 ? 1 : 0;
      A.pN1.style.opacity = A.pN2.style.opacity = s >= 4 ? .1 : 1; A.nvme.style.opacity = s >= 4 ? .3 : (s > 0 && !hl.includes(A.nvme) ? .35 : 1);
    },
  });

  /* ── pipelines don't own models ── */
  Deck.on('registry', {
    enter(ctx) {
      const root = ctx.q('#rg'); root.innerHTML = '';
      const X = i => i * 280;
      ['Machine 1', 'Machine 2', 'Machine 3'].forEach((t, m) => U.html('div', { class: 'mh', text: t, style: `left:${m * 560}px` }, root));
      const mkVl = (i, top, h, off) => { const v = U.html('div', { class: 'vl', style: `left:${X(i) + off}px;top:${top}px;height:${h}px` }, root); U.html('i', {}, v); return v; };
      const vlA = [0, 1, 2, 3, 4, 5].map(i => mkVl(i, 162, 138, 112)), vlB = [0, 1, 2, 3, 4, 5].map(i => mkVl(i, 162, 262, 142));
      const SRV = [0, 1, 2, 3, 4, 5].map(i => { const d = U.html('div', { class: 'srv', style: `left:${X(i)}px` }, root); d.innerHTML = `<b>server ${i + 1}</b><span>starting…</span><div class="gp">${'<u></u>'.repeat(8)}</div>`; return d; });
      const reg = U.html('div', { class: 'reg' }, root); reg.innerHTML = '<b>registry</b><span id="rg-l"></span>';
      U.html('div', { class: 'rl', text: 'pipeline A', style: 'top:266px' }, root); U.html('div', { class: 'rl', text: 'pipeline B · another team', style: 'top:394px' }, root);
      const WA = [0, 1, 2, 3, 4, 5].map(i => U.html('div', { class: 'wk', style: `left:${X(i)}px;top:304px`, text: 'worker' }, root));
      const WB = [0, 1, 2, 3, 4, 5].map(i => U.html('div', { class: 'wk b', style: `left:${X(i)}px;top:432px`, text: 'worker' }, root));
      const wait = U.html('div', { class: 'wait', text: 'launched before any model is up: waiting…' }, root);
      ctx.__rg = { SRV, WA, WB, vlA, vlB, wait, timers: [], list: reg.querySelector('#rg-l'), cur: null };
    },
    step(ctx, s, p) {
      const R = ctx.__rg;
      R.timers.forEach(clearTimeout); R.timers = [];
      const cap = ['A run launched before any server exists waits.', 'Servers appear; workers are spawned from the registry. <b>No restart, no configuration.</b>', 'Two servers are put to sleep. Their workers <b>drain</b>; requests return without blame.', 'The servers wake and their workers <b>rejoin</b>.', 'No pipeline owns a server: <b>another pipeline shares them</b>.'][s];
      ctx.q('#rg-cap').innerHTML = cap;
      const T = { srv: [0, 0, 0, 0, 0, 0].map(() => 'off'), A: [0, 0, 0, 0, 0, 0].map(() => 'none'), B: [0, 0, 0, 0, 0, 0].map(() => 'none') };
      if (s >= 1) { T.srv.fill('on'); T.A.fill('run'); }
      if (s === 2) { T.srv[2] = T.srv[3] = 'sleep'; T.A[2] = T.A[3] = 'none'; }
      if (s >= 4) T.B.fill('run');
      const prev = R.cur; R.cur = T;
      const render = (i, srv, A, B, drain) => {
        const e = R.SRV[i]; e.className = 'srv ' + (srv === 'on' ? 'on' : srv === 'sleep' ? 'sleep' : '');
        e.querySelector('span').textContent = srv === 'on' ? 'serving' : srv === 'sleep' ? 'asleep' : 'starting…';
        R.WA[i].className = 'wk ' + (A === 'run' ? 'run' : ''); R.WA[i].classList.toggle('drain', !!drain); if (drain) R.WA[i].textContent = 'draining…'; else R.WA[i].textContent = 'worker';
        R.WB[i].className = 'wk b ' + (B === 'run' ? 'run' : '');
        R.vlA[i].classList.toggle('on', A === 'run'); R.vlB[i].classList.toggle('on', B === 'run');
        R.list.innerHTML = R.SRV.map((x, j) => x.classList.contains('on') ? `<i>server ${j + 1}</i>` : '').join('');
        R.wait.style.opacity = R.WA.some(w => w.classList.contains('run')) ? 0 : 1;
      };
      const forward = prev && p === s - 1;
      for (let i = 0; i < 6; i++) {
        const apply = () => render(i, T.srv[i], T.A[i], T.B[i], false);
        if (!forward) { apply(); continue; }
        if (s === 1) { R.timers.push(setTimeout(() => render(i, 'on', 'none', 'none', false), 300 + i * 350)); R.timers.push(setTimeout(apply, 900 + i * 350)); }
        else if (s === 2 && (i === 2 || i === 3)) { R.timers.push(setTimeout(() => render(i, 'sleep', 'run', 'none', true), 200)); R.timers.push(setTimeout(apply, 1800)); }
        else if (s === 3 && (i === 2 || i === 3)) { R.timers.push(setTimeout(() => render(i, 'on', 'none', 'none', false), 300)); R.timers.push(setTimeout(apply, 1100)); }
        else if (s === 4) R.timers.push(setTimeout(apply, 200 + i * 250));
        else apply();
      }
      if (!forward) R.wait.style.opacity = s === 0 ? 1 : 0;
    },
  });

  /* ── one day of a production run ── */
  const DR = [[0, 0], [.9, 0], [1.1, 10], [2.2, 70], [3, 85], [7, 85], [7.3, 60], [9, 60], [9.2, 85], [14, 85], [14.2, 64], [14.8, 85], [18, 85], [19, 125], [24, 125]];
  const EV = [1.1, 7.3, 9.2, 14.2, 18.4];
  Deck.on('dayrun', {
    enter(ctx) {
      const host = ctx.q('#dr-chart'); host.innerHTML = '';
      const W = 1120, H = 660, L = 80, R = 1096, T = 30, B = 560, ymax = 150;
      const xs = t => L + t / 24 * (R - L), ys = v => B - v / ymax * (B - T);
      const svg = U.svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
      [0, 50, 100, 150].forEach(v => { U.svg('line', { x1: L, x2: R, y1: ys(v), y2: ys(v), stroke: v === 0 ? '#9DB3DC' : '#E3E8F1', 'stroke-width': v === 0 ? 2.5 : 2 }, svg); const t = U.svg('text', { x: L - 14, y: ys(v) + 8, 'text-anchor': 'end', 'font-size': 24, fill: '#5B6785' }, svg); t.textContent = v; });
      [0, 6, 12, 18, 24].forEach(h => { const t = U.svg('text', { x: xs(h), y: B + 44, 'text-anchor': 'middle', 'font-size': 24, fill: '#5B6785' }, svg); t.textContent = h + ' h'; });
      const yl = U.svg('text', { x: L, y: 20, 'font-size': 24, fill: '#5B6785', 'font-weight': 600 }, svg); yl.textContent = 'samples per second';
      const defs = U.svg('defs', {}, svg), cp = U.svg('clipPath', { id: 'drclip' }, defs), cr = U.svg('rect', { x: L - 4, y: 0, width: 0, height: H, style: 'transition:width 1.6s cubic-bezier(.4,0,.2,1)' }, cp);
      const gr = U.svg('linearGradient', { id: 'drgrad', x1: 0, y1: 0, x2: 0, y2: 1 }, defs); U.svg('stop', { offset: 0, 'stop-color': '#2A63C9', 'stop-opacity': .22 }, gr); U.svg('stop', { offset: 1, 'stop-color': '#2A63C9', 'stop-opacity': 0 }, gr);
      const pts = DR.map(([t, v]) => `${xs(t)},${ys(v)}`), g = U.svg('g', { 'clip-path': 'url(#drclip)' }, svg);
      U.svg('path', { d: `M${pts.join(' L')} L${xs(24)},${B} L${xs(0)},${B} Z`, fill: 'url(#drgrad)' }, g);
      U.svg('path', { d: `M${pts.join(' L')}`, fill: 'none', stroke: '#2A63C9', 'stroke-width': 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
      const val = t => { for (let i = 1; i < DR.length; i++) if (t <= DR[i][0]) { const [a, b] = [DR[i - 1], DR[i]]; return a[1] + (b[1] - a[1]) * (t - a[0]) / ((b[0] - a[0]) || 1); } return DR[DR.length - 1][1]; };
      ctx.__ev = EV.map((t, i) => {
        const gE = U.svg('g', { style: 'opacity:0;transform-box:fill-box;transform-origin:center;transition:all .5s cubic-bezier(.22,.9,.3,1)' }, svg);
        U.svg('line', { x1: xs(t), x2: xs(t), y1: ys(val(t)) + 20, y2: B, stroke: '#F28C28', 'stroke-width': 2.5, 'stroke-dasharray': '6 6' }, gE);
        U.svg('circle', { cx: xs(t), cy: ys(val(t)) - 6, r: 22, fill: '#F28C28', stroke: '#fff', 'stroke-width': 4 }, gE);
        const tx = U.svg('text', { x: xs(t), y: ys(val(t)) + 2, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, fill: '#fff', 'font-family': 'Sora' }, gE); tx.textContent = i + 1; return gE;
      });
      ctx.__cr = cr; ctx.__xs = xs;
    },
    step(ctx, s) {
      const reach = [0, 3.4, 8.7, 12.4, 16.6, 24, 24][s];
      ctx.__cr.setAttribute('width', Math.max(0, ctx.__xs(reach) - 76));
      ctx.__ev.forEach((e, i) => { e.style.opacity = s > i ? 1 : 0; });
    },
  });

  /* ── a busy kitchen ── */
  Deck.on('busy', {
    enter(ctx) {
      const lane = ctx.q('#bz-l'); lane.innerHTML = '';
      const rng = U.rng(3);
      for (let i = 0; i < 71; i++) U.html('u', { style: `animation-delay:${(rng() * 2).toFixed(2)}s` }, lane);
      U.html('u', { class: 'probe' }, lane);
      ctx.__bz = { t0: null, n: 1284551 };
      ctx.raf((t, dt) => {
        const B = ctx.__bz;
        if (B.t0 !== null) { const sec = Math.min(60, Math.floor((performance.now() - B.t0) / 1000 * 8)); ctx.q('#bz-t').textContent = sec + ' s / 60 s'; if (sec >= 60) { const v = ctx.q('#bz-lv'); v.classList.add('on'); v.textContent = 'asleep or wedged? rank paused'; } }
        if (ctx.step >= 2) { B.n += Math.floor(dt * (3 + Math.random() * 4)); ctx.q('#bz-n').textContent = B.n.toLocaleString('en-US'); }
      });
    },
    step(ctx, s, p) {
      const B = ctx.__bz;
      ctx.q('#bz-cap').innerHTML = ['Is the server alive? We used to <b>send it a test request</b>.', 'On a busy server the test <b>waits behind everything else</b>. Healthy servers read as dead. <b class="hr">1 of 30 nodes</b> was working.', 'Now we <b>watch tokens leave</b>. Moving? Serving. <b>Nothing is sent.</b>', 'Judged serving in <b>~3 s</b> with zero requests. A real wedge: caught in <b>38 s</b>, not ~80.'][s];
      if (s >= 1 && B.t0 === null) B.t0 = performance.now();
      if (s < 1) { B.t0 = null; ctx.q('#bz-t').textContent = '0 s / 60 s'; ctx.q('#bz-lv').classList.remove('on'); ctx.q('#bz-lv').textContent = ''; }
      ctx.q('#bz-rc').style.opacity = s >= 2 ? 1 : .3;
      const rv = ctx.q('#bz-rv'); rv.classList.toggle('on', s >= 2); rv.textContent = s >= 2 ? 'serving: tokens are moving' : ''; ctx.q('#bz-belt').classList.toggle('run', s >= 2);
    },
  });

  /* ── tuning bars ── */
  Deck.on('tuning', {
    enter(ctx) {
      ctx.qa('.bars').forEach(b => {
        b.innerHTML = ''; const a = +b.dataset.a, v = +b.dataset.b, mx = Math.max(a, v);
        [[b.dataset.la, a, ''], [b.dataset.lb, v, 'b']].forEach(([l, x, c]) => { const r = U.html('div', { class: 'row ' + c }, b); U.html('span', { text: l }, r); const t = U.html('div', { class: 't' }, r); U.html('i', { style: `--w:${x / mx * 100}%` }, t); U.html('b', { text: x }, r); });
        U.html('div', { class: 'gain', text: b.dataset.g }, b);
      });
    },
  });

  /* ── vLLM is one more worker spec ── */
  Deck.on('anyback', {
    enter(ctx) {
      const be = ['hosted vLLM servers', 'a local vllm serve', 'a Hugging Face model per GPU', '32 headless Chromes', 'a plain CPU function'];
      const chips = ctx.q('#ab-chips'); chips.innerHTML = ''; const cs = be.map(t => U.html('span', { class: 'chip', text: t }, chips));
      let i = 0; const show = () => { ctx.q('#ab-be').style.opacity = 0; ctx.after(() => { ctx.q('#ab-be').textContent = be[i]; ctx.q('#ab-be').style.opacity = 1; cs.forEach((c, k) => c.classList.toggle('cur', k === i)); i = (i + 1) % be.length; }, 250); };
      show(); ctx.every(show, 2400);
    },
  });
})();
