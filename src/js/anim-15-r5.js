
/* blog demo, ported as is: six pages, six different routes through a DAG of seventeen agents.
   Builds once per visit; playAll() loops until the slide is left. */
(function () {
  const NS = 'http://www.w3.org/2000/svg', reduce = false;
  const $ = (s, r = document) => r.querySelector(s);
  function build(route) {
    const svg = $('#route-graph', route), out = $('.route-out', route), allBtn = $('[data-act="all"]', route);
    const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
    const defs = el('defs', {});
    const pat = el('pattern', { id: 'rg-dots', width: 26, height: 26, patternUnits: 'userSpaceOnUse' }, defs);
    el('circle', { cx: 2, cy: 2, r: 1.3 }, pat);
    el('rect', { x: 0, y: 0, width: 1110, height: 590, fill: 'url(#rg-dots)', class: 'dotgrid' });
    const RN = {
      und: { x: 205, y: 285, r: 32, t: 'Understand', s: 'what is this?', up: 1 },
      charts: { x: 360, y: 55, r: 24, t: 'Charts', s: 'read the chart' },
      tables: { x: 385, y: 160, r: 24, t: 'Tables', s: 'read the table' },
      text: { x: 360, y: 300, r: 24, t: 'Text', s: 'transcribe', up: 1 },
      scan: { x: 405, y: 405, r: 24, t: 'Clean up', s: 'straighten scan' },
      forms: { x: 360, y: 510, r: 24, t: 'Forms', s: 'extract fields' },
      cvals: { x: 540, y: 45, r: 24, t: 'Recheck', s: 'second model' },
      rebuild: { x: 520, y: 150, r: 24, t: 'Rebuild', s: 'write as HTML' },
      render: { x: 645, y: 252, r: 24, t: 'Render', s: 'browser check', up: 1 },
      ent: { x: 545, y: 350, r: 24, t: 'Key facts', s: 'dates, amounts' },
      hide: { x: 545, y: 505, r: 24, t: 'Hide value', s: 'edit one field' },
      plan: { x: 750, y: 235, r: 28, t: 'Plan', s: 'what to ask' },
      ask: { x: 855, y: 235, r: 30, t: 'Questions', s: 'write, answer', up: 1 },
      chk: { x: 960, y: 235, r: 28, t: 'Verify', s: 'check answer', up: 1 },
      second: { x: 960, y: 400, r: 24, t: 'Escalate', s: 'larger teacher' },
      out: { x: 1065, y: 235, r: 26, t: 'Dataset', s: 'kept', up: 1, cls: 'sink', nomark: 1 },
      drop: { x: 205, y: 425, r: 22, t: 'Dropped', s: 'nothing to learn', cls: 'drop', nomark: 1 }
    };
    RN.und.nomark = 1;
    const NAME = { und: 'understand', charts: 'charts', tables: 'tables', forms: 'forms', text: 'text', scan: 'clean up', cvals: 'recheck', rebuild: 'rebuild', render: 'render', ent: 'key facts', hide: 'hide value', plan: 'plan', ask: 'questions', chk: 'verify', second: 'escalate' };
    const bez = (a, b) => { const x1 = a.x + a.r, x2 = b.x - b.r, m = (x1 + x2) / 2; return `M${x1} ${a.y} C ${m} ${a.y}, ${m} ${b.y}, ${x2} ${b.y}`; };
    const DOCS = [
      { type: 'chart', label: 'Chart', color: '#f59222', note: 'read, then re-read by a second model to catch wrong numbers', route: ['und', 'und-charts', 'charts', 'charts-cvals', 'cvals', 'cvals-plan', 'plan', 'plan-ask', 'ask', 'ask-chk', 'chk', 'chk-out', 'out'] },
      { type: 'table', label: 'Table', color: '#05539c', note: 'rebuilt as HTML, then rendered in a browser to check it matches', route: ['und', 'und-tables', 'tables', 'tables-rebuild', 'rebuild', 'rebuild-render', 'render', 'render-plan', 'plan', 'plan-ask', 'ask', 'ask-chk', 'chk', 'chk-out', 'out'] },
      { type: 'form', label: 'Form', color: '#0e7c61', note: 'one field is hidden, so the questions test whether the model notices it is missing', route: ['und', 'und-forms', 'forms', 'forms-hide', 'hide', 'hide-ask', 'ask', 'ask-chk', 'chk', 'chk-out', 'out'] },
      { type: 'text', label: 'Text', color: '#6b4bb8', note: 'Verify rejected the answer, so a larger teacher model produced the final one', route: ['und', 'und-text', 'text', 'text-ent', 'ent', 'ent-plan', 'plan', 'plan-ask', 'ask', 'ask-chk', 'chk', 'chk-second', 'second', 'second-out', 'out'] },
      { type: 'scan', label: 'Scan', color: '#0b8aa6', note: 'a scan is straightened first, then handled like any text page', route: ['und', 'und-scan', 'scan', 'scan-text', 'text', 'text-ent', 'ent', 'ent-plan', 'plan', 'plan-ask', 'ask', 'ask-chk', 'chk', 'chk-out', 'out'] },
      { type: 'blank', label: 'Blank', color: '#7b8794', note: 'nothing to learn from, so no expensive stage runs', route: ['und', 'und-drop', 'drop'] }
    ];
    const DX = 4, DW = 108, DH = 58, dy = i => 10 + i * 92;
    const R = RN;
    const E = {
      'und-charts': bez(R.und, R.charts), 'und-tables': bez(R.und, R.tables), 'und-text': bez(R.und, R.text), 'und-scan': bez(R.und, R.scan), 'und-forms': bez(R.und, R.forms),
      'und-drop': `M${R.und.x} ${R.und.y + R.und.r} V ${R.drop.y - R.drop.r}`,
      'scan-text': `M${R.scan.x - 6} ${R.scan.y - R.scan.r} C ${R.scan.x - 14} ${R.scan.y - 60}, ${R.text.x + 10} ${R.text.y + 60}, ${R.text.x + 6} ${R.text.y + R.text.r}`,
      'charts-cvals': bez(R.charts, R.cvals),
      'cvals-plan': `M${R.cvals.x + R.cvals.r} ${R.cvals.y} C 680 ${R.cvals.y}, 660 217, ${R.plan.x - 21.5} ${R.plan.y - 18}`,
      'tables-rebuild': bez(R.tables, R.rebuild), 'rebuild-render': bez(R.rebuild, R.render),
      'render-plan': bez(R.render, R.plan),
      'text-ent': bez(R.text, R.ent),
      'ent-plan': `M${R.ent.x + R.ent.r} ${R.ent.y} C 680 ${R.ent.y}, 660 253, ${R.plan.x - 21.5} ${R.plan.y + 18}`,
      'forms-hide': bez(R.forms, R.hide),
      'hide-ask': `M${R.hide.x + R.hide.r} ${R.hide.y} C 760 ${R.hide.y}, ${R.ask.x} 420, ${R.ask.x} ${R.ask.y + R.ask.r}`,
      'plan-ask': bez(R.plan, R.ask), 'ask-chk': bez(R.ask, R.chk), 'chk-out': bez(R.chk, R.out),
      'chk-second': `M${R.chk.x} ${R.chk.y + R.chk.r} V ${R.second.y - R.second.r}`,
      'second-out': `M${R.second.x + R.second.r} ${R.second.y} C 1065 ${R.second.y}, 1065 340, 1065 ${R.out.y + R.out.r}`
    };
    DOCS.forEach((D, i) => { const cy = dy(i) + DH / 2; E['in' + i] = `M${DX + DW} ${cy} C 142 ${cy}, 142 ${R.und.y}, ${R.und.x - R.und.r} ${R.und.y}`; D.route.unshift('in' + i); });
    const P = {}, LEN = {}, NG = {}, AR = {};
    const arrows = el('g', {});
    for (const id in E) {
      P[id] = el('path', { d: E[id], class: 'edge' }); LEN[id] = P[id].getTotalLength();
      const p1 = P[id].getPointAtLength(LEN[id]), p0 = P[id].getPointAtLength(LEN[id] - 4), ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
      AR[id] = el('path', { d: 'M0 0 L-10 -5 L-10 5 Z', class: 'arrow', transform: `translate(${p1.x.toFixed(1)} ${p1.y.toFixed(1)}) rotate(${ang.toFixed(1)})` }, arrows);
    }
    const LBL = el('text', { x: R.chk.x + 12, y: 322, class: 'lbl', 'text-anchor': 'start' }); LBL.textContent = 'rejected'; LBL.dataset.edge = 'chk-second';
    for (const id in RN) {
      const n = RN[id], g = el('g', { class: 'nd' + (n.cls ? ' ' + n.cls : '') });
      el('circle', { cx: n.x, cy: n.y, r: n.r }, g);
      const ty = n.up ? n.y - n.r - 22 : n.y + n.r + 17;
      el('text', { x: n.x, y: ty, class: 't', 'text-anchor': 'middle' }, g).textContent = n.t;
      n.sEl = el('text', { x: n.x, y: ty + 14, class: 's', 'text-anchor': 'middle' }, g); n.sEl.textContent = n.s;
      NG[id] = g;
    }

    /* the six pages, drawn as little documents on the left */
    function thumb(g, type, c, x, y) {
      const ln = (x1, yy, x2, col = '#b9b3a6', w = 2) => el('path', { d: `M${x1} ${yy} H${x2}`, stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', fill: 'none' }, g);
      el('rect', { x, y, width: 32, height: 46, rx: 3, fill: type === 'scan' ? '#ece5d3' : '#fff', stroke: '#cfc8b8' }, g);
      if (type === 'chart') {
        [[6, 14], [14, 26], [22, 20]].forEach(([dx, h]) => el('rect', { x: x + dx, y: y + 40 - h, width: 6, height: h, rx: 1, fill: c }, g));
        el('path', { d: `M${x + 4} ${y + 41} H${x + 28}`, stroke: '#8a8478', 'stroke-width': 1.2 }, g);
        ln(x + 6, y + 6, x + 20);
      } else if (type === 'table') {
        el('rect', { x: x + 5, y: y + 8, width: 22, height: 30, fill: 'none', stroke: c, 'stroke-width': 1.3 }, g);
        el('rect', { x: x + 5, y: y + 8, width: 22, height: 8, fill: c, opacity: .35 }, g);
        el('path', { d: `M${x + 5} ${y + 24} H${x + 27} M${x + 5} ${y + 31} H${x + 27} M${x + 16} ${y + 8} V${y + 38}`, stroke: c, 'stroke-width': 1 }, g);
      } else if (type === 'form') {
        [10, 20, 30].forEach(dy2 => { ln(x + 5, y + dy2, x + 13); el('rect', { x: x + 16, y: y + dy2 - 4, width: 11, height: 8, rx: 1.5, fill: 'none', stroke: c, 'stroke-width': 1.2 }, g); });
        ln(x + 5, y + 40, x + 14, c, 2.4);
      } else if (type === 'text') {
        [8, 14, 20, 26, 32, 38].forEach((dy2, k) => ln(x + 5, y + dy2, x + (k === 5 ? 17 : 27), '#a9a393', 2));
      } else if (type === 'scan') {
        const r = el('g', { transform: `rotate(-5 ${x + 16} ${y + 23})` }, g);
        [9, 15, 21, 27, 33].forEach(dy2 => el('path', { d: `M${x + 5} ${y + dy2} H${x + 27}`, stroke: '#8f897a', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: .8 }, r));
        [[9, 36], [24, 12], [20, 40], [28, 30]].forEach(([dx, dy2]) => el('circle', { cx: x + dx, cy: y + dy2, r: 1, fill: '#9b9484' }, g));
      }
    }
    const docEls = DOCS.map((D, i) => {
      const y = dy(i), g = el('g', { class: 'doc', tabindex: 0, role: 'button', 'aria-pressed': 'false', 'aria-label': 'Follow the ' + D.label.toLowerCase() + ' page' }); g.style.setProperty('--c', D.color);
      el('rect', { x: DX, y, width: DW, height: DH, rx: 12, class: 'bg' }, g);
      thumb(g, D.type, D.color, DX + 9, y + 6);
      el('text', { x: DX + 48, y: y + DH / 2 + 4.5 }, g).textContent = D.label;
      g.addEventListener('click', () => pick(i));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } });
      return g;
    });
    const tokLayer = el('g', {});

    let gen = 0, stopped = false, running = false;
    const sleep = (ms, g) => new Promise((res, rej) => setTimeout(() => g === gen ? res() : rej(0), ms));
    const glide = (tok, path, len, dur, g) => new Promise((res, rej) => {
      const t0 = performance.now();
      const f = now => {
        if (g !== gen) return rej(0);
        const k = Math.min(1, (now - t0) / dur), p = path.getPointAtLength(k * len);
        tok.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        k < 1 ? requestAnimationFrame(f) : res();
      };
      requestAnimationFrame(f);
    });
    async function fly(D, g, delay, multi) {
      const tok = el('g', { opacity: 0 }, tokLayer);
      el('rect', { x: -7, y: -9, width: 14, height: 18, rx: 3, fill: D.color, stroke: '#fff', 'stroke-width': 1.6 }, tok);
      el('path', { d: 'M-3 -3 H3 M-3 1 H3 M-3 5 H1', stroke: '#fff', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, tok);
      try {
        if (delay) await sleep(delay, g);
        tok.setAttribute('opacity', 1);
        for (const id of D.route) {
          if (P[id]) await glide(tok, P[id], LEN[id], Math.max(220, LEN[id] * 1.5), g);
          else {
            const n = RN[id];
            tok.setAttribute('transform', `translate(${n.x} ${n.y})`);
            NG[id].style.setProperty('--c', D.color); NG[id].classList.add('act');
            await sleep(230, g);
            NG[id].classList.remove('act');
          }
        }
        await sleep(250, g);
      } finally { tok.remove(); }
    }
    function select(i) {
      const D = DOCS[i], on = new Set(D.route);
      svg.classList.add('focus'); svg.style.setProperty('--c', D.color);
      docEls.forEach((d, k) => { d.classList.toggle('sel', k === i); d.setAttribute('aria-pressed', String(k === i)); });
      for (const k in P) { P[k].classList.toggle('on', on.has(k)); AR[k].classList.toggle('on', on.has(k)); }
      for (const k in NG) NG[k].classList.toggle('on', on.has(k));
      LBL.classList.toggle('on', on.has(LBL.dataset.edge));
      RN.und.sEl.textContent = 'page_type=' + D.type; RN.und.sEl.style.fill = D.color;
      const stages = D.route.filter(k => NAME[k]).map(k => '"' + NAME[k] + '"');
      out.innerHTML = '<b>route_taken:</b> [' + stages.join(', ') + ']' + (D.note ? '  ·  ' + D.note : '');
    }
    function selectAll() {
      svg.classList.remove('focus');
      docEls.forEach(d => { d.classList.remove('sel'); d.setAttribute('aria-pressed', 'false'); });
      for (const k in NG) NG[k].classList.remove('on');
      RN.und.sEl.textContent = RN.und.s; RN.und.sEl.style.fill = '';
      out.innerHTML = '<b>Six pages went in together.</b> Each took its own route, decided by what the agents found in it.';
    }
    const guard = async fn => { try { await fn(); } catch (e) { if (e !== 0) throw e; } };
    function playAll() {
      const g = ++gen; stopped = false; running = true; tokLayer.innerHTML = '';
      guard(async () => {
        while (true) {
          selectAll();
          if (reduce) return;
          await Promise.all(DOCS.map((D, i) => fly(D, g, i * 220, true)));
          await sleep(1400, g);
        }
      });
    }
    function halt() { gen++; running = false; tokLayer.innerHTML = ''; for (const k in NG) NG[k].classList.remove('act'); }
    function pick(i) { stopped = true; halt(); const g = gen; select(i); if (!reduce) guard(() => fly(DOCS[i], g, 0, false)); }
    allBtn.addEventListener('click', () => { stopped = false; halt(); playAll(); });
    selectAll();
    return { playAll, halt };
  }
  Deck.on('route4', {
    enter(ctx) {
      const route = ctx.q('#route-demo'), svg = $('#route-graph', route);
      svg.innerHTML = ''; svg.classList.remove('focus');
      const old = $('[data-act="all"]', route), btn = old.cloneNode(true); old.replaceWith(btn);   // drop listeners from an earlier visit
      ctx.__rt = build(route); ctx.__rt.playAll();
    },
    leave(ctx) { if (ctx.__rt) ctx.__rt.halt(); },
  });
})();
