/* ==========================================================================
   SODDI FITNESS — interactions
   Everything degrades gracefully: if GSAP or Lenis fail to load from the CDN,
   the page still renders, scrolls and works. Motion is skipped for users who
   ask for reduced motion.
   ========================================================================== */

(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const html = document.documentElement;

  const HAS_GSAP   = typeof window.gsap !== 'undefined';
  const HAS_ST     = HAS_GSAP && typeof window.ScrollTrigger !== 'undefined';
  const HAS_LENIS  = typeof window.Lenis !== 'undefined';
  const REDUCED    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ANIMATE    = HAS_GSAP && !REDUCED;

  // No GSAP (offline / blocked CDN) → drop the hidden start states.
  if (!ANIMATE) html.classList.remove('js-anim');
  if (HAS_ST) gsap.registerPlugin(ScrollTrigger);

  /* ----------------------------------------------------------------------
     1. Smooth scrolling (Lenis) synced to ScrollTrigger
     ---------------------------------------------------------------------- */
  let lenis = null;
  if (HAS_LENIS && !REDUCED) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.6 });
    if (HAS_ST) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  } else {
    html.style.scrollBehavior = 'smooth';
  }

  const scrollTo = target => {
    if (lenis) lenis.scrollTo(target, { offset: -10, duration: 1.2 });
    else target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
  };

  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const el = $(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      closeMenu();
      scrollTo(el);
    });
  });

  /* ----------------------------------------------------------------------
     2. Text splitting — wraps every word in a mask for line-by-line reveals
     ---------------------------------------------------------------------- */
  const splitWords = el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map(w => `<span class="ln" style="display:inline-block;overflow:hidden;vertical-align:top">
                   <span class="ln-i" style="display:inline-block;will-change:transform">${w}</span>
                 </span>`)
      .join(' ');
    return $$('.ln-i', el);
  };

  /* ----------------------------------------------------------------------
     3. Preloader → hero entrance (one orchestrated opening moment)
     ---------------------------------------------------------------------- */
  const preloader = $('#preloader');
  const preNum = $('#preNum');
  const preBar = $('#preBar');

  let progress = 0;
  let pageLoaded = false;
  window.addEventListener('load', () => { pageLoaded = true; });

  const tickProgress = () => {
    const ceiling = pageLoaded ? 100 : 88;
    progress = Math.min(ceiling, progress + (ceiling - progress) * 0.08 + 0.6);
    preNum.textContent = Math.round(progress);
    preBar.style.width = progress + '%';
    if (progress > 99.4) { preNum.textContent = 100; preBar.style.width = '100%'; finish(); }
    else requestAnimationFrame(tickProgress);
  };

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    document.body.classList.remove('is-loading');

    if (!ANIMATE) { preloader.style.display = 'none'; return; }

    const tl = gsap.timeline();
    tl.to('.pre-inner, .pre-bar', { y: -24, opacity: 0, duration: .5, ease: 'power2.in' })
      .to('.pre-curtain', { y: '0%', duration: .7, ease: 'power4.inOut' }, '-=.15')
      .set(preloader, { background: 'transparent' })
      .to('.pre-curtain', {
        y: '-100%', borderRadius: '0 0 56px 56px', duration: .85, ease: 'power4.inOut',
        onComplete: () => { preloader.style.display = 'none'; }
      })
      .from('.nav', { y: -40, opacity: 0, duration: .7, ease: 'power3.out' }, '-=.55')
      .to('.hero-title .word', { y: '0%', duration: 1.05, stagger: .09, ease: 'power4.out' }, '-=.75')
      .to('.hero .anim-fade', { y: 0, opacity: 1, duration: .8, stagger: .1, ease: 'power3.out' }, '-=.7')
      .to('.hero-media-inner img', { scale: 1, duration: 1.4, ease: 'power3.out' }, '-=1.1')
      .to('.hero-foot > *', { y: 0, opacity: 1, duration: .6, stagger: .08 }, '-=.9');
  }

  if (ANIMATE) {
    gsap.set('.hero .anim-fade, .hero-foot > *', { y: 24, opacity: 0 });
  }
  requestAnimationFrame(tickProgress);
  setTimeout(finish, 6000); // hard safety net

  /* ----------------------------------------------------------------------
     4. Scroll-triggered reveals
     ---------------------------------------------------------------------- */
  if (ANIMATE && HAS_ST) {

    // Word-mask headings
    $$('.anim-lines').forEach(el => {
      const inner = splitWords(el);
      gsap.set(inner, { yPercent: 108 });
      gsap.to(inner, {
        yPercent: 0, duration: .9, stagger: .035, ease: 'power4.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });

    // Generic fade-ups, staggered per group
    const groups = [
      ['.stat-card', .08], ['.steps li', .1], ['.t-step', .1],
      ['.price-card', .1], ['.acc-item', .06], ['.w-card', .1]
    ];
    groups.forEach(([sel, stagger]) => {
      const items = $$(sel);
      if (!items.length) return;
      gsap.set(items, { y: 40, opacity: 0 });
      gsap.to(items, {
        y: 0, opacity: 1, duration: .9, stagger, ease: 'power3.out',
        scrollTrigger: { trigger: items[0].parentElement, start: 'top 82%' }
      });
    });

    // Program cards live inside a pinned track, so they key off the section
    const pCards = $$('.p-card');
    if (pCards.length) {
      gsap.set(pCards, { y: 50, opacity: 0 });
      gsap.to(pCards, {
        y: 0, opacity: 1, duration: .9, stagger: .09, ease: 'power3.out',
        scrollTrigger: { trigger: '.programs', start: 'top 62%' }
      });
    }

    $$('.anim-fade').forEach(el => {
      if (el.closest('.hero')) return;
      gsap.fromTo(el, { y: 26, opacity: 0 }, {
        y: 0, opacity: 1, duration: .8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    // Image scale-out reveals
    $$('[data-reveal-img] img').forEach(img => {
      gsap.to(img, {
        scale: 1, duration: 1.4, ease: 'power3.out',
        scrollTrigger: { trigger: img, start: 'top 90%' }
      });
    });

    // Parallax
    $$('[data-parallax]').forEach(img => {
      const amt = parseFloat(img.dataset.parallax) || 12;
      gsap.fromTo(img, { yPercent: -amt / 2 }, {
        yPercent: amt / 2, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Counters
    $$('[data-count]').forEach(el => {
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || '';
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
        onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; }
      });
    });

    // Timeline progress line
    const fill = $('#timelineFill');
    if (fill) {
      gsap.to(fill, {
        height: '100%', ease: 'none',
        scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 80%', scrub: .5 }
      });
    }

    // Footer wordmark drift
    gsap.fromTo('#footMark', { yPercent: 18 }, {
      yPercent: -6, ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
  }

  /* ----------------------------------------------------------------------
     5. Programs — pinned horizontal scroll (desktop only)
     ---------------------------------------------------------------------- */
  const track = $('#programsTrack');
  if (ANIMATE && HAS_ST && track) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1101px)', () => {
      const distance = () => Math.max(0, track.scrollWidth - track.offsetWidth + 40);
      if (distance() < 60) return;

      const tween = gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: {
          trigger: '.programs',
          start: 'top top+=60',
          end: () => '+=' + distance() * 1.25,
          pin: true,
          scrub: .8,
          invalidateOnRefresh: true,
          anticipatePin: 1
        }
      });
      return () => tween.scrollTrigger && tween.scrollTrigger.kill();
    });
  }

  /* ----------------------------------------------------------------------
     6. Marquee — infinite loop that reacts to scroll speed
     ---------------------------------------------------------------------- */
  const marquee = $('#marquee');
  if (marquee && !REDUCED) {
    let x = 0, boost = 0, half = marquee.scrollWidth / 2, last = performance.now();
    window.addEventListener('resize', () => { half = marquee.scrollWidth / 2; });

    if (HAS_ST) {
      ScrollTrigger.create({
        trigger: marquee, start: 'top bottom', end: 'bottom top',
        onUpdate: self => { boost = gsap.utils.clamp(-14, 14, self.getVelocity() / 260); }
      });
    }
    const loop = now => {
      const dt = Math.min(48, now - last); last = now;
      x -= (0.55 + boost) * (dt / 16.67);
      boost *= 0.94;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      marquee.style.transform = `translate3d(${x}px,0,0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ----------------------------------------------------------------------
     7. Cursor, magnetic buttons, card tilt (pointer devices only)
     ---------------------------------------------------------------------- */
  const finePointer = window.matchMedia('(pointer:fine)').matches;

  if (finePointer && !REDUCED) {
    const cursor = $('#cursor');
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;

    window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; cursor.style.opacity = 1; });
    const follow = () => {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);

    $$('a, button, .p-card, .w-card, .price-card').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });

    // Magnetic pull
    $$('.magnetic').forEach(el => {
      const move = e => {
        const r = el.getBoundingClientRect();
        const mx = (e.clientX - r.left - r.width / 2) * .28;
        const my = (e.clientY - r.top - r.height / 2) * .38;
        if (HAS_GSAP) gsap.to(el, { x: mx, y: my, duration: .45, ease: 'power3.out' });
        else el.style.transform = `translate(${mx}px,${my}px)`;
      };
      const reset = () => {
        if (HAS_GSAP) gsap.to(el, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1,.4)' });
        else el.style.transform = '';
      };
      el.addEventListener('mousemove', move);
      el.addEventListener('mouseleave', reset);
    });

    // Subtle 3D tilt
    if (HAS_GSAP) {
      $$('.tilt').forEach(el => {
        el.style.transformStyle = 'preserve-3d';
        el.addEventListener('mousemove', e => {
          const r = el.getBoundingClientRect();
          gsap.to(el, {
            rotateY: ((e.clientX - r.left) / r.width - .5) * 7,
            rotateX: ((e.clientY - r.top) / r.height - .5) * -7,
            transformPerspective: 900, duration: .5, ease: 'power2.out'
          });
        });
        el.addEventListener('mouseleave', () => {
          gsap.to(el, { rotateX: 0, rotateY: 0, duration: .8, ease: 'power3.out' });
        });
      });
    }
  }

  /* ----------------------------------------------------------------------
     8. Navigation — sticky state, hide on scroll down, progress bar
     ---------------------------------------------------------------------- */
  const nav = $('#nav');
  const bar = $('#progressBar');
  const wa = $('.wa-float');
  let lastY = 0;

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.body.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

    nav.classList.toggle('is-stuck', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > 320 && !document.body.classList.contains('menu-open'));
    wa.classList.toggle('is-in', y > 600);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----------------------------------------------------------------------
     9. Mobile menu
     ---------------------------------------------------------------------- */
  const burger = $('#burger');
  const overlay = $('#menuOverlay');

  function closeMenu() {
    burger.classList.remove('is-open');
    overlay.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (lenis) lenis.start();
  }
  burger.addEventListener('click', () => {
    const open = !overlay.classList.contains('is-open');
    burger.classList.toggle('is-open', open);
    overlay.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ----------------------------------------------------------------------
     10. Accordion — animates the height so the change is visible
     ---------------------------------------------------------------------- */
  const setPanel = (item, open) => {
    const panel = $('.acc-panel', item);
    item.classList.toggle('is-open', open);
    $('button', item).setAttribute('aria-expanded', String(open));
    panel.style.height = open ? panel.scrollHeight + 'px' : '0px';
  };

  $$('.acc-item').forEach(item => {
    setPanel(item, item.classList.contains('is-open'));
    $('button', item).addEventListener('click', () => {
      const willOpen = !item.classList.contains('is-open');
      $$('.acc-item').forEach(o => setPanel(o, false));
      setPanel(item, willOpen);
      if (HAS_ST) setTimeout(() => ScrollTrigger.refresh(), 500);
    });
  });
  window.addEventListener('resize', () => {
    $$('.acc-item.is-open').forEach(i => setPanel(i, true));
  });

  /* ----------------------------------------------------------------------
     11. Testimonial slider
     ---------------------------------------------------------------------- */
  const slides = $$('.v-slide');
  const dots = $$('#voiceNav button');
  let idx = 0, timer;

  const go = i => {
    idx = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === idx));
    dots.forEach((d, n) => d.classList.toggle('is-active', n === idx));
  };
  const play = () => { clearInterval(timer); timer = setInterval(() => go(idx + 1), 5200); };

  dots.forEach((d, i) => d.addEventListener('click', () => { go(i); play(); }));
  if (slides.length) play();

  /* ----------------------------------------------------------------------
     12. Misc
     ---------------------------------------------------------------------- */
  $('#year').textContent = new Date().getFullYear();

  if (HAS_ST) {
    window.addEventListener('load', () => ScrollTrigger.refresh());
    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
