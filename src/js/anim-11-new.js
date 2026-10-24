/* the page journey */
(function () {
  const U = Deck.util;

  /* ── one page through the chain (plays by itself; pause and scrub with the bar) ── */
  Deck.on('page', {
    enter(ctx) { ctx.__cards = ctx.qa('.pgs'); ctx.__cards.forEach(c => { c.querySelector('.bar i').style.transition = 'none'; }); },
    step(ctx, s, p) {
      const cards = ctx.__cards;
      if (s >= 1 && !ctx.__pl) ctx.__pl = Deck.player(ctx, ctx.q('#pg-pl'), {
        dur: 5800, label: 'Timeline', fmt: t => (t / 1000).toFixed(1) + ' s',
        render: t => cards.forEach((c, k) => {
          const a = 300 + k * 1300, f = Math.max(0, Math.min(1, (t - a) / 950));
          c.querySelector('.bar i').style.width = (f * 100) + '%';
          c.classList.toggle('run', f > 0 && f < 1); c.classList.toggle('done', f >= 1);
        }),
      });
      else if (s >= 1 && p < 1) ctx.__pl.replay();
      else if (s < 1 && ctx.__pl) ctx.__pl.pause();
    },
  });

})();
