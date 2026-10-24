(function () {
  const U = Deck.util, clamp = U.clamp;

  /* ── StageWeaver: kinds of stages ── */
  Deck.on('swcap', {
    enter(ctx) {
      const root = ctx.q('#sw-kinds'); root.innerHTML = '';
      const svg = U.svg('svg', { viewBox: '0 0 700 540', width: 700, height: 540 }, root);
      const df = U.svg('defs', {}, svg), mk = U.svg('marker', { id: 'swh', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, df); U.svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#9DB3DC' }, mk);
      const W = 150, H = 54;
      const N = { R: [90, 60, 'root', 'root'], S1: [320, 60, 'stage', 'stage'], T1: [575, 20, 'routing target', 'rt'], T2: [575, 110, 'routing target', 'rt'], R2: [90, 260, 'root', 'root'], S2: [320, 260, 'stage', 'stage'], F: [575, 260, 'fan-in', 'fan'], L: [575, 410, 'leaf', 'leaf'] };
      const STY = { root: ['#fff', '#2A63C9', 4, ''], stage: ['#fff', '#9DB3DC', 3, ''], rt: ['#FFF4E2', '#F28C28', 3.5, '8 6'], fan: ['#ECE6F8', '#6B4BB8', 3.5, ''], leaf: ['#DDF1EA', '#0E7C61', 3.5, ''] };
      const E = [['R', 'S1'], ['S1', 'T1', 'rf'], ['S1', 'T2', 'rf'], ['R2', 'S2'], ['S2', 'F'], ['T1', 'F'], ['T2', 'F'], ['F', 'L']];
      const paths = E.map(([a, b, k]) => {
        const A = N[a], B = N[b]; let d;
        if (A[0] === B[0]) d = `M${A[0]} ${A[1] + H / 2} L${B[0]} ${B[1] - H / 2 - 4}`;
        else { const x1 = A[0] + W / 2, y1 = A[1], x2 = B[0] - W / 2 - 4, y2 = B[1], m = (x1 + x2) / 2; d = `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`; }
        if (a === 'T1' || a === 'T2') d = `M${A[0]} ${A[1] + H / 2} C${A[0] + 50} ${A[1] + 100} ${B[0] + 50} ${B[1] - 80} ${B[0]} ${B[1] - H / 2 - 4}`;
        return U.svg('path', { d, fill: 'none', stroke: k ? '#F28C28' : '#B4C2DF', 'stroke-width': 3.5, 'stroke-dasharray': k ? '8 6' : '', 'marker-end': 'url(#swh)' }, svg);
      });
      Object.entries(N).forEach(([k, [x, y, lab, sty]]) => {
        const [f, s, w, dash] = STY[sty]; U.svg('rect', { x: x - W / 2, y: y - H / 2, width: W, height: H, rx: 16, fill: f, stroke: s, 'stroke-width': w, 'stroke-dasharray': dash }, svg);
        const t = U.svg('text', { x, y: y + 7, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 600, fill: '#0E1A3A', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = lab;
      });
      const nt = (x, y, s, c) => { const t = U.svg('text', { x, y, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 600, fill: c, 'font-family': 'IBM Plex Sans' }, svg); t.textContent = s; };
      nt(445, 82, 'routing fn', '#B85C0A'); nt(575, 340, 'every | one', '#6B4BB8');
      [['root: entry point', '#2A63C9'], ['routing target: entered only by routing', '#F28C28'], ['fan-in: entered by the sweep', '#6B4BB8'], ['leaf: completes the sample', '#0E7C61']].forEach(([s, c], i) => { U.svg('rect', { x: 0, y: 470 + i * 0, width: 0, height: 0 }, svg); });
      const dots = paths.map((p, i) => ({ p, el: U.svg('circle', { r: 8, fill: '#F28C28' }, svg), o: i * .13 }));
      ctx.raf(t => dots.forEach(d => { const L = d.p.getTotalLength(), f = ((t / 2600) + d.o) % 1, pt = d.p.getPointAtLength(f * L); d.el.setAttribute('cx', pt.x); d.el.setAttribute('cy', pt.y); }));
      ctx.el.classList.remove('go'); void ctx.el.offsetWidth; ctx.el.classList.add('go');   // cards come in one by one
    },
    leave(ctx) { ctx.el.classList.remove('go'); },
  });

  /* ── StageWeaver: the ledger of one sample ── */
  const LNAMES = ['Understand', 'Charts', 'Tables', 'Forms', 'Text', 'Questions', 'Verify'];
  const LST = [
    { d: [], t: [], m: 'Each sample in flight has one row with two integers: <b>done</b> and <b>told</b>. Bit positions come from the graph.', who: -1 },
    { d: [], t: [0], m: '<b>Seeded.</b> The root’s told bit is set.', who: 0 },
    { d: [0], t: [0, 1], m: '<b>Understand finishes.</b> Routing says “chart”: Charts is told.', who: 0 },
    { d: [0, 1], t: [0, 1, 5], m: '<b>Charts finishes.</b> Questions waits for any of Charts, Tables, Text: the sweep tells it.', who: 1 },
    { d: [0, 1, 5], t: [0, 1, 5, 6], m: '<b>Questions finishes.</b> Verify waits for any of Forms, Questions: told.', who: 5 },
    { d: [0, 1, 5, 6], t: [0, 1, 5, 6], m: '<b>Verify finishes.</b> It is the only leaf: done ∧ L = L. <b>The row is deleted.</b>', who: 6 },
  ];
  Deck.on('ledger', {
    enter(ctx) {
      const root = ctx.q('#led'); root.innerHTML = '';
      const X = i => 200 + i * 210;
      const nd = LNAMES.map((n, i) => U.html('div', { class: 'nd', html: `${n}<small>bit ${i}</small>`, style: `left:${X(i)}px` }, root));
      U.html('div', { class: 'rl', style: 'top:128px', html: '<div>done<small>stages that finished it</small></div>' }, root); U.html('div', { class: 'rl', style: 'top:222px', html: '<div>told<small>stages handed it</small></div>' }, root);
      const D = LNAMES.map((_, i) => U.html('div', { class: 'bit', style: `left:${X(i) + 44}px;top:128px`, text: '0' }, root)), T = LNAMES.map((_, i) => U.html('div', { class: 'bit', style: `left:${X(i) + 44}px;top:222px`, text: '0' }, root));
      const bs = U.html('div', { class: 'bstr', style: 'left:0;top:316px' }, root);
      const del = U.html('div', { class: 'delrow', text: 'row deleted', style: 'left:0;top:128px;width:1680px;height:156px' }, root);
      ctx.__lg = { nd, D, T, bs, del };
    },
    step(ctx, s) {
      const { nd, D, T, bs, del } = ctx.__lg, st = LST[s];
      D.forEach((e, i) => { const on = st.d.includes(i); e.textContent = on ? 1 : 0; e.classList.toggle('f1', on); });
      T.forEach((e, i) => { const on = st.t.includes(i); e.textContent = on ? 1 : 0; e.classList.toggle('r1', on); });
      nd.forEach((e, i) => e.classList.toggle('fin', st.d.includes(i)));
      const bin = a => [6, 5, 4, 3, 2, 1, 0].map(i => a.includes(i) ? 1 : 0).join('');
      bs.innerHTML = `done = <b>${bin(st.d)}</b> &nbsp;&nbsp; told = <b>${bin(st.t)}</b> <span>(bit 6 … bit 0)</span>`;
      del.classList.toggle('on', s === 5);
      ctx.q('#led-msg').innerHTML = st.m;
    },
  });

  /* ── StageWeaver: routing is a write, fan-in is a query ── */
  Deck.on('paths', {
    enter(ctx) {
      const R = ctx.q('#ap-r'), S = ctx.q('#ap-s'); R.innerHTML = ''; S.innerHTML = '';
      const sr = U.svg('svg', { viewBox: '0 0 764 340', width: 764, height: 340 }, R), ss = U.svg('svg', { viewBox: '0 0 764 340', width: 764, height: 340 }, S);
      const box = (svg, x, y, w, h, t, f, st) => { U.svg('rect', { x, y, width: w, height: h, rx: 14, fill: f || '#fff', stroke: st || '#C3CEE5', 'stroke-width': 3 }, svg); const e = U.svg('text', { x: x + w / 2, y: y + h / 2 + 7, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 600, fill: '#0E1A3A', 'font-family': 'IBM Plex Sans' }, svg); e.textContent = t; };
      // routing
      box(sr, 20, 120, 190, 70, 'Understand'); [['Charts', 30], ['Tables', 135], ['Text', 240]].forEach(([n, y]) => { box(sr, 520, y, 200, 62, n); U.svg('path', { d: `M212 155 C340 155 380 ${y + 31} 516 ${y + 31}`, fill: 'none', stroke: '#C3CEE5', 'stroke-width': 3 }, sr); });
      const rf = U.svg('text', { x: 330, y: 110, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 600, fill: '#1F4FA8', 'font-family': 'IBM Plex Sans' }, sr); rf.textContent = 'routing function → queue rows + told bits';
      const toks = [];
      // sweep
      U.svg('rect', { x: 20, y: 20, width: 280, height: 300, rx: 14, fill: '#fff', stroke: '#C3CEE5', 'stroke-width': 3 }, ss); const lt = U.svg('text', { x: 160, y: 50, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: '#5B6785', 'font-family': 'IBM Plex Sans' }, ss); lt.textContent = 'ledger: samples in flight';
      const rows = [...Array(8)].map((_, i) => { const r = U.svg('rect', { x: 40, y: 66 + i * 30, width: 240, height: 22, rx: 6, fill: '#EDF1FA' }, ss); return r; });
      U.svg('circle', { cx: 400, cy: 170, r: 52, fill: '#fff', stroke: '#6B4BB8', 'stroke-width': 4 }, ss); const hand = U.svg('line', { x1: 400, y1: 170, x2: 400, y2: 128, stroke: '#6B4BB8', 'stroke-width': 5, 'stroke-linecap': 'round' }, ss); const ct = U.svg('text', { x: 400, y: 250, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 600, fill: '#6B4BB8', 'font-family': 'IBM Plex Sans' }, ss); ct.textContent = 'every 5 s';
      box(ss, 520, 120, 220, 70, 'Questions', '#ECE6F8', '#6B4BB8'); const cnt = U.svg('text', { x: 630, y: 222, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 700, fill: '#6B4BB8', 'font-family': 'IBM Plex Sans' }, ss);
      const o = { rOn: false, sOn: false, n: 0, t0: performance.now() };
      ctx.raf(() => {
        const now = performance.now();
        if (o.rOn) { const f = ((now - o.t0) / 3400) % 1; toks.forEach(t => t.el.remove()); toks.length = 0; if (f > .15) [30, 135, 240].forEach((y, i) => { const g = clamp((f - .15 - i * .05) / .5, 0, 1); if (g > 0 && g < 1) { const x = 212 + (516 - 212) * g, yy = 155 + (y + 31 - 155) * g; toks.push({ el: U.svg('circle', { cx: x, cy: yy, r: 10, fill: ['#2A63C9', '#F28C28', '#6B4BB8'][i] }, sr) }); } }); }
        if (o.sOn) { const f = ((now - o.t0) / 5000) % 1; hand.setAttribute('transform', `rotate(${f * 360} 400 170)`); rows.forEach((r, i) => r.setAttribute('fill', f > .15 + i * .09 && f < .98 ? (i % 3 === 0 ? '#EDF1FA' : '#DDF1EA') : '#EDF1FA')); if (f > .98 && !o.fired) { o.fired = true; o.n += 5; cnt.textContent = 'tells ' + o.n; } if (f < .5) o.fired = false; }
      });
      ctx.__ap = o;
    },
    step(ctx, s) { const o = ctx.__ap; o.rOn = s >= 1; o.sOn = s >= 2; o.t0 = performance.now(); },
  });

  /* ── StageWeaver: process layout ── */
  Deck.on('layout', {
    enter(ctx) {
      const root = ctx.q('#ly-dia'); root.innerHTML = '';
      const svg = U.svg('svg', { width: 1680, height: 600, viewBox: '0 0 1680 600', style: 'position:absolute;left:0;top:0;pointer-events:none' }, root);
      const df = U.svg('defs', {}, svg), mk = U.svg('marker', { id: 'lyh', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, df); U.svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#7C879F' }, mk);
      const b = (cls, l, t, w, h, html) => U.html('div', { class: 'lyb ' + cls, style: `left:${l}px;top:${t}px;width:${w}px;height:${h}px`, html }, root);
      const main = b('m', 560, 0, 560, 70, '<h4>Main process</h4><span>validate graph · ingest</span>');
      const la = b('l', 0, 110, 780, 440, '<h4>Group leader A</h4><span>init_fn starts the backend; term_fn stops it last</span>'), lb = b('l', 820, 110, 450, 440, '<h4>Group leader B</h4><span>its own backend</span>');
      const s0 = b('s', 30, 190, 220, 90, '<h4>Stage 0</h4><span>process</span>'), s1 = b('s', 280, 190, 220, 90, '<h4>Stage 1</h4><span>process</span>'), s2 = b('s', 850, 190, 220, 90, '<h4>Stage 2</h4><span>process</span>');
      const pa = b('p', 30, 340, 720, 180, '<h4>Worker pool + model servers</h4><span>one copy, shared by stages 0 and 1</span>'), pb = b('p', 850, 340, 390, 180, '<h4>Worker pool</h4><span>another model</span>');
      const sw = b('w', 1310, 110, 360, 130, '<h4>Sweep process</h4><span>ledger query every 5 s</span>');
      const db = b('d', 1310, 280, 360, 110, '<h4>DB</h4><span>queues · ledger</span>');
      const ln = (d, c, dash) => U.svg('path', { d, fill: 'none', stroke: c || '#7C879F', 'stroke-width': 3.5, 'stroke-dasharray': dash || '', 'marker-end': 'url(#lyh)' }, svg);
      ln('M640 72 C640 90 390 80 390 108'); ln('M960 72 C960 90 1045 80 1045 108'); ln('M1100 40 C1200 40 1490 60 1490 108');
      const req = [ln('M140 282 V338', '#2A63C9'), ln('M390 282 V338', '#2A63C9')], rsp = [ln('M170 338 V284', '#0E7C61'), ln('M420 338 V284', '#0E7C61')];
      const lbl = (x, y, s, c) => { const t = U.svg('text', { x, y, 'font-size': 18, fill: c, 'font-family': 'IBM Plex Sans', 'font-weight': 600 }, svg); t.textContent = s; };
      lbl(520, 304, 'shared request queue', '#2A63C9'); lbl(520, 330, 'private response queues', '#0E7C61');
      const sig = [ln('M780 74 V104', '#C93C3C', '6 5'), ln('M390 150 V186', '#C93C3C', '6 5'), ln('M1045 150 V186', '#C93C3C', '6 5')]; sig.forEach(e => e.style.opacity = 0);
      ctx.__ly = { main, la, lb, s0, s1, s2, pa, pb, sw, db, req, rsp, sig };
    },
    step(ctx, s) {
      const o = ctx.__ly;
      [o.s0, o.s1, o.s2].forEach(e => e.classList.toggle('hl', s === 1)); [o.pa, o.s0, o.s1].forEach(e => { if (s === 2) e.classList.add('hl'); else if (s !== 1) e.classList.remove('hl'); });
      [o.main, o.la, o.lb].forEach(e => e.classList.toggle('hl', s === 3)); o.sig.forEach(e => e.style.opacity = s === 3 ? 1 : 0);
      [...o.req, ...o.rsp].forEach(e => e.style.opacity = s >= 2 ? 1 : .3);
      ctx.q('#ly-cap').innerHTML = ['The main process validates the graph, then spawns a sweep and one group leader per backend.', '<b>One process per stage</b>, each with its own database connection.', 'Stages in a group <b>share one backend</b>: shared request queue, private response queues.', 'Supervisors forward SIGTERM and outlive their children. <b>The backend is stopped last.</b>'][s];
    },
  });

  /* ── comparison table ── */
  const LS = [
    ['LLM and synthetic-data frameworks', [['distilabel', 'PYYPNPPNXXX'], ['SyGra', 'YYPPNNPNXXX'], ['LangGraph', 'YYPPNNPNNNX'], ['Matrix', 'YPYNNPPNXXX']]],
    ['Batch data processing', [['NeMo Curator', 'NNYNNPNNXXX'], ['Data-Juicer', 'NNPNNPNNXXX'], ['DataTrove', 'PNNPPNPNYYX'], ['Ray Data', 'NNYPNYPNXXX']]],
    ['Workflow and stream engines', [['Flink', 'YYYYPPNNYXX'], ['ExoFlow', 'PYYPPPNNXXX'], ['Airflow', 'NYNPPYNNPPX']]],
    ['Durable execution', [['DBOS', 'YYYPYYPNNNN'], ['Temporal', 'YYYPYYPNNNN']]],
  ];
  Deck.on('landscape', {
    enter(ctx) {
      const host = ctx.q('#ls-tab'); host.innerHTML = '';
      const sym = c => `<span class="sy ${c.toLowerCase()}"></span>`;
      let h = '<table><tr><th></th><th colspan="3" class="grp">Dynamic graphs</th><th colspan="2" class="grp">Crash safety</th><th colspan="3" class="grp">Shared, changing cluster</th><th colspan="3" class="grp">Cost of durability</th></tr><tr><th></th><th>Route per sample</th><th>Fan-in</th><th>Stages at once</th><th>Exactly once</th><th>Self-healing</th><th>Auto-scaling</th><th>Follows servers</th><th>Outage ≠ bad sample</th><th>Bulk writes</th><th>Answers out of database</th><th>Database not the limit</th></tr>';
      LS.forEach(([g, rows], gi) => { h += `<tr class="cat off" data-g="${gi + 1}"><td colspan="12">${g}</td></tr>`; rows.forEach(([n, c]) => { h += `<tr class="row off" data-g="${gi + 1}"><td>${n}</td>${[...c].map(x => `<td>${sym(x)}</td>`).join('')}</tr>`; }); });
      h += `<tr class="row ours off" data-g="5"><td>Patram-Ingest</td>${('<td>' + sym('Y') + '</td>').repeat(11)}</tr></table>`;
      host.innerHTML = h;
    },
    step(ctx, s) { ctx.qa('#ls-tab tr[data-g]').forEach(r => r.classList.toggle('off', +r.dataset.g > s)); },
  });

  /* ── head-to-head throughput ── */
  Deck.on('h2h', {
    enter(ctx) {
      const host = ctx.q('#hh-chart'); host.innerHTML = '';
      const svg = U.svg('svg', { viewBox: '0 0 940 540', width: 940, height: 540 }, host);
      const X0 = 230, SC = 640 / 9000, rows = [['DBOS', 1376, '#C93C3C', '1,376', 'peak 1,400', 1], ['Temporal', 302, '#C93C3C', '302', 'peak 546', 2], ['Patram-Ingest', 8571, '#0E7C61', '8,571', '6× DBOS · 28× Temporal', 3]];
      ctx.__hh = rows.map(([n, v, c, lab, note, st], i) => {
        const y = 30 + i * 150, g = U.svg('g', { style: 'opacity:0;transition:opacity .6s' }, svg);
        const nm = U.svg('text', { x: X0 - 16, y: y + 40, 'text-anchor': 'end', 'font-size': 26, 'font-weight': 700, fill: '#0E1A3A', 'font-family': 'IBM Plex Sans' }, g); nm.textContent = n;
        U.svg('rect', { x: X0, y, width: Math.max(v * SC, 8), height: 62, rx: 10, fill: c }, g);
        const lv = U.svg('text', { x: X0 + Math.max(v * SC, 8) + 16, y: y + 42, 'font-size': 32, 'font-weight': 700, fill: '#0E1A3A', 'font-family': 'IBM Plex Mono' }, g); lv.textContent = lab;
        const nt = U.svg('text', { x: X0, y: y + 98, 'font-size': 22, fill: '#42506B', 'font-family': 'IBM Plex Sans' }, g); nt.textContent = note;
        return { g, st };
      });
    },
    step(ctx, s) { ctx.__hh.forEach(r => r.g.style.opacity = s >= r.st ? 1 : 0); },
  });

  /* ── outage: failed good pages ── */
  Deck.on('outage', {
    enter(ctx) {
      const mk = (id, fail) => { const g = ctx.q(id); g.innerHTML = ''; const cells = [...Array(240)].map(() => U.html('u', {}, g)); const order = [...Array(240).keys()].sort(() => U.rng(5)() - .5); return { cells, order, nf: Math.round(fail * 240) }; };
      const A = mk('#og-a', 14056 / 49894), B = mk('#og-b', 45099 / 49894), C = mk('#og-c', 0);
      const rng = U.rng(77); [A, B].forEach(G => { G.order = [...Array(240).keys()]; for (let i = 239; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[G.order[i], G.order[j]] = [G.order[j], G.order[i]]; } });
      ctx.__og = { A, B, C, done: {} };
    },
    step(ctx, s) {
      const o = ctx.__og, fill = (G, key, el, to) => {
        if (o.done[key]) return; o.done[key] = true;
        G.order.slice(0, G.nf).forEach((ci, i) => ctx.after(() => G.cells[ci].classList.add('f'), 400 + i * 9));
        U.countUp(ctx, ctx.q(el), to, 1800);
      };
      if (s >= 1) fill(o.A, 'a', '#on-a', 14056); if (s >= 2) fill(o.B, 'b', '#on-b', 45099);
      if (s < 1) { o.done = {}; [o.A, o.B].forEach(G => G.cells.forEach(c => c.classList.remove('f'))); ctx.q('#on-a').textContent = 0; ctx.q('#on-b').textContent = 0; }
    },
  });

  /* ── overhead and scaling ── */
  Deck.on('overhead', {
    enter(ctx) {
      const host = ctx.q('#ov-line'); host.innerHTML = '';
      const svg = U.svg('svg', { viewBox: '0 0 1680 270', width: 1680, height: 270 }, host);
      const X0 = 330, SC = 1000 / 190;
      const g = U.svg('g', { style: 'opacity:0;transition:opacity .7s' }, svg);
      [['Linear, 48 nodes', 186.2, '#9DB3DC', '186.2 /s', 20], ['Measured, 48 nodes', 183.6, '#0E7C61', '183.6 /s', 120]].forEach(([n, v, c, lab, y]) => {
        const t = U.svg('text', { x: X0 - 16, y: y + 40, 'text-anchor': 'end', 'font-size': 25, 'font-weight': 600, fill: '#0E1A3A', 'font-family': 'IBM Plex Sans' }, g); t.textContent = n;
        U.svg('rect', { x: X0, y, width: v * SC, height: 58, rx: 10, fill: c }, g);
        const l = U.svg('text', { x: X0 + v * SC + 16, y: y + 40, 'font-size': 28, 'font-weight': 700, fill: '#0E1A3A', 'font-family': 'IBM Plex Mono' }, g); l.textContent = lab;
      });
      ctx.__ov = { g, done: {} };
    },
    step(ctx, s) {
      const o = ctx.__ov; o.g.style.opacity = s >= 2 ? 1 : 0;
      ctx.qa('[data-count]').forEach((b, i) => { if (s >= i + 1 && !o.done[i]) { o.done[i] = 1; const to = +b.dataset.count, dec = +b.dataset.dec || 0, suf = b.dataset.suffix || ''; U.countUp(ctx, b, to, 1400, v => v.toFixed(dec) + suf); } });
    },
  });
})();
