/* ============================================================
   HAMEL BROS. LANDSCAPING — Main JavaScript
   Features:
   - Intersection Observer (scroll animations + lazy load)
   - Navbar scroll behavior
   - Mobile menu toggle
   - Animated stat counters
   - Active nav link detection
   Author: AI Agent | March 2026
   ============================================================ */

/* ============================================================
   1. INTERSECTION OBSERVER — Scroll Animations
   Watches for .fade-up, .fade-left, .fade-right, .fade-in
   and adds .is-visible when they enter the viewport
   ============================================================ */
function initScrollAnimations() {
  // Options: trigger when 15% of element is visible
  const options = {
    threshold: 0.15,
    rootMargin: '0px 0px -60px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Stop observing once animated (performance)
        observer.unobserve(entry.target);
      }
    });
  }, options);

  // Observe all animated elements
  const animatedEls = document.querySelectorAll(
    '.fade-up, .fade-left, .fade-right, .fade-in'
  );
  animatedEls.forEach(el => observer.observe(el));
}

/* ============================================================
   2. LAZY LOADING — Images
   Uses Intersection Observer to load images only when
   they approach the viewport (via data-src attribute)
   ============================================================ */
function initLazyImages() {
  const lazyImages = document.querySelectorAll('img[data-src]');

  if (!lazyImages.length) return;

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        // Swap data-src → src to trigger the real load
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.add('is-loaded');
        imageObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '200px 0px' // Start loading 200px before visible
  });

  lazyImages.forEach(img => imageObserver.observe(img));
}

/* ============================================================
   3. NAVBAR — Scroll behavior & sticky shadow
   ============================================================ */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  // Add .scrolled class when user scrolls past 50px
  const handleScroll = () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Run on init
}

/* ============================================================
   4. MOBILE MENU TOGGLE
   ============================================================ */
function initMobileMenu() {
  const toggle = document.querySelector('.navbar__toggle');
  const menu   = document.querySelector('.navbar__menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);

    // Animate hamburger → X
    const bars = toggle.querySelectorAll('span');
    if (isOpen) {
      bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      bars[1].style.opacity   = '0';
      bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      bars.forEach(bar => {
        bar.style.transform = '';
        bar.style.opacity   = '';
      });
    }
  });

  // Close menu when clicking a link
  menu.querySelectorAll('.navbar__link').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', false);
      const bars = toggle.querySelectorAll('span');
      bars.forEach(bar => {
        bar.style.transform = '';
        bar.style.opacity   = '';
      });
    });
  });

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', false);
      const bars = toggle.querySelectorAll('span');
      bars.forEach(bar => {
        bar.style.transform = '';
        bar.style.opacity   = '';
      });
    }
  });
}

/* ============================================================
   5. ACTIVE NAV LINK — Highlight current page
   ============================================================ */
function initActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.navbar__link');

  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/* ============================================================
   6. STAT COUNTERS — Animate numbers when visible
   Looks for elements with data-target attribute
   e.g. <span class="stat-card__number" data-target="25">0</span>
   ============================================================ */
function initCounters() {
  const counters = document.querySelectorAll('[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const el     = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';  // e.g. '+', '%', 'K+'
      const duration = 1800; // ms
      const start    = performance.now();

      // Ease-out animation function
      const animate = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current  = Math.round(eased * target);
        el.textContent = current + suffix;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          el.textContent = target + suffix; // Ensure exact final value
        }
      };

      requestAnimationFrame(animate);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* ============================================================
   7. SMOOTH ANCHOR SCROLL
   Handles clicks on anchor links (#section)
   ============================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navHeight = document.querySelector('.navbar')?.offsetHeight || 80;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ============================================================
   8. SECTION LAZY CONTENT INJECTION
   Heavy sections (gallery) are injected into DOM
   only when the user scrolls near them
   ============================================================ */
function initLazySections() {
  const lazySections = document.querySelectorAll('[data-lazy-section]');
  if (!lazySections.length) return;

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const section = entry.target;
      const type    = section.dataset.lazySection;

      // Dispatch custom event so page-specific scripts can handle it
      section.dispatchEvent(new CustomEvent('lazy:load', { detail: { type } }));
      section.removeAttribute('data-lazy-section'); // Only trigger once
      sectionObserver.unobserve(section);
    });
  }, {
    rootMargin: '300px 0px' // Load 300px before reaching section
  });

  lazySections.forEach(section => sectionObserver.observe(section));
}

/* ============================================================
   9. GALLERY LIGHTBOX (minimal, no dependencies)
   ============================================================ */
function initLightbox() {
  const galleryItems = document.querySelectorAll('.gallery-item');
  if (!galleryItems.length) return;

  // Create lightbox overlay
  const lightbox = document.createElement('div');
  lightbox.id    = 'lightbox';
  lightbox.innerHTML = `
    <div class="lightbox__backdrop"></div>
    <div class="lightbox__content">
      <button class="lightbox__close" aria-label="Close">&times;</button>
      <button class="lightbox__prev" aria-label="Previous">&#8249;</button>
      <img class="lightbox__img" src="" alt="" />
      <button class="lightbox__next" aria-label="Next">&#8250;</button>
    </div>
  `;
  document.body.appendChild(lightbox);

  // Inject lightbox styles
  const style = document.createElement('style');
  style.textContent = `
    #lightbox { position:fixed; inset:0; z-index:9999; display:none; }
    #lightbox.active { display:flex; align-items:center; justify-content:center; }
    .lightbox__backdrop { position:absolute; inset:0; background:rgba(0,0,0,0.92); }
    .lightbox__content { position:relative; z-index:1; max-width:90vw; max-height:90vh; display:flex; align-items:center; gap:16px; }
    .lightbox__img { max-width:80vw; max-height:80vh; object-fit:contain; border-radius:12px; box-shadow:0 0 60px rgba(168,255,120,0.2); }
    .lightbox__close { position:absolute; top:-48px; right:0; width:40px; height:40px; border-radius:50%; background:rgba(255,255,255,0.1); border:none; color:#fff; font-size:24px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.2s; }
    .lightbox__close:hover { background:#a8ff78; color:#000; }
    .lightbox__prev, .lightbox__next { width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.1); border:none; color:#fff; font-size:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.2s; flex-shrink:0; }
    .lightbox__prev:hover, .lightbox__next:hover { background:#a8ff78; color:#000; }
  `;
  document.head.appendChild(style);

  const img    = lightbox.querySelector('.lightbox__img');
  const images = [...galleryItems].map(item => item.querySelector('img'));
  let currentIndex = 0;

  const open  = (index) => {
    currentIndex   = index;
    img.src        = images[index].src || images[index].dataset.src;
    img.alt        = images[index].alt;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };

  const prev = () => open((currentIndex - 1 + images.length) % images.length);
  const next = () => open((currentIndex + 1) % images.length);

  galleryItems.forEach((item, i) => item.addEventListener('click', () => open(i)));
  lightbox.querySelector('.lightbox__close').addEventListener('click', close);
  lightbox.querySelector('.lightbox__backdrop').addEventListener('click', close);
  lightbox.querySelector('.lightbox__prev').addEventListener('click', prev);
  lightbox.querySelector('.lightbox__next').addEventListener('click', next);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape')      close();
    if (e.key === 'ArrowLeft')   prev();
    if (e.key === 'ArrowRight')  next();
  });
}

/* ============================================================
   10. INIT — Run everything on DOMContentLoaded
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initLazyImages();
  initNavbar();
  initMobileMenu();
  initActiveNav();
  initCounters();
  initSmoothScroll();
  initLazySections();
  initLightbox();

  // Log for development
  console.log('%c Hamel Bros. Web — Loaded ✓', 'color:#a8ff78; font-weight:bold;');
});
