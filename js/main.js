const SUPABASE_URL = 'https://jrgzenkcimujewydqflq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_scV6_vg_8Nmf3Y2p4hbPPw_SiJB-NZN';

function loadBrandFixes() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/brand-fixes.css';
  document.head.appendChild(link);
}

function initMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.navbar__menu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i * 45, 260)}ms`;
    observer.observe(el);
  });
}

async function submitContact(form) {
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type="submit"]');
  const original = button.textContent;
  status.textContent = 'Sending…';
  status.className = 'form-status';
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
  }
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    submitContact(form);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadBrandFixes();
  initMenu();
  initReveal();
  initContactForm();
});
