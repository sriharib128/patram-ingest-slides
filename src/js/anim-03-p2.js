(function () {
  const U = Deck.util, clamp = U.clamp;

  /* ── stage by stage vs pipeline parallel ── */
  Deck.on('pp', {
    enter(ctx) {
      const stages = ['Understand', 'Questions', 'Answer', 'Verify'];
      const build = panel => {
        const rows = panel.querySelector('.rows'); rows.innerHTML = '';
        return stages.map((n, i) => {
          const r = U.html('div', { class: 'row' }, rows);
          U.html('span', { text: (i + 1) + '  ' + n }, r);
          const b = U.html('div', { class: 'bar' }, r), f = U.html('i', {}, b);
          const g = U.html('div', { class: 'gpus' }, r), pips = [...Array(8)].map(() => U.html('u', {}, g));
          return { f, pips };
        });
      };
      const L = build(ctx.q('#pp-l')), R = build(ctx.q('#pp-r'));
      const D = .06, range = ctx.q('#pp-range'), pct = ctx.q('#pp-pct'), play = ctx.q('#pp-play');
      const S = { t: 0, anim: null };
      const usableL = t => clamp(t * 4 - 3, 0, 1), usableR = t => clamp((t - 3 * D) / (1 - 3 * D), 0, 1);
      function render() {
        const t = S.t;
        L.forEach((s, k) => { const p = clamp(t * 4 - k, 0, 1), act = p > 0 && p < 1; s.f.style.width = p * 100 + '%'; s.f.classList.toggle('act', act); s.pips.forEach(u => u.classList.toggle('on', act)); });
        R.forEach((s, k) => { const p = clamp((t - k * D) / (1 - 3 * D), 0, 1), act = p > 0 && p < 1; s.f.style.width = p * 100 + '%'; s.f.classList.toggle('act', act); s.pips.forEach((u, j) => u.classList.toggle('on', act && j < 2)); });
        ctx.q('#pp-l .usable').textContent = Math.round(usableL(t) * 100) + '%'; ctx.q('#pp-r .usable').textContent = Math.round(usableR(t) * 100) + '%';
        ctx.q('#pp-l .hand').textContent = t > 0 ? Math.min(4, Math.floor(t * 4) + 1) : 0; ctx.q('#pp-r .hand').textContent = t > 0 ? 1 : 0;
        range.value = Math.round(t * 100); pct.textContent = Math.round(t * 100) + '%';
        play.textContent = S.anim ? 'Pause' : (t >= 1 ? 'Replay' : 'Play');
      }
      function animateTo(to, ms) { S.anim = { from: S.t, to, ms, t0: performance.now() }; }
      ctx.__animateTo = animateTo; ctx.__set = v => { S.anim = null; S.t = v; render(); }; ctx.__S = S;
      ctx.__call = () => {
        const a = Math.round(usableL(.45) * 100), b = Math.round(usableR(.45) * 100);
        ctx.q('#pp-call').innerHTML = `Stopped at 45%: <b class="hr">${a}% usable</b> vs <b class="hg">${b}% usable</b>.`;
      };
      ctx.raf(() => {
        if (!S.anim) return;
        const k = clamp((performance.now() - S.anim.t0) / S.anim.ms, 0, 1);
        S.t = S.anim.from + (S.anim.to - S.anim.from) * (S.anim.to === 1 ? k : U.ease.inout(k));
        if (k >= 1) S.anim = null; render();
      });
      range.oninput = () => { S.anim = null; S.t = range.value / 100; render(); };
      play.onclick = e => { e.stopPropagation(); if (S.anim) { S.anim = null; } else { if (S.t >= 1) S.t = 0; animateTo(1, 9000 * (1 - S.t) + 400); } render(); };
      render();
    },
    step(ctx, s, p) {
      clearTimeout(ctx.__t1);
      if (s === 0) ctx.__set(0);
      else if (s === 1) { if (p === 0 || p === -1) ctx.__t1 = ctx.after(() => ctx.__animateTo(1, 9000), 500); else ctx.__set(1); }
      else if (s === 2) { ctx.__animateTo(.45, 1500); ctx.__call(); }
    },
  });

  /* ── one machine or four ── */
  Deck.on('machines', {
    enter(ctx) {
      const root = ctx.q('#mach'), svg = ctx.q('#m-svg');
      root.querySelectorAll('.mbox,.sc,.pill,#m-store').forEach(e => e.remove()); svg.innerHTML = '';
      const names = ['Understand', 'Charts', 'Questions', 'Answer', 'Verify'];
      const boxes = [0, 1, 2, 3].map(i => {
        const d = U.html('div', { class: 'mbox', style: `left:${i * 430}px` }, root);
        d.innerHTML = `<h4>Machine ${i + 1}</h4><div class="gp">${'<u></u>'.repeat(8)}</div><div class="ml"></div>`;
        return d;
      });
      root.appendChild(svg);
      const store = U.html('div', { id: 'm-store', html: 'shared storage' }, root); store.style.opacity = 0;
      const A = names.map((_, k) => ({ x: 30, y: 62 + k * 60 }));
      const B = [{ x: 30, y: 180 }, { x: 460, y: 180 }, { x: 890, y: 140 }, { x: 890, y: 230 }, { x: 1320, y: 180 }];
      const chips = names.map((n, k) => {
        const c = U.html('div', { class: 'sc', html: `<i>${n[0]}</i>${n}` }, root); return { el: c, x: A[k].x, y: A[k].y, tx: A[k].x, ty: A[k].y };
      });
      const gMid = U.svg('g', {}, svg), gDots = U.svg('g', {}, svg);
      const ED = [[0, 1], [1, 2], [2, 3], [3, 4]], paths = ED.map(() => U.svg('path', { fill: 'none', stroke: '#B4C2DF', 'stroke-width': 4, 'stroke-linecap': 'round' }, gMid));
      const dots = ED.map(() => [0, 1, 2].map(() => U.svg('circle', { r: 8, fill: '#F28C28' }, gDots)));
      const pill = U.html('div', { class: 'pill', text: 'one shared teacher copy' }, root); pill.style.cssText = 'left:1030px;top:84px;opacity:0;transition:opacity .5s';
      const setPips = (box, n, color) => { box.querySelectorAll('.gp u').forEach((u, j) => { u.classList.toggle('on', j < n); u.style.setProperty('--c', color); }); };
      const W = 330, H = 54;
      function path(a, b) {
        if (Math.abs(a.x - b.x) < 60) { const x = a.x + W / 2; return `M${x} ${a.y + H} L${x} ${b.y}`; }
        const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, m = (x1 + x2) / 2; return `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`;
      }
      ctx.__set = (layout, s) => {
        const T = layout === 'A' ? A : B;
        chips.forEach((c, k) => { c.tx = T[k].x; c.ty = T[k].y; });
        boxes.forEach((b, i) => {
          b.classList.toggle('idle', layout === 'A' && i > 0);
          b.classList.toggle('hl', s === 2 && i === 2); b.classList.toggle('dim', s === 2 && i !== 2);
        });
        const lab = layout === 'A' ? ['all models, one program · 5 GPUs', '', '', ''] : ['small model · 1 GPU', 'chart reader · 2 GPUs', 'teacher · 4 GPUs, shared', 'checker · 2 GPUs'];
        boxes.forEach((b, i) => b.querySelector('.ml').textContent = lab[i]);
        setPips(boxes[0], layout === 'A' ? 5 : 1, '#2A63C9'); setPips(boxes[1], layout === 'A' ? 0 : 2, '#F28C28'); setPips(boxes[2], layout === 'A' ? 0 : 4, '#0E7C61'); setPips(boxes[3], layout === 'A' ? 0 : 2, '#6B4BB8');
        chips[2].el.classList.toggle('share', s === 2); chips[3].el.classList.toggle('share', s === 2);
        pill.style.opacity = s === 2 ? 1 : 0; store.style.opacity = s === 3 ? 1 : 0;
        ctx.q('#m-cap').innerHTML = [
          'One machine: every model in one program.',
          'Four machines: each stage runs <b>where its model is</b>. Same graph.',
          'Same model, <b>one shared copy</b>.',
          'Results move by address: local stays local, shared goes anywhere.',
        ][s];
      };
      ctx.raf((t, dt) => {
        const k = 1 - Math.exp(-dt / 170);
        chips.forEach(c => { c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; c.el.style.transform = `translate(${c.x}px,${c.y}px)`; });
        ED.forEach(([a, b], i) => {
          const d = path(chips[a], chips[b]); paths[i].setAttribute('d', d);
          const L = paths[i].getTotalLength();
          dots[i].forEach((c, j) => { const f = ((t / 1700) + j / 3 + i * .21) % 1, pt = paths[i].getPointAtLength(f * L); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); });
        });
      });
    },
    step(ctx, s) { ctx.__set(s === 0 ? 'A' : 'B', s); },
  });

  /* ── router ledger ── */
  Deck.on('ledger', {
    enter(ctx) {
      const root = ctx.q('#led'); root.innerHTML = '';
      const names = ['Understand', 'Charts', 'Questions', 'Verify'], X = i => 190 + i * 380;
      const nodes = names.map((n, i) => U.html('div', { class: 'nd', text: n, style: `left:${X(i)}px` }, root));
      for (let i = 0; i < 3; i++) U.html('div', { class: 'arr', style: `left:${X(i) + 314}px` }, root);
      U.html('div', { class: 'rl', style: 'top:118px', html: '<div>finished<small>stage is done</small></div>' }, root);
      U.html('div', { class: 'rl', style: 'top:196px', html: '<div>ready<small>waiting in its queue</small></div>' }, root);
      const fin = names.map((_, i) => U.html('div', { class: 'bit', style: `left:${X(i) + 104}px;top:118px`, text: '0' }, root));
      const rdy = names.map((_, i) => U.html('div', { class: 'bit', style: `left:${X(i) + 104}px;top:196px`, text: '0' }, root));
      const tok = U.html('div', { class: 'tok', style: `left:${X(0) + 130}px` }, root);
      U.html('div', { class: 'any', style: `left:${X(2)}px;top:84px`, text: 'starts when any input is done' }, root);
      const sw = U.html('div', { class: 'sweep', style: `left:${X(2) + 20}px;top:268px` }, root);
      sw.innerHTML = '<svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="#6B4BB8" stroke-width="3.5" stroke-linecap="round"><path d="M25 15a10 10 0 1 1-3-7"/><path d="M24 3v6h-6"/></svg>sweep reads the ledger every 5 s';
      ctx.__ledger = s => {
        const st = Math.min(s, 3);
        const F = [[0, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [1, 1, 0, 0]][st], R = [[1, 0, 0, 0], [1, 0, 0, 0], [1, 1, 0, 0], [1, 1, 1, 0]][st];
        F.forEach((v, i) => { fin[i].textContent = v; fin[i].classList.toggle('f1', !!v); nodes[i].classList.toggle('fin', !!v); });
        R.forEach((v, i) => { rdy[i].textContent = v; rdy[i].classList.toggle('r1', !!v); });
        tok.style.left = (X([0, 0, 1, 2][st]) + 130) + 'px';
        sw.classList.toggle('on', st === 3);
        ctx.q('#led-msg').innerHTML = [
          'A sample enters. Understand is <b class="hi">ready</b>.',
          '<b>1 · Understand finishes.</b> Its <b class="hb">finished</b> bit flips.',
          '<b>2 · Routing says “chart”.</b> Charts is marked <b class="hi">ready</b>.',
          '<b>3 · Charts finishes.</b> The sweep marks Questions <b class="hi">ready</b>.',
        ][st];
      };
    },
    step(ctx, s) { ctx.__ledger(s); },
  });
})();
