/* v4: ledger (two rows of switches) and the scaling chart */
(function () {
  const U = Deck.util;

  /** how to move between steps: settle(k) puts the slide in the finished state of step k;
      anim(s) plays the transition into step s. Called from a module's step(). */
  const stepper = (settle, anim) => (ctx, s, p) => {
    ctx.cancel();
    if (p >= 0 && s === p + 1) { settle(ctx, p); anim(ctx, s); } else settle(ctx, s);
  };

  /* ── ledger: two bitmasks per sample (done, told); steps walk one page through a wait-for-all merge ── */
  Deck.on('ledger2', {
    enter(ctx) {
      const host = ctx.q('#lg-graph'); host.innerHTML = '';
      const svg = U.svg('svg', { viewBox: '0 0 900 480', width: 900, height: 480 }, host);
      const defs = U.svg('defs', {}, svg); const mk = U.svg('marker', { id: 'lgh', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, defs); U.svg('path', { d: 'M0 0L10 5L0 10z', fill: '#7C879F' }, mk);
      const P = { u: [0, 190], x: [340, 50], l: [340, 330], q: [670, 190] }, NW = 220, NH = 80;
      [['u', 'x'], ['u', 'l'], ['x', 'q'], ['l', 'q']].forEach(([a, b]) => { const [x1, y1] = P[a], [x2, y2] = P[b]; U.svg('path', { d: `M${x1 + NW} ${y1 + NH / 2} C${x1 + NW + 70} ${y1 + NH / 2} ${x2 - 70} ${y2 + NH / 2} ${x2 - 4} ${y2 + NH / 2}`, fill: 'none', stroke: '#7C879F', 'stroke-width': 4, 'marker-end': 'url(#lgh)' }, svg); });
      const nm = { u: 'Understand', x: 'Text', l: 'Layout', q: 'Grounded Q&A' }, where = { x: 'node 3', l: 'node 7' }; ctx.__n = {};
      Object.keys(P).forEach(k => {
        const g = U.svg('g', { class: 'nd' }, svg); U.svg('rect', { x: P[k][0], y: P[k][1], width: NW, height: NH, rx: 16 }, g);
        const t = U.svg('text', { x: P[k][0] + NW / 2, y: P[k][1] + 50 }, g); t.textContent = nm[k];
        if (where[k]) { const w = U.svg('text', { x: P[k][0] + NW / 2, y: P[k][1] + NH + 32, class: 'wh' }, g); w.textContent = where[k]; }
        ctx.__n[k] = g;
      });
      const b = U.svg('g', { class: 'lg-all' }, svg); U.svg('rect', { x: 740, y: 160, width: 100, height: 28, rx: 14 }, b); const bt = U.svg('text', { x: 790, y: 180 }, b); bt.textContent = 'all';
      ctx.__sw = U.svg('text', { x: 780, y: 310, class: 'lg-sw' }, svg);
      ctx.__cap = ctx.q('#lg-cap');
    },
    step(ctx, s) {
      const F = ctx.qa('#lg-f i'), R = ctx.qa('#lg-r i'), n = ctx.__n;
      const done = [s >= 2, s >= 3, s >= 4, false], told = [s >= 1, s >= 2, s >= 2, s >= 4];
      F.forEach((e, i) => e.classList.toggle('on', done[i])); R.forEach((e, i) => e.classList.toggle('on', told[i]));
      ['u', 'x', 'l', 'q'].forEach((k, i) => { n[k].classList.toggle('dn', done[i]); n[k].classList.toggle('rdy', told[i] && !done[i]); });
      ctx.__sw.textContent = s === 3 ? 'sweep → wait' : s === 4 ? 'sweep → start, once' : '';
      ctx.__sw.classList.toggle('go', s === 4);
      ctx.__cap.innerHTML = [
        'One row per sample in flight: <b>done</b> and <b>told</b>, one bit per stage. Deleted when the sample finishes.',
        'A page enters. <b>Understand</b> is handed it: its told bit is set.',
        'Understand finishes; its routing function says “text”. Hand-off order: <b>write the queues, set told, then set own done</b>. Each step is safe to repeat.',
        '<b>Text</b> finishes on node 3. The sweep asks: all inputs done, and not yet told? Layout is not done, so it waits.',
        '<b>Layout</b> finishes on node 7, minutes later. The sweep matches, hands the page to <b>Grounded Q&amp;A</b> and sets told, so it never matches again: <b>exactly once</b>.',
      ][s];
    },
  });

  /* ── scaling chart (paper Fig. 4) ── */
  Deck.on('scale2', {
    enter(ctx) {
      const host = ctx.q('#sc2-chart'); host.innerHTML = '';
      const W = 990, H = 560, X0 = 90, X1 = 660, Y0 = 500, Y1 = 30, N = [4, 8, 16, 24, 32];
      const svg = U.svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
      const X = n => X0 + (n - 4) / 28 * (X1 - X0), Y = v => Y0 - v / 10000 * (Y0 - Y1);
      [0, 2500, 5000, 7500, 10000].forEach(v => { U.svg('line', { x1: X0, x2: X1 + 20, y1: Y(v), y2: Y(v), stroke: '#E3E8F1', 'stroke-width': 2 }, svg); const t = U.svg('text', { x: X0 - 14, y: Y(v) + 8, 'text-anchor': 'end', 'font-size': 22, fill: '#5B6785', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = v ? (v / 1000) + 'k' : '0'; });
      N.forEach(n => { const t = U.svg('text', { x: X(n), y: Y0 + 38, 'text-anchor': 'middle', 'font-size': 24, fill: '#5B6785', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = n; });
      const xl = U.svg('text', { x: (X0 + X1) / 2, y: Y0 + 76, 'text-anchor': 'middle', 'font-size': 23, fill: '#5B6785', 'font-family': 'IBM Plex Sans' }, svg); xl.textContent = 'nodes';
      const S = [
        { k: 'd', n: 'DBOS', c: '#D9822B', v: [630, 1140, 1360, 1390, 1376], end: '1,376', st: 1 },
        { k: 't', n: 'Temporal', c: '#C93C3C', v: [546, 390, 260, 330, 302], end: '302', st: 1 },
        { k: 'o', n: 'Patram-Ingest', c: '#0E7C61', v: [1650, 3200, 5900, 7700, 8571], end: '8,571', st: 2 },
      ];
      ctx.__S = S.map(s => {
        const g = U.svg('g', { style: 'opacity:0;transition:opacity .8s' }, svg);
        const pts = N.map((n, i) => `${X(n)},${Y(s.v[i])}`).join(' ');
        U.svg('polyline', { points: pts, fill: 'none', stroke: s.c, 'stroke-width': 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
        N.forEach((n, i) => U.svg('circle', { cx: X(n), cy: Y(s.v[i]), r: 8, fill: s.c }, g));
        const e = U.svg('text', { x: X(32) + 22, y: Y(s.v[4]) + (s.k === 'd' ? -12 : s.k === 't' ? 30 : 8), 'font-weight': 700, fill: s.c }, g);
        const t1 = U.svg('tspan', { 'font-size': 23, 'font-family': 'IBM Plex Sans' }, e); t1.textContent = s.n + '  ';
        const t2 = U.svg('tspan', { 'font-size': 28, 'font-family': 'IBM Plex Mono' }, e); t2.textContent = s.end;
        return { g, st: s.st };
      });
    },
    step(ctx, s) { ctx.__S.forEach(o => o.g.style.opacity = 1); },
  });

})();
