/* Karman 2026 — chart library (D3 v7). Each chart takes a container element and
   returns an object with update(step) for the scroll steps and optional
   highlight(periodId). All data comes from window.KARMAN (data/bundle.js). */
(function () {
  'use strict';

  const K = window.KARMAN;
  const locale = d3.formatLocale({ decimal: ',', thousands: '.', grouping: [3], currency: ['', ' €'] });
  const fmt = locale.format(',d');
  const pct = locale.format('.0%');
  const pct1 = locale.format('.1%');

  const C = {
    oxford: '#002147', oxfordSoft: '#2c4a6e', gold: '#c4a15a', goldDeep: '#8c6d2a',
    goldPale: '#efe3c4', sand: '#f6f1e7', sandDeep: '#e6dcc7', line: '#e3d9c6',
    muted: '#5c5348', ink: '#1b2733', paper: '#fffdf8',
  };
  const PERIOD_COLORS = {
    studium: '#8c6d2a', aachen: '#002147', pasadena: '#3f7686', beratung: '#9a4f3c', agard: '#5f6b3a',
  };
  const GROUP_COLORS = {
    personen: '#002147', organisationen: '#2c4a6e', firmen: '#56708f', hochschulen: '#3f7686',
    behoerden: '#6b8e8f', sachakten: '#8c6d2a', werke: '#c4a15a', fremde: '#a8927a',
    ehrungen: '#9a4f3c', familie: '#b8765f', finanzen: '#7d7163', presse: '#a39a8b', sonstige: '#cccccc',
  };
  const CAT_GROUP_COLORS = { korrespondenz: '#002147', eigene: '#8c6d2a', sachakten: '#3f7686', fremde: '#a8927a' };
  const TYPE_COLORS = {
    letter: '#002147', note: '#c4a15a', report: '#3f7686', enclosure: '#a8927a', telegram: '#9a4f3c',
    memo: '#5f6b3a', other: '#cdbfa4', postcard: '#56708f', envelope: '#d8cdb8', invoice: '#d8cdb8',
    drawing: '#d8cdb8', 'medical report': '#d8cdb8',
  };
  const LANG_COLORS = {
    english: '#002147', german: '#8c6d2a', french: '#3f7686', hungarian: '#9a4f3c', italian: '#5f6b3a',
    spanish: '#b8765f', other: '#cdbfa4', '': '#e6dcc7',
  };
  const CITY_COLORS = ['#002147', '#8c6d2a', '#3f7686', '#9a4f3c', '#5f6b3a', '#56708f', '#b8765f', '#6b8e8f', '#a8927a'];

  // ------------------------------------------------------------------ helpers
  let tipEl = null;
  function tip() {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'tip';
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function showTip(evt, html) {
    const t = tip();
    t.innerHTML = html;
    t.style.opacity = 1;
    const x = Math.min(evt.clientX + 14, window.innerWidth - t.offsetWidth - 10);
    const y = Math.min(evt.clientY + 14, window.innerHeight - t.offsetHeight - 10);
    t.style.left = x + 'px';
    t.style.top = y + 'px';
  }
  function hideTip() { if (tipEl) tipEl.style.opacity = 0; }
  function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function svg(el, w, h, label) {
    return d3.select(el).append('svg')
      .attr('viewBox', `0 0 ${w} ${h}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'img')
      .attr('aria-label', label || '');
  }
  function legend(el, items) {
    const div = d3.select(el).append('div').attr('class', 'fig-legend');
    items.forEach(it => {
      const s = div.append('span');
      s.append('i').style('background', it.color);
      s.append('span').text(it.label);
    });
    return div;
  }
  function note(el, text) {
    d3.select(el).append('p').attr('class', 'fig-note').html(text);
  }
  function periods() { return K.periods.periods; }
  function periodOf(y) { return periods().find(p => y >= p.from && y <= p.to); }
  function nameShort(n) {
    if (!n) return '';
    const i = n.indexOf(',');
    if (i < 0) return n;
    const sur = n.slice(0, i).trim();
    const rest = n.slice(i + 1).trim();
    return rest ? `${rest.split(/\s+/)[0]} ${sur}`.replace(/\s+/g, ' ') : sur;
  }

  const charts = {};

  // ------------------------------------------------------------------ 1 boxes
  charts.boxes = function (el) {
    const data = K.boxes;
    const boxes = data.boxes;
    const W = 760, H = 350, m = { t: 58, r: 8, b: 56, l: 44 };
    const s = svg(el, W, H, 'Ordner und Scans je Kiste des Nachlasses');
    const x = d3.scaleBand().domain(boxes.map(b => b.box)).range([m.l, W - m.r]).paddingInner(0.18);
    const maxScans = d3.max(boxes, b => b.scans);
    const y = d3.scaleLinear().domain([0, maxScans]).nice().range([H - m.b, m.t]);
    s.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(fmt)).call(g => g.select('.domain').remove());
    s.append('text').attr('class', 'lbl').attr('x', 0).attr('y', 12).text('Scans je Kiste');
    const bars = s.append('g').selectAll('rect').data(boxes).join('rect')
      .attr('x', b => x(b.box)).attr('width', x.bandwidth())
      .attr('y', b => y(b.scans)).attr('height', b => y(0) - y(b.scans))
      .attr('fill', b => GROUP_COLORS[b.group] || '#ccc')
      .on('mousemove', (e, b) => {
        const g = data.groups.find(g => g.id === b.group);
        showTip(e, `<b>Kiste ${b.box}</b><br>${esc(g ? g.label : '')}<br>${fmt(b.folders)} Ordner · ${fmt(b.scans)} Scans` +
          (b.pdai_docs ? `<br>PDAI: ${fmt(b.pdai_docs)} Dokumente · ${fmt(b.pdai_pages)} Seiten` : '<br>nicht im PDAI-Bestand'));
      })
      .on('mouseleave', hideTip);
    const over = s.append('g').selectAll('rect').data(boxes.filter(b => b.pdai_pages)).join('rect')
      .attr('x', b => x(b.box)).attr('width', x.bandwidth())
      .attr('y', b => y(Math.min(b.pdai_pages, b.scans))).attr('height', b => y(0) - y(Math.min(b.pdai_pages, b.scans)))
      .attr('fill', C.gold).attr('opacity', 0).attr('pointer-events', 'none');
    // group ribbon
    const rib = s.append('g').attr('transform', `translate(0,${H - m.b + 8})`);
    data.groups.forEach(g => {
      g.boxes.forEach(([lo, hi]) => {
        const x0 = x(lo), x1 = x(hi) + x.bandwidth();
        rib.append('rect').attr('x', x0).attr('width', x1 - x0).attr('height', 7).attr('fill', GROUP_COLORS[g.id]);
      });
    });
    [1, 34, 56, 70, 82, 97, 117, 124, 134, 146, 157].forEach(b => {
      if (x(b) === undefined) return;
      rib.append('text').attr('class', 'lbl').attr('x', x(b) + x.bandwidth() / 2).attr('y', 22).attr('text-anchor', 'middle').text(b);
    });
    rib.append('text').attr('class', 'lbl').attr('x', m.l).attr('y', 40).text('Kistennummer');
    // attested sections
    const sec = s.append('g').attr('opacity', 0);
    sec.append('text').attr('class', 'lbl').attr('x', m.l + x.bandwidth() * 16).attr('y', m.t - 16).text('Caltech-Sections laut Deckblatt');
    data.sections.forEach((sc, i) => {
      const x0 = x(sc.box_min), x1 = x(sc.box_max) + x.bandwidth();
      if (x0 === undefined) return;
      const lift = sc.section === 'VIII' ? 14 : 0;
      sec.append('path').attr('d', `M${x0},${m.t - 4} V${m.t - 10 - lift} H${x1} V${m.t - 4}`).attr('fill', 'none').attr('stroke', C.goldDeep);
      sec.append('text').attr('class', 'lbl-strong').attr('x', (x0 + x1) / 2).attr('y', m.t - 14 - lift)
        .attr('text-anchor', 'middle').text(sc.section);
    });
    const leg = legend(el, data.groups.map(g => ({ color: GROUP_COLORS[g.id], label: g.label })));
    note(el, 'Gruppen nach den Ordnernamen gebildet; die Section-Klammern (I, VII, VIII, IX) sind auf den Deckblättern der Caltech Archives genannt. Gold: Seiten im PDAI-Bestand.');
    function update(step) {
      bars.transition().duration(500).attr('opacity', b => (step >= 1 && !b.pdai_docs) ? 0.28 : 1);
      over.transition().duration(500).attr('opacity', step >= 1 ? 0.95 : 0);
      sec.transition().duration(500).attr('opacity', step >= 2 ? 1 : 0);
    }
    update(0);
    return { update };
  };

  // ------------------------------------------------------------------ 2 categories
  charts.categories = function (el) {
    const tree = K.categories;
    const W = 760, H = 460;
    const wrap = d3.select(el).append('div');
    const title = wrap.append('p').attr('class', 'fig-title');
    const s = svg(wrap.node(), W, H, 'Gliederung des PDAI-Bestands');
    const gTree = s.append('g');
    const gWaffle = s.append('g').attr('opacity', 0);
    const leg = d3.select(el).append('div');
    const noteEl = d3.select(el).append('p').attr('class', 'fig-note');
    let mode = null;

    function layout(metric) {
      const root = d3.hierarchy(tree).sum(d => d.children ? 0 : d[metric]).sort((a, b) => b.value - a.value);
      d3.treemap().size([W, H]).paddingOuter(3).paddingTop(20).paddingInner(2).round(true)(root);
      return root;
    }
    function drawTree(metric) {
      const root = layout(metric);
      const groups = gTree.selectAll('g.grp').data(root.children, d => d.data.id).join(enter => {
        const g = enter.append('g').attr('class', 'grp');
        g.append('rect').attr('class', 'frame').attr('fill', 'none').attr('stroke', C.line);
        g.append('text').attr('class', 'lbl-strong');
        return g;
      });
      groups.select('rect.frame').transition().duration(600)
        .attr('x', d => d.x0).attr('y', d => d.y0).attr('width', d => d.x1 - d.x0).attr('height', d => d.y1 - d.y0);
      groups.select('text').transition().duration(600).attr('x', d => d.x0 + 5).attr('y', d => d.y0 + 14)
        .text(d => `${d.data.name} · ${fmt(d.value)}`);
      const leaves = gTree.selectAll('g.leaf').data(root.leaves(), d => d.data.category).join(enter => {
        const g = enter.append('g').attr('class', 'leaf');
        g.append('rect');
        g.append('text').attr('class', 'n1');
        g.append('text').attr('class', 'n2');
        return g;
      });
      leaves.on('mousemove', (e, d) => showTip(e,
        `<b>${esc(d.data.name)}</b><br>${esc(d.data.category)}<br>${fmt(d.data.docs)} Dokumente · ${fmt(d.data.pages)} Seiten · ${fmt(d.data.units)} Inhaltseinheiten`))
        .on('mouseleave', hideTip);
      leaves.select('rect').transition().duration(600)
        .attr('x', d => d.x0).attr('y', d => d.y0).attr('width', d => Math.max(0, d.x1 - d.x0)).attr('height', d => Math.max(0, d.y1 - d.y0))
        .attr('fill', d => CAT_GROUP_COLORS[d.parent.data.id]).attr('opacity', d => 0.55 + 0.45 * Math.min(1, (d.x1 - d.x0) * (d.y1 - d.y0) / 40000));
      const fit = (s, w) => { const n = Math.floor((w - 10) / 6.2); return s.length <= n ? s : (n > 4 ? s.slice(0, n - 1) + '…' : ''); };
      leaves.select('text.n1').transition().duration(600).attr('x', d => d.x0 + 5).attr('y', d => d.y0 + 15)
        .attr('fill', '#fff').attr('font-family', "'Source Sans 3', sans-serif").attr('font-size', 11.5).attr('font-weight', 650)
        .text(d => ((d.x1 - d.x0) > 50 && (d.y1 - d.y0) > 22) ? fit(d.data.name, d.x1 - d.x0) : '');
      leaves.select('text.n2').transition().duration(600).attr('x', d => d.x0 + 5).attr('y', d => d.y0 + 29)
        .attr('fill', 'rgba(255,255,255,0.85)').attr('font-family', "'Source Sans 3', sans-serif").attr('font-size', 11)
        .text(d => ((d.x1 - d.x0) > 70 && (d.y1 - d.y0) > 36) ? `${fmt(d.value)} ${metric === 'pages' ? 'S.' : 'Dok.'}` : '');
    }
    function drawWaffle() {
      if (gWaffle.selectAll('*').size()) return;
      const types = K.unit_types;
      const per = 25;
      const cells = [];
      types.forEach(t => { const n = Math.round(t.n / per); for (let i = 0; i < n; i++) cells.push(t); });
      const cols = 36, size = Math.floor((W - 20) / cols) - 2;
      gWaffle.selectAll('rect').data(cells).join('rect')
        .attr('x', (d, i) => 10 + (i % cols) * (size + 2)).attr('y', (d, i) => 10 + Math.floor(i / cols) * (size + 2))
        .attr('width', size).attr('height', size).attr('rx', 1.5).attr('fill', d => TYPE_COLORS[d.type] || '#ccc')
        .on('mousemove', (e, d) => showTip(e, `<b>${esc(d.label)}</b><br>${fmt(d.n)} Inhaltseinheiten`)).on('mouseleave', hideTip);
    }
    function setMode(m) {
      if (m === mode) return;
      mode = m;
      if (m === 'waffle') {
        drawWaffle();
        gTree.transition().duration(400).attr('opacity', 0);
        gWaffle.transition().duration(400).attr('opacity', 1);
        title.text('Inhaltseinheiten nach Typ (ein Quadrat = 25 Einheiten)');
        leg.html('');
        legend(leg.node(), K.unit_types.filter(t => t.n >= 100).map(t => ({ color: TYPE_COLORS[t.type], label: `${t.label} ${fmt(t.n)}` })));
        noteEl.text('Leere Seiten sind nicht gezählt. Eine Inhaltseinheit ist ein Brief, eine Notiz, ein Bericht oder ein anderes Stück, das bei der Erschließung eigens erfasst wurde.');
      } else {
        gWaffle.transition().duration(400).attr('opacity', 0);
        gTree.transition().duration(400).attr('opacity', 1);
        drawTree(m);
        title.text(m === 'pages' ? 'PDAI-Bestand nach Kategorien, Fläche = Seiten' : 'PDAI-Bestand nach Kategorien, Fläche = Dokumente');
        leg.html('');
        legend(leg.node(), tree.children.map(g => ({ color: CAT_GROUP_COLORS[g.id], label: g.name })));
        noteEl.text('Kategorien der Ordnerbeschriftung; die Gruppen fassen sie für die Übersicht zusammen.');
      }
    }
    function update(step) { setMode(step === 0 ? 'pages' : step === 1 ? 'docs' : 'waffle'); }
    update(0);
    return { update };
  };

  // ------------------------------------------------------------------ 3 years
  charts.years = function (el) {
    const Y = K.years;
    const rows = Y.years.filter(r => r.y >= 1900 && r.y <= 1963);
    const W = 760, H = 380, m = { t: 60, r: 10, b: 34, l: 46 };
    const s = svg(el, W, H, 'Datierte Inhaltseinheiten je Jahr');
    const x = d3.scaleBand().domain(rows.map(r => r.y)).range([m.l, W - m.r]).paddingInner(0.15);
    const y = d3.scaleLinear().domain([0, d3.max(rows, r => r.n)]).nice().range([H - m.b, m.t]);
    const bands = s.append('g');
    periods().forEach(p => {
      const x0 = x(Math.max(p.from, 1900)), x1 = x(Math.min(p.to, 1963)) + x.bandwidth();
      if (x0 === undefined || x1 === undefined) return;
      bands.append('rect').attr('x', x0).attr('width', x1 - x0).attr('y', 22).attr('height', H - m.b - 22)
        .attr('fill', PERIOD_COLORS[p.id]).attr('opacity', 0.06);
      bands.append('rect').attr('x', x0).attr('width', x1 - x0).attr('y', 18).attr('height', 4).attr('fill', PERIOD_COLORS[p.id]);
      bands.append('text').attr('class', 'lbl').attr('x', (x0 + x1) / 2).attr('y', 12).attr('text-anchor', 'middle')
        .attr('fill', PERIOD_COLORS[p.id]).text(p.short);
    });
    s.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).tickValues(rows.map(r => r.y).filter(y => y % 10 === 0)).tickSizeOuter(0));
    s.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(fmt)).call(g => g.select('.domain').remove());
    const gK = s.append('g'), gO = s.append('g');
    gK.selectAll('rect').data(rows).join('rect').attr('x', r => x(r.y)).attr('width', x.bandwidth())
      .attr('y', r => y(r.karman)).attr('height', r => y(0) - y(r.karman)).attr('fill', C.oxford);
    gO.selectAll('rect').data(rows).join('rect').attr('x', r => x(r.y)).attr('width', x.bandwidth())
      .attr('y', r => y(r.n)).attr('height', r => y(r.karman) - y(r.n)).attr('fill', C.gold);
    s.append('g').selectAll('rect').data(rows).join('rect').attr('x', r => x(r.y)).attr('width', x.bandwidth())
      .attr('y', m.t).attr('height', H - m.b - m.t).attr('fill', 'transparent')
      .on('mousemove', (e, r) => showTip(e, `<b>${r.y}</b><br>${fmt(r.n)} datierte Einheiten<br>davon ${fmt(r.karman)} mit Kármán als Absender oder Empfänger<br>${fmt(r.letters)} Briefe, Telegramme, Postkarten`))
      .on('mouseleave', hideTip);
    const ann = s.append('g').attr('opacity', 0);
    [[1928, 'Aachen 1928'], [1940, '1940: Tacoma, Windturbine']].forEach(([yr, t]) => {
      const r = rows.find(d => d.y === yr);
      if (!r) return;
      ann.append('line').attr('x1', x(yr) + x.bandwidth() / 2).attr('x2', x(yr) + x.bandwidth() / 2)
        .attr('y1', y(r.n) - 4).attr('y2', y(r.n) - 22).attr('stroke', C.ink);
      ann.append('text').attr('class', 'lbl-strong').attr('x', x(yr) + x.bandwidth() / 2 + (yr === 1940 ? -4 : 0))
        .attr('y', y(r.n) - 26).attr('text-anchor', yr === 1940 ? 'end' : 'middle').text(`${t}: ${fmt(r.n)}`);
    });
    legend(el, [
      { color: C.oxford, label: 'Kármán als Absender oder Empfänger' },
      { color: C.gold, label: 'übrige datierte Einheiten' },
    ]);
    note(el, `${fmt(Y.n_dated)} datierte Einheiten; ${fmt(Y.n_undated)} Einheiten tragen kein lesbares Jahr und fehlen in dieser Grafik. Periodenbänder vorläufig.`);
    function update(step) {
      ann.transition().duration(400).attr('opacity', step >= 1 ? 1 : 0);
      bands.transition().duration(400).attr('opacity', step >= 2 ? 1 : 0.35);
    }
    update(0);
    return { update };
  };

  // ------------------------------------------------------------------ 4 places
  let clipSeq = 0;
  function drawWorld(g, projection, fill, w, h) {
    if (!window.WORLD110 || !window.topojson) return;
    const id = 'mapclip' + (++clipSeq);
    g.append('clipPath').attr('id', id).append('rect').attr('width', w).attr('height', h);
    g.attr('clip-path', `url(#${id})`);
    g.append('rect').attr('width', w).attr('height', h).attr('fill', '#f7f2e8');
    const land = topojson.feature(window.WORLD110, window.WORLD110.objects.countries);
    const path = d3.geoPath(projection);
    g.selectAll('path').data(land.features).join('path').attr('d', path)
      .attr('fill', fill || C.sandDeep).attr('stroke', '#fffdf8').attr('stroke-width', 0.5);
  }
  // Mercator-free regional view over North America and Europe.
  function regionProjection(w, h) {
    return d3.geoConicEqualArea().parallels([30, 55]).rotate([55, 0]).center([0, 44])
      .fitExtent([[6, 6], [w - 6, h - 6]], { type: 'MultiPoint', coordinates: [[-124, 30], [-124, 50], [22, 58], [20, 38], [-75, 30]] });
  }
  function placeLabels(g, items, proj, r, max, size) {
    const placed = [];
    items.slice(0, max).forEach(c => {
      const [px, py] = proj([c.lon, c.lat]);
      const w = c.label.length * (size * 0.58), h = size + 2;
      const cands = [[px + r(c.n) + 3, py + size / 3, 'start'], [px - r(c.n) - 3, py + size / 3, 'end'], [px, py - r(c.n) - 3, 'middle'], [px, py + r(c.n) + size, 'middle']];
      for (const [tx, ty, anchor] of cands) {
        const x0 = anchor === 'start' ? tx : anchor === 'end' ? tx - w : tx - w / 2;
        const box = [x0, ty - size, x0 + w, ty + 2];
        if (placed.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
        placed.push(box);
        g.append('text').attr('class', 'lbl-strong').attr('font-size', size).attr('x', tx).attr('y', ty).attr('text-anchor', anchor)
          .attr('paint-order', 'stroke').attr('stroke', '#fffdf8').attr('stroke-width', 3).text(c.label);
        break;
      }
    });
  }
  charts.places = function (el) {
    const P = K.places;
    const W = 760, Hm = 300, Hs = 250;
    const wrap = d3.select(el);
    wrap.append('p').attr('class', 'fig-title').text('Schreiborte der Inhaltseinheiten');
    const sm = svg(el, W, Hm, 'Karte der Schreiborte');
    const proj = regionProjection(W, Hm);
    drawWorld(sm.append('g'), proj, null, W, Hm);
    const inView = c => { const [px, py] = proj([c.lon, c.lat]); return px >= 0 && px <= W && py >= 0 && py <= Hm; };
    const shown = P.cities.filter(inView).sort((a, b) => b.n - a.n);
    const outside = P.cities.filter(c => !inView(c));
    const r = d3.scaleSqrt().domain([0, d3.max(P.cities, c => c.n)]).range([0, 24]);
    const dots = sm.append('g').selectAll('circle').data(shown).join('circle')
      .attr('cx', c => proj([c.lon, c.lat])[0]).attr('cy', c => proj([c.lon, c.lat])[1]).attr('r', c => r(c.n))
      .attr('fill', C.oxford).attr('fill-opacity', 0.55).attr('stroke', '#fff').attr('stroke-width', 0.6)
      .on('mousemove', (e, c) => showTip(e, `<b>${esc(c.label)}</b><br>${fmt(c.n)} Einheiten`)).on('mouseleave', hideTip);
    placeLabels(sm.append('g'), shown, proj, r, 14, 10.5);
    if (outside.length) {
      sm.append('text').attr('class', 'lbl').attr('x', W - 8).attr('y', Hm - 10).attr('text-anchor', 'end')
        .text('außerhalb des Ausschnitts: ' + outside.map(c => `${c.label} ${fmt(c.n)}`).join(', '));
    }

    wrap.append('p').attr('class', 'fig-title').style('margin-top', '0.6rem').text('Die neun häufigsten Orte je Jahr');
    const ss = svg(el, W, Hs, 'Stromdiagramm der Schreiborte je Jahr');
    const keys = P.stream_keys.concat(['other']);
    const stack = d3.stack().keys(keys).offset(d3.stackOffsetNone).order(d3.stackOrderNone)(P.stream);
    const x = d3.scaleLinear().domain([1900, 1963]).range([40, W - 10]);
    const y = d3.scaleLinear().domain([0, d3.max(stack[stack.length - 1], d => d[1])]).nice().range([Hs - 26, 8]);
    const area = d3.area().curve(d3.curveMonotoneX).x(d => x(d.data.y)).y0(d => y(d[0])).y1(d => y(d[1]));
    const color = k => k === 'other' ? '#e6dcc7' : CITY_COLORS[P.stream_keys.indexOf(k) % CITY_COLORS.length];
    const layers = ss.append('g').selectAll('path').data(stack).join('path').attr('d', area).attr('fill', d => color(d.key))
      .on('mousemove', (e, d) => {
        const yr = Math.round(x.invert(d3.pointer(e)[0]));
        const row = P.stream.find(r => r.y === yr);
        showTip(e, `<b>${esc(d.key === 'other' ? 'übrige Orte' : P.stream_labels[d.key])}</b><br>${yr}: ${fmt(row ? row[d.key] : 0)} Einheiten`);
      }).on('mouseleave', hideTip);
    ss.append('g').attr('class', 'axis').attr('transform', `translate(0,${Hs - 26})`).call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(7));
    ss.append('g').attr('class', 'axis').attr('transform', 'translate(40,0)').call(d3.axisLeft(y).ticks(4).tickFormat(fmt)).call(g => g.select('.domain').remove());
    legend(el, P.stream_keys.map(k => ({ color: color(k), label: P.stream_labels[k] })).concat([{ color: '#e6dcc7', label: 'übrige' }]));
    note(el, `${fmt(P.n_with_place)} Einheiten nennen einen Ort; ${fmt(P.n_matched)} davon sind einer Stadt der Ortsliste zugeordnet. Brooklyn ist New York, Charlottenburg Berlin zugerechnet.`);
    const focus = [null, ['aachen', 'berlin'], ['pasadena'], ['washington', 'newyork', 'paris']];
    function update(step) {
      const f = focus[Math.min(step, focus.length - 1)];
      layers.transition().duration(400).attr('opacity', d => !f || f.includes(d.key) ? 1 : 0.18);
      dots.transition().duration(400).attr('fill-opacity', c => !f || f.includes(c.id) ? 0.7 : 0.12);
    }
    update(0);
    return { update };
  };

  // ------------------------------------------------------------------ 5 languages
  charts.languages = function (el) {
    const L = K.languages;
    const keys = L.keys;
    const rows = L.decades.map(d => {
      const tot = d3.sum(keys, k => d[k]);
      const o = { decade: d.decade, total: tot };
      keys.forEach(k => { o[k] = tot ? d[k] / tot : 0; o['n_' + k] = d[k]; });
      return o;
    });
    const W = 760, H = 340, m = { t: 14, r: 10, b: 30, l: 44 };
    const s = svg(el, W, H, 'Sprachen der datierten Einheiten je Jahrzehnt');
    const x = d3.scaleBand().domain(rows.map(r => r.decade)).range([m.l, W - m.r]).padding(0.18);
    const y = d3.scaleLinear().domain([0, 1]).range([H - m.b, m.t]);
    const stack = d3.stack().keys(keys)(rows);
    const g = s.append('g').selectAll('g').data(stack).join('g').attr('fill', d => LANG_COLORS[d.key]);
    const rects = g.selectAll('rect').data(d => d.map(v => Object.assign(v, { key: d.key }))).join('rect')
      .attr('x', d => x(d.data.decade)).attr('width', x.bandwidth()).attr('y', d => y(d[1])).attr('height', d => y(d[0]) - y(d[1]))
      .on('mousemove', (e, d) => showTip(e, `<b>${d.data.decade}er Jahre · ${esc(L.labels[d.key])}</b><br>${pct1(d.data[d.key])} · ${fmt(d.data['n_' + d.key])} von ${fmt(d.data.total)} Einheiten`))
      .on('mouseleave', hideTip);
    s.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickFormat(d => `${d}er`));
    s.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(pct)).call(g => g.select('.domain').remove());
    const labels = s.append('g');
    rows.forEach(r => {
      ['german', 'english'].forEach(k => {
        if (r[k] < 0.12) return;
        const lay = stack.find(st => st.key === k).find(v => v.data.decade === r.decade);
        labels.append('text').attr('class', 'lbl').attr('fill', '#fff').attr('text-anchor', 'middle')
          .attr('x', x(r.decade) + x.bandwidth() / 2).attr('y', (y(lay[0]) + y(lay[1])) / 2 + 4).text(pct(r[k]));
      });
    });
    legend(el, keys.map(k => ({ color: LANG_COLORS[k], label: L.labels[k] })));
    note(el, 'Sprache der Einheit laut Erschließung; Anteile an den datierten Einheiten des Jahrzehnts. Die 1900er und 1910er Jahre umfassen nur wenige Einheiten.');
    function update(step) {
      rects.transition().duration(400).attr('opacity', d => step === 0 || ['german', 'english'].includes(d.key) ? 1 : 0.3);
    }
    update(0);
    return { update };
  };

  // ------------------------------------------------------------------ 6 correspondents
  charts.correspondents = function (el) {
    const Cc = K.correspondents;
    const W = 760, H = 560;
    const title = d3.select(el).append('p').attr('class', 'fig-title');
    const s = svg(el, W, H, 'Korrespondenzpartner Kármáns');
    const gBars = s.append('g');
    const gNet = s.append('g').attr('opacity', 0);
    const leg = d3.select(el).append('div');
    const noteEl = d3.select(el).append('p').attr('class', 'fig-note');
    // bars
    const top = Cc.top.slice(0, 25);
    const m = { t: 8, r: 70, b: 20, l: 170 };
    const y = d3.scaleBand().domain(top.map(d => d.id)).range([m.t, H - m.b]).padding(0.22);
    const x = d3.scaleLinear().domain([0, d3.max(top, d => d.n)]).nice().range([m.l, W - m.r]);
    const row = gBars.selectAll('g').data(top).join('g').attr('transform', d => `translate(0,${y(d.id)})`);
    row.append('text').attr('class', 'lbl-serif').attr('x', m.l - 8).attr('y', y.bandwidth() / 2 + 4).attr('text-anchor', 'end').text(d => d.name);
    row.append('rect').attr('x', m.l).attr('height', y.bandwidth()).attr('width', d => x(d.in) - m.l).attr('fill', C.gold);
    row.append('rect').attr('x', d => x(d.in)).attr('height', y.bandwidth()).attr('width', d => x(d.in + d.out) - x(d.in)).attr('fill', C.oxford);
    row.append('text').attr('class', 'lbl').attr('x', d => x(d.n) + 5).attr('y', y.bandwidth() / 2 + 4)
      .text(d => `${fmt(d.n)} · ${d.first ?? '?'}–${d.last ?? '?'}`);
    row.on('mousemove', (e, d) => showTip(e, `<b>${esc(d.name)}</b><br>${fmt(d.in)} an Kármán · ${fmt(d.out)} von Kármán<br>datiert ${d.first ?? '–'} bis ${d.last ?? '–'}`)).on('mouseleave', hideTip);
    // network
    let netDrawn = false;
    function drawNet() {
      if (netDrawn) return;
      netDrawn = true;
      const nodes = Cc.network.nodes.map(n => Object.assign({}, n));
      const links = Cc.network.links.map(l => Object.assign({}, l));
      const rr = d3.scaleSqrt().domain([0, d3.max(nodes.filter(n => !n.center), n => n.n)]).range([3, 16]);
      const sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(l => l.third ? 60 : 150 - Math.min(90, l.n / 2)).strength(l => l.third ? 0.25 : 0.5))
        .force('charge', d3.forceManyBody().strength(-120))
        .force('collide', d3.forceCollide(d => (d.center ? 24 : rr(d.n)) + 3))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .stop();
      nodes.find(n => n.center).fx = W / 2;
      nodes.find(n => n.center).fy = H / 2;
      for (let i = 0; i < 320; i++) sim.tick();
      nodes.forEach(n => { n.x = Math.max(20, Math.min(W - 20, n.x)); n.y = Math.max(16, Math.min(H - 16, n.y)); });
      gNet.append('g').selectAll('line').data(links).join('line')
        .attr('x1', l => l.source.x).attr('y1', l => l.source.y).attr('x2', l => l.target.x).attr('y2', l => l.target.y)
        .attr('stroke', l => l.third ? C.goldDeep : '#b9ab90').attr('stroke-opacity', l => l.third ? 0.8 : 0.35)
        .attr('stroke-width', l => l.third ? 1 + Math.min(3, l.n / 10) : 0.6 + Math.min(4, l.n / 40))
        .attr('stroke-dasharray', l => l.third ? '3 2' : null);
      const col = n => { if (n.center) return C.gold; const p = n.first ? periodOf(n.first) : null; return p ? PERIOD_COLORS[p.id] : '#999'; };
      gNet.append('g').selectAll('circle').data(nodes).join('circle')
        .attr('cx', n => n.x).attr('cy', n => n.y).attr('r', n => n.center ? 22 : rr(n.n))
        .attr('fill', col).attr('stroke', '#fff').attr('stroke-width', 1)
        .on('mousemove', (e, n) => showTip(e, n.center ? `<b>Theodore von Kármán</b><br>${fmt(n.n)} Einheiten als Absender oder Empfänger` :
          `<b>${esc(n.name)}</b><br>${fmt(n.n)} Einheiten mit Kármán<br>erstes datiertes Stück: ${n.first ?? '–'}`))
        .on('mouseleave', hideTip);
      const lab = nodes.filter(n => !n.center).sort((a, b) => b.n - a.n).slice(0, 16);
      gNet.append('g').selectAll('text').data(lab).join('text').attr('class', 'lbl')
        .attr('x', n => n.x + rr(n.n) + 3).attr('y', n => n.y + 4).attr('fill', C.ink)
        .attr('paint-order', 'stroke').attr('stroke', '#fffdf8').attr('stroke-width', 3).text(n => nameShort(n.name));
      gNet.append('text').attr('class', 'lbl-strong').attr('x', W / 2).attr('y', H / 2 + 4).attr('text-anchor', 'middle').attr('fill', C.oxford).text('Kármán');
    }
    function update(step) {
      if (step === 0) {
        gBars.transition().duration(400).attr('opacity', 1);
        gNet.transition().duration(400).attr('opacity', 0);
        title.text('Die 25 häufigsten Korrespondenzpartner');
        leg.html('');
        legend(leg.node(), [{ color: C.gold, label: 'an Kármán' }, { color: C.oxford, label: 'von Kármán' }]);
        noteEl.text(`Zählung: Einheiten mit Kármán als Absender oder Empfänger (${fmt(Cc.n_karman_units)}); ${fmt(Cc.n_counterparts)} verschiedene Partner. Funktionsbezeichnungen wie „Chief Engineer“ sind nicht mitgezählt.`);
      } else {
        drawNet();
        gBars.transition().duration(400).attr('opacity', 0);
        gNet.transition().duration(400).attr('opacity', 1);
        title.text('Kármán und seine 60 häufigsten Partner');
        leg.html('');
        legend(leg.node(), periods().map(p => ({ color: PERIOD_COLORS[p.id], label: `erstes Stück: ${p.short}` }))
          .concat([{ color: C.goldDeep, label: 'gestrichelt: Briefe der Partner untereinander' }]));
        noteEl.text('Kreisfläche nach der Zahl der Einheiten mit Kármán; die Farbe nennt die Periode des ersten datierten Stücks. Die Anordnung ergibt sich aus einer Kräftesimulation und trägt keine eigene Bedeutung.');
      }
    }
    update(0);
    return { update };
  };

  // ------------------------------------------------------------------ 7 topics heatmap
  charts.topics = function (el) {
    const T = K.topics;
    const rows = T.subjects;
    const decs = T.decades.filter(d => d <= 1960);
    const W = 760, rowH = 19, m = { t: 26, r: 10, b: 10, l: 190 };
    const H = m.t + rows.length * rowH + m.b;
    const s = svg(el, W, H, 'Sachthemen je Jahrzehnt');
    const x = d3.scaleBand().domain(decs).range([m.l, W - m.r]).padding(0.06);
    const y = d3.scaleBand().domain(rows.map(r => r.topic)).range([m.t, H - m.b]).padding(0.08);
    const MIN_UNITS = 200;
    const maxShare = d3.max(rows, r => d3.max(r.cells.filter(c => c.decade <= 1960 && T.units_per_decade[c.decade] >= MIN_UNITS), c => c.share));
    const col = d3.scaleSequentialSqrt(d3.interpolateRgbBasis(['#f4ecdb', '#e2c98d', '#c4a15a', '#3f7686', '#002147'])).domain([0, maxShare]);
    s.append('g').selectAll('text').data(decs).join('text').attr('class', 'lbl').attr('x', d => x(d) + x.bandwidth() / 2)
      .attr('y', m.t - 8).attr('text-anchor', 'middle').text(d => `${d}er`);
    const rowG = s.append('g').selectAll('g').data(rows).join('g').attr('transform', r => `translate(0,${y(r.topic)})`);
    rowG.append('text').attr('class', 'lbl-serif').attr('x', m.l - 8).attr('y', y.bandwidth() / 2 + 4).attr('text-anchor', 'end').text(r => r.label);
    rowG.selectAll('rect').data(r => r.cells.filter(c => c.decade <= 1960).map(c => Object.assign({ row: r }, c))).join('rect')
      .attr('x', c => x(c.decade)).attr('width', x.bandwidth()).attr('height', y.bandwidth())
      .attr('fill', c => T.units_per_decade[c.decade] < MIN_UNITS ? '#f8f4ec' : col(Math.min(c.share, maxShare)))
      .on('mousemove', (e, c) => showTip(e, `<b>${esc(c.row.label)} · ${c.decade}er</b><br>${fmt(c.n)} Einheiten, ${pct1(c.share)} der datierten Einheiten des Jahrzehnts`))
      .on('mouseleave', hideTip);
    rowG.selectAll('text.v').data(r => r.cells.filter(c => c.decade <= 1960 && c.n >= 40).map(c => Object.assign({ row: r }, c))).join('text')
      .attr('class', 'v lbl').attr('x', c => x(c.decade) + x.bandwidth() / 2).attr('y', y.bandwidth() / 2 + 4).attr('text-anchor', 'middle')
      .attr('fill', c => c.share > maxShare * 0.3 && T.units_per_decade[c.decade] >= MIN_UNITS ? '#fff' : C.ink).text(c => fmt(c.n));
    note(el, `Schlagwörter der Erschließung (englisch), zusammengefasst nach topics.yaml. Farbe: Anteil an den datierten Einheiten des Jahrzehnts; Zahl: Einheiten (ab 40). Archivvermerke (${T.exclude.slice(0, 4).join(', ')} …) sind ausgeschlossen. Die 1900er und 1910er Jahre haben weniger als 200 datierte Einheiten und bleiben ungefärbt.`);
    const groups = [null,
      ['aerodynamics', 'aerodynamic theory', 'turbulence', 'boundary layer', 'fluid mechanics', 'wind tunnel', 'aerodynamic stability', 'patents', 'helicopter', 'propellers'],
      ['suspension bridges', 'tacoma narrows bridge', 'hydraulics', 'cavitation', 'pump testing', 'wind turbine', 'turbine blades', 'elasticity', 'structural mechanics', 'stress analysis'],
      ['supersonic flow', 'shock waves', 'compressible flow', 'jet propulsion', 'rockets', 'missiles', 'space flight', 'combustion', 'heat transfer']];
    function update(step) {
      const g = groups[Math.min(step, groups.length - 1)];
      rowG.transition().duration(400).attr('opacity', r => !g || g.includes(r.topic) ? 1 : 0.22);
    }
    update(0);
    return { update };
  };

  // ------------------------------------------------------------------ 8 manuscripts beeswarm / swimlane
  function manuscriptSwarm(el, opts = {}) {
    const M = K.manuscripts;
    const lanes = ['Vorlesungen', 'Buchmanuskripte', 'Allgemein', 'Technisch'];
    const laneLabel = { Vorlesungen: 'Vorlesungen und Kurse', Buchmanuskripte: 'Buchmanuskripte', Allgemein: 'Allgemeine Manuskripte', Technisch: 'Technische Manuskripte' };
    const W = 760, laneH = opts.laneH || 92, m = { t: opts.bands ? 30 : 12, r: 118, b: 30, l: 158 };
    const H = m.t + lanes.length * laneH + m.b;
    const s = svg(el, W, H, 'Manuskripte nach Jahr und Gattung');
    const x = d3.scaleLinear().domain([1906, 1964]).range([m.l, W - m.r]);
    const yLane = d3.scaleBand().domain(lanes).range([m.t, H - m.b]).padding(0.08);
    const ux = W - m.r + 24, uw = m.r - 30;
    if (opts.bands) {
      periods().forEach(p => {
        const x0 = x(Math.max(p.from, 1906)), x1 = x(Math.min(p.to + 1, 1964));
        s.append('rect').attr('class', 'pband').attr('data-p', p.id).attr('x', x0).attr('width', x1 - x0).attr('y', m.t - 20)
          .attr('height', H - m.b - m.t + 20).attr('fill', PERIOD_COLORS[p.id]).attr('opacity', 0.07);
        s.append('text').attr('class', 'lbl').attr('x', (x0 + x1) / 2).attr('y', m.t - 8).attr('text-anchor', 'middle').attr('fill', PERIOD_COLORS[p.id]).text(p.short);
      });
    }
    lanes.forEach((l, i) => {
      s.append('line').attr('x1', m.l).attr('x2', W - 4).attr('y1', yLane(l) + yLane.bandwidth()).attr('y2', yLane(l) + yLane.bandwidth()).attr('stroke', C.line);
      s.append('text').attr('class', 'lbl-serif').attr('x', m.l - 10).attr('y', yLane(l) + yLane.bandwidth() / 2 + 4).attr('text-anchor', 'end').text(laneLabel[l]);
    });
    s.append('rect').attr('x', ux - 6).attr('y', m.t).attr('width', uw + 12).attr('height', H - m.b - m.t).attr('fill', '#f3ede1');
    s.append('text').attr('class', 'lbl').attr('x', ux + uw / 2).attr('y', H - m.b + 16).attr('text-anchor', 'middle').text('undatiert');
    s.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(8));
    const r = d3.scaleSqrt().domain([0, d3.max(M, d => d.pages)]).range([2, 9]);
    const nodes = M.map(d => ({
      d, lane: d.lane,
      tx: d.y0 ? x((d.y0 + d.y1) / 2 + 0.5) : ux + uw / 2,
      ty: yLane(d.lane) + yLane.bandwidth() / 2,
      r: r(d.pages || 1),
    }));
    nodes.forEach(n => { n.x = n.tx; n.y = n.ty; });
    const sim = d3.forceSimulation(nodes)
      .force('x', d3.forceX(n => n.tx).strength(n => n.d.y0 ? 0.9 : 0.08))
      .force('y', d3.forceY(n => n.ty).strength(0.12))
      .force('c', d3.forceCollide(n => n.r + 0.8)).stop();
    for (let i = 0; i < 260; i++) sim.tick();
    nodes.forEach(n => {
      const top = yLane(n.lane) + 3, bot = yLane(n.lane) + yLane.bandwidth() - 3;
      n.y = Math.max(top + n.r, Math.min(bot - n.r, n.y));
      if (!n.d.y0) n.x = Math.max(ux, Math.min(ux + uw, n.x));
    });
    const dots = s.append('g').selectAll('circle').data(nodes).join('circle')
      .attr('cx', n => n.x).attr('cy', n => n.y).attr('r', n => n.r)
      .attr('fill', n => n.d.period ? PERIOD_COLORS[n.d.period] : '#a8927a').attr('fill-opacity', 0.78)
      .attr('stroke', '#fff').attr('stroke-width', 0.6).style('cursor', 'pointer')
      .on('mousemove', (e, n) => {
        const d = n.d;
        const yr = d.y0 ? (d.y1 && d.y1 !== d.y0 ? `${d.approx ? 'ca. ' : ''}${d.y0}–${d.y1}` : `${d.approx ? 'ca. ' : ''}${d.y0}`) : 'undatiert';
        showTip(e, `<b>${esc(d.title)}</b><br>${yr} · ${fmt(d.pages)} Seiten · Kiste ${d.box}` +
          (d.tags.length ? `<br>${esc(d.tags.map(t => t.label).join(', '))}` : '') +
          (d.regest ? `<br><span style="opacity:.85">${esc(d.regest.slice(0, 180))}${d.regest.length > 180 ? ' …' : ''}</span>` : '') +
          '<br><i>Klick öffnet den Viewer</i>');
      })
      .on('mouseleave', hideTip)
      .on('click', (e, n) => window.open(n.d.link, '_blank', 'noopener'));
    return { s, dots, nodes, lanes };
  }
  charts.manuscripts = function (el) {
    const sw = manuscriptSwarm(el);
    legend(el, periods().map(p => ({ color: PERIOD_COLORS[p.id], label: p.short })).concat([{ color: '#a8927a', label: 'undatiert' }]));
    note(el, `${fmt(K.facts.n_manuscripts)} Dokumente, ${fmt(K.facts.n_ms_pages)} Seiten; Kreisfläche nach Seitenzahl. Das Jahr steht in der Ordnerbeschriftung; ${fmt(K.facts.n_ms_undated)} Dokumente tragen keines und stehen rechts. Klick öffnet das Dokument im Viewer.`);
    const focus = [null, ['Vorlesungen', 'Buchmanuskripte'], ['Technisch', 'Allgemein'], 'undated'];
    function update(step) {
      const f = focus[Math.min(step, focus.length - 1)];
      sw.dots.transition().duration(400).attr('fill-opacity', n => {
        if (!f) return 0.78;
        if (f === 'undated') return n.d.y0 ? 0.12 : 0.9;
        return f.includes(n.lane) ? 0.85 : 0.12;
      });
    }
    update(0);
    return { update };
  };

  // ------------------------------------------------------------------ 9 famulus diagram
  charts.famulus = function (el) {
    const W = 760, H = 420;
    const s = svg(el, W, H, 'Ablauf eines Famulus-Notebook-Blocks');
    const nodes = [
      { id: 'frage', x: 20, y: 30, w: 220, h: 78, t: 'Frage', b: ['Mit wem korrespondierte', 'Kármán 1930–1940?'] },
      { id: 'block', x: 270, y: 30, w: 220, h: 78, t: 'Block', b: ['Präambel (Partitur): subtask,', 'years, duckdb, oracle'] },
      { id: 'lauf', x: 520, y: 30, w: 220, h: 78, t: 'Lauf', b: ['correspondence-roster auf', 'karman-nachlass.duckdb, nur lesend'] },
      { id: 'artefakt', x: 520, y: 170, w: 220, h: 78, t: 'Artefakt', b: ['roster.json mit Kopf „famulus“,', 'versioniert unter _famulus/'] },
      { id: 'urteil', x: 270, y: 170, w: 220, h: 78, t: 'Urteil', b: ['verdict.json gegen die Untergrenze:', 'mindestens 200 Partner'] },
      { id: 'text', x: 20, y: 170, w: 220, h: 78, t: 'Text', b: ['Die .fam-Datei erklärt Frage,', 'Antwort und Prüfung'] },
      { id: 'golden', x: 145, y: 310, w: 470, h: 78, t: 'Golden', b: ['Eine geprüfte Antwort wird zum Maßstab weiterer Läufe:', 'ground-K1 (Partner), ground-K3 (Einstein), Manuskriptbestand'] },
    ];
    const links = [['frage', 'block'], ['block', 'lauf'], ['lauf', 'artefakt'], ['artefakt', 'urteil'], ['urteil', 'text'], ['urteil', 'golden']];
    const defs = s.append('defs');
    defs.append('marker').attr('id', 'arr').attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7)
      .attr('orient', 'auto-start-reverse').append('path').attr('d', 'M0,0 L10,5 L0,10 z').attr('fill', C.goldDeep);
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    function anchor(a, b) {
      const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
      if (Math.abs(ay - by) < 5) return [ax + Math.sign(bx - ax) * a.w / 2, ay, bx - Math.sign(bx - ax) * b.w / 2, by];
      return [ax, ay + Math.sign(by - ay) * a.h / 2, bx, by - Math.sign(by - ay) * b.h / 2];
    }
    const L = s.append('g').selectAll('line').data(links).join('line').each(function ([a, b]) {
      const [x1, y1, x2, y2] = anchor(byId[a], byId[b]);
      d3.select(this).attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
    }).attr('stroke', C.goldDeep).attr('stroke-width', 1.4).attr('marker-end', 'url(#arr)');
    const g = s.append('g').selectAll('g').data(nodes).join('g').attr('transform', n => `translate(${n.x},${n.y})`);
    g.append('rect').attr('width', n => n.w).attr('height', n => n.h).attr('fill', C.paper).attr('stroke', C.oxford).attr('rx', 2);
    g.append('rect').attr('width', n => n.w).attr('height', 4).attr('fill', n => n.id === 'golden' ? C.gold : C.oxford);
    g.append('text').attr('class', 'lbl-strong').attr('x', 12).attr('y', 26).attr('font-size', 13).text(n => n.t);
    g.each(function (n) {
      n.b.forEach((line, i) => d3.select(this).append('text').attr('class', 'lbl').attr('x', 12).attr('y', 46 + i * 15).attr('fill', C.ink).text(line));
    });
    note(el, 'Beispiel: die drei Blöcke des Notebooks „Kármán: Korrespondenz und Manuskripte“ (korrespondenz.fam). Jeder Block ist ein Lauf einer Partitur mit festgelegten Eingaben; das Urteil vergleicht das Ergebnis mit einer vorab festgelegten Untergrenze.');
    const focus = [null, ['frage', 'block'], ['lauf', 'artefakt'], ['urteil', 'text', 'golden']];
    function update(step) {
      const f = focus[Math.min(step, focus.length - 1)];
      g.transition().duration(300).attr('opacity', n => !f || f.includes(n.id) ? 1 : 0.3);
    }
    update(0);
    return { update };
  };

  // ================================================================== periods page
  const bus = d3.dispatch('period');
  charts.bus = bus;

  charts.periodBand = function (el) {
    const P = periods();
    const W = Math.max(280, Math.round(el.clientWidth || 900)), H = 46;
    const s = svg(el, W, H, 'Arbeitsperioden');
    const x = d3.scaleLinear().domain([P[0].from, P[P.length - 1].to + 1]).range([0, W]);
    const seg = s.selectAll('g').data(P).join('g').attr('class', 'seg').attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', p => `${p.label}, ${p.from}–${p.to}`);
    const segW = p => x(p.to + 1) - x(p.from) - 2;
    seg.append('rect').attr('x', p => x(p.from) + 1).attr('width', segW).attr('y', 4).attr('height', 38)
      .attr('fill', p => PERIOD_COLORS[p.id]).attr('rx', 2);
    seg.append('text').attr('x', p => x(p.from) + (segW(p) < 70 ? 4 : 8)).attr('y', 20)
      .text(p => segW(p) < 58 ? p.short.slice(0, Math.max(3, Math.floor(segW(p) / 7))) + '.' : p.short);
    seg.append('text').attr('class', 'yr').attr('x', p => x(p.from) + (segW(p) < 70 ? 4 : 8)).attr('y', 35)
      .text(p => segW(p) >= 150 ? `${p.from}–${p.to}${p.status === 'proposed' ? ' · vorläufig' : ''}` : segW(p) >= 64 ? `${p.from}–${String(p.to).slice(2)}` : `${String(p.from).slice(2)}–${String(p.to).slice(2)}`);
    let current = null;
    function pick(id) {
      current = current === id ? null : id;
      bus.call('period', null, current);
    }
    seg.on('click', (e, p) => {
      pick(p.id);
      const sec = document.getElementById('p-' + p.id);
      if (sec && current) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).on('keydown', (e, p) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(p.id); } });
    bus.on('period.band', id => { current = id; seg.classed('dim', p => id && p.id !== id); });
    return { update() {} };
  };

  charts.periodCheck = function (el) {
    const PC = K.period_check;
    const rows = PC.series.filter(r => r.y >= 1905);
    const keys = [['aachen', 'Aachen', PERIOD_COLORS.aachen], ['pasadena', 'Pasadena', PERIOD_COLORS.pasadena],
      ['washington', 'Washington', PERIOD_COLORS.beratung], ['paris', 'Paris', PERIOD_COLORS.agard], ['berlin', 'Berlin', '#a8927a']];
    const W = 760, H = 320, m = { t: 30, r: 90, b: 30, l: 44 };
    const s = svg(el, W, H, 'Schreiborte je Jahr und Periodengrenzen');
    const x = d3.scaleLinear().domain([1905, 1963]).range([m.l, W - m.r]);
    const share = (r, k) => r.n_place >= 15 ? r[k] / r.n_place : null;
    const y = d3.scaleLinear().domain([0, 0.8]).range([H - m.b, m.t]);
    periods().slice(1).forEach(p => {
      s.append('line').attr('x1', x(p.from)).attr('x2', x(p.from)).attr('y1', m.t - 12).attr('y2', H - m.b).attr('stroke', PERIOD_COLORS[p.id]).attr('stroke-dasharray', '4 3');
      s.append('text').attr('class', 'lbl').attr('x', x(p.from) + 3).attr('y', m.t - 16).attr('fill', PERIOD_COLORS[p.id]).text(`${p.from} ${p.short}`);
    });
    s.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(8));
    s.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(pct)).call(g => g.select('.domain').remove());
    const line = k => d3.line().defined(r => share(r, k) !== null).curve(d3.curveMonotoneX).x(r => x(r.y)).y(r => y(share(r, k)));
    const placed = [];
    keys.forEach(([k, label, color]) => {
      s.append('path').datum(rows).attr('d', line(k)).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2);
      const peak = rows.filter(r => share(r, k) !== null).reduce((a, b) => share(b, k) > share(a, k) ? b : a);
      let lx = x(peak.y) + 4, ly = y(share(peak, k)) - 6;
      while (placed.some(([px, py]) => Math.abs(px - lx) < 70 && Math.abs(py - ly) < 13)) ly -= 14;
      placed.push([lx, ly]);
      s.append('text').attr('class', 'lbl-strong').attr('fill', color).attr('x', lx).attr('y', ly)
        .attr('paint-order', 'stroke').attr('stroke', '#fffdf8').attr('stroke-width', 3).text(label);
    });
    PC.checks.forEach(c => {
      if (c.data_year == null) return;
      const p = periods().find(pp => pp.id === c.period);
      s.append('circle').attr('cx', x(c.data_year)).attr('cy', H - m.b - 6).attr('r', 5).attr('fill', '#fff').attr('stroke', PERIOD_COLORS[p.id]).attr('stroke-width', 2)
        .on('mousemove', e => showTip(e, `<b>Prüfung: ${esc(p.label)}</b><br>${esc(c.rule)}: ${c.data_year}<br>vorgeschlagene Grenze ${c.boundary}, Abstand ${c.delta > 0 ? '+' : ''}${c.delta} Jahre`))
        .on('mouseleave', hideTip);
    });
    note(el, 'Anteil der Einheiten mit Ortsangabe, die aus der Stadt stammen (nur Jahre mit mindestens 15 Einheiten mit Ort). Gestrichelt: vorgeschlagene Periodengrenzen; Kreise: das Jahr, in dem die jeweilige Prüfregel zuerst erfüllt ist.');
    return { update() {} };
  };

  charts.miniBars = function (el, items, opts = {}) {
    const W = 360, rowH = 17, lw = opts.labelWidth || 150;
    const H = items.length * rowH + 4;
    const s = svg(el, W, H, opts.label || '');
    const x = d3.scaleLinear().domain([0, opts.max || d3.max(items, d => d.value) || 1]).range([lw, W - 40]);
    const g = s.selectAll('g').data(items).join('g').attr('transform', (d, i) => `translate(0,${i * rowH})`);
    g.append('text').attr('class', 'lbl').attr('x', lw - 6).attr('y', 12).attr('text-anchor', 'end').attr('fill', C.ink)
      .text(d => d.label.length > 26 ? d.label.slice(0, 25) + '…' : d.label).append('title').text(d => d.label);
    g.append('rect').attr('x', lw).attr('y', 3).attr('height', rowH - 6).attr('width', d => Math.max(1, x(d.value) - lw)).attr('fill', opts.color || C.oxford);
    g.append('text').attr('class', 'lbl').attr('x', d => x(d.value) + 4).attr('y', 12).text(d => d.text ?? fmt(d.value));
    if (opts.tip) g.on('mousemove', (e, d) => showTip(e, opts.tip(d))).on('mouseleave', hideTip);
    return s;
  };

  charts.miniMap = function (el, cities, color) {
    const W = 360, H = 170;
    const s = svg(el, W, H, 'Schreiborte der Periode');
    const proj = regionProjection(W, H);
    drawWorld(s.append('g'), proj, null, W, H);
    const r = d3.scaleSqrt().domain([0, d3.max(cities, c => c.n) || 1]).range([1.5, 13]);
    s.append('g').selectAll('circle').data(cities).join('circle')
      .attr('cx', c => proj([c.lon, c.lat])[0]).attr('cy', c => proj([c.lon, c.lat])[1]).attr('r', c => r(c.n))
      .attr('fill', color).attr('fill-opacity', 0.65).attr('stroke', '#fff').attr('stroke-width', 0.5)
      .on('mousemove', (e, c) => showTip(e, `<b>${esc(c.label)}</b><br>${fmt(c.n)} Einheiten`)).on('mouseleave', hideTip);
    placeLabels(s.append('g'), cities, proj, r, 4, 10);
    return s;
  };

  charts.langBar = function (el, langs) {
    const W = 360, H = 30;
    const s = svg(el, W, H, 'Sprachen der Periode');
    const tot = d3.sum(langs, l => l.n) || 1;
    let acc = 0;
    langs.forEach(l => {
      const w = (l.n / tot) * W;
      s.append('rect').attr('x', acc).attr('width', w).attr('y', 2).attr('height', 16).attr('fill', LANG_COLORS[l.key] || '#ccc')
        .on('mousemove', e => showTip(e, `<b>${esc(l.label)}</b><br>${fmt(l.n)} Einheiten, ${pct1(l.n / tot)}`)).on('mouseleave', hideTip);
      if (w > 60) s.append('text').attr('class', 'lbl').attr('x', acc + 4).attr('y', 14).attr('fill', '#fff').text(`${l.label} ${pct(l.n / tot)}`);
      acc += w;
    });
    return s;
  };

  charts.bump = function (el) {
    const B = K.periods.bump;
    const P = periods();
    const W = 760, H = 520, m = { t: 34, r: 150, b: 16, l: 150 };
    const s = svg(el, W, H, 'Rang der Korrespondenzpartner je Periode');
    const x = d3.scalePoint().domain(P.map(p => p.id)).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([1, 25]).range([m.t, H - m.b]);
    P.forEach(p => {
      s.append('line').attr('x1', x(p.id)).attr('x2', x(p.id)).attr('y1', m.t - 8).attr('y2', H - m.b).attr('stroke', C.line);
      s.append('text').attr('class', 'lbl-strong').attr('x', x(p.id)).attr('y', m.t - 16).attr('text-anchor', 'middle').attr('fill', PERIOD_COLORS[p.id]).text(p.short);
    });
    [1, 5, 10, 15, 20, 25].forEach(r => s.append('text').attr('class', 'lbl').attr('x', m.l - 128).attr('y', y(r) + 4).text(`Rang ${r}`));
    const peak = b => b.ranks.filter(r => r.rank).reduce((a, c) => (c.rank < a.rank ? c : a), { rank: 99 });
    const line = d3.line().defined(r => r.rank).x(r => x(r.period)).y(r => y(r.rank)).curve(d3.curveBumpX);
    const persons = s.append('g').selectAll('g').data(B).join('g').attr('class', 'person');
    persons.append('path').attr('d', b => line(b.ranks)).attr('fill', 'none').attr('stroke', b => PERIOD_COLORS[peak(b).period]).attr('stroke-width', 2.2).attr('stroke-opacity', 0.85);
    persons.selectAll('circle').data(b => b.ranks.filter(r => r.rank).map(r => Object.assign({ b }, r))).join('circle')
      .attr('cx', r => x(r.period)).attr('cy', r => y(r.rank)).attr('r', 4).attr('fill', r => PERIOD_COLORS[peak(r.b).period]).attr('stroke', '#fff')
      .on('mousemove', (e, r) => showTip(e, `<b>${esc(r.b.name)}</b><br>${esc(P.find(p => p.id === r.period).label)}: Rang ${r.rank}, ${fmt(r.n)} Einheiten`)).on('mouseleave', hideTip);
    // labels: at first and last ranked point
    persons.each(function (b) {
      const rk = b.ranks.filter(r => r.rank);
      const first = rk[0], last = rk[rk.length - 1];
      const g = d3.select(this);
      const pk = peak(b);
      g.append('text').attr('class', 'lbl').attr('fill', C.ink)
        .attr('x', x(pk.period) + (pk.period === P[P.length - 1].id ? 8 : pk.period === P[0].id ? -8 : 0))
        .attr('y', y(pk.rank) - 7).attr('text-anchor', pk.period === P[P.length - 1].id ? 'start' : pk.period === P[0].id ? 'end' : 'middle')
        .attr('font-size', 10).attr('paint-order', 'stroke').attr('stroke', '#fffdf8').attr('stroke-width', 3.5).text(nameShort(b.name));
    });
    note(el, K.periods.method.ranks + ' Gezeigt sind die jeweils sechs häufigsten Partner jeder Periode; die Linienfarbe nennt die Periode ihres besten Rangs.');
    function highlight(id) {
      persons.transition().duration(300).attr('opacity', b => !id || b.ranks.some(r => r.period === id && r.rank && r.rank <= 12) ? 1 : 0.12);
    }
    bus.on('period.bump', highlight);
    return { update() {}, highlight };
  };

  // Flow bars: one bar per period (partners with at least two units), split into partners
  // continued from the previous period (top, colour of that period) and new partners
  // (bottom, gold). Ribbons join the continued partners of neighbouring periods; the grey
  // tail under each bar is the number of partners that do not continue.
  charts.alluvial = function (el) {
    const F = K.periods.flows;
    const P = periods();
    const W = 760, H = 340, top = 40, barW = 26;
    const s = svg(el, W, H, 'Fortgeführte, neue und beendete Korrespondenzbeziehungen');
    const x = d3.scalePoint().domain(P.map(p => p.id)).range([60, W - 90]);
    const k = (H - top - 70) / d3.max(F, f => f.size);
    const bars = F.map((f, i) => ({ f, p: P[i], x: x(P[i].id) - barW / 2, h: f.size * k, hc: f.continued_from_prev * k }));
    const tip = (e, html) => showTip(e, html);
    bars.forEach((b, i) => {
      const g = s.append('g');
      g.append('rect').attr('x', b.x).attr('y', top).attr('width', barW).attr('height', b.hc).attr('fill', i ? PERIOD_COLORS[P[i - 1].id] : C.gold);
      g.append('rect').attr('x', b.x).attr('y', top + b.hc).attr('width', barW).attr('height', b.h - b.hc).attr('fill', C.gold)
        .on('mousemove', e => tip(e, `<b>${b.f.new} Partner</b> erstmals in „${esc(b.p.label)}“`)).on('mouseleave', hideTip);
      g.append('text').attr('class', 'lbl-strong').attr('x', b.x + barW / 2).attr('y', top - 22).attr('text-anchor', 'middle')
        .attr('fill', PERIOD_COLORS[b.p.id]).text(b.p.short);
      g.append('text').attr('class', 'lbl').attr('x', b.x + barW / 2).attr('y', top - 8).attr('text-anchor', 'middle').text(`${b.f.size} Partner`);
      g.append('text').attr('class', 'lbl').attr('x', b.x - 5).attr('y', top + b.hc + (b.h - b.hc) / 2 + 4).attr('text-anchor', 'end')
        .attr('fill', C.goldDeep).text(`neu ${b.f.new}`);
      if (b.f.end != null) {
        const ex = b.x + barW, ey0 = top + (b.f.continue_to_next * k), ey1 = top + b.h;
        g.append('path').attr('d', `M${ex},${ey0} C${ex + 30},${ey0} ${ex + 30},${ey1 + 16} ${ex + 44},${ey1 + 16} L${ex + 44},${ey1 + 16 + (ey1 - ey0) * 0.25} C${ex + 20},${ey1 + 16 + (ey1 - ey0) * 0.25} ${ex + 8},${ey1} ${ex},${ey1} Z`)
          .attr('fill', '#cdbfa4').attr('opacity', 0.55)
          .on('mousemove', e => tip(e, `<b>${b.f.end} Partner</b> aus „${esc(b.p.label)}“ nicht mehr in der folgenden Periode`)).on('mouseleave', hideTip);
        g.append('text').attr('class', 'lbl').attr('x', ex + 48).attr('y', ey1 + 22).text(`endet ${b.f.end}`);
      }
      if (i + 1 < bars.length && b.f.continue_to_next) {
        const n = bars[i + 1], hh = b.f.continue_to_next * k;
        const x0 = b.x + barW, x1 = n.x, y0 = top, y1 = top;
        s.append('path').attr('d', `M${x0},${y0} C${(x0 + x1) / 2},${y0} ${(x0 + x1) / 2},${y1} ${x1},${y1} L${x1},${y1 + hh} C${(x0 + x1) / 2},${y1 + hh} ${(x0 + x1) / 2},${y0 + hh} ${x0},${y0 + hh} Z`)
          .attr('fill', PERIOD_COLORS[b.p.id]).attr('opacity', 0.35)
          .on('mousemove', e => tip(e, `<b>${b.f.continue_to_next} Partner</b> aus „${esc(b.p.label)}“ auch in „${esc(n.p.label)}“`)).on('mouseleave', hideTip);
        s.append('text').attr('class', 'lbl').attr('x', (x0 + x1) / 2).attr('y', y0 + hh + 14).attr('text-anchor', 'middle')
          .attr('fill', PERIOD_COLORS[b.p.id]).text(`${b.f.continue_to_next} fortgeführt`);
      }
    });
    note(el, K.periods.method.flows + ' Obere Teile der Balken: aus der vorigen Periode fortgeführte Partner; goldene Teile: neue Partner; graue Ausläufer: Partner, die in der folgenden Periode nicht mehr vorkommen.');
    return { update() {} };
  };

  charts.topicStream = function (el) {
    const P = periods().filter(p => p.n_units >= 200);
    const skipped = periods().filter(p => p.n_units < 200);
    const subjects = K.topics.subjects.map(s => s.topic);
    const per = P.map(p => {
      const o = { id: p.id };
      p.subjects.forEach(s => { o[s.tag] = s.share; });
      return o;
    });
    const top = subjects.map(t => ({ t, max: d3.max(per, r => r[t] || 0) })).sort((a, b) => b.max - a.max).slice(0, 10).map(d => d.t);
    const label = Object.fromEntries(K.topics.subjects.map(s => [s.topic, s.label]));
    const W = 760, H = 380, m = { t: 30, r: 40, b: 20, l: 40 };
    const s = svg(el, W, H, 'Anteile der Sachthemen je Periode');
    const x = d3.scalePoint().domain(P.map(p => p.id)).range([m.l + 20, W - m.r]);
    const stack = d3.stack().keys(top).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(per.map(r => { const o = { id: r.id }; top.forEach(t => o[t] = r[t] || 0); return o; }));
    const y = d3.scaleLinear().domain([d3.min(stack, l => d3.min(l, d => d[0])), d3.max(stack, l => d3.max(l, d => d[1]))]).range([H - m.b, m.t]);
    const palette = ['#002147', '#8c6d2a', '#3f7686', '#9a4f3c', '#5f6b3a', '#56708f', '#b8765f', '#6b8e8f', '#a8927a', '#c4a15a'];
    const area = d3.area().curve(d3.curveCatmullRom).x(d => x(d.data.id)).y0(d => y(d[0])).y1(d => y(d[1]));
    const cols = s.append('g');
    P.forEach(p => {
      cols.append('rect').attr('class', 'col').attr('data-p', p.id).attr('x', x(p.id) - 22).attr('width', 44).attr('y', m.t - 6).attr('height', H - m.b - m.t + 6).attr('fill', PERIOD_COLORS[p.id]).attr('opacity', 0);
      s.append('text').attr('class', 'lbl-strong').attr('x', x(p.id)).attr('y', m.t - 12).attr('text-anchor', 'middle').attr('fill', PERIOD_COLORS[p.id]).text(p.short);
    });
    s.append('g').selectAll('path').data(stack).join('path').attr('d', area).attr('fill', (d, i) => palette[i % palette.length]).attr('fill-opacity', 0.88)
      .on('mousemove', (e, d) => {
        const mx = d3.pointer(e)[0];
        const pi = d3.minIndex(P, p => Math.abs(x(p.id) - mx));
        showTip(e, `<b>${esc(label[d.key])}</b><br>${esc(P[pi].label)}: ${pct1(per[pi][d.key] || 0)} der datierten Einheiten`);
      }).on('mouseleave', hideTip);
    stack.forEach((l, i) => {
      const best = l.reduce((a, d) => (d[1] - d[0]) > (a[1] - a[0]) ? d : a);
      const thick = y(best[0]) - y(best[1]);
      if (thick < 15) return;
      const pi = P.findIndex(p => p.id === best.data.id);
      const anchor = pi === 0 ? 'start' : pi === P.length - 1 ? 'end' : 'middle';
      const dx = pi === 0 ? 6 : pi === P.length - 1 ? -6 : 0;
      s.append('text').attr('class', 'lbl-strong').attr('x', x(best.data.id) + dx).attr('y', y((best[0] + best[1]) / 2) + 4)
        .attr('text-anchor', anchor).attr('fill', '#fff').attr('pointer-events', 'none').text(label[l.key]);
    });
    legend(el, stack.map((l, i) => ({ color: palette[i % palette.length], label: label[l.key] })));
    note(el, 'Anteil der datierten Einheiten einer Periode, die das Schlagwort tragen; zehn Themen mit dem höchsten Anteil in irgendeiner Periode. Die Dicke eines Bandes ist der Anteil; die senkrechte Lage dient nur der Lesbarkeit.' +
      (skipped.length ? ` Nicht gezeigt: ${skipped.map(p => p.label).join(', ')} (weniger als 200 datierte Einheiten).` : ''));
    bus.on('period.stream', id => cols.selectAll('rect').transition().duration(300).attr('opacity', function () { return id && this.dataset.p === id ? 0.1 : 0; }));
    return { update() {} };
  };

  charts.swimlane = function (el) {
    const sw = manuscriptSwarm(el, { bands: true, laneH: 78 });
    legend(el, periods().map(p => ({ color: PERIOD_COLORS[p.id], label: p.label })).concat([{ color: '#a8927a', label: 'undatiert' }]));
    note(el, 'Jedes Manuskript an seinem Jahr der Ordnerbeschriftung; Kreisfläche nach Seitenzahl. Undatierte Manuskripte stehen rechts; ihnen wird kein Jahr zugewiesen.');
    bus.on('period.swim', id => {
      sw.dots.transition().duration(300).attr('fill-opacity', n => !id ? 0.78 : n.d.period === id ? 0.95 : 0.1);
      sw.s.selectAll('rect.pband').transition().duration(300).attr('opacity', function () { return !id ? 0.07 : this.dataset.p === id ? 0.16 : 0.03; });
    });
    return { update() {} };
  };

  // ------------------------------------------------------------------ landing sparkline
  charts.spark = function (el) {
    const rows = K.years.years.filter(r => r.y >= 1900 && r.y <= 1963);
    const W = 420, H = 70;
    const s = svg(el, W, H, 'Datierte Einheiten je Jahr');
    const x = d3.scaleBand().domain(rows.map(r => r.y)).range([0, W]).padding(0.12);
    const y = d3.scaleLinear().domain([0, d3.max(rows, r => r.n)]).range([H - 14, 2]);
    periods().forEach(p => {
      const x0 = x(Math.max(p.from, 1900)), x1 = x(Math.min(p.to, 1963));
      if (x0 === undefined) return;
      s.append('rect').attr('x', x0).attr('width', x1 + x.bandwidth() - x0).attr('y', H - 10).attr('height', 4).attr('fill', PERIOD_COLORS[p.id]);
    });
    s.append('g').selectAll('rect').data(rows).join('rect').attr('x', r => x(r.y)).attr('width', x.bandwidth())
      .attr('y', r => y(r.n)).attr('height', r => y(0) - y(r.n)).attr('fill', C.oxford).attr('opacity', 0.85);
    s.append('text').attr('class', 'lbl').attr('x', 0).attr('y', H).text('1900');
    s.append('text').attr('class', 'lbl').attr('x', W).attr('y', H).attr('text-anchor', 'end').text('1963');
    return s;
  };

  window.KarmanCharts = charts;
  window.KarmanFmt = { fmt, pct, pct1 };
})();
