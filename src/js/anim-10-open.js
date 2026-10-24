(function () {
  const U = Deck.util;
  const TL = [
    ['2024', 'e-VikrAI', 'Product listings from a photo, in Indian languages', ''],
    ['Jun 2025', 'Patram-7B', 'India’s first sovereign vision-language model, released openly', ''],
    ['2025–26', 'Patram ecosystem', 'Task models and agents, in use with partner organisations', ''],
    ['Today', 'Patram 1.5', 'One model for 34 tasks, with promptable OCR and “I don’t know”', 'now'],
    ['Upcoming', 'Patram 2.0', 'All tasks and 22+ Indian languages in one model', 'next'],
  ];
  Deck.on('vision', {
    enter(ctx) {
      const host = ctx.q('#vs-tl'); host.innerHTML = '<div class="bg"></div><div class="ln"></div>';
      ctx.__nd = TL.map(([d, n, t, c], i) => { const e = U.html('div', { class: 'nd ' + c, style: `left:${i * 340}px`, html: `<small>${d}</small><i></i><h4>${n}</h4><p>${t}</p>` }, host); return e; });
    },
    step(ctx, s) {
      const k = s <= 1 ? 0 : s === 2 ? 2 : s === 3 ? 4 : 5;
      ctx.__nd.forEach((e, i) => e.classList.toggle('on', i < k));
      ctx.q('#vs-tl .ln').style.width = (k === 0 ? 0 : Math.min(1620, (k - 1) * 340 + 30)) + 'px';
    },
  });
})();
