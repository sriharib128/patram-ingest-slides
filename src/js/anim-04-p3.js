(function () {
  const U = Deck.util, clamp = U.clamp;
  const scaleOf = () => document.getElementById('stage').getBoundingClientRect().width / 1920;

  /* ── divider motif ── */
  Deck.on('d3', {
    enter(ctx) {
      const svg = ctx.q('#d3-motif'); svg.innerHTML = '';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
        const i = r * 6 + c, dead = i === 14;
        const e = U.svg('rect', { class: 'sq' + (dead ? ' dead' : ''), x: 30 + c * 112, y: 60 + r * 112, width: 94, height: 94, rx: 16, fill: dead ? '#9DB3DC' : (i % 5 === 0 ? '#FFC078' : '#9DB3DC'), 'fill-opacity': dead ? .8 : .55 }, svg);
        e.style.animationDelay = (.3 + i * .07) + 's' + (dead ? ',2.8s' : '');
      }
    },
  });

  /* ── the DB queue ── */
  Deck.on('queue', {
    enter(ctx) {
      const grid = ctx.q('#q-grid'); grid.innerHTML = '';
      const cells = [...Array(48)].map(() => ({ el: U.html('div', { class: 'qc' }, grid), state: 'w', owner: null }));
      const M = [
        { n: 'A', c: '#2A63C9', ct: '#DCE7FA', sp: 1.4 }, { n: 'B', c: '#F28C28', ct: '#FDE9D2', sp: 1.0 }, { n: 'C', c: '#0E7C61', ct: '#D6EEE6', sp: .7 },
      ].map(m => Object.assign(m, { alive: true, busy: false, until: 0, batch: [], done: 0, rowEl: null }));
      const box = ctx.q('#q-mach'); box.innerHTML = '';
      M.forEach(m => { m.rowEl = U.html('div', { class: 'mr', style: `--c:${m.c}`, html: `<i></i><b>Node ${m.n}</b><span>idle</span><em>0</em>` }, box); });
      const skip = ctx.q('#q-skip'), nodeEl = ctx.q('#q-node');
      const S = { running: false, crashPending: false, resetAt: 0 };
      const rng = U.rng(11);
      function paint() {
        cells.forEach(c => { c.el.classList.remove('w', 'k', 'd'); c.el.classList.add(c.state); if (c.owner) { c.el.style.setProperty('--c', c.owner.c); c.el.style.setProperty('--ct', c.owner.ct); } });
        M.forEach(m => {
          m.rowEl.classList.toggle('dead', !m.alive);
          m.rowEl.querySelector('span').textContent = !m.alive ? 'crashed: its rows go back to waiting' : (m.busy ? `working on ${m.batch.length} rows` : 'asking for work…');
          m.rowEl.querySelector('em').textContent = m.done;
        });
      }
      function reset() { cells.forEach(c => { c.state = 'w'; c.owner = null; }); M.forEach(m => { m.alive = true; m.busy = false; m.batch = []; m.done = 0; }); S.resetAt = 0; paint(); }
      function crash(m) {
        m.alive = false; m.busy = false;
        m.batch.forEach(c => { c.state = 'w'; c.owner = null; c.el.classList.add('flash'); setTimeout(() => c.el.classList.remove('flash'), 800); });
        m.batch = []; paint();
      }
      ctx.__q = { S, M, cells, reset, crash, paint };
      ctx.raf(() => {
        if (!S.running) return; const now = performance.now();
        M.forEach(m => {
          if (!m.alive) return;
          if (m.busy && now >= m.until) { m.batch.forEach(c => c.state = 'd'); m.done += m.batch.length; m.batch = []; m.busy = false; }
          if (!m.busy) {
            const w = cells.filter(c => c.state === 'w').slice(0, 4);
            if (w.length) { w.forEach(c => { c.state = 'k'; c.owner = m; }); m.batch = w; m.busy = true; m.until = now + 3000 / m.sp * (.85 + rng() * .3); if (nodeEl) nodeEl.textContent = `'${m.n}'`; skip.classList.add('pulse'); setTimeout(() => skip.classList.remove('pulse'), 450); }
          }
        });
        if (S.crashPending && M[1].busy) { S.crashPending = false; ctx.after(() => crash(M[1]), 400); }
        if (cells.every(c => c.state === 'd')) { if (!S.resetAt) S.resetAt = now + 1800; else if (now > S.resetAt) { const wasDead = !M[1].alive; reset(); M[1].alive = !wasDead ? true : M[1].alive; } }
        paint();
      });
      paint();
    },
    step(ctx, s, p) {
      const Q = ctx.__q, cap = [
        'One row per sample, per stage.',
        'One statement claims a batch. <b>SKIP LOCKED</b>: concurrent workers never share or wait on rows.',
        'Node B dies. Its rows return to the queue and are claimed elsewhere. <b>No coordinator.</b>',
        'Nothing is assigned in advance: faster nodes take more work.',
      ][s];
      ctx.q('#q-cap').innerHTML = cap;
      if (s < p && p !== -1) { Q.reset(); }
      if (s === 0) { Q.S.running = false; Q.reset(); }
      if (s >= 1) Q.S.running = true;
      if (s === 2 && p === 1) Q.S.crashPending = true;
      if (s === 2 && p !== 1) { Q.M[1].alive = false; }
      if (s === 3) { if (p === 2) ctx.after(() => { Q.M[1].alive = true; Q.paint(); }, 1200); else Q.M[1].alive = true; }
      if (s === 1) Q.M[1].alive = true;
      Q.paint();
    },
  });

  /* ── boring on purpose ── */
  Deck.on('boring', {
    step(ctx, s) {
      const opts = ctx.qa('#b-opts .opt');
      opts.forEach((o, i) => { ctx.after(() => o.classList.toggle('struck', s >= 1), s >= 1 ? i * 650 : 0); });
    },
  });

  /* ── nine crash points ── */
  const SF = [
    ['Queued', 'Nothing to do. It is still <b>waiting</b>.', 'Nothing', '#5FDDB2', ''],
    ['Claimed', 'A restarted node hands back every row it held. <b>In-flight always rewinds.</b>', 'Nothing', '#5FDDB2', ''],
    ['Dispatched', 'A supervisor notices, answers as <b>infra</b>, respawns the worker.', 'Nothing', '#5FDDB2', 'the row is retried'],
    ['Processed', 'The result dies with the process. Redone, <b>not failed</b>.', '1 image', '#FFC078', 'of GPU time'],
    ['Written', 'A <b>torn half-line</b> in the file. Trimmed to the last done record.', '≤ 250', '#FFC078', 'images redone'],
    ['Fsync’d', 'Safe on disk but not marked done: <b>the queue wins</b>. Trimmed, redone.', '≤ 250', '#FFC078', 'images redone'],
    ['Routed', 'Same rule: <b>keep what is marked done</b>, redo what isn’t.', '≤ 250', '#FFC078', 'images redone'],
    ['Committed', 'Nothing happens. <b>Finished for good.</b>', 'Nothing', '#5FDDB2', 'never replayed'],
    ['Handed off', 'The hand-off is simply <b>performed again</b>. Seed first, then mark.', 'Nothing', '#5FDDB2', ''],
  ];
  Deck.on('savefirst', {
    enter(ctx) {
      const root = ctx.q('#sf-track'); root.innerHTML = '';
      const X = i => 93 + i * 186.5;
      for (let i = 0; i < 8; i++) U.html('div', { class: 'ln', style: `left:${X(i) + 36}px;width:${186.5 - 72}px` }, root);
      const nodes = SF.map((d, i) => {
        const n = U.html('div', { class: 'nd', text: i + 1, style: `left:${X(i) - 34}px` }, root);
        U.html('div', { class: 'lb', text: d[0], style: `left:${X(i) - 85}px` }, root); return n;
      });
      const zone = (a, b, cls, t) => U.html('div', { class: 'zone ' + cls, text: t, style: `left:${X(a) - 70}px;width:${X(b) - X(a) + 140}px` }, root);
      zone(0, 3, 'z1', 'per image, in memory and in the queue'); zone(4, 7, 'z2', 'a flush group: write · fsync · router · commit'); zone(8, 8, 'z3', 'hand-off');
      const bolt = U.html('div', { class: 'bolt' }, root);
      bolt.innerHTML = '<svg viewBox="0 0 64 90" width="64" height="90"><path d="M38 2 8 52h20L22 88 58 34H36z" fill="#FF8A80" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';
      ctx.__sf = { nodes, bolt, X };
    },
    step(ctx, s, p) {
      const { nodes, bolt, X } = ctx.__sf, rs = ctx.q('#sf-restart'), cs = ctx.q('#sf-cost');
      nodes.forEach((n, i) => { n.className = 'nd' + (s === 10 ? ' all' : s >= 1 && i < s - 1 ? ' past' : (s >= 1 && i === s - 1 ? ' cur' : '')); });
      const show = s >= 1 && s <= 9;
      bolt.classList.toggle('on', show);
      if (show) { bolt.style.left = (X(s - 1) - 32) + 'px'; bolt.classList.remove('hit'); void bolt.offsetWidth; bolt.classList.add('hit'); }
      let a, bt, bc, bs;
      if (s === 0) { a = 'Press → to kill the process at each step.'; bt = '?'; bc = '#C7D6F3'; bs = 'what does each crash cost?'; }
      else if (s === 10) { a = '<b>Nine crash points. One rule:</b> keep what is marked done, redo what isn’t.'; bt = '≤ 250'; bc = '#5FDDB2'; bs = 'redone. Nothing lost, nothing twice.'; }
      else { const d = SF[s - 1]; a = `<b style="color:#FFC078">${s}. ${d[0]}.</b> ${d[1]}`; bt = d[2]; bc = d[3]; bs = d[4]; }
      rs.querySelector('p').innerHTML = a; cs.querySelector('b').textContent = bt; cs.querySelector('b').style.color = bc; cs.querySelector('span').textContent = bs;
      [rs, cs].forEach(e => { e.classList.remove('swap'); void e.offsetWidth; e.classList.add('swap'); });
    },
  });

  /* ── error sorting ── */
  const CHIPS = [
    ['corrupt image', 's'], ['server crash', 'y'], ['broken JSON', 's'], ['out of memory', 'y'], ['answer cut off', 's'], ['network blip', 'y'], ['server asleep', 'y'],
    ['image too large', 's'], ['slow response', 'y'], ['disk full', 'y'], ['database failover', 'y'], ['process killed', 'y'], ['wrong format', 's'],
  ];
  Deck.on('errors', {
    enter(ctx) {
      const pool = ctx.q('#er-pool'); pool.innerHTML = '';
      const order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].sort((a, b) => ((a * 7) % 13) - ((b * 7) % 13));
      ctx.__chips = order.map(i => ({ side: CHIPS[i][1], el: U.html('span', { class: 'ech', text: CHIPS[i][0] }, pool) }));
      ctx.__sorted = false;
    },
    step(ctx, s) {
      const pool = ctx.q('#er-pool'), slots = { s: ctx.q('#er-sample .slot'), y: ctx.q('#er-system .slot') };
      const sc = scaleOf();
      if (s >= 1 && !ctx.__sorted) {
        ctx.__sorted = true;
        const sorted = [...ctx.__chips].sort((a, b) => a.side.localeCompare(b.side) * -1);
        let d = 0;
        ctx.__chips.forEach(c => {
          const first = c.el.getBoundingClientRect(); slots[c.side].appendChild(c.el); const last = c.el.getBoundingClientRect();
          c.el.style.transition = 'none'; c.el.style.transform = `translate(${(first.left - last.left) / sc}px,${(first.top - last.top) / sc}px)`; void c.el.offsetWidth;
          c.el.style.transition = `transform .9s cubic-bezier(.22,.9,.3,1) ${d}ms, background .4s ease ${d + 500}ms, border-color .4s ease ${d + 500}ms`; c.el.style.transform = 'none'; c.el.classList.add(c.side); d += 130;
        });
      } else if (s < 1 && ctx.__sorted) {
        ctx.__sorted = false; ctx.__chips.forEach(c => { c.el.style.transition = 'none'; c.el.style.transform = 'none'; c.el.classList.remove('s', 'y'); pool.appendChild(c.el); });
      }
    },
  });

  /* ── the 1-in-N bug ── */
  Deck.on('inn', {
    enter(ctx) {
      const NS = 'http://www.w3.org/2000/svg';
      const mkDia = (root, after) => {
        const svg = root.querySelector('svg'); svg.innerHTML = '';
        const g = (t, a, p) => U.svg(t, a, p || svg);
        const W = [0, 1, 2, 3].map(i => ({ i, y: 20 + i * 78, alive: true, blocked: false, flash: 0 }));
        const wEl = W.map(w => {
          const r = g('rect', { x: 560, y: w.y, width: 200, height: 58, rx: 14, fill: 'rgba(255,255,255,.08)', stroke: '#9DB3DC', 'stroke-width': 3 });
          const t = g('text', { x: 660, y: w.y + 37, 'text-anchor': 'middle', 'font-size': 23, 'font-weight': 600 }); t.textContent = 'W' + (w.i + 1);
          return { r, t };
        });
        const lines = [], inb = [];
        let qx2;
        if (!after) {
          g('rect', { x: 20, y: 105, width: 150, height: 120, rx: 18, fill: 'rgba(255,255,255,.08)', stroke: '#9DB3DC', 'stroke-width': 3 });
          const qt = g('text', { x: 95, y: 175, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 600 }); qt.textContent = 'queue';
          const lk = g('g', { transform: 'translate(70 52)' });
          const lkb = g('rect', { x: 0, y: 18, width: 50, height: 38, rx: 7, fill: '#5FDDB2' }, lk), lka = g('path', { d: 'M9 18v-9a16 16 0 0 1 32 0v9', fill: 'none', stroke: '#5FDDB2', 'stroke-width': 6, 'stroke-linecap': 'round' }, lk);
          const lkt = g('text', { x: 20, y: 262, 'text-anchor': 'start', 'font-size': 20, 'font-weight': 600, fill: '#5FDDB2', style: 'fill:#5FDDB2' }); lkt.textContent = 'reader lock';
          W.forEach(w => lines.push({ d: `M170 165 L560 ${w.y + 29}`, w }));
          return { svg, W, wEl, lines, lock: { lkb, lka, lkt }, srcX: 170, srcY: 165, g };
        }
        g('rect', { x: 20, y: 120, width: 110, height: 90, rx: 16, fill: 'rgba(255,255,255,.08)', stroke: '#9DB3DC', 'stroke-width': 3 });
        const qt = g('text', { x: 75, y: 172, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 600 }); qt.textContent = 'queue';
        g('circle', { cx: 235, cy: 165, r: 40, fill: 'rgba(255,192,120,.18)', stroke: '#FFC078', 'stroke-width': 3 });
        const dt = g('text', { x: 235, y: 171, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 600, style: 'fill:#FFC078' }); dt.textContent = 'dispatch';
        g('path', { d: 'M130 165 H195', stroke: '#9DB3DC', 'stroke-width': 3, fill: 'none' });
        W.forEach(w => {
          const r = g('rect', { x: 390, y: w.y + 9, width: 110, height: 40, rx: 10, fill: 'rgba(255,255,255,.08)', stroke: '#9DB3DC', 'stroke-width': 2.5 });
          const t = g('text', { x: 445, y: w.y + 36, 'text-anchor': 'middle', 'font-size': 18 }); t.textContent = 'inbox';
          inb.push({ r, t }); g('path', { d: `M275 165 C330 165 335 ${w.y + 29} 390 ${w.y + 29}`, stroke: '#9DB3DC', 'stroke-width': 2.5, fill: 'none' });
          g('path', { d: `M500 ${w.y + 29} H560`, stroke: '#9DB3DC', 'stroke-width': 2.5, fill: 'none' });
          lines.push({ d: `M130 165 H195 M275 165 C330 165 335 ${w.y + 29} 390 ${w.y + 29} H560`, w });
        });
        return { svg, W, wEl, lines, inb, srcX: 130, srcY: 165, g };
      };
      const mk = (id, after) => {
        const root = ctx.q(id), D = mkDia(root, after); D.root = root; D.after = after; D.done = []; D.dots = [];
        D.paths = D.lines.map(l => D.g('path', { d: l.d, fill: 'none', stroke: after ? 'none' : 'rgba(157,179,220,.4)', 'stroke-width': 2.5 }));
        D.tpEl = root.querySelector('.tp'); D.okEl = root.querySelector('.ok'); D.frozen = false; D.rate = 100;
        return D;
      };
      const B = mk('#inn-b', false), A = mk('#inn-a', true);
      ctx.__inn = { B, A };
      const colorW = (D) => D.W.forEach((w, i) => {
        const e = D.wEl[i]; const col = !w.alive ? '#FF8A80' : (w.blocked ? '#FFC078' : '#9DB3DC');
        e.r.setAttribute('stroke', col); e.r.setAttribute('stroke-dasharray', w.blocked ? '8 6' : ''); e.r.setAttribute('fill', !w.alive ? 'rgba(255,138,128,.2)' : (w.flash > 0 ? 'rgba(95,221,178,.35)' : 'rgba(255,255,255,.08)'));
        e.t.textContent = !w.alive ? 'W' + (i + 1) + '  killed' : (w.blocked ? 'W' + (i + 1) + '  waiting…' : 'W' + (i + 1));
      });
      let acc = 0, nextW = 0;
      ctx.raf((t, dt) => {
        acc += dt;
        [B, A].forEach(D => {
          if (D.root.style.opacity === '0.35' && D === A) return;
          if (acc > 480) {
            // spawn a request to a free worker
            const free = D.W.filter(w => w.alive && !w.blocked);
            if (free.length && !D.frozen) { const w = free[(nextW++) % free.length]; D.dots.push({ w, t: 0, el: D.g('circle', { r: 9, fill: '#FFC078' }) }); }
            else if (D.frozen && D.dots.filter(d => d.queued).length < 5) D.dots.push({ w: D.W[0], t: 0, queued: true, el: D.g('circle', { r: 9, fill: '#FFC078' }) });
          }
          for (let k = D.dots.length - 1; k >= 0; k--) {
            const d = D.dots[k];
            if (d.queued) { d.el.setAttribute('cx', 45 + (k % 5) * 22); d.el.setAttribute('cy', 128 + Math.floor(k / 5) * 20); d.el.setAttribute('opacity', .8); continue; }
            d.t += dt / 900; const path = D.paths[d.w.i], L = path.getTotalLength(), pt = path.getPointAtLength(Math.min(1, d.t) * L);
            d.el.setAttribute('cx', pt.x); d.el.setAttribute('cy', pt.y);
            if (d.t >= 1) { d.el.remove(); D.dots.splice(k, 1); if (d.w.alive && !d.w.blocked) { d.w.flash = 1; D.done.push(performance.now()); } }
          }
          D.W.forEach(w => w.flash = Math.max(0, w.flash - dt / 250));
          colorW(D);
          const now = performance.now(); D.done = D.done.filter(x => now - x < 3000);
          const pct = Math.round(clamp(D.done.length / 6.2, 0, 1) * 100);
          D.tpEl.textContent = 'throughput ' + pct + '%'; D.tpEl.style.color = pct > 55 ? '#fff' : (pct > 15 ? '#FFC078' : '#FF8A80');
        });
        if (acc > 480) acc = 0;
      });
      ctx.__kill = (D) => {
        const w = D.W[1]; w.alive = false;
        if (!D.after) {
          D.lock.lkb.setAttribute('fill', '#FF8A80'); D.lock.lka.setAttribute('stroke', '#FF8A80'); D.lock.lkt.textContent = 'held by a dead process'; D.lock.lkt.style.fill = '#FF8A80';
          ctx.after(() => { w.alive = true; D.W.forEach(x => x.blocked = true); D.frozen = true; }, 900);
        } else {
          D.inb[1].r.setAttribute('stroke', '#FF8A80'); D.inb[1].t.textContent = 'discarded';
          ctx.after(() => { w.alive = true; D.inb[1].r.setAttribute('stroke', '#9DB3DC'); D.inb[1].t.textContent = 'new inbox'; }, 900);
        }
      };
      ctx.__innReset = () => {
        [B, A].forEach(D => { D.W.forEach(w => { w.alive = true; w.blocked = false; }); D.frozen = false; D.dots.forEach(d => d.el.remove()); D.dots = []; D.done = [];
          if (!D.after) { D.lock.lkb.setAttribute('fill', '#5FDDB2'); D.lock.lka.setAttribute('stroke', '#5FDDB2'); D.lock.lkt.textContent = 'reader lock'; D.lock.lkt.style.fill = '#5FDDB2'; }
          else { D.inb.forEach(i => { i.r.setAttribute('stroke', '#9DB3DC'); i.t.textContent = 'inbox'; }); } });
      };
    },
    step(ctx, s, p) {
      const { B, A } = ctx.__inn;
      const cap = [
        'Every worker reads one shared queue. Reading it <b>holds an internal lock</b>.',
        'A worker holding the lock is killed. <b>The lock is never released.</b> The pool reports healthy; nothing moves.',
        'Fix: <b>one dispatcher</b> reads the queue and feeds a <b>private inbox</b> per worker. A kill affects only its own.',
        'A kill hits the lock holder about <b>1 time in N</b>. Measured:',
        '',
      ][s];
      ctx.q('#inn-cap').innerHTML = cap;
      A.root.style.opacity = s >= 2 ? 1 : .35;
      if (p > s && p !== -1) ctx.__innReset();
      if (s === 1 && p === 0) ctx.after(() => ctx.__kill(B), 300);
      if (s === 1 && p !== 0 && p !== -1) ctx.after(() => ctx.__kill(B), 300);
      if (s >= 2 && p === 1) { ctx.__kill(B); }
      if (s === 2 && p === 1) ctx.after(() => ctx.__kill(A), 1800);
      if (s >= 1 && p === -1) { ctx.after(() => ctx.__kill(B), 300); if (s >= 2) ctx.after(() => ctx.__kill(A), 1200); }
      if (s === 2 && p === 3) { ctx.__innReset(); ctx.after(() => ctx.__kill(B), 300); ctx.after(() => ctx.__kill(A), 1200); }
      B.okEl.textContent = 'pool: healthy, 4 / 4 workers';
    },
  });

  /* ── absence is the alarm ── */
  Deck.on('absence', {
    enter(ctx) {
      const grid = ctx.q('#ab-grid'); grid.innerHTML = '';
      const rng = U.rng(5);
      const T = [...Array(24)].map((_, i) => ({ el: U.html('div', { class: 'tn', html: `<small>node-${String(i + 1).padStart(2, '0')}</small><b>0</b>` }, grid), n: Math.floor(rng() * 4000), rate: .6 + rng() * 1.4, dead: false, acc: 0 }));
      ctx.__T = T;
      const kill = [2, 5, 8, 9, 12, 15, 17, 20, 22];
      ctx.__kill = () => kill.forEach((k, j) => ctx.after(() => { T[k].dead = true; T[k].el.classList.add('dead'); }, 400 + j * 380));
      ctx.__revive = () => T.forEach(t => { t.dead = false; t.el.classList.remove('dead'); });
      ctx.raf((t, dt) => T.forEach(x => { if (x.dead) return; x.acc += dt * x.rate / 4; if (x.acc >= 1) { x.n += Math.floor(x.acc); x.acc %= 1; x.el.querySelector('b').textContent = x.n.toLocaleString('en-US'); } }));
    },
    step(ctx, s, p) {
      const msg = ctx.q('#ab-msg');
      msg.innerHTML = ['24 nodes, each counting its output.', '<b class="hr">Nine died.</b> Nobody noticed for ~6 hours.', 'Read what a node <b>stops doing</b>.'][s];
      if (s >= 1 && p < 1) ctx.__kill();
      if (s < 1 && p >= 1) ctx.__revive();
    },
  });
})();
