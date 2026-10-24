(function () {
  const U = Deck.util, clamp = U.clamp;

  /* ── staying ahead of the GPU: bounded buffers between threads ── */
  Deck.on('ahead', {
    enter(ctx) {
      const root = ctx.q('#ah-dia'); root.innerHTML = '';
      const BOX = [['claim', 0, 230, 'Claim', 'database rows'], ['prep', 270, 230, 'Prepare', 'prep thread'], ['gpu', 540, 420, 'In flight', 'vLLM servers'], ['col', 1000, 230, 'Collect', 'collector thread'], ['wr', 1270, 200, 'Write', 'append · fsync'], ['cm', 1510, 170, 'Commit', 'database']];
      const el = {}, tok = { claim: [], prep: [], gpu: [], col: [], wr: [], cm: [] };
      BOX.forEach(([k, x, w, t, s]) => {
        const b = U.html('div', { class: 'ahb', style: `left:${x}px;width:${w}px` }, root); b.innerHTML = `<h4>${t}</h4><small>${s}</small><div class="slots"></div><div class="cnt"></div>`; el[k] = b;
      });
      [270, 540, 1000, 1270, 1510].forEach(x => U.html('div', { class: 'ahr', style: `left:${x - 34}px` }, root));
      const meter = U.html('div', { class: 'ahm' }, root);
      const S = { cap: 12, b: 4, g: 6, held: 0, batch: 0, asleep: false, nextClaim: 0, nextMove: 0, flush: 0, rng: U.rng(41), gpuEnd: [] };
      const col = n => (n % 2 ? '#F28C28' : '#2A63C9');
      function render() {
        Object.keys(tok).forEach(k => {
          const sl = el[k].querySelector('.slots'); const n = k === 'gpu' ? S.cap : 0;
          sl.innerHTML = tok[k].map(t => `<i style="background:${col(t.b)}"></i>`).join('') + (k === 'gpu' ? '<i class="empty"></i>'.repeat(Math.max(0, S.cap - tok[k].length)) : '');
          el[k].querySelector('.cnt').textContent = k === 'gpu' ? (S.asleep ? 'no server serving' : `${tok[k].length} / ${S.cap} slots busy`) : (k === 'cm' ? '' : `${tok[k].length}`);
          el[k].classList.toggle('sleep', k === 'gpu' && S.asleep);
        });
        const held = tok.claim.length + tok.prep.length + tok.gpu.length + tok.col.length + tok.wr.length;
        meter.textContent = `rows held ${held} / ${S.cap + 2 * S.b + S.g}`;
      }
      ctx.raf((t, dt) => {
        const now = performance.now(), held = () => tok.claim.length + tok.prep.length + tok.gpu.length + tok.col.length + tok.wr.length, max = S.cap + 2 * S.b + S.g;
        if (now > S.nextClaim) { S.nextClaim = now + 260; if (!S.asleep && held() + S.b <= max && tok.claim.length < S.b * 2) { S.batch++; for (let i = 0; i < S.b; i++) tok.claim.push({ b: S.batch }); } }
        if (now > S.nextMove) {
          S.nextMove = now + 120;
          if (tok.prep.length < S.b && tok.claim.length) tok.prep.push(tok.claim.shift());
          if (!S.asleep && tok.gpu.length < S.cap && tok.prep.length) { const x = tok.prep.shift(); x.end = now + 2200 + S.rng() * 2600; tok.gpu.push(x); }
          for (let i = tok.gpu.length - 1; i >= 0; i--) if (now > tok.gpu[i].end) tok.col.push(tok.gpu.splice(i, 1)[0]);
          if (tok.col.length) tok.wr.push(tok.col.shift());
          if (tok.wr.length >= S.g && !S.flush) { S.flush = now + 520; }
          if (S.flush && now > S.flush) { S.flush = 0; const n = tok.wr.length; tok.wr.length = 0; el.cm.classList.remove('flash'); void el.cm.offsetWidth; el.cm.classList.add('flash'); el.cm.querySelector('.cnt').textContent = `committed ${n}`; }
          render();
        }
      });
      ctx.__ah = { S, render, tok };
    },
    step(ctx, s) {
      const { S } = ctx.__ah; S.asleep = s >= 3;
      ctx.q('#ah-cap').innerHTML = ['Each stage has its own thread and a bounded buffer.', 'Results stream per request: no batch boundary. While batch k is in flight, batch k+1 is claimed and prepared.', 'The number of rows held is bounded by conservation, so a node never hoards work.', 'With every server asleep the stage claims nothing: work is not parked on a node that cannot do it.'][s];
    },
  });

  /* ── processes, threads, event loops ── */
  Deck.on('concurrency', {
    enter(ctx) {
      const root = ctx.q('#cc-dia'); root.innerHTML = ''; root.dataset.hl = '';
      const svg = U.svg('svg', { width: 1130, height: 700, style: 'position:absolute;left:0;top:0;pointer-events:none' }, root);
      const pbox = (l, t, w, h, lab) => U.html('div', { class: 'pbox', html: `<b>${lab}</b>`, style: `left:${l}px;top:${t}px;width:${w}px;height:${h}px` }, root);
      const pill = (c, l, t, txt, w) => U.html('div', { class: 'pill ' + c, text: txt, style: `left:${l}px;top:${t}px;${w ? 'width:' + w + 'px;' : ''}` }, root);
      pbox(0, 40, 380, 430, 'Stage process (one per stage)');
      ['claim loop (main thread)', 'prep thread', 'collector thread', 'writer: append · fsync · commit', 'uploader: shards to object store'].forEach((t, i) => pill('t', 22, 90 + i * 66, t));
      pbox(430, 40, 700, 430, 'Group leader process (owns the backend)');
      pill('t', 452, 90, 'dispatcher thread'); pill('t', 452, 156, 'supervisor: is_alive() every 0.5 s');
      for (let i = 0; i < 4; i++) { const x = 770 + (i % 2) * 175, y = 100 + Math.floor(i / 2) * 175; pbox(x, y, 160, 160, 'worker ' + (i + 1)); pill('q', x + 14, y + 44, 'inbox'); pill('e', x + 14, y + 94, 'event loop', 132); U.html('div', { class: 'gpu', text: 'GPU ' + (2 * i) + ',' + (2 * i + 1), style: `left:${x + 52}px;top:${y + 140}px;display:none` }, root); }
      pbox(430, 500, 340, 170, 'Sweep process'); pill('t', 452, 560, 'ledger query every 5 s');
      pbox(800, 500, 330, 170, 'DB'); U.html('div', { style: 'position:absolute;left:822px;top:556px;font-size:21px;color:var(--muted);line-height:1.5', html: 'queues · ledger<br>control tables' }, root);
      const ar = (d, col, dash) => U.svg('path', { d, fill: 'none', stroke: col, 'stroke-width': 3.5, 'stroke-dasharray': dash || '', 'marker-end': 'url(#cah)' }, svg);
      const df = U.svg('defs', {}, svg), mk = U.svg('marker', { id: 'cah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, df); U.svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#7C879F' }, mk);
      ar('M382 140 H448', '#7C879F'); ar('M382 380 V585 H798', '#7C879F'); ar('M772 585 H798', '#7C879F');
      [[770, 144], [945, 144]].forEach(([x, y]) => ar(`M706 126 C740 126 740 ${y} ${x - 6} ${y}`, '#B9A2FF'));
      [[770, 319], [945, 319]].forEach(([x, y]) => ar(`M706 126 C740 126 740 ${y} ${x - 6} ${y}`, '#B9A2FF'));
      [['requests', 392, 124], ['claim · commit', 420, 604]].forEach(([s, x, y]) => { const t = U.svg('text', { x, y, 'font-size': 18, fill: '#5B6785', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = s; });
    },
    step(ctx, s) { ctx.q('#cc-dia').dataset.hl = ['', 'p', 't', 'e', 'q'][s]; },
  });

  /* ── per-step vs bulk durability ── */
  Deck.on('durable', {
    enter(ctx) {
      const mk = (id, bulk) => {
        const host = ctx.q(id); host.innerHTML = '';
        const svg = U.svg('svg', { width: 770, height: 250, viewBox: '0 0 770 250' }, host);
        [220, 400, 580].forEach((x, i) => { U.svg('rect', { x: x - 60, y: 20, width: 120, height: 120, rx: 16, fill: '#F4F6FA', stroke: '#C3CEE5', 'stroke-width': 3 }, svg); const t = U.svg('text', { x, y: 86, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 600, fill: '#42506B', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = 'stage ' + (i + 1); });
        if (bulk) { U.svg('rect', { x: 690, y: 40, width: 70, height: 80, rx: 10, fill: '#E4ECFA', stroke: '#2A63C9', 'stroke-width': 3 }, svg); const t = U.svg('text', { x: 725, y: 86, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 600, fill: '#1F4FA8', 'font-family': 'IBM Plex Sans' }, svg); t.textContent = 'shard'; }
        const dots = [0, 1, 2, 3, 4, 5].map(i => U.svg('circle', { r: 9, cx: 20, cy: 36 + i * 18, fill: '#2A63C9' }, svg));
        const ticks = U.svg('g', {}, svg);
        return { svg, dots, ticks, n: 0, t0: null, fired: new Set(), cnt: ctx.q(bulk ? '#dm-b-n' : '#dm-a-n'), bulk };
      };
      const A = mk('#dm-a', false), B = mk('#dm-b', true);
      const tick = (L, x, i, col) => { U.svg('rect', { x: x - 42 + i * 14, y: 170, width: 11, height: 11, rx: 2, fill: col }, L.ticks); L.n++; L.cnt.textContent = L.n; };
      ctx.__d = { A, B };
      ctx.raf(() => [A, B].forEach(L => {
        if (L.t0 === null) return; const f = clamp((performance.now() - L.t0) / 6500, 0, 1), x = 20 + f * 690;
        L.dots.forEach((d, i) => { d.setAttribute('cx', x); d.setAttribute('opacity', f >= 1 && L.bulk ? 0 : 1); });
        [[220, 0.3], [400, 0.55], [580, 0.8]].forEach(([cx, th], k) => { if (f > th && !L.fired.has('s' + k)) { L.fired.add('s' + k); if (!L.bulk) for (let i = 0; i < 6; i++) ctx.after(() => tick(L, cx, i, '#C93C3C'), i * 80); } });
        if (L.bulk) { if (f > 0.02 && !L.fired.has('claim')) { L.fired.add('claim'); tick(L, 30, 3, '#2A63C9'); } if (f > 0.93 && !L.fired.has('end')) { L.fired.add('end'); tick(L, 690, 2, '#2A63C9'); tick(L, 690, 3, '#2A63C9'); } }
      }));
    },
    step(ctx, s) {
      const { A, B } = ctx.__d, reset = L => { L.t0 = null; L.n = 0; L.fired.clear(); L.ticks.innerHTML = ''; L.cnt.textContent = 0; L.dots.forEach(d => d.setAttribute('cx', 20)); };
      if (s >= 1 && A.t0 === null) A.t0 = performance.now(); if (s >= 2 && B.t0 === null) B.t0 = performance.now();
      if (s < 1) reset(A); if (s < 2) reset(B);
    },
  });

  /* ── commit order and crash points (Algorithm 1) ── */
  const SF = [
    ['Claimed', 'The row is <b>processing</b> and stamped with this node. At restart it returns to the queue.', 'none', '#5FDDB2', 'the row is claimed again'],
    ['Requested', 'The request is in flight. A dead worker’s requests are answered as <b>infra</b> and the worker respawns.', 'none', '#5FDDB2', 'the request is retried'],
    ['Result', 'The result lives in memory and dies with the process. The sample is redone, <b>not failed</b>.', '1 sample', '#FFC078', 'of model time'],
    ['Appended', 'The record is in the OS buffer, possibly torn. <b>No row confirms it</b>: truncated at restart.', '≤ g', '#FFC078', 'records of the group'],
    ['Fsynced', 'Durable, but no row says done. <b>The database is the source of truth</b>: truncated, redone.', '≤ g', '#FFC078', 'records of the group'],
    ['Handed on', 'Downstream rows are queued, the told bit is not. The sweep <b>repeats the write</b>; it changes nothing.', '≤ g', '#FFC078', 'hand-off repeated harmlessly'],
    ['Told', 'The told bit is set; rows are not done. The stage redoes them. <b>OR-ing a bit twice changes nothing.</b>', '≤ g', '#FFC078', 'records of the group'],
    ['Marked done', 'Committed with its shard:// address. <b>Never replayed.</b>', 'none', '#5FDDB2', 'finished for good'],
  ];
  Deck.on('savefirst', {
    enter(ctx) {
      const root = ctx.q('#sf-track'); root.innerHTML = '';
      const X = i => 105 + i * 210, n = SF.length;
      for (let i = 0; i < n - 1; i++) U.html('div', { class: 'ln', style: `left:${X(i) + 38}px;width:${210 - 76}px` }, root);
      const nodes = SF.map((d, i) => { const e = U.html('div', { class: 'nd', text: i + 1, style: `left:${X(i) - 34}px` }, root); U.html('div', { class: 'lb', text: d[0], style: `left:${X(i) - 95}px;width:190px` }, root); return e; });
      const zone = (a, b, cls, t) => U.html('div', { class: 'zone ' + cls, text: t, style: `left:${X(a) - 100}px;width:${X(b) - X(a) + 200}px` }, root);
      zone(0, 2, 'z1', 'per sample'); zone(3, 7, 'z2', 'one commit group of g records');
      const bolt = U.html('div', { class: 'bolt' }, root);
      bolt.innerHTML = '<svg viewBox="0 0 64 90" width="64" height="90"><path d="M38 2 8 52h20L22 88 58 34H36z" fill="#FF8A80" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';
      ctx.__sf = { nodes, bolt, X };
    },
    step(ctx, s) {
      const { nodes, bolt, X } = ctx.__sf, rs = ctx.q('#sf-restart'), cs = ctx.q('#sf-cost');
      nodes.forEach((n, i) => { n.className = 'nd' + (s === 9 ? ' all' : s >= 1 && i < s - 1 ? ' past' : (s >= 1 && i === s - 1 ? ' cur' : '')); });
      const show = s >= 1 && s <= 8; bolt.classList.toggle('on', show);
      if (show) { bolt.style.left = (X(s - 1) - 32) + 'px'; bolt.classList.remove('hit'); void bolt.offsetWidth; bolt.classList.add('hit'); }
      let a, bt, bc, bs;
      if (s === 0) { a = 'Press → to kill the process at each step.'; bt = '?'; bc = '#C7D6F3'; bs = 'what is redone?'; }
      else if (s === 9) { a = '<b>Done implies durable.</b> <b>Told implies queued.</b> Every sample reaches every stage its route names, exactly once.'; bt = '≤ g'; bc = '#5FDDB2'; bs = 'records redone per crash; none lost, none twice'; }
      else { const d = SF[s - 1]; a = `<b style="color:#FFC078">${s}. ${d[0]}.</b> ${d[1]}`; bt = d[2]; bc = d[3]; bs = d[4]; }
      rs.querySelector('p').innerHTML = a; cs.querySelector('b').textContent = bt; cs.querySelector('b').style.color = bc; cs.querySelector('span').textContent = bs;
      [rs, cs].forEach(e => { e.classList.remove('swap'); void e.offsetWidth; e.classList.add('swap'); });
    },
  });

  /* ── state: queue tables, ledger, shards ── */
  Deck.on('state', {
    enter(ctx) {
      const root = ctx.q('#st-dia'); root.innerHTML = '';
      const svg = U.svg('svg', { width: 1680, height: 640, viewBox: '0 0 1680 640', style: 'position:absolute;left:0;top:0;pointer-events:none' }, root);
      const df = U.svg('defs', {}, svg), mk = U.svg('marker', { id: 'sah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, df); U.svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#7C879F' }, mk);
      const box = (cls, l, t, w, h, html) => U.html('div', { class: 'stb ' + cls, style: `left:${l}px;top:${t}px;width:${w}px;height:${h}px`, html }, root);
      const pg = box('pg', 560, 10, 560, 410, '<h4>DB</h4>');
      const zq = box('zq', 584, 70, 512, 100, '<b>Queue tables</b><span>one per stage · one row per sample</span><div class="rowsg">' + '<i></i>'.repeat(18) + '</div>');
      const zl = box('zl', 584, 184, 512, 100, '<b>Ledger</b><span>per sample in flight: done · told</span><div class="bitsg"><i>0</i><i>1</i><i>1</i><i>0</i><i>0</i><i>1</i><i>0</i></div>');
      const zc = box('zc', 584, 298, 512, 100, '<b>Control tables</b><span>node counts · node events · stop requests</span>');
      const na = box('na', 0, 30, 440, 170, '<h4>Node A</h4><span>stage workers · worker pool</span>'), nb = box('nb', 0, 235, 440, 170, '<h4>Node B</h4><span>stage workers · worker pool</span>');
      const rg = box('rg', 1220, 10, 420, 100, '<h4>Registry</h4><span>which servers are serving now</span>'), sv = box('sv', 1220, 140, 420, 130, '<h4>Hosted model servers</h4><span>shared by all pipelines</span>'), sw = box('sw', 1220, 300, 420, 120, '<h4>Sweep</h4><span>starts fan-in stages, one node at a time</span>');
      const sh = box('sh', 0, 480, 1640, 130, '<h4>Output shards</h4><span>append-only JSONL and tar on node-local NVMe, then the object store</span><div class="addr mono">shard://archive/offset/length</div>');
      const ar = (d, c) => U.svg('path', { d, fill: 'none', stroke: c || '#7C879F', 'stroke-width': 3.5, 'marker-end': 'url(#sah)' }, svg);
      const aClaim = [ar('M442 115 H556'), ar('M442 320 H556')], aSw = ar('M1218 360 H1124'), aSh = [ar('M220 202 V476'), ar('M220 407 V476')];
      const x = U.svg('g', { style: 'opacity:0;transition:opacity .5s' }, svg);
      U.svg('path', { d: 'M220 208 V230', stroke: '#C93C3C', 'stroke-width': 5, 'stroke-dasharray': '4 6' }, x);
      const xt = U.svg('text', { x: 240, y: 224, 'font-size': 22, 'font-weight': 700, fill: '#C93C3C', 'font-family': 'IBM Plex Sans' }, x); xt.textContent = 'no direct communication';
      ctx.__st = { zq, zl, zc, na, nb, sh, sw, aClaim, aSw, aSh, x, pg };
    },
    step(ctx, s) {
      const o = ctx.__st, hl = (e, on) => { e.classList.toggle('hl', on); e.classList.toggle('dim', s > 0 && !on); };
      hl(o.zq, s === 1); hl(o.zl, s === 2); hl(o.zc, s === 2 && false); hl(o.sw, s === 2); hl(o.sh, s === 3); hl(o.na, s === 1 || s === 3 || s === 4); hl(o.nb, s === 1 || s === 3 || s === 4);
      o.aClaim.forEach(a => a.style.opacity = s === 0 || s === 1 ? 1 : .2); o.aSw.style.opacity = s === 2 ? 1 : .2; o.aSh.forEach(a => a.style.opacity = s === 3 ? 1 : .2); o.x.style.opacity = s === 4 ? 1 : 0;
      ctx.q('#st-cap').innerHTML = ['Three kinds of durable state.', '<b>Queue tables:</b> one row per sample, per stage.', '<b>Ledger:</b> two integers per sample in flight.', '<b>Output shards:</b> append-only files, addressed by shard://.', 'Processes never talk to each other. <b>No master, lease or heartbeat.</b>'][s];
    },
  });

  /* ── recovery ── */
  Deck.on('recovery', {
    enter(ctx) {
      const sh = ctx.q('#rv-shard'), rw = ctx.q('#rv-rows'); sh.innerHTML = ''; rw.innerHTML = '';
      const S = [], R = []; for (let i = 0; i < 14; i++) { S.push(U.html('i', { text: i + 1 }, sh)); R.push(U.html('i', { text: i + 1 }, rw)); }
      ctx.__rv = { S, R };
    },
    step(ctx, s) {
      const { S, R } = ctx.__rv, note = ctx.q('#rv-note');
      const set = (e, c) => { e.className = c; };
      S.forEach((e, i) => { if (i < 9) set(e, 'ok'); else set(e, s === 0 ? '' : (s <= 2 ? 'un' : (s === 3 ? 'un cut' : 'ok'))); });
      R.forEach((e, i) => { if (i < 9) set(e, 'done'); else set(e, s <= 1 ? 'proc' : (s === 2 || s === 3 ? 'pend' : 'done')); });
      if (s === 0) S.forEach((e, i) => { if (i >= 9) ctx.after(() => { if (ctx.step === 0) set(e, 'un'); }, 500 + (i - 9) * 450); });
      note.innerHTML = ['A stage is running. Records are appended; rows are marked done per commit group.', '<b>kill -9.</b> Records 10–14 were appended, but their rows were never marked done.', '<b>1 ·</b> Rows stamped with this node return to <b>pending</b>.', '<b>2 ·</b> The shard is truncated after the last <b>done</b> record.', 'The stage continues: rows 10–14 are claimed again and written <b>once</b>.'][s];
    },
  });

  /* ── cost of durability ── */
  Deck.on('cost', {
    enter(ctx) {
      const host = ctx.q('#ct-chart'); host.innerHTML = '';
      const svg = U.svg('svg', { viewBox: '0 0 970 540', width: 970, height: 540 }, host);
      const panel = (y0, title, unit, rows, max) => {
        const g = U.svg('g', { style: 'opacity:0;transition:opacity .7s' }, svg), X0 = 230, SC = 560 / max;
        const t = U.svg('text', { x: 0, y: y0 + 8, 'font-size': 27, 'font-weight': 700, fill: '#0E1A3A', 'font-family': 'Sora' }, g); t.textContent = title;
        const u = U.svg('text', { x: 0, y: y0 + 36, 'font-size': 20, fill: '#5B6785', 'font-family': 'IBM Plex Sans' }, g); u.textContent = unit;
        rows.forEach(([n, a, b, col, lab], i) => {
          const y = y0 + 60 + i * 62; const nm = U.svg('text', { x: X0 - 14, y: y + 30, 'text-anchor': 'end', 'font-size': 23, 'font-weight': 600, fill: '#0E1A3A', 'font-family': 'IBM Plex Sans' }, g); nm.textContent = n;
          const w0 = Math.max(a * SC, 6), w1 = Math.max(b * SC, 6);
          if (b > a) { U.svg('rect', { x: X0, y, width: w0, height: 40, rx: 8, fill: col, opacity: .45 }, g); U.svg('rect', { x: X0 + w0, y, width: w1 - w0, height: 40, rx: 8, fill: col }, g); } else U.svg('rect', { x: X0, y, width: w0, height: 40, rx: 8, fill: col }, g);
          const lv = U.svg('text', { x: X0 + w1 + 14, y: y + 30, 'font-size': 25, 'font-weight': 700, fill: '#0E1A3A', 'font-family': 'IBM Plex Mono' }, g); lv.textContent = lab;
        });
        return g;
      };
      ctx.__ct = [panel(10, 'Commits per page', 'database transactions', [['Patram-Ingest', 0.2, 0.2, '#0E7C61', '0.2'], ['DBOS', 18, 18, '#C93C3C', '18  (90×)'], ['Temporal', 42, 110, '#C93C3C', '42–110']], 110),
        panel(280, 'Log written per page', 'KB of write-ahead log', [['Patram-Ingest', 11, 12, '#0E7C61', '11–12'], ['DBOS', 254, 283, '#C93C3C', '254–283'], ['Temporal', 329, 1112, '#C93C3C', '329–1,112']], 1112)];
    },
    step(ctx, s) { ctx.__ct[0].style.opacity = s >= 2 ? 1 : 0; ctx.__ct[1].style.opacity = s >= 3 ? 1 : 0; },
  });
})();
