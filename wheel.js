/* Cisco Printers Cybercafe — interactive services wheel
   Builds a rotating radial SVG from the service cards already in the page
   (#listView), so the HTML list stays the single source of truth. */
(function () {
    'use strict';

    var sheet = document.getElementById('services');
    var svg = document.getElementById('wheelSvg');
    var detail = document.getElementById('wheelDetail');
    var legend = document.getElementById('wheelLegend');
    if (!sheet || !svg || !detail || !legend) return;

    var NS = 'http://www.w3.org/2000/svg';
    var COLORS = ['#2c8cff', '#ff2e93', '#8f63ff', '#5ee7ff', '#e56bff']; // site palette
    var SECTOR = 72;            // 360 / 5 categories
    var R_IN = 165, R_OUT = 450, R_LABEL = 436, R_RING = 118;
    var BUB_R = 33;
    var SPEED = 5;              // degrees per second (one turn = 72 s)
    var WA = 'https://wa.me/254769357320';

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- state ---------- */
    var cats = [], bubs = [], labels = [], dots = [], spokes = [], sectors = [], legBtns = [];
    var wheelG, innerG, hubSub;
    var A = 0, tween = null, raf = 0, last = 0;
    var userPaused = reduce, hover = false, dragging = false, dragMoved = false;
    var sel = null, selCat = null, visible = false, didIntro = false, built = false;

    /* ---------- helpers ---------- */
    function el(name, attrs, parent) {
        var n = document.createElementNS(NS, name);
        for (var k in attrs) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    }
    function h(tag, cls, txt) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (txt != null) n.textContent = txt;
        return n;
    }
    function pol(r, deg) { var a = deg * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a)]; }
    function f(n) { return Math.round(n * 100) / 100; }
    function lin(a, b, n) { var o = []; for (var i = 0; i < n; i++) o.push(a + (b - a) * (n === 1 ? 0 : i / (n - 1))); return o; }
    function norm(d) { return ((d + 540) % 360) - 180; }
    function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

    /* ---------- read the service data out of the list view ---------- */
    function readData() {
        var tabEls = document.querySelectorAll('#listView .tab');
        var out = [];
        document.querySelectorAll('#listView .panel').forEach(function (p, i) {
            var services = [];
            p.querySelectorAll('.card').forEach(function (c) {
                var icon = c.querySelector('.card-icon');
                var glyph = icon ? window.getComputedStyle(icon, '::before').content : '';
                glyph = glyph && glyph !== 'none' && glyph !== 'normal' ? glyph.replace(/^["']|["']$/g, '') : '';
                var link = c.querySelector('.card-link');
                var title = c.querySelector('h3').textContent.trim();
                services.push({
                    title: title,
                    desc: c.querySelector('p').textContent.trim(),
                    tags: [].map.call(c.querySelectorAll('.tags li'), function (li) { return li.textContent.trim(); }),
                    glyph: glyph || title.charAt(0),
                    cta: link ? link.textContent.replace(/\s+/g, ' ').trim() : 'Get in touch'
                });
            });
            out.push({
                name: tabEls[i] ? tabEls[i].textContent.trim() : 'Category ' + (i + 1),
                color: COLORS[i % COLORS.length],
                services: services
            });
        });
        return out;
    }

    /* ---------- build the SVG ---------- */
    function build() {
        cats = readData();
        if (!cats.length) return;
        svg.textContent = '';
        bubs = []; labels = []; dots = []; spokes = []; sectors = []; legBtns = [];
        legend.textContent = '';

        var defs = el('defs', {}, svg);
        var hg = el('linearGradient', { id: 'hubGrad', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
        el('stop', { offset: '0', 'stop-color': '#ff2e93' }, hg);
        el('stop', { offset: '1', 'stop-color': '#6a2cff' }, hg);
        var rg = el('linearGradient', { id: 'ringGrad', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
        el('stop', { offset: '0', 'stop-color': '#ff2e93' }, rg);
        el('stop', { offset: '0.5', 'stop-color': '#6a2cff' }, rg);
        el('stop', { offset: '1', 'stop-color': '#5ee7ff' }, rg);
        var gl = el('filter', { id: 'wglow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
        el('feGaussianBlur', { stdDeviation: '7', result: 'b' }, gl);
        var fm = el('feMerge', {}, gl);
        el('feMergeNode', { 'in': 'b' }, fm);
        el('feMergeNode', { 'in': 'SourceGraphic' }, fm);

        /* static outer rings (gear-like teeth + gradient line) */
        el('circle', { r: 488, fill: 'none', stroke: 'rgba(255,255,255,.16)', 'stroke-width': 1.5 }, svg);
        el('circle', { r: 474, fill: 'none', stroke: 'url(#ringGrad)', 'stroke-width': 2.5 }, svg);
        el('circle', { r: 466, fill: 'none', stroke: 'rgba(255,255,255,.22)', 'stroke-width': 8, 'stroke-dasharray': '1.5 7.5' }, svg);

        /* rotating wheel */
        wheelG = el('g', { 'class': 'wheel' }, svg);

        cats.forEach(function (cat, ci) {
            var center = -90 + ci * SECTOR, a0 = center - SECTOR / 2, a1 = center + SECTOR / 2;
            var p0 = pol(R_IN, a0), p1 = pol(R_OUT, a0), p2 = pol(R_OUT, a1), p3 = pol(R_IN, a1);
            var d = 'M' + f(p0[0]) + ' ' + f(p0[1]) + ' L' + f(p1[0]) + ' ' + f(p1[1]) +
                ' A' + R_OUT + ' ' + R_OUT + ' 0 0 1 ' + f(p2[0]) + ' ' + f(p2[1]) +
                ' L' + f(p3[0]) + ' ' + f(p3[1]) +
                ' A' + R_IN + ' ' + R_IN + ' 0 0 0 ' + f(p0[0]) + ' ' + f(p0[1]) + ' Z';
            var sec = el('path', { d: d, 'class': 'sector', fill: cat.color, 'fill-opacity': 0.1, stroke: 'rgba(255,255,255,.1)', 'stroke-width': 1.5 }, wheelG);
            sec.addEventListener('click', function () { if (!dragMoved) chooseCategory(ci); });
            sectors.push(sec);

            /* position the service bubbles in staggered rows */
            var n = cat.services.length, rows = Math.ceil(n / 2);
            var radii = rows === 1 ? [300] : lin(210, 375, rows);
            cat.services.forEach(function (s, j) {
                var row = Math.floor(j / 2);
                var single = row === rows - 1 && n % 2 === 1;
                var spread = row % 2 === 0 ? 14 : 9;
                s.a = center + (single ? 0 : (j % 2 === 0 ? -spread : spread));
                s.r = radii[row];
            });
        });

        /* spokes (hub -> service) */
        cats.forEach(function (cat, ci) {
            cat.services.forEach(function (s, j) {
                var a = pol(R_IN, s.a), b = pol(s.r, s.a);
                spokes.push({ c: ci, s: j, node: el('line', { x1: f(a[0]), y1: f(a[1]), x2: f(b[0]), y2: f(b[1]), 'class': 'spoke', stroke: cat.color, 'stroke-opacity': 0.22, 'stroke-width': 1.2 }, wheelG) });
            });
        });

        /* bubbles + upright category labels */
        var idx = 0;
        cats.forEach(function (cat, ci) {
            cat.services.forEach(function (s, j) {
                var pos = pol(s.r, s.a);
                var g = el('g', { 'class': 'bub', tabindex: 0, role: 'button', 'aria-label': s.title + ', ' + cat.name }, wheelG);
                var pop = el('g', { 'class': 'pop' }, g);
                pop.style.transitionDelay = (idx * 45 + 250) + 'ms';
                el('circle', { r: BUB_R + 8, 'class': 'focusring', fill: 'none', stroke: '#fff', 'stroke-width': 2 }, pop);
                el('circle', { r: BUB_R, 'class': 'disc', fill: cat.color, 'fill-opacity': 0.2, stroke: cat.color, 'stroke-width': 2 }, pop);
                var t = el('text', { 'class': 'glyph' }, pop);
                t.textContent = s.glyph;
                var tt = el('title', {}, g);
                tt.textContent = s.title;
                g.addEventListener('click', function () { if (!dragMoved) selectService(ci, j); });
                g.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectService(ci, j); }
                });
                bubs.push({ c: ci, s: j, node: g, pop: pop, x: pos[0], y: pos[1] });
                idx++;
            });

            var lp = pol(R_LABEL, -90 + ci * SECTOR);
            var lg = el('g', { 'class': 'catlabel' }, wheelG);
            var label = cat.name.toUpperCase();
            var w = label.length * 12 + 30;
            el('rect', { x: f(-w / 2), y: -13, width: w, height: 26, rx: 13, fill: 'rgba(5,6,13,.85)', stroke: cat.color, 'stroke-width': 1.5 }, lg);
            var lt = el('text', {}, lg);
            lt.textContent = label;
            labels.push({ node: lg, x: lp[0], y: lp[1] });
        });

        /* inner ring: one dot per service, counter-rotating */
        innerG = el('g', { 'class': 'inner' }, svg);
        el('circle', { r: R_RING, fill: 'none', stroke: 'rgba(255,255,255,.05)', 'stroke-width': 34 }, innerG);
        el('circle', { r: R_RING, fill: 'none', stroke: 'rgba(255,255,255,.2)', 'stroke-width': 1 }, innerG);
        var total = bubs.length;
        bubs.forEach(function (b, i) {
            var p = pol(R_RING, -90 + (i / total) * 360);
            var dg = el('g', { 'class': 'dot', tabindex: -1 }, innerG);
            el('circle', { cx: f(p[0]), cy: f(p[1]), r: 8, fill: cats[b.c].color, 'fill-opacity': 0.85, stroke: 'rgba(255,255,255,.55)', 'stroke-width': 1 }, dg);
            var ttl = el('title', {}, dg);
            ttl.textContent = cats[b.c].services[b.s].title;
            dg.addEventListener('click', function () { if (!dragMoved) selectService(b.c, b.s); });
            dots.push({ c: b.c, s: b.s, node: dg });
        });

        /* hub: sawtooth seal + title */
        var hub = el('g', { 'class': 'hub' }, svg);
        var pts = [];
        for (var k = 0; k < 72; k++) { var q = pol(k % 2 ? 80 : 89, k * 5); pts.push(f(q[0]) + ',' + f(q[1])); }
        el('polygon', { points: pts.join(' '), fill: 'url(#hubGrad)', filter: 'url(#wglow)' }, hub);
        el('circle', { r: 68, fill: 'none', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1, 'stroke-dasharray': '2 5' }, hub);
        var t1 = el('text', { 'class': 'hub-t1', y: -20 }, hub); t1.textContent = 'CISCO';
        var t2 = el('text', { 'class': 'hub-t1', y: 0 }, hub); t2.textContent = 'PRINTERS';
        hubSub = el('text', { 'class': 'hub-t2', y: 22 }, hub);
        var t4 = el('text', { 'class': 'hub-t3', y: 40 }, hub); t4.textContent = 'BARATON · KENYA';

        /* legend: category buttons + notes */
        cats.forEach(function (cat, ci) {
            var b = h('button', 'leg');
            b.type = 'button';
            b.style.setProperty('--c', cat.color);
            b.setAttribute('aria-pressed', 'false');
            b.appendChild(h('span', 'leg-dot'));
            b.appendChild(document.createTextNode(cat.name));
            b.addEventListener('click', function () { chooseCategory(ci); });
            legend.appendChild(b);
            legBtns.push(b);
        });
        legend.appendChild(h('span', 'leg-note', 'Inner ring: every service'));
        legend.appendChild(h('span', 'leg-note', 'Lines: hub → category → service'));

        built = true;
        refresh();
        renderDetail();
        paint();
    }

    /* ---------- painting ---------- */
    function paint() {
        if (!built) return;
        wheelG.setAttribute('transform', 'rotate(' + f(A) + ')');
        innerG.setAttribute('transform', 'rotate(' + f(-A * 1.5) + ')');
        var inv = ' rotate(' + f(-A) + ')';
        for (var i = 0; i < bubs.length; i++) bubs[i].node.setAttribute('transform', 'translate(' + f(bubs[i].x) + ' ' + f(bubs[i].y) + ')' + inv);
        for (var j = 0; j < labels.length; j++) labels[j].node.setAttribute('transform', 'translate(' + f(labels[j].x) + ' ' + f(labels[j].y) + ')' + inv);
    }

    function refresh() {
        svg.classList.toggle('has-sel', !!sel);
        bubs.forEach(function (b) { b.node.classList.toggle('active', !!sel && sel.c === b.c && sel.s === b.s); });
        spokes.forEach(function (s) { s.node.classList.toggle('active', !!sel && sel.c === s.c && sel.s === s.s); });
        dots.forEach(function (d) { d.node.classList.toggle('active', !!sel && sel.c === d.c && sel.s === d.s); });
        sectors.forEach(function (s, i) { s.classList.toggle('active', selCat === i); });
        legBtns.forEach(function (b, i) { b.classList.toggle('active', selCat === i); b.setAttribute('aria-pressed', String(selCat === i)); });
        if (!hubSub) return;
        if (sel) hubSub.textContent = trunc(cats[sel.c].services[sel.s].title, 20);
        else if (selCat != null) hubSub.textContent = cats[selCat].name + ' · ' + cats[selCat].services.length;
        else hubSub.textContent = bubs.length + ' services';
    }

    /* ---------- detail panel ---------- */
    function renderDetail() {
        detail.textContent = '';
        if (sel) {
            var cat = cats[sel.c], s = cat.services[sel.s];
            var chip = h('span', 'wd-chip', cat.name);
            chip.style.setProperty('--c', cat.color);
            detail.appendChild(chip);
            var ic = h('span', 'wd-icon fas', s.glyph);
            ic.style.setProperty('--c', cat.color);
            ic.setAttribute('aria-hidden', 'true');
            detail.appendChild(ic);
            detail.appendChild(h('h3', null, s.title));
            detail.appendChild(h('p', 'wd-desc', s.desc));
            var ul = h('ul', 'tags');
            s.tags.forEach(function (tg) { ul.appendChild(h('li', null, tg)); });
            detail.appendChild(ul);
            var row = h('div', 'wd-actions');
            var a1 = h('a', 'btn btn-primary', s.cta + ' ');
            a1.href = '#contact';
            a1.appendChild(h('i', 'fas fa-arrow-right'));
            var a2 = h('a', 'btn btn-outline');
            a2.href = WA + '?text=' + encodeURIComponent('Hello Cisco Printers! I am interested in: ' + s.title);
            a2.target = '_blank'; a2.rel = 'noopener';
            a2.appendChild(h('i', 'fab fa-whatsapp'));
            a2.appendChild(document.createTextNode(' WhatsApp'));
            row.appendChild(a1); row.appendChild(a2);
            detail.appendChild(row);
        } else if (selCat != null) {
            var c = cats[selCat];
            var chip2 = h('span', 'wd-chip', c.name);
            chip2.style.setProperty('--c', c.color);
            detail.appendChild(chip2);
            detail.appendChild(h('h3', null, c.name + ' services'));
            detail.appendChild(h('p', 'wd-desc', c.services.length + ' services in this group. Pick one to see details.'));
            var list = h('ul', 'wd-list');
            c.services.forEach(function (s, j) {
                var li = h('li');
                var b = h('button', null, s.title);
                b.type = 'button';
                b.addEventListener('click', function () { selectService(selCat, j); });
                li.appendChild(b);
                list.appendChild(li);
            });
            detail.appendChild(list);
        } else {
            var chip3 = h('span', 'wd-chip', 'Explore');
            chip3.style.setProperty('--c', '#ff2e93');
            detail.appendChild(chip3);
            detail.appendChild(h('h3', null, 'Spin the wheel'));
            detail.appendChild(h('p', 'wd-desc', 'Click any bubble to open that service here. Drag the wheel to spin it, or pick a category below to bring it to the top.'));
            detail.appendChild(h('p', 'wd-hint', 'Prefer plain text? Switch to the List view.'));
        }
    }

    /* ---------- actions ---------- */
    function rotateTo(deg) {
        var to = A + norm(deg - A);
        tween = { from: A, to: to, t0: performance.now(), d: 900 };
        ensureLoop();
    }
    function selectService(ci, j) {
        sel = { c: ci, s: j }; selCat = ci;
        refresh(); renderDetail();
        rotateTo(-ci * SECTOR);
    }
    function chooseCategory(ci) {
        sel = null; selCat = ci;
        refresh(); renderDetail();
        rotateTo(-ci * SECTOR);
    }
    function resetView() {
        sel = null; selCat = null; userPaused = reduce; hover = false;
        refresh(); renderDetail(); syncPlay();
        rotateTo(0);
    }
    function clearDelays() { bubs.forEach(function (b) { b.pop.style.transitionDelay = ''; }); }
    function playIntro() {
        if (!built) return;
        bubs.forEach(function (b, i) { b.pop.style.transitionDelay = (i * 45 + 250) + 'ms'; });
        svg.classList.add('intro');
        void svg.getBoundingClientRect();
        setTimeout(function () {
            svg.classList.remove('intro');
            setTimeout(clearDelays, 2000);
        }, 60);
    }

    /* ---------- animation loop ---------- */
    function frame(t) {
        raf = 0;
        if (!visible || !sheet.classList.contains('wheel-mode') || document.hidden) { last = 0; return; }
        var dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
        last = t;
        if (tween) {
            var p = Math.min(1, (performance.now() - tween.t0) / tween.d);
            var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            A = tween.from + (tween.to - tween.from) * e;
            if (p >= 1) tween = null;
        } else if (!userPaused && !hover && !sel && !dragging) {
            A += SPEED * dt;
        }
        paint();
        raf = requestAnimationFrame(frame);
    }
    function ensureLoop() { if (!raf && built) { last = 0; raf = requestAnimationFrame(frame); } }

    /* ---------- pointer: hover pause + drag to spin ---------- */
    function ptrAngle(e) {
        var r = svg.getBoundingClientRect();
        return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    }
    var lastPtr = 0, travelled = 0;
    svg.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    svg.addEventListener('pointerleave', function () { hover = false; });
    svg.addEventListener('focusin', function () { hover = true; });
    svg.addEventListener('focusout', function () { hover = false; });
    svg.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        dragging = true; dragMoved = false; travelled = 0; tween = null;
        lastPtr = ptrAngle(e);
    });
    svg.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var ang = ptrAngle(e), inc = norm(ang - lastPtr);
        lastPtr = ang; travelled += inc;
        if (!dragMoved && Math.abs(travelled) > 4) {
            dragMoved = true;
            try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        }
        if (dragMoved) { A += inc; paint(); }
    });
    function endDrag() { dragging = false; setTimeout(function () { dragMoved = false; }, 0); }
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);

    /* ---------- view toggle + tools ---------- */
    var segs = [].slice.call(sheet.querySelectorAll('.seg-btn'));
    function setView(mode) {
        sheet.classList.toggle('wheel-mode', mode === 'wheel');
        segs.forEach(function (b) {
            var on = b.getAttribute('data-view') === mode;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', String(on));
        });
        if (mode === 'wheel') ensureLoop();
    }
    segs.forEach(function (b) { b.addEventListener('click', function () { setView(b.getAttribute('data-view')); }); });

    var playBtn = document.getElementById('wheelPlay');
    function syncPlay() {
        if (!playBtn) return;
        playBtn.setAttribute('aria-pressed', String(userPaused));
        playBtn.querySelector('span').textContent = userPaused ? 'Play' : 'Pause';
        playBtn.querySelector('i').className = userPaused ? 'fas fa-play' : 'fas fa-pause';
    }
    if (playBtn) playBtn.addEventListener('click', function () { userPaused = !userPaused; syncPlay(); });
    var replayBtn = document.getElementById('wheelReplay');
    if (replayBtn) replayBtn.addEventListener('click', playIntro);
    var resetBtn = document.getElementById('wheelReset');
    if (resetBtn) resetBtn.addEventListener('click', resetView);

    /* ---------- visibility ---------- */
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            if (visible) {
                ensureLoop();
                if (!didIntro && sheet.classList.contains('wheel-mode')) { didIntro = true; playIntro(); }
            }
        }, { threshold: 0.25 }).observe(svg);
    } else { visible = true; }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) ensureLoop(); });

    /* ---------- init ---------- */
    function init() {
        build();
        syncPlay();
        setView(window.innerWidth >= 760 ? 'wheel' : 'list');
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();
})();
