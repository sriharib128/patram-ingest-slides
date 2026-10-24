/* bit-mask explainer: how the engine tracks a page through a graph (two numbers per page: Finished, Ready) */
(function () {
  const U = Deck.util;
  const NAMES = ['Understand', 'Text', 'Layout', 'Grounded Q&A'];

  /** a grid of switches: header row of stage names, then one row per spec in o.rows.
      Returns { rows: { key: { set(bits, {num}), show(on), w } } }. */
  function grid(host, o) {
    host.innerHTML = ''; host.classList.add('bm-g');
    const add = (cls, html, parent) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; (parent || host).appendChild(d); return d; };
    add('c', '');
    (o.names || NAMES).forEach((n, i) => add('h', n.replace('&', '&amp;') + (o.seats ? `<small>seat ${i}</small>` : '')));
    add('c', '');
    const rows = {};
    o.rows.forEach(r => {
      const w = document.createElement('div'); w.className = 'row ' + r.k; host.appendChild(w);
      add('l', r.label + (r.sub ? `<small>${r.sub}</small>` : ''), w);
      const cells = [0, 1, 2, 3].map(i => { const e = document.createElement('i'); e.textContent = r.fixed ? r.fixed[i] : '0'; w.appendChild(e); return e; });
      const num = add('num', '', w);
      let prev = [0, 0, 0, 0];
      rows[r.k] = {
        w, cells, num, names: null,
        set(bits, opt) {
          opt = opt || {};
          bits.forEach((b, i) => {
            b = b ? 1 : 0;
            cells[i].classList.toggle('on', !!b); cells[i].textContent = b;
            if (b !== prev[i] && !opt.quiet) { cells[i].classList.remove('chg'); void cells[i].offsetWidth; cells[i].classList.add('chg'); }
          });
          prev = bits.map(b => b ? 1 : 0);
          const sum = prev.reduce((a, b, i) => a + b * (1 << i), 0);
          num.innerHTML = opt.num === false ? '' : `= <b>${sum}</b>`;
        },
        mark(i, cls) { cells.forEach((c, j) => c.classList.toggle(cls, j === i)); },
        show(on) { w.classList.toggle('off', !on); },
      };
    });
    return { rows, heads: [...host.querySelectorAll('.h')] };
  }

  /* ── 2 · one switch per stage, read as a number ── */
  Deck.on('bmbits', {
    enter(ctx) {
      ctx.__g = grid(ctx.q('#bmb-grid'), { seats: true, rows: [{ k: 'n', label: 'Switches', sub: 'one per stage' }, { k: 'wt', label: 'Worth', sub: 'of each seat', fixed: [1, 2, 4, 8] }] });
    },
    step(ctx, s) {
      const R = ctx.__g.rows;
      R.n.set([s >= 1, s >= 1, 0, 0], { num: s >= 2, quiet: false });
      R.wt.show(s >= 2); R.wt.num.innerHTML = '';
      R.n.cells.forEach((c, i) => c.classList.toggle('sum', s >= 2 && i < 2));
      ctx.q('#bmb-add').classList.toggle('on', s >= 2);
    },
  });

  /* ── 3 · two rows per page ── */
  Deck.on('bmtwo', {
    enter(ctx) {
      ctx.__g = grid(ctx.q('#bmt-grid'), { rows: [{ k: 'f', label: 'Finished', sub: 'stages that have finished this page' }, { k: 'r', label: 'Ready', sub: 'stages that may start on it' }] });
    },
    step(ctx, s) {
      const R = ctx.__g.rows;
      R.f.show(s >= 0); R.r.show(s >= 1);
      R.f.set([0, 0, 0, 0]); R.r.set([s >= 2, 0, 0, 0]);
      ctx.q('#bmt-f').textContent = '0'; ctx.q('#bmt-r').textContent = s >= 2 ? '1' : '–';
    },
  });

  /* ── 4 · one page walked through the graph ── */
  const WALK = [
    { f: [0, 0, 0, 0], r: [1, 0, 0, 0] },
    { f: [1, 0, 0, 0], r: [1, 1, 1, 0] },
    { f: [1, 1, 0, 0], r: [1, 1, 1, 0] },
    { f: [1, 1, 1, 0], r: [1, 1, 1, 0] },
    { f: [1, 1, 1, 0], r: [1, 1, 1, 1] },
    { f: [1, 1, 1, 1], r: [1, 1, 1, 1] },
  ];
  Deck.on('bmwalk', {
    enter(ctx) {
      ctx.__g = grid(ctx.q('#bmw-grid'), { rows: [{ k: 'f', label: 'Finished', sub: 'done with this page' }, { k: 'r', label: 'Ready', sub: 'may start on it' }] });
      const host = ctx.q('#bmw-graph'); host.innerHTML = '';
      const svg = U.svg('svg', { viewBox: '0 0 720 480', width: 720, height: 480 }, host);
      const defs = U.svg('defs', {}, svg);
      [['g', '#7C879F'], ['v', '#6B4BB8']].forEach(([id, c]) => { const m = U.svg('marker', { id: 'bmah' + id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, defs); U.svg('path', { d: 'M0 0L10 5L0 10z', fill: c }, m); });
      const P = [[0, 200], [265, 50], [265, 350], [510, 200]], W = 190, H = 80, WD = [190, 190, 190, 210];
      const E = [[0, 1, 'g'], [0, 2, 'g'], [1, 3, 'v'], [2, 3, 'v']];
      E.forEach(([a, b, c]) => {
        const x1 = P[a][0] + WD[a], y1 = P[a][1] + H / 2, x2 = P[b][0] - 4, y2 = P[b][1] + H / 2;
        U.svg('path', { d: `M${x1} ${y1} C${x1 + 50} ${y1} ${x2 - 50} ${y2} ${x2} ${y2}`, fill: 'none', stroke: c === 'v' ? '#6B4BB8' : '#7C879F', 'stroke-width': 4, 'marker-end': `url(#bmah${c})` }, svg);
      });
      ctx.__nd = P.map((p, i) => {
        const g = U.svg('g', { class: 'bm-nd' }, svg);
        U.svg('rect', { x: p[0], y: p[1], width: WD[i], height: H, rx: 16 }, g);
        const t = U.svg('text', { x: p[0] + WD[i] / 2, y: p[1] + 50 }, g); t.textContent = NAMES[i];
        if (i === 3) t.setAttribute('font-size', 23);
        return g;
      });
      [['node 3', 265 + W / 2, 50 + H + 30], ['node 7', 265 + W / 2, 350 + H + 30]].forEach(([s, x, y]) => { const t = U.svg('text', { x, y, class: 'bm-wh' }, svg); t.textContent = s; });
      const nb = U.svg('text', { x: 615, y: 186, class: 'bm-both' }, svg); nb.textContent = 'needs both';
      const lg = (x, c, s) => { U.svg('rect', { x, y: 452, width: 22, height: 22, rx: 6, class: 'bm-lg ' + c }, svg); const t = U.svg('text', { x: x + 32, y: 470, class: 'bm-lgt' }, svg); t.textContent = s; };
      lg(430, 'rdy', 'Ready'); lg(560, 'dn', 'Finished');
    },
    step(ctx, s, p) {
      const st = WALK[s], R = ctx.__g.rows, quiet = p < 0;
      R.f.set(st.f, { quiet }); R.r.set(st.r, { quiet });
      ctx.__nd.forEach((g, i) => { g.classList.toggle('dn', !!st.f[i]); g.classList.toggle('rdy', !!st.r[i] && !st.f[i]); });
      ctx.q('#bmw-rec').classList.toggle('gone', s >= 5);
      ctx.q('#bmw-gone').classList.toggle('on', s >= 5);
    },
  });

  /* ── 5 · the sweep's check ── */
  const RULE = [
    { names: NAMES, need: [0, 1, 1, 0], fin: [1, 1, 0, 0], v: 'wait', t: 'Not yet: Layout has not finished', rule: 'Needs both: the third row must match the first row.' },
    { names: NAMES, need: [0, 1, 1, 0], fin: [1, 1, 1, 0], v: 'go', t: 'Match: Grounded Q&amp;A may start', rule: 'Needs both: the third row must match the first row.' },
    { names: ['Understand', 'Table', 'Chart', 'Write a question'], need: [0, 1, 1, 0], fin: [1, 0, 1, 0], v: 'go', t: 'One is on: Write a question may start', rule: 'Either one is enough: the third row needs at least one switch on.' },
  ];
  Deck.on('bmrule', {
    enter(ctx) {
      ctx.__g = grid(ctx.q('#bmr-grid'), { rows: [{ k: 'n', label: 'Needs', sub: 'inputs this stage waits on' }, { k: 'f', label: 'Finished', sub: 'from the page’s record' }, { k: 'm', label: 'Needed and finished', sub: 'switches on in both rows above' }] });
    },
    step(ctx, s) {
      const d = RULE[s], R = ctx.__g.rows;
      ctx.__g.heads.forEach((h, i) => { h.innerHTML = d.names[i].replace('&', '&amp;'); });
      R.n.set(d.need); R.f.set(d.fin);
      const both = d.need.map((n, i) => n && d.fin[i] ? 1 : 0);
      R.m.set(both);
      R.m.cells.forEach((c, i) => c.classList.toggle('miss', !!d.need[i] && !d.fin[i]));
      const v = ctx.q('#bmr-v'); v.className = 'bm-v ' + d.v; v.innerHTML = d.t;
      ctx.q('#bmr-rule').innerHTML = d.rule;
    },
  });
})();
