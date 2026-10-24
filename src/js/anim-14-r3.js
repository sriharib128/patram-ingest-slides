/* r3: the node architecture, drawn once and shown twice (plain, then by kind of parallelism) */
(function () {
  const U = Deck.util;

  /* boxes: [key, x, y, w, h, name, description, kind]; kind: p = process, t = thread, '' = untagged */
  const BOX = [
    ['stage', 30, 50, 520, 500, 'Stage worker', 'one per stage', 'p'],
    ['prep', 60, 110, 460, 88, 'Prepare', 'claim samples, build requests', 't'],
    ['coll', 60, 215, 460, 88, 'Collect', 'gather the results', 't'],
    ['write', 60, 320, 460, 88, 'Write', 'save to disk, then mark done', 't'],
    ['up', 60, 425, 460, 88, 'Upload', 'move files to the object store', 't'],
    ['pool', 650, 50, 570, 500, 'Worker pool', 'shared by the stages', 'p'],
    ['disp', 680, 110, 510, 88, 'Dispatcher', 'hands each request to a worker', 't'],
    ['w1', 680, 232, 158, 172, 'Worker 1', '', 'w'],
    ['w2', 856, 232, 158, 172, 'Worker 2', '', 'w'],
    ['w3', 1032, 232, 158, 172, 'Worker N', '', 'w'],
    ['sup', 680, 425, 510, 88, 'Supervisor', 'restarts any worker that dies', 't'],
    ['bk', 1310, 50, 370, 500, 'Backends', 'what a worker calls', ''],
  ];
  const BK = ['vLLM servers', 'Hugging Face models', 'CPU process', 'Any classic model'];
  const KIND = { p: 'process', t: 'thread', w: 'process' };

  /* byKind: tag every box with its kind of parallelism, drop the backends and stretch the node to the full width */
  function archDiagram(host, byKind) {
    host.innerHTML = ''; host.classList.add('ar3'); host.classList.toggle('kinds', byKind);
    const sx = byKind ? 1680 / 1250 : 1, X = v => Math.round(v * sx);
    U.html('div', { class: 'ar3-node', html: '<span>One node</span>', style: `width:${X(1250)}px` }, host);
    BOX.filter(b => !(byKind && b[0] === 'bk')).forEach(([k, x, y, w, h, name, desc, kind]) => {
      const frame = k === 'stage' || k === 'pool' || k === 'bk';
      const b = U.html('div', { class: `ar3-b ${frame ? 'fr' : ''} k-${kind || 'n'} b-${k}`, style: `left:${X(x)}px;top:${y}px;width:${X(w)}px;height:${h}px` }, host);
      if (frame) U.html('h4', { html: `${name} <small>${desc}</small>` }, b);
      else { U.html('h4', { text: name }, b); if (desc) U.html('p', { text: desc }, b); }
      if (kind === 'w') U.html('p', { class: 'ev', html: byKind ? '<b>event loop</b>many calls in flight' : 'calls a backend' }, b);
      if (byKind && KIND[kind]) U.html('em', { class: 'tag ' + KIND[kind], text: KIND[kind] }, b);
    });
    if (!byKind) BK.forEach((n, i) => U.html('div', { class: 'ar3-bk', text: n, style: `left:1340px;top:${110 + i * 105}px` }, host));
    U.html('div', { class: 'ar3-wt', style: `left:${X(30)}px;top:572px;width:${X(1190)}px`, html: '<b>Watcher</b> restarts the whole program if it exits or the node reboots' }, host);
    const svg = U.svg('svg', { viewBox: '0 0 1680 640', width: 1680, height: 640, class: 'ar3-svg' }, host);
    const defs = U.svg('defs', {}, svg), mk = U.svg('marker', { id: 'ar3h' + (byKind ? 'k' : ''), viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, defs);
    U.svg('path', { d: 'M0 0L10 5L0 10z', fill: '#5B6785' }, mk);
    const A = (d, dash) => U.svg('path', { d, fill: 'none', stroke: '#5B6785', 'stroke-width': 3.5, 'marker-end': `url(#${mk.id})`, 'stroke-dasharray': dash || '' }, svg);
    A(`M${X(520)} 154 H${X(680) - 4}`); [759, 935, 1111].forEach(c => A(`M${X(c)} 198 V228`));
    if (!byKind) A('M1190 315 H1306');
    A(`M${X(680)} 360 C${X(610)} 360 ${X(600)} 259 ${X(520) + 4} 259`);
    A(`M${X(290)} 303 V316`); A(`M${X(290)} 408 V421`); A(`M${X(935)} 425 V408`, '6 6');
    const lab = (x, y, t) => { const e = U.svg('text', { x, y, class: 'ar3-l' }, svg); e.textContent = t; };
    lab(X(552), 142, 'requests'); lab(X(562), 388, 'results');
  }

  Deck.on('arch', { enter(ctx) { archDiagram(ctx.q('#ar3-a'), false); } });
  Deck.on('where', { enter(ctx) { archDiagram(ctx.q('#ar3-k'), true); } });
  Deck.on('askpar', { enter(ctx) { archDiagram(ctx.q('#ar3-q'), false); } });
})();

/* heals itself → scales by itself → one day of a run. Panels open and close through CSS keyed on data-st;
   clicking a panel opens or closes it. Step 5 plays the scaling story (Deck.player, render is a pure function of t). */
(function () {
  const U = Deck.util, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  /* the v1 "pipelines don't own models" picture, light: 3 machines x 2 servers, one worker per serving
     server, and the database the workers fetch from. Servers 3 and 4 are lent out mid-run and come back. */
  const HEAL = { 2: 2800, 3: 3500, 4: 3100 };            // step → length of its heal example (ms)
  const N = 6, X = i => i * 268, LENT = [5000, 8700];
  /* the scaling story is one timeline cut into three steps; each step plays its own slice */
  const SEG = { 5: [0, 4900], 6: [5000, 8600], 7: [8700, 12700] };
  const onAt = i => 1000 + i * 300;
  const lent = i => i === 2 || i === 3;
  function server(i, t) {
    if (t < onAt(i)) return 'off';
    if (lent(i) && t >= LENT[0] && t < LENT[1]) return 'sleep';
    return 'on';
  }
  function worker(i, t) {
    const sp = onAt(i) + 500;
    if (t < sp) return { s: 'none', held: 0 };
    if (lent(i)) {
      if (t >= LENT[0] && t < LENT[0] + 1500) return { s: 'drain', held: 4 * (1 - (t - LENT[0]) / 1500) };
      if (t >= LENT[0] + 1500 && t < LENT[1] + 500) return { s: 'wait', held: 0 };
      if (t >= LENT[1] + 500 && t < LENT[1] + 1300) return { s: 'fetch', held: 4 * (t - LENT[1] - 500) / 800 };
    }
    if (t < sp + 700) return { s: 'fetch', held: 4 * (t - sp) / 700 };
    return { s: 'work', held: 4 };
  }
  const workMs = (i, t) => {
    let w = Math.max(0, t - (onAt(i) + 1200));
    if (lent(i)) w -= Math.max(0, Math.min(t, LENT[1] + 1300) - LENT[0]);
    return Math.max(0, w);
  };
  const RATE = 0.05, TOTAL = 3000;
  const LOG = [[0, 'Launched <b>before any model server is up</b>. The run waits.'],
    [1000, 'Servers come up. The run <b>starts one worker per serving server</b>.'],
    [3700, 'Each worker <b>fetches samples from the database</b> for its server.'],
    [LENT[0], 'Servers 3 and 4 are <b>lent out</b>. Their workers <b>drain</b>: samples go back.'],
    [LENT[0] + 1500, 'Workers 3 and 4 <b>wait</b>. Everyone else carries on.'],
    [LENT[1], 'The servers are back. Workers 3 and 4 <b>fetch again</b>.'],
    [LENT[1] + 2000, 'No samples were lost, and <b>the run was not restarted</b>.']];
  const STATUS = { work: 'working', drain: 'draining', wait: 'waiting', fetch: 'fetching', none: '' };

  function build(ctx) {
    const svg = ctx.q('#fl6-svg'); svg.innerHTML = '';
    const el = (tag, a, parent = svg) => U.svg(tag, a, parent);
    const txt = (x, y, cls, t, parent = svg, a = {}) => { const e = el('text', Object.assign({ x, y, class: cls }, a), parent); e.textContent = t; return e; };
    ['Machine 1', 'Machine 2', 'Machine 3'].forEach((m, k) => { txt(k * 536 + 248, 22, 'f6-cap', m.toUpperCase(), svg, { 'text-anchor': 'middle' }); el('line', { x1: k * 536, x2: k * 536 + 516, y1: 36, y2: 36, class: 'f6-mh' }); });
    const linkS = [], linkD = [];
    for (let i = 0; i < N; i++) {
      linkS.push(el('path', { d: `M${X(i) + 124} 170 V270`, class: 'f6-l' }));
      linkD.push(el('path', { d: `M${X(i) + 124} 332 V398`, class: 'f6-l' }));
    }
    const SV = [...Array(N)].map((_, i) => {
      const g = el('g', {});
      const r = el('rect', { x: X(i), y: 56, width: 248, height: 114, rx: 18, class: 'f6-s' }, g);
      txt(X(i) + 20, 94, 'f6-wn', 'server ' + (i + 1), g); const st = txt(X(i) + 20, 122, 'f6-ws', '', g);
      const gp = [...Array(8)].map((_, k) => el('rect', { x: X(i) + 20 + k * 27, y: 140, width: 22, height: 12, rx: 3, class: 'f6-gpu' }, g));
      return { r, st, gp };
    });
    const WK = [...Array(N)].map((_, i) => {
      const g = el('g', { class: 'f6-wg' });
      const r = el('rect', { x: X(i) + 24, y: 270, width: 200, height: 62, rx: 14, class: 'f6-w' }, g);
      txt(X(i) + 124, 297, 'f6-wn sm', 'worker ' + (i + 1), g, { 'text-anchor': 'middle' }); const st = txt(X(i) + 124, 320, 'f6-ws', '', g, { 'text-anchor': 'middle' });
      return { g, r, st };
    });
    const wait = el('g', {}); el('rect', { x: 0, y: 270, width: 1600, height: 62, rx: 14, class: 'f6-wait' }, wait);
    txt(800, 309, 'f6-waitt', 'launched before any model server is up: waiting…', wait, { 'text-anchor': 'middle' });
    el('rect', { x: 0, y: 398, width: 1600, height: 92, rx: 18, class: 'f6-db' });
    const cyl = el('g', { transform: 'translate(26 417)', class: 'f6-dbi' });       // three stacked discs
    el('path', { d: 'M0 8 v38 a22 8 0 0 0 44 0 v-38', class: 'f6-dbs' }, cyl);
    el('path', { d: 'M0 21 a22 8 0 0 0 44 0 M0 34 a22 8 0 0 0 44 0', class: 'f6-dbr' }, cyl);
    el('ellipse', { cx: 22, cy: 8, rx: 22, ry: 8, class: 'f6-dbt' }, cyl);
    txt(92, 452, 'f6-dbn', 'DATABASE');
    txt(320, 434, 'f6-ws', 'samples waiting'); const dbw = txt(320, 470, 'f6-dbv', '');
    txt(620, 434, 'f6-ws', 'done'); const dbd = txt(620, 470, 'f6-dbv done', '');
    const ret = txt(1576, 456, 'f6-ret', '', svg, { 'text-anchor': 'end' });
    const log = ctx.q('#fl6-log'); let lastLog = -1;
    return t => {
      let done = 0, held = 0, anyW = false;
      for (let i = 0; i < N; i++) {
        const sv = server(i, t), W = worker(i, t), S = SV[i], K = WK[i];
        S.r.setAttribute('class', 'f6-s ' + sv);
        S.st.textContent = sv === 'on' ? 'serving' : sv === 'sleep' ? 'lent to another job' : 'starting…';
        S.gp.forEach(g => g.setAttribute('class', 'f6-gpu ' + sv));
        K.g.style.opacity = W.s === 'none' ? 0 : 1; K.g.style.transform = W.s === 'none' ? 'translateY(10px)' : 'none';
        K.r.setAttribute('class', 'f6-w ' + W.s); K.st.textContent = STATUS[W.s];
        if (W.s !== 'none') { anyW = true; held += Math.round(W.held); }
        done += workMs(i, t) * RATE;
        const up = W.s === 'work' || W.s === 'fetch';
        linkS[i].setAttribute('class', 'f6-l' + (W.s === 'work' ? ' out' : ''));
        linkS[i].style.strokeDashoffset = (-t / 12).toFixed(1);
        linkD[i].setAttribute('class', 'f6-l' + (up ? ' in' : W.s === 'drain' ? ' back' : ''));
        linkD[i].style.strokeDashoffset = (W.s === 'drain' ? -t / 10 : t / 12).toFixed(1);
      }
      wait.style.opacity = anyW ? 0 : 1;
      dbd.textContent = Math.floor(done).toLocaleString('en-US');
      dbw.textContent = Math.max(0, TOTAL - Math.floor(done) - held).toLocaleString('en-US');
      ret.textContent = t >= LENT[0] && t < LENT[0] + 3500 ? '+8 samples sent back by workers 3 and 4' : '';
      let k = 0; LOG.forEach(([at], j) => { if (t >= at) k = j; });
      if (k !== lastLog) { lastLog = k; log.innerHTML = LOG[k][1]; }
    };
  }

  Deck.on('fleet', {
    enter(ctx) {
      const open = { heal: [1, 8, 8, 8, 8, 1, 1, 1, 1], scale: [5, 5, 5, 5, 5, 8, 8, 8, 5] };    // by step: an open panel collapses, a closed one opens
      if (!ctx.el.__fl5wired) {                                              // wire once: enter runs on every visit
        ctx.el.__fl5wired = true;
        ctx.qa('.fl5').forEach(card => card.addEventListener('click', e => {
          if (e.target.closest('button,input')) return;
          const st = Deck.state.step, which = card.classList.contains('heal') ? 'heal' : 'scale';
          if (st !== 0 && !e.target.closest('.fl5-h')) return;             // inside an open panel, only the header toggles
          e.stopPropagation();
          Deck.go(Deck.state.i, open[which][st]);
        }));
        ctx.qa('.fl6-steps button').forEach(b => b.addEventListener('click', e => {      // the three scaling steps, clickable
          e.stopPropagation(); Deck.go(Deck.state.i, +b.dataset.k); b.blur();
        }));
        ctx.qa('.fl5-rows > div').forEach((row, k) => row.addEventListener('click', e => {   // each case plays its own example
          if (Deck.state.step === 0) return;
          e.stopPropagation(); Deck.go(Deck.state.i, k + 2);
        }));
      }
      ctx.__render = build(ctx);
    },
    step(ctx, s, p) {
      if (p < 0) { ctx.el.classList.add('fl5-now'); ctx.after(() => ctx.el.classList.remove('fl5-now'), 80); }
      if (HEAL[s]) {                                           // heal examples: CSS keyframes, seeked through --f5t
        ctx.__hd = HEAL[s];                                    // held just before the loop resets
        if (!ctx.__hp) ctx.__hp = Deck.player(ctx, ctx.q('#fl5-pl'), { dur: ctx.__hd, fmt: (t, D) => t >= D ? 'finished' : '', render: t => ctx.el.style.setProperty('--f5t', -Math.min(t, ctx.__hd * .94).toFixed(0) + 'ms') });
        else ctx.__hp.restart(ctx.__hd);
      } else if (ctx.__hp) ctx.__hp.pause();
      if (SEG[s]) {                                           // scaling steps 1-3: play this step's slice of the timeline
        const [a, b] = SEG[s]; ctx.__sa = a;
        if (!ctx.__pl) ctx.__pl = Deck.player(ctx, ctx.q('#fl6-pl'), { dur: b - a, label: 'Time', mini: true, fmt: (t, d) => t >= d ? 'finished' : '', render: t => ctx.__render(ctx.__sa + t) });
        else ctx.__pl.restart(b - a);
      } else if (ctx.__pl) ctx.__pl.pause();
    },
    leave(ctx) { ctx.el.classList.remove('fl5-now'); ctx.__pl = ctx.__hp = null; },
  });
})();

/* the whole pipeline as one graph. Step 0: the graph alone. Steps 1-3 zoom into one rule each
   (routing, wait for all, wait for any) and loop a small example there. Step 4: zoom out, rules labelled. */
(function () {
  const U = Deck.util, W = 210, H = 58, VW = 1640, VH = 600;
  const NODES = [
    ['page', 10, 271, 'Page', 120], ['und', 180, 271, 'Understand'],
    ['tab', 470, 95, 'Read the table'], ['cht', 470, 195, 'Chart to JSON'], ['tex', 470, 295, 'Write as LaTeX'],
    ['txt', 470, 400, 'Transcribe text'], ['lay', 470, 500, 'Find the layout'],
    ['ask', 790, 145, 'Write a question'], ['ren', 790, 295, 'Render + compile'], ['gqa', 790, 450, 'Grounded Q&A'],
    ['ari', 1100, 80, 'Arithmetic verifier', 240], ['chk', 1100, 210, 'Check the answer', 240], ['ds', 1430, 295, 'Dataset', 190],
  ];
  const EDGES = [['page', 'und'], ['und', 'tab'], ['und', 'cht'], ['und', 'tex'], ['und', 'txt'], ['und', 'lay'],
    ['tab', 'ask', 'any'], ['cht', 'ask', 'any'], ['tex', 'ren'], ['txt', 'gqa'], ['lay', 'gqa'],
    ['ask', 'ari'], ['ask', 'chk'], ['ari', 'ds'], ['chk', 'ds'], ['ren', 'ds'], ['gqa', 'ds']];
  /* what each zoom shows: nodes kept bright, box to fit */
  const ZOOM = [null,
    { keep: ['page', 'und', 'tab', 'cht', 'tex', 'txt', 'lay'], box: [0, 70, 700, 580] },
    { keep: ['txt', 'lay', 'gqa'], box: [440, 370, 1030, 590] },
    { keep: ['tab', 'cht', 'ask'], box: [440, 60, 1030, 280] },
    null];
  const PAGES = [['chart', '#F28C28', ['cht']], ['table', '#2A63C9', ['tab']], ['formula', '#6B4BB8', ['tex']], ['text', '#0E7C61', ['txt', 'lay']]];
  const ZMS = 900, DURS = [0, ZMS + 4 * 2400, ZMS + 5200, ZMS + 3800, 0];   // per step: the zoom, then one run of the example
  const lerp = (a, b, k) => a + (b - a) * k, ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  Deck.on('gph', {
    enter(ctx) {
      const host = ctx.q('#gp4-svg'); host.innerHTML = '';
      const svg = U.svg('svg', { viewBox: `0 0 ${VW} ${VH}`, width: VW, height: VH }, host);
      const defs = U.svg('defs', {}, svg), mk = U.svg('marker', { id: 'gp4h', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, defs);
      U.svg('path', { d: 'M0 0L10 5L0 10z', fill: 'context-stroke' }, mk);
      const P = {}, N = {}, E = {};
      NODES.forEach(([k, x, y, , w]) => { P[k] = { x, y, w: w || W }; });
      const eg = U.svg('g', {}, svg), ng = U.svg('g', {}, svg), xg = U.svg('g', {}, svg), tg = U.svg('g', {}, svg);
      EDGES.forEach(([a, b, t]) => {
        const A = P[a], B = P[b], x1 = A.x + A.w, y1 = A.y + H / 2, x2 = B.x - 4, y2 = B.y + H / 2, m = (x1 + x2) / 2;
        E[a + '-' + b] = U.svg('path', { d: `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`, class: 'g4e' + (t ? ' ' + t : ''), 'marker-end': 'url(#gp4h)', 'data-a': a, 'data-b': b }, eg);
      });
      NODES.forEach(([k, x, y, label, w]) => {
        const g = U.svg('g', { class: 'g4n' + (k === 'ds' ? ' k' : ''), 'data-k': k }, ng);
        U.svg('rect', { x, y, width: w || W, height: H, rx: 14 }, g);
        U.svg('text', { x: x + (w || W) / 2, y: y + 37 }, g).textContent = label;
        N[k] = g;
      });
      /* labels for the zoomed examples and the final summary */
      const tag = (x, y, cls, txt) => { const g = U.svg('g', { class: 'g4b ' + cls }, xg); const r = U.svg('rect', { x: x - 60, y: y - 15, width: 120, height: 30, rx: 15 }, g); const t = U.svg('text', { x, y: y + 6 }, g); t.textContent = txt; return { g, r, t }; };
      const say = (x, y, cls) => { const t = U.svg('text', { x, y, class: 'g4say ' + cls }, xg); return t; };
      ctx.__x = {
        type: say(285, 255, 'z1'), cnt: say(895, 438, 'z2'), any: say(895, 133, 'z3'), never: say(782, 112, 'z3 no'),
        tags: [tag(285, 268, 'r sum', 'routes'), tag(895, 448, 'l sum', 'needs both'), tag(895, 143, 'a sum', 'either one')],
      };
      ctx.__x.tags.forEach(o => { o.r.setAttribute('width', 150); o.r.setAttribute('x', +o.r.getAttribute('x') - 15); });
      ctx.__g = { svg, P, N, E, tg, vb: [0, 0, VW, VH], st: 0, pt: 0 };
      ctx.raf(() => tick(ctx));
    },
    step(ctx, s, p) {
      const G = ctx.__g; G.st = s; G.pt = 0; G.tg.innerHTML = ''; G.tok = null;
      if (DURS[s]) {                                           // steps 1-3 run on a small player bar
        if (!ctx.__pl) ctx.__pl = Deck.player(ctx, ctx.q('#gp4-pl'), { dur: DURS[s], mini: true, fmt: (t, d) => t >= d ? 'finished' : '', render: t => { G.pt = t; } });
        else ctx.__pl.restart(DURS[s]);
      } else if (ctx.__pl) ctx.__pl.pause();
      ctx.el.dataset.st = s;
      const Z = ZOOM[s], keep = Z ? new Set(Z.keep) : null;
      Object.entries(G.N).forEach(([k, g]) => g.classList.toggle('dim', !!keep && !keep.has(k)));
      Object.values(G.E).forEach(e => e.classList.toggle('dim', !!keep && !(keep.has(e.dataset.a) && keep.has(e.dataset.b))));
      let to = [0, 0, VW, VH];
      if (Z) { const [x0, y0, x1, y1] = Z.box, sc = Math.min(VW / (x1 - x0), VH / (y1 - y0)), w = VW / sc, h = VH / sc; to = [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h]; }
      const from = G.vb.slice(), t0 = performance.now(), dur = p < 0 ? 0 : ZMS;
      G.zoom = { from, to, t0, dur };
    },
  });

  function tick(ctx) {
    const G = ctx.__g, X = ctx.__x, now = performance.now();
    if (G.zoom) {
      const { from, to, t0, dur } = G.zoom, k = dur ? Math.min(1, (now - t0) / dur) : 1, e = ease(k);
      G.vb = from.map((v, i) => lerp(v, to[i], e)); G.svg.setAttribute('viewBox', G.vb.map(v => v.toFixed(1)).join(' '));
      if (k >= 1) G.zoom = null;
    }
    const s = G.st, t = Math.min(G.pt, DURS[s] - 1) - ZMS;     // player time; held on the last frame
    Object.values(G.N).forEach(g => g.classList.remove('hot', 'go'));
    Object.values(G.E).forEach(e => e.classList.remove('hot'));
    G.tg.innerHTML = '';
    X.type.textContent = X.cnt.textContent = X.any.textContent = X.never.textContent = '';
    if (t < 0) return;
    const tok = (key, f, c) => { const e = G.E[key], L = e.getTotalLength(), q = e.getPointAtLength(Math.max(0, Math.min(1, f)) * L); const g = U.svg('g', { transform: `translate(${q.x} ${q.y})` }, G.tg); U.svg('rect', { x: -10, y: -13, width: 20, height: 26, rx: 4, fill: c, stroke: '#fff', 'stroke-width': 2.5 }, g); };
    const hot = (k, cls = 'hot') => G.N[k].classList.add(cls);
    if (s === 1) {                                             // routing: one page type every 2.4 s
      const T = 2400, i = Math.floor(t / T) % PAGES.length, u = (t % T) / T, [name, c, to] = PAGES[i];
      if (u < .3) tok('page-und', u / .3, c);
      else { X.type.textContent = 'page_type = ' + name; X.type.style.fill = c; hot('und'); }
      if (u >= .38 && u < .78) to.forEach(k => { tok('und-' + k, (u - .38) / .4, c); G.E['und-' + k].classList.add('hot'); });
      if (u >= .78) to.forEach(k => { hot(k); G.E['und-' + k].classList.add('hot'); });
    } else if (s === 2) {                                      // wait for all: text first, layout later
      const T = 5200, u = (t % T) / T, c = '#0E7C61';
      if (u < .2) tok('txt-gqa', u / .2, c);
      if (u >= .2) { hot('txt', 'go'); G.E['txt-gqa'].classList.add('hot'); }
      if (u >= .2 && u < .5) { X.cnt.textContent = 'text arrived · still needs layout'; }
      if (u >= .45 && u < .65) tok('lay-gqa', (u - .45) / .2, c);
      if (u >= .65) { hot('lay', 'go'); G.E['lay-gqa'].classList.add('hot'); hot('gqa', 'go'); X.cnt.textContent = 'both arrived → starts, once'; }
    } else if (s === 3) {                                      // wait for any: a chart page never reaches the table reader
      const T = 3800, u = (t % T) / T, c = '#F28C28';
      X.never.textContent = 'never comes for a chart page';
      if (u < .3) tok('cht-ask', u / .3, c);
      if (u >= .3) { hot('cht', 'go'); G.E['cht-ask'].classList.add('hot'); hot('ask', 'go'); X.any.textContent = 'chart arrived → starts'; }
    }
  }
})();
