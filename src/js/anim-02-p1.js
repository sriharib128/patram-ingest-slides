(function () {
  const U = Deck.util;

  /* ── chains: a pulse walks along each chain ── */
  Deck.on('chains', {
    enter(ctx) {
      const rows = ctx.qa('.chain .cr');
      rows.forEach((row, r) => {
        const chips = [...row.querySelectorAll('span')]; let i = r * 2;
        ctx.every(() => { chips.forEach((c, k) => c.classList.toggle('lit', k === i % (chips.length + 2))); i++; }, 650);
      });
    },
  });

  /* ── the dynamic graph ── */
  const NODES = {
    U: { x: 140, y: 250, t: 'Understand' }, C: { x: 510, y: 50, t: 'Chart reader' }, T: { x: 510, y: 170, t: 'Table reader' },
    F: { x: 510, y: 330, t: 'Form reader' }, X: { x: 510, y: 450, t: 'Text reader' }, Q: { x: 900, y: 110, t: 'Write questions' },
    K: { x: 900, y: 390, t: 'Key-values to JSON' }, A: { x: 1230, y: 110, t: 'Answer' }, V: { x: 1230, y: 280, t: 'Verify' }, S: { x: 1535, y: 280, t: 'Training example' },
  };
  const EDGES = ['UC', 'UT', 'UF', 'UX', 'CQ', 'TQ', 'XQ', 'FK', 'QA', 'AV', 'KV', 'VS'];
  const PAGES = [
    { id: 'chart', label: 'Chart', color: '#2A63C9', routes: [['U', 'C', 'Q', 'A', 'V', 'S']] },
    { id: 'table', label: 'Table', color: '#F28C28', routes: [['U', 'T', 'Q', 'A', 'V', 'S']] },
    { id: 'form', label: 'Form', color: '#0E7C61', routes: [['U', 'F', 'K', 'V', 'S']] },
    { id: 'text', label: 'Text page', color: '#6B4BB8', routes: [['U', 'X', 'Q', 'A', 'V', 'S']] },
    { id: 'mixed', label: 'Chart + table', color: '#D6336C', routes: [['U', 'C', 'Q', 'A', 'V', 'S'], ['U', 'T', 'Q']] },
    { id: 'blank', label: 'Blank page', color: '#7C879F', routes: [['U']], dead: true },
  ];
  const W = 262, H = 64;

  Deck.on('graph', {
    enter(ctx) {
      const svg = ctx.q('#g-svg'); svg.innerHTML = '';
      const defs = U.svg('defs', {}, svg);
      const mk = U.svg('marker', { id: 'ah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      U.svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#B4C2DF' }, mk);
      const gEdges = U.svg('g', {}, svg), gUsed = U.svg('g', {}, svg), gNodes = U.svg('g', {}, svg), gTop = U.svg('g', {}, svg);
      const edge = {};
      EDGES.forEach(k => {
        const a = NODES[k[0]], b = NODES[k[1]]; let d;
        if (Math.abs(a.x - b.x) < 5) d = `M${a.x} ${a.y + H / 2} L${b.x} ${b.y - H / 2 - 6}`;
        else { const x1 = a.x + W / 2, y1 = a.y, x2 = b.x - W / 2 - 6, y2 = b.y, m = (x1 + x2) / 2; d = `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`; }
        edge[k] = U.svg('path', { d, fill: 'none', stroke: '#C3CEE5', 'stroke-width': 3.5, 'marker-end': 'url(#ah)' }, gEdges);
      });
      const node = {};
      Object.entries(NODES).forEach(([k, n]) => {
        const g = U.svg('g', {}, gNodes);
        const r = U.svg('rect', { x: n.x - W / 2, y: n.y - H / 2, width: W, height: H, rx: 18, fill: k === 'S' ? '#FCE6CF' : '#fff', stroke: '#C3CEE5', 'stroke-width': 3 }, g);
        const tx = U.svg('text', k === 'S' ? { x: n.x, y: n.y + 8, 'text-anchor': 'middle', 'font-size': 23, 'font-weight': 600, fill: '#0E1A3A' } : { x: n.x - W / 2 + 54, y: n.y + 8, 'text-anchor': 'start', 'font-size': 22, 'font-weight': 600, fill: '#0E1A3A' }, g); tx.textContent = n.t;
        if (k !== 'S') {
          U.svg('circle', { cx: n.x - W / 2 + 26, cy: n.y, r: 16, fill: '#E4ECFA' }, g);
          const l = U.svg('text', { x: n.x - W / 2 + 26, y: n.y + 7, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 700, fill: '#1F4FA8' }, g); l.textContent = k;
        }
        node[k] = { r };
      });
      const sCount = U.svg('text', { x: NODES.S.x, y: NODES.S.y + 62, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, fill: '#B85C0A' }, gTop); sCount.textContent = '';
      const deadLbl = U.svg('text', { x: NODES.U.x, y: NODES.U.y + 66, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 600, fill: '#7C879F', opacity: 0 }, gTop); deadLbl.textContent = 'nothing to learn from';
      const mergeLbl = U.svg('text', { x: NODES.Q.x, y: NODES.Q.y - 46, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 600, fill: '#D6336C', opacity: 0 }, gTop); mergeLbl.textContent = 'waits for both inputs';
      const routerLbl = U.svg('text', { x: NODES.U.x, y: NODES.U.y - 50, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 600, fill: '#1F4FA8' }, gTop); routerLbl.textContent = 'routing function';

      /* chips */
      const chipBox = ctx.q('#g-chips');
      chipBox.querySelectorAll('.pg').forEach(e => e.remove());
      PAGES.forEach(pg => {
        const b = U.html('button', { class: 'pg', 'data-noclick': '', html: `<b><i style="background:${pg.color}"></i>${pg.label}</b><small>&nbsp;</small>` }, chipBox);
        pg.btn = b; b.addEventListener('click', e => { e.stopPropagation(); run(pg); });
      });
      ctx.q('.playall').onclick = e => { e.stopPropagation(); playAll(); };

      /* particles */
      const parts = []; let done = 0;
      const usedKey = new Set();
      function run(pg, delay = 0) {
        const st = { branchDone: !pg.routes[1] };
        pg.btn.classList.add('cur'); pg.btn.querySelector('small').textContent = '…';
        pg.routes.forEach((route, ri) => {
          ctx.after(() => {
            const el = U.svg('circle', { r: 13, fill: pg.color, stroke: '#fff', 'stroke-width': 4 }, gTop);
            const halo = U.svg('circle', { r: 26, fill: pg.color, opacity: .22 }, gTop);
            parts.push({ pg, route, ri, st, i: 0, phase: 'dwell', t: 0, el, halo, off: (PAGES.indexOf(pg) - 2.5) * 3 });
          }, delay + (ri ? 350 : 0));
        });
      }
      function playAll() { PAGES.forEach((pg, k) => run(pg, k * 750)); }
      ctx.__run = run; ctx.__playAll = playAll;

      const DW = 330, MV = 620;
      ctx.raf((t, dt) => {
        const dwellers = {};
        for (let k = parts.length - 1; k >= 0; k--) {
          const p = parts[k]; p.t += dt;
          const cur = NODES[p.route[p.i]];
          if (p.phase === 'dwell') {
            dwellers[p.route[p.i]] = p.pg.color;
            p.el.setAttribute('cx', cur.x + p.off); p.el.setAttribute('cy', cur.y + 40 + p.off); p.halo.setAttribute('cx', cur.x + p.off); p.halo.setAttribute('cy', cur.y + 40 + p.off);
            const last = p.i === p.route.length - 1;
            if (p.route[p.i] === 'Q' && p.ri === 0 && !p.st.branchDone) mergeLbl.setAttribute('opacity', 1);
            if (p.t > DW && !last) {
              if (p.route[p.i] === 'Q' && p.ri === 0 && !p.st.branchDone) continue;   // merge: wait for the other branch
              p.phase = 'move'; p.t = 0; const key = p.route[p.i] + p.route[p.i + 1] + p.pg.id;
              p.edge = edge[p.route[p.i] + p.route[p.i + 1]];
              if (!usedKey.has(key)) {
                usedKey.add(key);
                const c = U.svg('path', { d: p.edge.getAttribute('d'), fill: 'none', stroke: p.pg.color, 'stroke-width': 7, opacity: .5, 'stroke-linecap': 'round' }, gUsed);
                const L = c.getTotalLength(); c.style.strokeDasharray = L; c.style.strokeDashoffset = L; c.style.transition = `stroke-dashoffset ${MV}ms linear`;
                requestAnimationFrame(() => requestAnimationFrame(() => c.style.strokeDashoffset = 0));
              }
            } else if (last && p.t > DW + 150) {
              // finished
              if (p.route[p.i] === 'S') { done++; sCount.textContent = '× ' + done; }
              if (p.pg.dead) { deadLbl.setAttribute('opacity', 1); }
              if (p.route[p.i] === 'Q' && p.ri === 1) { p.st.branchDone = true; mergeLbl.setAttribute('opacity', 1); ctx.after(() => mergeLbl.setAttribute('opacity', 0), 900); }
              if (p.ri === 0 || p.pg.id === 'blank') {
                p.pg.btn.querySelector('small').textContent = (p.pg.routes[0].length > 1 ? p.pg.routes[0].join('›') : 'U ✕');
                if (p.pg.dead) p.pg.btn.querySelector('small').textContent = 'stops at U';
              }
              p.el.remove(); p.halo.remove(); parts.splice(k, 1);
            }
          } else {
            const f = Math.min(1, p.t / MV), L = p.edge.getTotalLength(), pt = p.edge.getPointAtLength(U.ease.inout(f) * L);
            p.el.setAttribute('cx', pt.x); p.el.setAttribute('cy', pt.y); p.halo.setAttribute('cx', pt.x); p.halo.setAttribute('cy', pt.y);
            if (f >= 1) { p.i++; p.phase = 'dwell'; p.t = 0; }
          }
        }
        Object.keys(node).forEach(k => {
          node[k].r.setAttribute('stroke', dwellers[k] || '#C3CEE5'); node[k].r.setAttribute('stroke-width', dwellers[k] ? 5 : 3);
        });
      });
    },
    step(ctx, s, p) {
      if (s >= 1 && p < 1 && ctx.__playAll) ctx.after(() => ctx.__playAll(), 400);
    },
  });

  /* ── addresses + failure propagation ── */
  Deck.on('addresses', {
    enter(ctx) { ctx.__timers = []; },
    step(ctx, s, p) {
      const rows = ctx.qa('#fail-chain .st');
      const set = (el, cls, txt) => { el.classList.remove('fail', 'up'); if (cls) el.classList.add(cls); el.querySelector('span').textContent = txt; };
      ctx.__timers.forEach(clearTimeout); ctx.__timers = [];
      if (s < 4) { rows.forEach(r => set(r, '', 'ok')); return; }
      const seq = [[1, 'fail', 'failed: bad JSON'], [2, 'up', 'upstream failed'], [3, 'up', 'upstream failed']];
      if (p >= 4) { seq.forEach(([i, c, t]) => set(rows[i], c, t)); return; }
      seq.forEach(([i, c, t], k) => ctx.__timers.push(ctx.after(() => set(rows[i], c, t), 500 + k * 900)));
    },
  });
})();
