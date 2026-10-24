(function () {
  const U = Deck.util, clamp = U.clamp;

  /* ── dividers: one motif per part ── */
  const MOT = {
    flow(svg) {
      [[70, '#9DB3DC'], [200, '#FFC078'], [330, '#5FDDB2']].forEach(([y, c], r) => {
        for (let k = 0; k < 3; k++) { const e = U.svg('rect', { class: 'bar', x: 30 + r * 70 + k * 205, y, width: 190, height: 62, rx: 16, fill: c }, svg); e.style.animationDelay = (.3 + r * .35 + k * .2) + 's'; }
      });
      const t = U.svg('text', { class: 'fade', x: 30, y: 500, fill: '#C7D6F3', 'font-size': 28, 'font-family': 'IBM Plex Sans', style: 'animation-delay:1.8s' }, svg); t.textContent = 'prepare · infer · finish, overlapped';
    },
    grid(svg) {
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
        const i = r * 6 + c, dead = i === 14;
        const e = U.svg('rect', { class: 'sq' + (dead ? ' dead' : ''), x: 30 + c * 112, y: 60 + r * 112, width: 94, height: 94, rx: 16, fill: i % 5 === 0 ? '#FFC078' : '#9DB3DC', 'fill-opacity': dead ? .8 : .55 }, svg);
        e.style.animationDelay = (.3 + i * .07) + 's' + (dead ? ',2.8s' : '');
      }
    },
    fork(svg) {
      [100, 300, 500].forEach((y, k) => {
        const d = k * .5;
        const stem = U.svg('path', { class: 'draw', d: `M30 ${y} H250`, stroke: '#9DB3DC', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg); stem.style.animationDelay = (.3 + d) + 's';
        const a = U.svg('path', { class: 'draw d2', d: `M250 ${y} C340 ${y} 340 ${y - 55} 440 ${y - 55} H600`, stroke: '#5FDDB2', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg); a.style.animationDelay = (.9 + d) + 's';
        const b = U.svg('path', { class: 'draw d2', d: `M250 ${y} C340 ${y} 340 ${y + 55} 440 ${y + 55} H600`, stroke: '#FFC078', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg); b.style.animationDelay = (.9 + d) + 's';
        const ok = U.svg('circle', { class: 'pop-dot', cx: 622, cy: y - 55, r: 18, fill: '#5FDDB2' }, svg); ok.style.animationDelay = (1.6 + d) + 's';
        const ok2 = U.svg('circle', { class: 'pop-dot', cx: 622, cy: y + 55, r: 18, fill: '#FFC078' }, svg); ok2.style.animationDelay = (1.7 + d) + 's';
      });
    },
    hub(svg) {
      const cx = 350, cy = 300;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 - Math.PI / 2, x = cx + Math.cos(a) * 230, y = cy + Math.sin(a) * 230;
        U.svg('path', { class: 'draw d2', d: `M${cx} ${cy} L${x} ${y}`, stroke: i % 2 ? '#9DB3DC' : '#FFC078', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
        const r = U.svg('rect', { class: 'sq', x: x - 38, y: y - 38, width: 76, height: 76, rx: 16, fill: i % 2 ? '#9DB3DC' : '#FFC078', 'fill-opacity': .85 }, svg); r.style.animationDelay = (1.1 + i * .15) + 's';
      }
      U.svg('circle', { class: 'pop-dot', cx, cy, r: 46, fill: '#5FDDB2' }, svg);
    },
    bars(svg) {
      [[120, 560, '#FFC078'], [260, 130, '#9DB3DC'], [400, 60, '#7F8CA8']].forEach(([y, w, c], k) => { const e = U.svg('rect', { class: 'bar', x: 30, y, width: w, height: 70, rx: 16, fill: c }, svg); e.style.animationDelay = (.4 + k * .5) + 's'; });
    },
  };
  ['dv1', 'dv2', 'dv3', 'dv4', 'dv5'].forEach(id => Deck.on(id, { enter(ctx) { const svg = ctx.q('svg.motif'); svg.innerHTML = ''; MOT[ctx.el.dataset.motif](svg); } }));

  /* ── workload: the generation pipeline with content routing ── */
  const WN = {
    U: { x: 140, y: 240, t: 'Understand', b: 0 }, C: { x: 520, y: 40, t: 'Charts', b: 1 }, T: { x: 520, y: 140, t: 'Tables', b: 2 }, X: { x: 520, y: 240, t: 'Text', b: 4 },
    F: { x: 520, y: 380, t: 'Forms', b: 3 }, Q: { x: 900, y: 140, t: 'Questions', b: 5 }, V: { x: 1220, y: 270, t: 'Verify', b: 6 }, D: { x: 1540, y: 270, t: 'Dataset' }, R: { x: 140, y: 420, t: 'Dropped' },
  };
  const WE = ['UC', 'UT', 'UX', 'UF', 'CQ', 'TQ', 'XQ', 'QV', 'FV', 'VD', 'UR'];
  const WP = [
    { id: 'chart', label: 'Chart', color: '#2A63C9', route: ['U', 'C', 'Q', 'V', 'D'] }, { id: 'table', label: 'Table', color: '#F28C28', route: ['U', 'T', 'Q', 'V', 'D'] },
    { id: 'form', label: 'Form', color: '#0E7C61', route: ['U', 'F', 'V', 'D'] }, { id: 'text', label: 'Text page', color: '#6B4BB8', route: ['U', 'X', 'Q', 'V', 'D'] },
    { id: 'blank', label: 'Blank page', color: '#7C879F', route: ['U', 'R'] },
  ];
  Deck.on('workload', {
    enter(ctx) {
      const svg = ctx.q('#w-svg'); svg.innerHTML = '';
      const W = 230, H = 62;
      const defs = U.svg('defs', {}, svg), mk = U.svg('marker', { id: 'wah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      U.svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#B4C2DF' }, mk);
      const gE = U.svg('g', {}, svg), gU = U.svg('g', {}, svg), gN = U.svg('g', {}, svg), gT = U.svg('g', {}, svg);
      const edge = {};
      WE.forEach(k => {
        const a = WN[k[0]], b = WN[k[1]]; let d;
        if (Math.abs(a.x - b.x) < 5) d = `M${a.x} ${a.y + H / 2} L${b.x} ${b.y - H / 2 - 6}`;
        else { const x1 = a.x + W / 2, y1 = a.y, x2 = b.x - W / 2 - 6, y2 = b.y, m = (x1 + x2) / 2; d = `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`; }
        edge[k] = U.svg('path', { d, fill: 'none', stroke: k === 'UR' ? '#D2D9E8' : '#C3CEE5', 'stroke-width': 3.5, 'stroke-dasharray': k === 'UR' ? '8 8' : '', 'marker-end': 'url(#wah)' }, gE);
      });
      const node = {};
      Object.entries(WN).forEach(([k, n]) => {
        const g = U.svg('g', {}, gN);
        const fill = k === 'D' ? '#FCE6CF' : k === 'R' ? '#F2F4F9' : '#fff';
        const r = U.svg('rect', { x: n.x - W / 2, y: n.y - H / 2, width: W, height: H, rx: 18, fill, stroke: '#C3CEE5', 'stroke-width': 3 }, g);
        const t = U.svg('text', { x: n.x, y: n.y + 8, 'text-anchor': 'middle', 'font-size': 23, 'font-weight': 600, fill: k === 'R' ? '#7C879F' : '#0E1A3A' }, g); t.textContent = n.t;
        if (n.b !== undefined) { U.svg('circle', { cx: n.x - W / 2 + 4, cy: n.y - H / 2 + 4, r: 15, fill: '#EDF1FA', stroke: '#C3CEE5', 'stroke-width': 2 }, g); const l = U.svg('text', { x: n.x - W / 2 + 4, y: n.y - H / 2 + 11, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: '#5B6785' }, g); l.textContent = n.b; }
        node[k] = r;
      });
      const lab = (x, y, s, col) => { const t = U.svg('text', { x, y, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 600, fill: col }, gT); t.textContent = s; };
      lab(WN.U.x, WN.U.y - 50, 'routing function', '#1F4FA8'); lab(WN.Q.x, WN.Q.y + 56, 'fan-in: any input', '#B85C0A');
      const cnt = U.svg('text', { x: WN.D.x, y: WN.D.y + 62, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, fill: '#B85C0A' }, gT);
      const box = ctx.q('#w-chips'); box.querySelectorAll('.pg').forEach(e => e.remove());
      const parts = []; let done = 0; const used = new Set();
      const run = (pg, delay = 0) => ctx.after(() => parts.push({ pg, i: 0, phase: 'dwell', t: 0, el: U.svg('circle', { r: 13, fill: pg.color, stroke: '#fff', 'stroke-width': 4 }, gT), halo: U.svg('circle', { r: 26, fill: pg.color, opacity: .22 }, gT) }), delay);
      WP.forEach(pg => { pg.btn = U.html('button', { class: 'pg', 'data-noclick': '', html: `<b><i style="background:${pg.color}"></i>${pg.label}</b><small>&nbsp;</small>` }, box); pg.btn.onclick = e => { e.stopPropagation(); run(pg); }; });
      ctx.q('.playall').onclick = e => { e.stopPropagation(); WP.forEach((pg, k) => run(pg, k * 800)); };
      ctx.__playAll = () => WP.forEach((pg, k) => run(pg, k * 800));
      ctx.raf((t, dt) => {
        const dw = {};
        for (let k = parts.length - 1; k >= 0; k--) {
          const p = parts[k]; p.t += dt; const cur = WN[p.pg.route[p.i]], last = p.i === p.pg.route.length - 1;
          if (p.phase === 'dwell') {
            dw[p.pg.route[p.i]] = p.pg.color; p.el.setAttribute('cx', cur.x); p.el.setAttribute('cy', cur.y + 42); p.halo.setAttribute('cx', cur.x); p.halo.setAttribute('cy', cur.y + 42);
            if (p.t > 330 && !last) { p.phase = 'move'; p.t = 0; p.edge = edge[p.pg.route[p.i] + p.pg.route[p.i + 1]]; const key = p.pg.id + p.pg.route[p.i] + p.pg.route[p.i + 1]; if (!used.has(key)) { used.add(key); const c = U.svg('path', { d: p.edge.getAttribute('d'), fill: 'none', stroke: p.pg.color, 'stroke-width': 7, opacity: .5, 'stroke-linecap': 'round' }, gU); const L = c.getTotalLength(); c.style.strokeDasharray = L; c.style.strokeDashoffset = L; c.style.transition = 'stroke-dashoffset 600ms linear'; requestAnimationFrame(() => requestAnimationFrame(() => c.style.strokeDashoffset = 0)); } }
            else if (last && p.t > 480) { if (p.pg.route[p.i] === 'D') { done++; cnt.textContent = '× ' + done; } p.pg.btn.querySelector('small').textContent = p.pg.route.join('›'); p.el.remove(); p.halo.remove(); parts.splice(k, 1); }
          } else { const f = Math.min(1, p.t / 600), L = p.edge.getTotalLength(), pt = p.edge.getPointAtLength(U.ease.inout(f) * L); p.el.setAttribute('cx', pt.x); p.el.setAttribute('cy', pt.y); p.halo.setAttribute('cx', pt.x); p.halo.setAttribute('cy', pt.y); if (f >= 1) { p.i++; p.phase = 'dwell'; p.t = 0; } }
        }
        Object.keys(node).forEach(k => { node[k].setAttribute('stroke', dw[k] || '#C3CEE5'); node[k].setAttribute('stroke-width', dw[k] ? 5 : 3); });
      });
    },
    step(ctx, s, p) { if (s >= 1 && p < 1) ctx.after(() => ctx.__playAll(), 400); },
  });

  /* ── the cluster ── */
  Deck.on('cluster', {
    enter(ctx) {
      const root = ctx.q('#cl-dia'); root.innerHTML = '';
      const cap = (x, y, s) => U.html('div', { class: 'cap2', text: s, style: `left:${x}px;top:${y}px` }, root);
      cap(0, 0, '50 H100 nodes · 8 GPUs each');
      const rng = U.rng(9), tiles = [];
      for (let i = 0; i < 50; i++) { const t = U.html('div', { class: 'tile2', style: `left:${(i % 10) * 78}px;top:${34 + Math.floor(i / 10) * 42}px` }, root); for (let k = 0; k < 4; k++) U.html('u', { style: `animation:twinkle ${(1.2 + rng()).toFixed(2)}s ease-in-out ${(rng() * 1.5).toFixed(2)}s infinite` }, t); tiles.push(t); }
      const box = (l, w, b, s) => U.html('div', { class: 'bx2', html: `${b}<small>${s}</small>`, style: `left:${l}px;top:268px;width:${w}px` }, root);
      box(0, 262, 'Fleet layer', 'hosts and restarts vLLM, publishes a registry'); box(289, 262, 'Managed DB', 'the only shared service'); box(578, 262, 'Output shards', 'node-local NVMe, then object store');
      const tl = U.html('div', { id: 'cl-tl', style: 'position:absolute;left:0;top:420px;width:840px;height:210px;opacity:0' }, root);
      const svg = U.svg('svg', { width: 840, height: 210, viewBox: '0 0 840 210' }, tl), px = h => h * 8.1;
      [['Profile', 0, 26, '#9DB3DC'], ['Questions', 26, 70.7, '#FFC078'], ['Answers', 70.7, 96, '#5FDDB2']].forEach(([n, a, b, c]) => { U.svg('rect', { x: px(a) + 2, y: 70, width: px(b - a) - 4, height: 46, rx: 12, fill: c }, svg); const t = U.svg('text', { x: px((a + b) / 2), y: 100, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 600, fill: '#0E1A3A', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = n; });
      [0, 26, 70.7].forEach(h => U.svg('path', { d: `M${px(h) + 2} 56 l-9 -16 h18 z`, fill: '#C93C3C' }, svg));
      const l1 = U.svg('text', { x: 4, y: 30, 'font-size': 20, fill: '#C93C3C', 'font-weight': 600, 'font-family': 'IBM Plex Sans' }, svg); l1.textContent = 'each stage launched by hand';
      [0, 24, 48, 72, 96].forEach(h => { const t = U.svg('text', { x: Math.min(px(h), 826), y: 150, 'text-anchor': h === 0 ? 'start' : 'middle', 'font-size': 19, fill: '#5B6785', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = h + ' h'; });
      const t2 = U.svg('text', { x: px(70.7), y: 184, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 700, fill: '#0E7C61', 'font-family': 'IBM Plex Sans' }, svg); t2.textContent = 'first usable record: 70.7 h';
      const t3 = U.svg('text', { x: 4, y: 204, 'font-size': 17, fill: '#6B7690', 'font-family': 'IBM Plex Sans' }, svg); t3.textContent = 'schematic of the first production run';
      ctx.__cl = { tiles, tl };
    },
    step(ctx, s) {
      const { tiles, tl } = ctx.__cl;
      tl.style.opacity = s >= 1 ? 1 : 0;
      const dead = [1, 4, 6, 9, 12, 14, 17, 20, 22];
      tiles.forEach((t, i) => t.classList.toggle('dead', s >= 2 && dead.includes(i)));
    },
  });

  /* ── thesis: coordination against model time ── */
  Deck.on('thesis', {
    enter(ctx) {
      const host = ctx.q('#th-bar'); host.innerHTML = '';
      const svg = U.svg('svg', { viewBox: '0 0 800 150', width: 800, height: 150 }, host);
      const bar = U.svg('rect', { x: 0, y: 60, width: 0, height: 44, rx: 10, fill: '#9DB3DC', style: 'transition:width 1.6s cubic-bezier(.4,0,.2,1)' }, svg);
      const lab = U.svg('text', { x: 400, y: 138, 'text-anchor': 'middle', 'font-size': 23, fill: '#42506B', 'font-family': 'IBM Plex Sans' }, svg); lab.textContent = 'one batch in the model: T ≈ 25 s';
      const ticks = [[0, 'claim'], [396, 'commit'], [792, 'hand-off']].map(([x, n]) => {
        const g = U.svg('g', { style: 'opacity:0;transition:opacity .5s' }, svg);
        U.svg('rect', { x: x, y: 52, width: 8, height: 60, rx: 2, fill: '#C93C3C' }, g);
        const t = U.svg('text', { x: x === 0 ? 0 : (x === 792 ? 800 : x + 4), y: 38, 'text-anchor': x === 0 ? 'start' : (x === 792 ? 'end' : 'middle'), 'font-size': 21, 'font-weight': 600, fill: '#C93C3C', 'font-family': 'IBM Plex Sans' }, g); t.textContent = n; return g;
      });
      ctx.after(() => { bar.setAttribute('width', 800); }, 300); ctx.after(() => ticks.forEach((g, i) => ctx.after(() => g.style.opacity = 1, i * 250)), 1500);
    },
  });

  /* ── GPU utilisation is decided by the host ── */
  Deck.on('gpu', {
    enter(ctx) {
      const svg = ctx.q('#gpu-svg'); svg.innerHTML = '';
      const defs = U.svg('defs', {}, svg), pat = U.svg('pattern', { id: 'idl', width: 12, height: 12, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      U.svg('rect', { width: 12, height: 12, fill: '#EDF1FA' }, pat); U.svg('rect', { width: 5, height: 12, fill: '#CBD5E8' }, pat);
      const X0 = 170, UN = 100, COL = { prep: '#2A63C9', gpu: '#F28C28', post: '#6B4BB8' };
      const lane = (y, label) => { U.svg('rect', { x: X0, y, width: 1500, height: 56, rx: 10, fill: 'url(#idl)' }, svg); const t = U.svg('text', { x: X0 - 16, y: y + 36, 'text-anchor': 'end', 'font-size': 24, 'font-weight': 600, fill: '#0E1A3A', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = label; };
      const mkScn = (y0, title, blocks, id) => {
        const t = U.svg('text', { x: 0, y: y0 + 24, 'font-size': 29, 'font-weight': 700, fill: '#0E1A3A', 'font-family': 'Sora' }, svg); t.textContent = title;
        lane(y0 + 56, 'host CPU'); lane(y0 + 130, 'GPU');
        const cp = U.svg('clipPath', { id }, defs), cr = U.svg('rect', { x: X0 - 4, y: y0, width: 0, height: 250 }, cp);
        const g = U.svg('g', { 'clip-path': `url(#${id})` }, svg);
        blocks.forEach(([ln, a, b, k]) => U.svg('rect', { x: X0 + a * UN + 2, y: y0 + (ln === 'c' ? 56 : 130) + 2, width: (b - a) * UN - 4, height: 52, rx: 9, fill: COL[k] }, g));
        const meter = U.svg('text', { x: 1670, y: y0 + 24, 'text-anchor': 'end', 'font-size': 30, 'font-weight': 700, fill: '#0E1A3A', 'font-family': 'Sora' }, svg);
        const head = U.svg('line', { x1: X0, x2: X0, y1: y0 + 50, y2: y0 + 190, stroke: '#0E1A3A', 'stroke-width': 3, opacity: 0 }, svg);
        return { cr, meter, head, blocks, y0 };
      };
      const A = [], B = [];
      for (let k = 0; k < 3; k++) { const o = k * 5; A.push(['c', o, o + 1, 'prep'], ['g', o + 1, o + 4, 'gpu'], ['c', o + 4, o + 5, 'post']); }
      for (let k = 0; k < 5; k++) { const o = k * 3; B.push(['c', o, o + 1, 'prep'], ['g', o + 1, o + 4, 'gpu']); if (k >= 1) B.push(['c', o + 1, o + 2, 'post']); }
      const SA = mkScn(0, 'Serial: one batch at a time', A, 'cA'), SB = mkScn(290, 'Overlapped: the next batch is prepared while the GPU works', B, 'cB');
      const busy = (S, t) => { let b = 0; S.blocks.forEach(([ln, a, e]) => { if (ln === 'g') b += Math.max(0, Math.min(t, e) - a); }); return t > 0 ? b / t : 0; };
      const anim = { A: null, B: null };
      ctx.__play = (S, key) => { anim[key] = performance.now(); S.head.setAttribute('opacity', 1); };
      ctx.raf(() => {
        [[SA, 'A'], [SB, 'B']].forEach(([S, key]) => {
          if (anim[key] === null) return; const t = clamp((performance.now() - anim[key]) / 6500, 0, 1) * 15, x = X0 + t * UN;
          S.cr.setAttribute('width', x - X0 + 6); S.head.setAttribute('x1', x); S.head.setAttribute('x2', x);
          const u = busy(S, t); S.meter.textContent = 'GPU busy ' + Math.round(u * 100) + ' %'; S.meter.setAttribute('fill', u > .85 ? '#0E7C61' : '#C93C3C');
          if (t >= 15) S.head.setAttribute('opacity', 0);
        });
      });
      ctx.__S = { SA, SB, anim };
    },
    step(ctx, s, p) {
      const { SA, SB, anim } = ctx.__S;
      if (s >= 1 && anim.A === null) ctx.__play(SA, 'A');
      if (s >= 2 && anim.B === null) ctx.__play(SB, 'B');
      if (s < 1) { anim.A = null; SA.cr.setAttribute('width', 0); SA.meter.textContent = ''; SA.head.setAttribute('opacity', 0); }
      if (s < 2) { anim.B = null; SB.cr.setAttribute('width', 0); SB.meter.textContent = ''; SB.head.setAttribute('opacity', 0); }
    },
  });

  /* ── blocking and non-blocking calls ── */
  Deck.on('calls', {
    enter(ctx) {
      const a = ctx.q('#cl-blk'), b = ctx.q('#cl-nb'); a.innerHTML = ''; b.innerHTML = '';
      const rng = U.rng(17);
      for (let i = 0; i < 6; i++) { const l = U.html('div', { class: 'th' }, a); U.html('small', { text: 'thread ' + (i + 1) }, l); const off = Math.floor(rng() * 40); U.html('div', { class: 'seg', style: `width:${off}px` }, l); U.html('div', { class: 'seg a', style: 'width:14px' }, l); U.html('div', { class: 'seg w', style: 'flex:1' }, l); U.html('div', { class: 'seg a', style: 'width:14px' }, l); }
      const l = U.html('div', { class: 'th' }, b); U.html('small', { text: 'event loop' }, l);
      for (let i = 0; i < 24; i++) U.html('div', { class: 'seg a', style: `width:8px;margin-right:${6 + Math.floor(rng() * 8)}px;opacity:${.5 + rng() * .5}` }, l);
      U.html('div', { style: 'font-size:21px;color:var(--muted);margin-top:14px', text: 'in flight (open calls):' }, b);
      const g = U.html('div', { class: 'dotgrid' }, b); for (let i = 0; i < 96; i++) U.html('u', { style: `animation-delay:${(rng() * 2).toFixed(2)}s` }, g);
    },
  });

  /* ── Little's law ── */
  Deck.on('little', {
    enter(ctx) {
      const host = ctx.q('#lt-chart'); host.innerHTML = '';
      const W = 940, H = 560, L = 70, R = 900, T = 20, B = 440, xs = v => L + v / 160 * (R - L), ys = v => B - v / 4.5 * (B - T);
      const svg = U.svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, host);
      [0, 1, 2, 3, 4].forEach(v => { U.svg('line', { x1: L, x2: R, y1: ys(v), y2: ys(v), stroke: v === 0 ? '#9DB3DC' : '#E3E8F1', 'stroke-width': 2 }, svg); const t = U.svg('text', { x: L - 12, y: ys(v) + 8, 'text-anchor': 'end', 'font-size': 22, fill: '#5B6785', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = v; });
      [0, 32, 64, 96, 128, 160].forEach(v => { const t = U.svg('text', { x: xs(v), y: B + 34, 'text-anchor': 'middle', 'font-size': 22, fill: '#5B6785', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = v; });
      const xl = U.svg('text', { x: (L + R) / 2, y: B + 72, 'text-anchor': 'middle', 'font-size': 24, fill: '#0E1A3A', 'font-weight': 600, 'font-family': 'IBM Plex Sans' }, svg); xl.textContent = 'calls in flight per node';
      const reg = (a, b, c, txt) => { U.svg('rect', { x: xs(a), y: T, width: xs(b) - xs(a), height: B - T, fill: c, opacity: .5 }, svg); const t = U.svg('text', { x: (xs(a) + xs(b)) / 2, y: T + 40, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 600, fill: '#42506B', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = txt; };
      const g = U.svg('g', { style: 'opacity:0;transition:opacity .8s' }, svg);
      reg(0, 96, '#FBE6E4', 'servers under-fed'); reg(96, 160, '#E4ECFA', 'queueing only');
      const lam = v => Math.min(v / 25, 96 / 25), pts = []; for (let v = 0; v <= 160; v += 4) pts.push(`${xs(v)},${ys(lam(v))}`);
      const path = U.svg('path', { d: 'M' + pts.join(' L'), fill: 'none', stroke: '#2A63C9', 'stroke-width': 6, 'stroke-linejoin': 'round' }, g);
      const sat = U.svg('line', { x1: xs(96), x2: xs(96), y1: ys(3.84), y2: B, stroke: '#F28C28', 'stroke-width': 3, 'stroke-dasharray': '8 8' }, g);
      const st = U.svg('text', { x: xs(96) + 12, y: ys(3.84) + 40, 'font-size': 24, 'font-weight': 700, fill: '#B85C0A', 'font-family': 'IBM Plex Sans' }, g); st.textContent = '96 calls · 3.84 / s';
      const mk = U.svg('circle', { r: 13, fill: '#F28C28', stroke: '#fff', 'stroke-width': 4, cx: xs(8), cy: ys(lam(8)) }, g);
      ctx.__lt = { g, mk, xs, ys, lam, t0: null };
      ctx.raf(() => { const o = ctx.__lt; if (o.t0 === null) return; const f = ((performance.now() - o.t0) / 7000) % 1, v = 8 + f * 152; mk.setAttribute('cx', xs(v)); mk.setAttribute('cy', ys(lam(v))); });
    },
    step(ctx, s) { const o = ctx.__lt; o.g.style.opacity = s >= 2 ? 1 : 0; o.t0 = s >= 3 ? performance.now() : null; if (s < 3) o.mk.setAttribute('cx', o.xs(8)); },
  });
})();
