/* ============================================================
   js/main.js — Heirloom Outdoor Services
   Shared interactive logic across all pages.
   All handlers are defensive: if an element isn't on the page,
   its initializer simply returns without error.
   ============================================================ */

(function () {
  'use strict';

  /* ===================== HELPERS ===================== */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /**
   * Safely set text content (never innerHTML) — prevents XSS from
   * any dynamic string that might originate from user input.
   */
  function setText(el, text) {
    if (!el) return;
    el.textContent = String(text == null ? '' : text);
  }

  /**
   * Basic client-side sanitizer for values we intend to echo back
   * to the DOM (e.g., "Thanks, Jane —" success messages).
   */
  function sanitize(input) {
    return String(input == null ? '' : input)
      .replace(/[<>]/g, '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim();
  }

  /* ===================== 1. CURRENT YEAR ===================== */
  function initYear() {
    const year = String(new Date().getFullYear());
    $$('.js-year').forEach((el) => setText(el, year));
  }

  /* ===================== 2. STICKY HEADER ===================== */
  function initStickyHeader() {
    const header = $('#site-header');
    if (!header) return;

    let ticking = false;
    const update = () => {
      const y = window.scrollY || window.pageYOffset;
      header.classList.toggle('is-scrolled', y > 20);
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  /* ===================== 3. MOBILE NAV ===================== */
  function initMobileNav() {
    const toggle = $('#nav-toggle');
    const nav    = $('#primary-navigation');
    const scrim  = $('#nav-scrim');
    if (!toggle || !nav || !scrim) return;

    const openNav = () => {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close navigation menu');
      scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add('is-visible'));
      document.body.classList.add('is-locked');

      const firstLink = nav.querySelector('a, button');
      if (firstLink) firstLink.focus({ preventScroll: true });
    };

    const closeNav = () => {
      if (!nav.classList.contains('is-open')) return;
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
      scrim.classList.remove('is-visible');
      document.body.classList.remove('is-locked');
      window.setTimeout(() => { scrim.hidden = true; }, 250);
      toggle.focus({ preventScroll: true });
    };

    toggle.addEventListener('click', () => {
      if (nav.classList.contains('is-open')) closeNav();
      else openNav();
    });

    scrim.addEventListener('click', closeNav);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) closeNav();
    });

    // Close when a nav link is activated
    $$('a', nav).forEach((link) => {
      link.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 820px)').matches) closeNav();
      });
    });

    // Close on resize to desktop
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!window.matchMedia('(max-width: 820px)').matches) closeNav();
      }, 160);
    });
  }

  /* ===================== 4. SMOOTH ANCHOR SCROLL ===================== */
  function initSmoothScroll() {
    const header = $('#site-header');

    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || href.length < 2) return;

        const target = document.getElementById(href.slice(1));
        if (!target) return;

        e.preventDefault();

        const headerH = header ? header.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerH - 12;

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });

        // Update the hash without jumping
        if (history.pushState) history.pushState(null, '', href);

        // Move focus for accessibility
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  }

  /* ===================== 5. REVEAL ON SCROLL ===================== */
  function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    items.forEach((el) => observer.observe(el));
  }

  /* ===================== 6. FAQ ACCORDION ===================== */
  function initFaq() {
    const items = $$('.faq-item');
    if (!items.length) return;

    items.forEach((item) => {
      const trigger = item.querySelector('.faq-item__trigger');
      const panel   = item.querySelector('.faq-item__panel');
      if (!trigger || !panel) return;

      trigger.addEventListener('click', () => {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';

        // Close all others (single-open accordion)
        items.forEach((other) => {
          if (other === item) return;
          const otherTrigger = other.querySelector('.faq-item__trigger');
          const otherPanel   = other.querySelector('.faq-item__panel');
          if (!otherTrigger || !otherPanel) return;
          otherTrigger.setAttribute('aria-expanded', 'false');
          otherPanel.hidden = true;
          other.classList.remove('is-open');
        });

        // Toggle current
        if (isOpen) {
          trigger.setAttribute('aria-expanded', 'false');
          panel.hidden = true;
          item.classList.remove('is-open');
        } else {
          trigger.setAttribute('aria-expanded', 'true');
          panel.hidden = false;
          item.classList.add('is-open');
        }
      });
    });

    // Keyboard: allow arrow keys to move between triggers
    const triggers = items
      .map((i) => i.querySelector('.faq-item__trigger'))
      .filter(Boolean);

    triggers.forEach((trigger, index) => {
      trigger.addEventListener('keydown', (e) => {
        let nextIndex = null;
        if (e.key === 'ArrowDown') nextIndex = (index + 1) % triggers.length;
        if (e.key === 'ArrowUp')   nextIndex = (index - 1 + triggers.length) % triggers.length;
        if (e.key === 'Home')      nextIndex = 0;
        if (e.key === 'End')       nextIndex = triggers.length - 1;
        if (nextIndex === null) return;
        e.preventDefault();
        triggers[nextIndex].focus();
      });
    });
  }

  /* ===================== 7. GALLERY LIGHTBOX ===================== */
  function initLightbox() {
    const lightbox  = $('#lightbox');
    const imageEl   = $('#lightbox-image');
    const captionEl = $('#lightbox-caption');
    const closeBtn  = $('#lightbox-close');
    const prevBtn   = $('#lightbox-prev');
    const nextBtn   = $('#lightbox-next');
    const buttons   = $$('.gallery__button');

    if (!lightbox || !imageEl || !buttons.length) return;

    let currentIndex = 0;
    let lastFocused = null;

    const getData = (btn) => ({
      src: btn.getAttribute('data-full') || '',
      caption: btn.getAttribute('data-caption') || '',
      alt: (btn.querySelector('img') && btn.querySelector('img').alt) || ''
    });

    const render = (index) => {
      const btn = buttons[index];
      if (!btn) return;
      const data = getData(btn);

      imageEl.src = data.src;
      imageEl.alt = data.alt;
      setText(captionEl, data.caption);
      currentIndex = index;
    };

    const open = (index) => {
      lastFocused = document.activeElement;
      render(index);
      lightbox.hidden = false;
      document.body.classList.add('is-locked');
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    };

    const close = () => {
      lightbox.hidden = true;
      document.body.classList.remove('is-locked');
      imageEl.src = '';
      imageEl.alt = '';
      setText(captionEl, '');
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus({ preventScroll: true });
      }
    };

    const next = () => render((currentIndex + 1) % buttons.length);
    const prev = () => render((currentIndex - 1 + buttons.length) % buttons.length);

    buttons.forEach((btn, index) => {
      btn.addEventListener('click', () => open(index));
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (nextBtn)  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); next(); });
    if (prevBtn)  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prev(); });

    // Click on backdrop closes
    $$('[data-lightbox-close]', lightbox).forEach((el) => {
      el.addEventListener('click', close);
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape')     { e.preventDefault(); close(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
    });
  }

  /* ===================== 8. CONTACT FORM ===================== */
  function initContactForm() {
    const form = $('#contact-form-el');
    if (!form) return;

    const statusEl = $('#form-status');
    const submitBtn = $('#submit-button');

    const validators = {
      fullName(value) {
        const v = value.trim();
        if (!v) return 'Please enter your full name.';
        if (v.length < 2) return 'Name must be at least 2 characters.';
        if (v.length > 80) return 'Name must be under 80 characters.';
        return '';
      },
      email(value) {
        const v = value.trim();
        if (!v) return 'Please enter your email address.';
        // RFC-lite pattern: safe, no catastrophic backtracking
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!re.test(v)) return 'Please enter a valid email address.';
        if (v.length > 120) return 'Email must be under 120 characters.';
        return '';
      },
      phone(value) {
        const v = value.trim();
        if (!v) return ''; // optional
        const digits = v.replace(/\D/g, '');
        if (digits.length < 10) return 'Please enter a 10-digit phone number.';
        if (digits.length > 15) return 'Phone number is too long.';
        return '';
      },
      service(value) {
        if (!value) return 'Please select a service.';
        return '';
      },
      message(value) {
        const v = value.trim();
        if (!v) return 'Please describe your project.';
        if (v.length < 10) return 'Please provide at least 10 characters.';
        if (v.length > 1200) return 'Message must be under 1200 characters.';
        return '';
      },
      consent(checked) {
        if (!checked) return 'Please confirm you agree to be contacted.';
        return '';
      }
    };

    const fieldMap = {
      fullName: { input: $('#full-name'), error: $('#full-name-error') },
      email:    { input: $('#email'),     error: $('#email-error') },
      phone:    { input: $('#phone'),     error: $('#phone-error') },
      service:  { input: $('#service'),   error: $('#service-error') },
      message:  { input: $('#message'),   error: $('#message-error') },
      consent:  { input: $('#consent'),   error: $('#consent-error') }
    };

    function validateField(name) {
      const entry = fieldMap[name];
      if (!entry || !entry.input) return true;

      const input = entry.input;
      const value = input.type === 'checkbox' ? input.checked : input.value;
      const errorMsg = validators[name](value);

      if (errorMsg) {
        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        setText(entry.error, errorMsg);
        return false;
      }

      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      setText(entry.error, '');
      return true;
    }

    // Live validation on blur / change
    Object.keys(fieldMap).forEach((name) => {
      const entry = fieldMap[name];
      if (!entry || !entry.input) return;
      const evt = (entry.input.type === 'checkbox' || entry.input.tagName === 'SELECT')
        ? 'change' : 'blur';
      entry.input.addEventListener(evt, () => validateField(name));
    });

    // Clear error as the user corrects it
    Object.keys(fieldMap).forEach((name) => {
      const entry = fieldMap[name];
      if (!entry || !entry.input) return;
      entry.input.addEventListener('input', () => {
        if (entry.input.classList.contains('is-invalid')) validateField(name);
      });
    });

    function setStatus(message, type) {
      if (!statusEl) return;
      statusEl.classList.remove('is-success', 'is-error');
      setText(statusEl, message);
      if (type) statusEl.classList.add('is-' + type);
    }

    function focusFirstError() {
      const firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid && typeof firstInvalid.focus === 'function') {
        firstInvalid.focus({ preventScroll: false });
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // 1. Honeypot check — bots fill this hidden field
      const honeypot = $('#website');
      if (honeypot && honeypot.value.trim() !== '') {
        // Silently pretend success so bots don't retry
        setStatus('Thank you. Your request has been received.', 'success');
        form.reset();
        return;
      }

      // 2. Validate all fields
      const results = Object.keys(fieldMap).map((name) => validateField(name));
      const allValid = results.every(Boolean);

      if (!allValid) {
        setStatus('Please correct the highlighted fields and try again.', 'error');
        focusFirstError();
        return;
      }

      // 3. Simulate submission (replace with real endpoint or Netlify/CF form action)
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }
      setStatus('Sending your request…', null);

      window.setTimeout(() => {
        const nameInput = $('#full-name');
        const safeName = sanitize(nameInput ? nameInput.value : '');
        const firstName = safeName.split(/\s+/)[0] || 'there';

        setStatus(
          'Thank you, ' + firstName +
          '. Your request has been received — we\u2019ll follow up within one business day.',
          'success'
        );

        form.reset();
        Object.keys(fieldMap).forEach((name) => {
          const entry = fieldMap[name];
          if (!entry) return;
          if (entry.input) {
            entry.input.classList.remove('is-invalid');
            entry.input.removeAttribute('aria-invalid');
          }
          setText(entry.error, '');
        });

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send My Request';
        }

        if (statusEl) {
          statusEl.setAttribute('tabindex', '-1');
          statusEl.focus({ preventScroll: true });
        }
      }, 700);
    });
  }

  /* ===================== 9. COOKIE BANNER ===================== */
  function initCookieBanner() {
    const banner   = $('#cookie-banner');
    const acceptBtn = $('#cookie-accept');
    const declineBtn = $('#cookie-decline');
    if (!banner) return;

    const STORAGE_KEY = 'heirloom_cookie_consent';

    let stored = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      stored = null; // storage blocked — show banner each visit
    }

    if (stored === 'accepted' || stored === 'declined') return;

    // Slight delay so it doesn't compete with initial paint
    window.setTimeout(() => {
      banner.hidden = false;
    }, 1200);

    const dismiss = (value) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, value);
      } catch (err) { /* storage unavailable — ignore */ }
      banner.hidden = true;
    };

    if (acceptBtn)  acceptBtn.addEventListener('click', () => dismiss('accepted'));
    if (declineBtn) declineBtn.addEventListener('click', () => dismiss('declined'));
  }

  /* ===================== 10. BACK TO TOP ===================== */
  function initBackToTop() {
    const btn = $('#back-to-top');
    if (!btn) return;

    let ticking = false;
    const update = () => {
      const y = window.scrollY || window.pageYOffset;
      const show = y > 500;
      if (show) {
        btn.hidden = false;
        requestAnimationFrame(() => btn.classList.add('is-visible'));
      } else {
        btn.classList.remove('is-visible');
        window.setTimeout(() => {
          if (!btn.classList.contains('is-visible')) btn.hidden = true;
        }, 220);
      }
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    btn.addEventListener('click', () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });

    update();
  }

  /* ===================== HERO BACKGROUND VIDEO ===================== */
function initHeroVideo() {
  const video  = document.getElementById('hero-video');
  const toggle = document.getElementById('hero-video-toggle');
  if (!video) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // --- Respect reduced motion ---
  if (reduceMotion.matches) {
    video.removeAttribute('autoplay');
    video.pause();
    if (toggle) toggle.hidden = true;
    return;
  }

  // --- Respect Data Saver / slow connections ---
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && (conn.saveData === true || /^(slow-)?2g$/.test(conn.effectiveType || ''))) {
    video.removeAttribute('autoplay');
    video.pause();
    // Drop the sources so the browser stops fetching bytes
    video.querySelectorAll('source').forEach((s) => s.remove());
    video.load(); // resets to poster frame
    if (toggle) toggle.hidden = true;
    return;
  }

  // --- Wire up the pause / play control ---
  if (toggle) {
    // Only show the control if the video actually started
    const revealToggle = () => { toggle.hidden = false; };

    if (!video.paused) {
      revealToggle();
    } else {
      video.addEventListener('playing', revealToggle, { once: true });
    }

    toggle.addEventListener('click', () => {
      if (video.paused) {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        toggle.setAttribute('aria-pressed', 'false');
        toggle.setAttribute('aria-label', 'Pause background video');
      } else {
        video.pause();
        toggle.setAttribute('aria-pressed', 'true');
        toggle.setAttribute('aria-label', 'Play background video');
      }
    });
  }

  // --- Pause when the hero scrolls out of view (saves CPU/battery) ---
  if ('IntersectionObserver' in window) {
    const hero = video.closest('.hero');
    if (hero) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!video.paused) return;
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.15 });
      io.observe(hero);
    }
  }

  // --- iOS/Safari fallback: retry play on first user gesture ---
  const p = video.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => {
      const resume = () => {
        const rp = video.play();
        if (rp && typeof rp.catch === 'function') rp.catch(() => {});
        document.removeEventListener('touchstart', resume);
        document.removeEventListener('click', resume);
      };
      document.addEventListener('touchstart', resume, { once: true, passive: true });
      document.addEventListener('click', resume, { once: true });
    });
  }
}

  /* ===================== 11. FOOTER LINKS TO SECTIONS ===================== */
  function initFooterServiceLinks() {
    // On pages without a #services section, redirect footer service links
    // to the services page instead of a dead anchor.
    if (document.getElementById('services')) return;
    $$('a[href="#services"]').forEach((link) => {
      link.setAttribute('href', 'services.html');
    });
  }

  /* ===================== INIT ===================== */
  function init() {
    initYear();
    initStickyHeader();
    initMobileNav();
    initHeroVideo();
    initSmoothScroll();
    initReveal();
    initFaq();
    initLightbox();
    initContactForm();
    initCookieBanner();
    initBackToTop();
    initFooterServiceLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();