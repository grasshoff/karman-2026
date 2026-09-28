/* Karman 2026 — scroll controller. A chapter <section class="chapter" data-figure="name">
   holds text steps (.step) and one figure (.fig). The figure is drawn when the chapter
   approaches the viewport; the step in the middle of the viewport sets its state. */
(function () {
  'use strict';

  function init() {
    const charts = window.KarmanCharts;
    const chapters = Array.from(document.querySelectorAll('.chapter[data-figure]'));
    const instances = new Map();

    function ensure(ch) {
      if (instances.has(ch)) return instances.get(ch);
      const name = ch.dataset.figure;
      const el = ch.querySelector('.fig');
      let inst = null;
      if (el && charts[name]) {
        try { inst = charts[name](el); } catch (err) {
          el.innerHTML = `<p class="fig-note">Die Grafik „${name}“ konnte nicht gezeichnet werden: ${err.message}</p>`;
          console.error(err);
        }
      }
      instances.set(ch, inst);
      return inst;
    }

    const lazy = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { ensure(e.target); lazy.unobserve(e.target); } });
    }, { rootMargin: '600px 0px' });
    chapters.forEach(ch => lazy.observe(ch));

    const steps = Array.from(document.querySelectorAll('.chapter[data-figure] .step'));
    const stepObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const step = e.target;
        const ch = step.closest('.chapter');
        ch.querySelectorAll('.step').forEach(s => s.classList.toggle('active', s === step));
        const inst = ensure(ch);
        if (inst && inst.update) inst.update(parseInt(step.dataset.step || '0', 10));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => stepObs.observe(s));

    // Static figures outside chapters: <div class="fig" data-chart="name">
    document.querySelectorAll('.fig[data-chart]').forEach(el => {
      const name = el.dataset.chart;
      if (!charts[name]) return;
      try { charts[name](el); } catch (err) {
        el.innerHTML = `<p class="fig-note">Die Grafik „${name}“ konnte nicht gezeichnet werden: ${err.message}</p>`;
        console.error(err);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
