(function () {
  const U = Deck.util;

  /* ── title: a living pipeline graph behind the title ── */
  Deck.on('title', {
    enter(ctx) {
      const cv = ctx.q('canvas'), g = cv.getContext('2d');
      const cols = [[1280, [540]], [1450, [260, 430, 650, 820]], [1620, [340, 540, 740]], [1770, [440, 640]]];
      const nodes = [];
      cols.forEach(([x, ys], c) => ys.forEach(y => nodes.push({ x, y, c, out: [], pulse: 0 })));
      const byCol = c => nodes.filter(n => n.c === c);
      nodes.forEach(n => { if (n.c < 3) byCol(n.c + 1).forEach(m => { if (n.c === 0 || Math.abs(m.y - n.y) < 330) n.out.push(m); }); });
      const parts = [];
      const spawn = () => { const a = nodes[0]; parts.push({ a, b: a.out[Math.floor(Math.random() * a.out.length)], t: 0, hue: Math.random() < .5 ? '#F28C28' : '#9DB3DC', sp: U.rand(.55, .9) }); };
      let acc = 0;
      ctx.raf((t, dt) => {
        acc += dt; if (acc > 380) { acc = 0; spawn(); }
        g.clearRect(0, 0, 1920, 1080);
        g.lineWidth = 2; g.strokeStyle = 'rgba(157,179,220,.22)';
        nodes.forEach(n => n.out.forEach(m => { g.beginPath(); g.moveTo(n.x, n.y); g.lineTo(m.x, m.y); g.stroke(); }));
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]; p.t += dt / 1000 * p.sp * 1.7;
          if (p.t >= 1) { p.b.pulse = 1; if (p.b.out.length) { p.a = p.b; p.b = p.b.out[Math.floor(Math.random() * p.b.out.length)]; p.t = 0; } else parts.splice(i, 1); continue; }
          const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
          const gr = g.createRadialGradient(x, y, 0, x, y, 22); gr.addColorStop(0, p.hue); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.globalAlpha = .9; g.fillStyle = gr; g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill(); g.globalAlpha = 1;
          g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
        }
        nodes.forEach(n => {
          n.pulse = Math.max(0, n.pulse - dt / 500);
          g.fillStyle = `rgba(22,38,79,${.9})`; g.strokeStyle = n.pulse > 0 ? `rgba(255,192,120,${.4 + n.pulse * .6})` : 'rgba(157,179,220,.55)'; g.lineWidth = 3;
          g.beginPath(); g.roundRect(n.x - 24, n.y - 24, 48, 48, 12); g.fill(); g.stroke();
          if (n.pulse > 0) { g.fillStyle = `rgba(242,140,40,${n.pulse * .5})`; g.beginPath(); g.roundRect(n.x - 24, n.y - 24, 48, 48, 12); g.fill(); }
        });
      });
    },
    step(ctx, s, p) {
      if (s >= 1 && p < 1) ctx.qa('[data-count]').forEach(b => {
        const to = +b.dataset.count, suf = b.dataset.suffix || '';
        const dec = +b.dataset.dec || 0; U.countUp(ctx, b, to, 1500, v => (dec ? v.toFixed(dec) : Math.round(v)) + suf);
      });
      if (s < 1) ctx.qa('[data-count]').forEach(b => b.textContent = '0' + (b.dataset.suffix ? '' : ''));
    },
  });

  /* ── hook: the node that dies ── */
  Deck.on('hook', {
    enter(ctx) {
      const grid = ctx.q('#cluster-grid'); grid.innerHTML = '';
      const r = U.rng(7);
      for (let i = 0; i < 32; i++) {
        const t = U.html('div', { class: 'tile', 'data-i': i }, grid);
        for (let k = 0; k < 8; k++) U.html('u', { style: `animation-delay:${(r() * 1.6).toFixed(2)}s;animation-duration:${(1.1 + r()).toFixed(2)}s` }, t);
      }
    },
    step(ctx, s, p) {
      const tiles = ctx.qa('.tile'), dead = tiles[13], buddy = tiles[14], msg = ctx.q('#cluster-msg');
      dead.classList.toggle('dead', s >= 1); buddy.classList.toggle('take', s >= 3);
      if (s >= 1 && s < 3) msg.innerHTML = '<span style="color:#FF8A80">●</span> Node 14 is gone. Its in-flight work is <b style="color:#fff">unfinished</b>.';
      if (s >= 3) msg.innerHTML = '<span style="color:#FFC078">●</span> Its unfinished images go back in the queue. Another node takes them.';
      if (s >= 3 && p < 3) { const n = ctx.q('#hook-n'); U.countUp(ctx, n, 250, 1100); }
    },
  });

  /* ── the four-line loop ── */
  Deck.on('loop', {
    enter(ctx) {
      const code = 'for page in pages:\n    reply = model(instruction, image=page)\n    if looks_valid(reply):\n        save(page, reply)';
      ctx.after(() => U.typeCode(ctx, ctx.q('#loop-code'), code, 34), 500);
    },
  });
})();
