/* Cisco Printers Cybercafe — interactions */
(function () {
    'use strict';

    var WHATSAPP_NUMBER = '254769357320'; // 0769 357 320
    document.documentElement.classList.add('js');

    /* ---------- Sticky nav background ---------- */
    var nav = document.getElementById('nav');
    function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 12); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- Mobile menu ---------- */
    var burger = document.getElementById('burger');
    var navLinks = document.getElementById('navLinks');

    function setMenu(open) {
        navLinks.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    burger.addEventListener('click', function () {
        setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    navLinks.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

    /* ---------- Service tabs (accessible, arrow keys) ---------- */
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));

    function activate(tab, focus) {
        tabs.forEach(function (t) {
            var on = t === tab;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (p) {
            var on = p.id === 'panel-' + tab.dataset.target;
            p.hidden = !on;
            p.classList.toggle('active', on);
        });
        if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { activate(tab); });
        tab.addEventListener('keydown', function (e) {
            var next = null;
            if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
            if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
            if (e.key === 'Home') next = tabs[0];
            if (e.key === 'End') next = tabs[tabs.length - 1];
            if (next) { e.preventDefault(); activate(next, true); }
        });
    });

    /* ---------- Cursor spotlight on cards ---------- */
    document.addEventListener('pointermove', function (e) {
        var el = e.target.closest && e.target.closest('.spot');
        if (!el) return;
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    /* ---------- Scroll reveal ---------- */
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach(function (el, i) {
            el.style.transitionDelay = (i % 4) * 70 + 'ms';
            io.observe(el);
        });
    } else {
        reveals.forEach(function (el) { el.classList.add('in'); });
    }

    /* ---------- "Enroll" button preselects the service ---------- */
    var subject = document.getElementById('subject');
    document.querySelectorAll('[data-service]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            Array.prototype.forEach.call(subject.options, function (opt) {
                if (opt.text === btn.dataset.service) subject.value = opt.value || opt.text;
            });
        });
    });

    /* ---------- Contact form → WhatsApp (really sends) ---------- */
    var form = document.getElementById('contactForm');
    var formMsg = document.getElementById('formMessage');

    function showMsg(el, text, isError) {
        el.textContent = text;
        el.classList.toggle('error', !!isError);
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var fields = [form.name, form.subject, form.message];
        var ok = true;
        fields.forEach(function (f) {
            var bad = !f.value.trim();
            f.classList.toggle('invalid', bad);
            if (bad) ok = false;
        });
        if (!ok) { showMsg(formMsg, 'Please fill in all the fields.', true); return; }

        var text =
            'Hello Cisco Printers!%0A%0A' +
            '*Name:* ' + encodeURIComponent(form.name.value.trim()) + '%0A' +
            '*Service:* ' + encodeURIComponent(form.subject.value) + '%0A' +
            '*Details:* ' + encodeURIComponent(form.message.value.trim());

        window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + text, '_blank', 'noopener');
        showMsg(formMsg, 'Opening WhatsApp… press send there to complete your order.');
        form.reset();
        if (window.gtag) gtag('event', 'contact_whatsapp_submit');
    });
    form.addEventListener('input', function (e) { e.target.classList.remove('invalid'); });

    /* ---------- Newsletter (placeholder until a service is connected) ---------- */
    var news = document.getElementById('newsletter');
    var newsMsg = document.getElementById('newsMessage');
    news.addEventListener('submit', function (e) {
        e.preventDefault();
        // TODO: connect to Mailchimp / Brevo / Formspree. Until then, don't claim it's subscribed.
        var email = document.getElementById('newsEmail').value.trim();
        var url = 'mailto:info@ciscoprinters.co.ke?subject=' + encodeURIComponent('Subscribe me to updates') +
                  '&body=' + encodeURIComponent('Please add me to your updates list: ' + email);
        window.location.href = url;
        showMsg(newsMsg, 'Opening your email app to confirm…');
    });
})();
