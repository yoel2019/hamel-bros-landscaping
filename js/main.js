const SUPABASE_URL = 'https://jrgzenkcimujewydqflq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_scV6_vg_8Nmf3Y2p4hbPPw_SiJB-NZN';
const MOBILE_NAV_BREAKPOINT = 1050;
const MOBILE_FOOTER_BREAKPOINT = 820;

function initMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.navbar__menu');
  const inner = document.querySelector('.navbar__inner');
  if (!toggle || !menu || !inner || toggle.dataset.menuReady) return;
  toggle.dataset.menuReady = 'true';

  menu.id = menu.id || 'site-menu';
  toggle.setAttribute('aria-controls', menu.id);

  const setActive = () => {
    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    menu.querySelectorAll('a[href]').forEach((link) => {
      const raw = link.getAttribute('href') || '';
      const target = raw.split('#')[0].split('?')[0].split('/').pop().toLowerCase() || 'index.html';
      const active = target === current;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  const close = (restoreFocus = false) => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('menu-open');
    if (restoreFocus) toggle.focus();
  };

  const open = () => {
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('menu-open');
  };

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    menu.classList.contains('is-open') ? close() : open();
  });

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });

  document.addEventListener('click', (event) => {
    if (menu.classList.contains('is-open') && !menu.contains(event.target) && !toggle.contains(event.target)) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) close(true);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > MOBILE_NAV_BREAKPOINT) close();
  }, { passive: true });

  setActive();
}

function initViewCards() {
  const serviceDetails = {
    Maintenance: 'Spring & fall cleanups; edging & mulching; weeding; lawn care; fertilizing; lawn renovations; new lawn installations; aeration; de-thatching; seeding; trimming of trees and shrubs.',
    'Planting & design': 'Installation of trees, shrubs and perennials, plus landscape design services tailored to the property.',
    Commercial: 'Complete grounds maintenance plus snow management, snowplowing, shoveling, melting/de-icing and snow removal.',
    'Other landscape work': 'Bobcat/backhoe work, shrub and stump removal, land clearing and re-grading.'
  };

  // Only service-detail cards become expandable. CTAs such as "Request an estimate"
  // remain normal links and are never intercepted by the view-card behavior.
  document.querySelectorAll('.service-grid .service-card[href^="services.html#"]').forEach((original) => {
    if (original.dataset.viewCard) return;
    const summary = original.querySelector('p');
    if (!summary) return;

    const destination = original.getAttribute('href');
    const card = document.createElement('article');
    [...original.attributes].forEach((attribute) => {
      if (attribute.name !== 'href') card.setAttribute(attribute.name, attribute.value);
    });
    while (original.firstChild) card.appendChild(original.firstChild);
    original.replaceWith(card);

    card.dataset.viewCard = 'true';
    card.classList.add('view-card');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'group');

    const title = card.querySelector('h3, h2')?.textContent.trim() || '';
    const detail = document.createElement('div');
    detail.className = 'view-card__detail';
    const detailId = `service-detail-${Math.random().toString(36).slice(2, 9)}`;
    detail.id = detailId;
    detail.innerHTML = serviceDetails[title]
      ? `<ul>${serviceDetails[title].split(';').map((item) => `<li>${item}</li>`).join('')}</ul>`
      : '';

    const action = document.createElement('a');
    action.className = 'view-card__action';
    action.href = destination;
    action.innerHTML = 'View service <span aria-hidden="true">→</span>';
    action.setAttribute('aria-label', `View ${title} service details`);
    detail.appendChild(action);
    card.appendChild(detail);

    const toggle = document.createElement('button');
    toggle.className = 'view-card__toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', detailId);
    toggle.textContent = 'Show details →';
    card.appendChild(toggle);

    const setOpen = (openState) => {
      card.classList.toggle('is-open', openState);
      toggle.setAttribute('aria-expanded', String(openState));
      toggle.textContent = openState ? 'Hide details ↑' : 'Show details →';
    };

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(!card.classList.contains('is-open'));
    });

    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      setOpen(!card.classList.contains('is-open'));
    });

    card.addEventListener('keydown', (event) => {
      if (event.target !== card) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(!card.classList.contains('is-open'));
      }
      if (event.key === 'Escape' && card.classList.contains('is-open')) setOpen(false);
    });
  });
}

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((element) => element.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  items.forEach((element) => observer.observe(element));
}

function initFooterAccordion() {
  const groups = [...document.querySelectorAll('.footer__top > div:not(.footer__brand)')];
  if (!groups.length) return;

  groups.forEach((group, index) => {
    const title = group.querySelector('h3');
    const list = group.querySelector('ul');
    if (!title || !list || group.dataset.footerReady) return;
    group.dataset.footerReady = 'true';
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    title.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
    if (index === 0) group.classList.add('is-open');

    const toggle = () => {
      if (window.innerWidth > MOBILE_FOOTER_BREAKPOINT) return;
      const open = group.classList.toggle('is-open');
      title.setAttribute('aria-expanded', String(open));
    };

    title.addEventListener('click', toggle);
    title.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
  });

  const sync = () => groups.forEach((group, index) => {
    const title = group.querySelector('h3');
    if (!title) return;
    if (window.innerWidth > MOBILE_FOOTER_BREAKPOINT) {
      group.classList.add('is-open');
      title.setAttribute('aria-expanded', 'true');
    } else if (index !== 0) {
      group.classList.remove('is-open');
      title.setAttribute('aria-expanded', 'false');
    }
  });

  window.addEventListener('resize', sync, { passive: true });
  sync();
}

function initGalleryLightbox() {
  const cards = [...document.querySelectorAll('.gallery-card')];
  if (!cards.length || document.getElementById('gallery-lightbox')) return;

  const lightbox = document.createElement('div');
  lightbox.className = 'gallery-lightbox';
  lightbox.id = 'gallery-lightbox';
  lightbox.setAttribute('aria-hidden', 'true');
  lightbox.innerHTML = `
    <div class="gallery-lightbox__stage" role="dialog" aria-modal="true" aria-label="Gallery photo viewer">
      <button class="gallery-lightbox__close" type="button" aria-label="Close photo viewer"><i class="fa-solid fa-xmark"></i></button>
      <button class="gallery-lightbox__prev" type="button" aria-label="Previous photo"><i class="fa-solid fa-chevron-left"></i></button>
      <img class="gallery-lightbox__image" alt="">
      <button class="gallery-lightbox__next" type="button" aria-label="Next photo"><i class="fa-solid fa-chevron-right"></i></button>
      <div class="gallery-lightbox__caption" aria-live="polite"></div>
    </div>`;
  document.body.appendChild(lightbox);

  const image = lightbox.querySelector('.gallery-lightbox__image');
  const caption = lightbox.querySelector('.gallery-lightbox__caption');
  const previous = lightbox.querySelector('.gallery-lightbox__prev');
  const next = lightbox.querySelector('.gallery-lightbox__next');
  const closeButton = lightbox.querySelector('.gallery-lightbox__close');
  let index = 0;
  let touchX = 0;
  let lastFocused = null;

  const title = (card) => card.querySelector('.gallery-card__copy strong')?.textContent.trim() || '';
  const show = (nextIndex) => {
    index = (nextIndex + cards.length) % cards.length;
    const source = cards[index].querySelector('img');
    if (!source) return;
    image.src = source.currentSrc || source.src;
    image.alt = source.alt || title(cards[index]);
    caption.textContent = '';
    const label = document.createElement('span');
    label.textContent = title(cards[index]);
    const counter = document.createElement('span');
    counter.className = 'gallery-lightbox__counter';
    counter.textContent = `${index + 1} / ${cards.length}`;
    caption.append(label, counter);
  };

  const open = (nextIndex) => {
    lastFocused = document.activeElement;
    show(nextIndex);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-open');
    closeButton.focus();
  };

  const close = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gallery-open');
    image.removeAttribute('src');
    lastFocused?.focus?.();
  };

  cards.forEach((card, cardIndex) => {
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Open ${title(card) || 'gallery'} photo`);
    card.addEventListener('click', (event) => {
      event.preventDefault();
      open(cardIndex);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(cardIndex);
      }
    });
  });

  closeButton.addEventListener('click', close);
  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) close(); });
  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });
  lightbox.addEventListener('touchstart', (event) => { touchX = event.changedTouches[0].screenX; }, { passive: true });
  lightbox.addEventListener('touchend', (event) => {
    const delta = event.changedTouches[0].screenX - touchX;
    if (Math.abs(delta) > 45) show(delta < 0 ? index + 1 : index - 1);
  }, { passive: true });
}

function initImageFallbacks() {
  document.querySelectorAll('img[data-fallback-src]').forEach((image) => {
    if (image.dataset.fallbackReady) return;
    image.dataset.fallbackReady = 'true';
    image.addEventListener('error', () => {
      const fallback = image.dataset.fallbackSrc;
      if (!fallback || image.dataset.fallbackUsed) return;
      image.dataset.fallbackUsed = 'true';
      image.src = fallback;
    });
  });
}

async function submitContact(form) {
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type="submit"]');
  if (!status || !button || form.dataset.submitting === 'true') return;
  form.dataset.submitting = 'true';

  const original = button.textContent;
  status.className = 'form-status';
  status.textContent = 'Sending…';
  button.disabled = true;

  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch(`${SUPABASE_URL}/rest/v1/contact_submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || null,
        city: data.city,
        service: data.service || null,
        message: data.message,
        source: data.source || 'Website'
      })
    });

    if (!response.ok) throw new Error(await response.text());
    form.reset();
    status.textContent = 'Thanks — your request has been received. We’ll be in touch.';
    status.className = 'form-status success';
  } catch (error) {
    console.error(error);
    status.textContent = 'We could not send the form right now. Please call 508-647-0003.';
    status.className = 'form-status error';
  } finally {
    button.disabled = false;
    button.textContent = original;
    form.dataset.submitting = 'false';
  }
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form || form.dataset.contactReady) return;
  form.dataset.contactReady = 'true';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (form.reportValidity()) submitContact(form);
  });
}

function initPublicWebsite() {
  if (document.documentElement.dataset.publicWebInitialized === 'true') return;
  document.documentElement.dataset.publicWebInitialized = 'true';

  initMenu();
  initViewCards();
  initReveal();
  initFooterAccordion();
  initGalleryLightbox();
  initImageFallbacks();
  initContactForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPublicWebsite, { once: true });
} else {
  initPublicWebsite();
}
