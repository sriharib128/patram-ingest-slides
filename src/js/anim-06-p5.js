(function () {
  const U = Deck.util;

  /* d5 motif: forks, one branch turned down */
  Deck.on('d5', {
    enter(ctx) {
      const svg = ctx.q('#d5-motif'); svg.innerHTML = '';
      [100, 300, 500].forEach((y, k) => {
        const d = k * .5;
        const stem = U.svg('path', { class: 'draw', d: `M30 ${y} H250`, stroke: '#9DB3DC', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg); stem.style.animationDelay = (.3 + d) + 's';
        const a = U.svg('path', { class: 'draw d2', d: `M250 ${y} C340 ${y} 340 ${y - 55} 440 ${y - 55} H600`, stroke: '#5FDDB2', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg); a.style.animationDelay = (.9 + d) + 's';
        const b = U.svg('path', { class: 'draw d2', d: `M250 ${y} C340 ${y} 340 ${y + 55} 440 ${y + 55} H600`, stroke: '#7F8CA8', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': '10 12' }, svg); b.style.animationDelay = (.9 + d) + 's';
        const ok = U.svg('circle', { class: 'pop-dot', cx: 622, cy: y - 55, r: 20, fill: '#5FDDB2' }, svg); ok.style.animationDelay = (1.6 + d) + 's';
        const x = U.svg('g', { class: 'fade', style: `animation-delay:${1.6 + d}s` }, svg);
        U.svg('path', { d: `M606 ${y + 39} L638 ${y + 71} M638 ${y + 39} L606 ${y + 71}`, stroke: '#FF8A80', 'stroke-width': 7, 'stroke-linecap': 'round' }, x);
      });
    },
  });


  /* validate: count up + the loop lights up */
  Deck.on('validate', {
    enter(ctx) {
      const chips = ctx.qa('#vl-chips .chip'); let i = 0;
      ctx.every(() => { chips.forEach((c, k) => c.classList.toggle('lit', k === i % chips.length)); i++; }, 900);
    },
    step(ctx, s, p) {
      if (s >= 1 && p < 1) { const b = ctx.q('[data-count]'); U.countUp(ctx, b, 136, 1300); }
      if (s < 1) ctx.q('[data-count]').textContent = '0';
    },
  });

  /* results */
  const TYPES = ['Transcription', 'Document to Markdown', 'Document to HTML', 'Key-values to JSON', 'Charts and diagrams', 'Tables', 'Question answering', 'Multi-step reasoning', 'Saying “I don’t know”', 'Scientific pages', 'UI screenshots'];
  Deck.on('results', {
    enter(ctx) {
      const box = ctx.q('#rs-chips'); box.innerHTML = '';
      ctx.__chips = TYPES.map((t, i) => { const c = U.html('span', { class: 'chip', text: t, style: `animation-delay:${(i * .35) % 3}s` }, box); return c; });
      ctx.qa('[data-count]').forEach(b => { const to = +b.dataset.count, suf = b.dataset.suffix || ''; U.countUp(ctx, b, to, 1600, v => Math.round(v) + suf); });
    },
    step(ctx, s) { ctx.__chips.forEach((c, i) => ctx.after(() => c.classList.toggle('in', s >= 1), s >= 1 ? i * 120 : 0)); },
  });

  /* close: a pipeline of flowing particles */
  Deck.on('close', {
    enter(ctx) {
      const cv = ctx.q('canvas'), g = cv.getContext('2d'); const P = [];
      ctx.raf((t, dt) => {
        if (Math.random() < .12) P.push({ x: -20, y: 880 + Math.random() * 140, v: .25 + Math.random() * .4, c: Math.random() < .5 ? '#F28C28' : '#9DB3DC', r: 3 + Math.random() * 4 });
        g.clearRect(0, 0, 1920, 1080);
        for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.x += p.v * dt; if (p.x > 1960) { P.splice(i, 1); continue; } g.globalAlpha = .55; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y + Math.sin(p.x / 120) * 18, p.r, 0, 7); g.fill(); }
        g.globalAlpha = 1;
      });
    },
  });
})();
