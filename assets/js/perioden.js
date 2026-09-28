/* Karman 2026 — panels of the period sections (correspondents, distinctive topics,
   writing places, languages, institutions, evidence) and period selection. */
(function () {
  'use strict';

  function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function init() {
    const K = window.KARMAN;
    const charts = window.KarmanCharts;
    const { fmt } = window.KarmanFmt;
    const colors = { studium: '#8c6d2a', aachen: '#002147', pasadena: '#3f7686', beratung: '#9a4f3c', agard: '#5f6b3a' };

    document.querySelectorAll('[data-panels]').forEach(host => {
      const p = K.periods.periods.find(x => x.id === host.dataset.panels);
      if (!p) return;
      const col = colors[p.id];

      const add = (title, cls) => {
        const d = document.createElement('div');
        d.className = 'panel' + (cls ? ' ' + cls : '');
        d.innerHTML = `<h4>${esc(title)}</h4>`;
        host.appendChild(d);
        return d;
      };

      const cp = add(`Korrespondenzpartner (${fmt(p.n_counterparts)} verschiedene)`);
      charts.miniBars(cp, p.correspondents.slice(0, 8).map(c => ({ label: c.name, value: c.n })), {
        color: col, labelWidth: 150,
        tip: d => `<b>${esc(d.label)}</b><br>${fmt(d.value)} Einheiten mit Kármán in dieser Periode`,
      });

      const tp = add('Kennzeichnende Themen');
      if (p.distinct_topics.length) {
        charts.miniBars(tp, p.distinct_topics.slice(0, 8).map(t => ({ label: t.label, value: t.z, text: `z ${String(t.z).replace('.', ',')} · ${fmt(t.n)}` })), {
          color: '#8c6d2a', labelWidth: 150,
          tip: d => `<b>${esc(d.label)}</b><br>${esc(d.text)} Einheiten`,
        });
      } else {
        tp.insertAdjacentHTML('beforeend', '<p class="note">Zu wenige Einheiten für eine Aussage.</p>');
      }
      tp.insertAdjacentHTML('beforeend', '<p class="note">z-Wert des gewichteten Log-Odds-Quotienten gegen die übrigen Perioden; dahinter die Zahl der Einheiten.</p>');

      const mp = add(`Schreiborte (${fmt(p.n_with_place)} Einheiten mit Ort)`);
      charts.miniMap(mp, p.cities, col);

      const ip = add('Genannte Institutionen');
      if (p.institutions.length) {
        charts.miniBars(ip, p.institutions.slice(0, 6).map(i => ({ label: i.name, value: i.n })), { color: '#56708f', labelWidth: 170 });
      } else {
        ip.insertAdjacentHTML('beforeend', '<p class="note">Keine Institution in mehr als einer Einheit genannt.</p>');
      }

      const lp = add(`Sprachen (${fmt(p.n_units)} datierte Einheiten)`, 'wide');
      charts.langBar(lp, p.languages);

      const ep = add('Fundstellen zu den Stichwörtern der Periodengrenze', 'wide');
      if (p.evidence.length) {
        const ul = document.createElement('ul');
        ul.className = 'evidence';
        p.evidence.forEach(e => {
          ul.insertAdjacentHTML('beforeend',
            `<li><span class="d">${esc(e.date)}</span><a href="${e.link}" target="_blank" rel="noopener">Ordner ${esc(e.letter_id.split('_')[0])}</a> ` +
            `<span class="t">„${esc(e.term)}“: ${esc(e.regest.length > 200 ? e.regest.slice(0, 197) + ' …' : e.regest)}</span></li>`);
        });
        ep.appendChild(ul);
      } else {
        ep.insertAdjacentHTML('beforeend', '<p class="note">Keine datierte Fundstelle zu den Stichwörtern in dieser Periode.</p>');
      }
      ep.insertAdjacentHTML('beforeend', `<p class="note">Die Fundstellen belegen das Vorkommen des Stichworts, nicht die Grenze selbst. Quelle der Grenze: ${esc(p.source)}</p>`);
    });

    // selection from the period band dims other sections' headings
    charts.bus.on('period.sections', id => {
      document.querySelectorAll('.period-section[data-period]').forEach(s => {
        s.style.opacity = !id || s.dataset.period === id ? 1 : 0.45;
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
