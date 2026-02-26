// ============================================================
// SWIFT SPEED SENDER — MAIN JS
// Runs on every page: nav, animations, toasts, haptics
// ============================================================

import { applySettings, logError } from './supabase.js';

// ============================================================
// PAGE LOADER
// ============================================================
function initLoader() {
  const loader = document.getElementById('page-loader');
  if (!loader) return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('fade-out');
      setTimeout(() => loader.remove(), 600);
    }, 800);
  });
}

// ============================================================
// NAVBAR
// ============================================================
function initNavbar() {
  const navbar  = document.querySelector('.navbar');
  const toggle  = document.querySelector('.navbar__toggle');
  const links   = document.querySelectorAll('.navbar__link');
  if (!navbar) return;

  // Scroll state
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu toggle
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isOpen = navbar.classList.toggle('mobile-open');
      toggle.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  // Close mobile menu on link click
  links.forEach(link => {
    link.addEventListener('click', () => {
      navbar.classList.remove('mobile-open');
      if (toggle) toggle.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // Active link
  const path = window.location.pathname;
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && path.includes(href.replace(/^\//, '').split('.')[0])) {
      link.classList.add('active');
    }
  });
  // Special case: index
  if (path === '/' || path.endsWith('index.html')) {
    links.forEach(l => {
      if (l.getAttribute('href') === 'index.html' || l.getAttribute('href') === '/') {
        l.classList.add('active');
      }
    });
  }

  // Close mobile menu on outside click
  document.addEventListener('click', e => {
    if (navbar.classList.contains('mobile-open') &&
        !navbar.contains(e.target)) {
      navbar.classList.remove('mobile-open');
      if (toggle) toggle.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

// ============================================================
// SCROLL REVEAL ANIMATIONS
// ============================================================
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .reveal-left');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
  );

  reveals.forEach(el => observer.observe(el));
}

// ============================================================
// COUNTER ANIMATION (for stats)
// ============================================================
export function animateCounter(el, target, suffix = '', duration = 1800) {
  const start = performance.now();
  const isFloat = target % 1 !== 0;

  const tick = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = isFloat
      ? (target * eased).toFixed(1)
      : Math.floor(target * eased);

    el.textContent = current.toLocaleString() + suffix;

    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el      = entry.target;
        const target  = parseFloat(el.dataset.counter);
        const suffix  = el.dataset.suffix || '';
        animateCounter(el, target, suffix);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function getToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info', duration = 4000) {
  const container = getToastContainer();
  const toast = document.createElement('div');

  const icons = {
    success: '✓',
    error:   '✕',
    info:    '●'
  };

  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span style="font-weight:700;font-size:1rem">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================
// HAPTIC FEEDBACK (mobile vibration API)
// ============================================================
export function haptic(pattern = [10]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

export const haptics = {
  light:   () => haptic([8]),
  medium:  () => haptic([15]),
  success: () => haptic([10, 50, 10]),
  error:   () => haptic([50, 30, 50]),
  select:  () => haptic([5])
};

// ============================================================
// MODAL SYSTEM
// ============================================================
export function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

export function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function initModals() {
  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  // Close button
  document.querySelectorAll('.modal__close').forEach(btn => {
    btn.addEventListener('click', () => {
      const overlay = btn.closest('.modal-overlay');
      if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  // Esc key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(overlay => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    }
  });
}

// ============================================================
// CONFIRMATION DIALOG (for admin deletes)
// ============================================================
export function confirm(message, title = 'Are you sure?') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__header">
          <h4 class="modal__title">${title}</h4>
        </div>
        <p style="margin-bottom:1.5rem;color:var(--text-mid)">${message}</p>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end">
          <button class="btn btn--outline btn--sm" id="confirm-cancel">Cancel</button>
          <button class="btn btn--danger btn--sm" id="confirm-ok">Delete</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
      overlay.remove();
      document.body.style.overflow = '';
      resolve(false);
    });

    overlay.querySelector('#confirm-ok').addEventListener('click', () => {
      overlay.remove();
      document.body.style.overflow = '';
      resolve(true);
    });

    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.remove();
        document.body.style.overflow = '';
        resolve(false);
      }
    });
  });
}

// ============================================================
// FORM VALIDATION HELPERS
// ============================================================
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateRequired(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function setFieldError(inputEl, message) {
  const group = inputEl.closest('.form-group');
  if (!group) return;
  group.classList.add('has-error');
  const errEl = group.querySelector('.form-error');
  if (errEl) errEl.textContent = message;
}

export function clearFieldError(inputEl) {
  const group = inputEl.closest('.form-group');
  if (!group) return;
  group.classList.remove('has-error');
}

export function clearAllErrors(formEl) {
  formEl.querySelectorAll('.form-group.has-error').forEach(g => {
    g.classList.remove('has-error');
  });
}

// ============================================================
// BUTTON LOADING STATE
// ============================================================
export function setButtonLoading(btn, loading, text = null) {
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.classList.add('btn--loading');
    btn.disabled = true;
    if (text) btn.textContent = text;
  } else {
    btn.classList.remove('btn--loading');
    btn.disabled = false;
    if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
    }
  }
}

// ============================================================
// STATUS BADGE HELPER
// ============================================================
export function statusBadge(status) {
  const labels = {
    pending:           'Pending',
    picked_up:         'Picked Up',
    in_transit:        'In Transit',
    customs:           'Customs',
    out_for_delivery:  'Out for Delivery',
    delivered:         'Delivered',
    exception:         'Exception',
    returned:          'Returned'
  };
  const label = labels[status] || status;
  return `<span class="badge badge--${status}">${label}</span>`;
}

// ============================================================
// INIT — runs on every page
// ============================================================
async function init() {
  initLoader();
  initNavbar();
  initScrollReveal();
  initCounters();
  initModals();

  // Apply site settings from Supabase to DOM
  try {
    await applySettings();
  } catch (err) {
    await logError('settings_apply', err.message);
  }
}

// Global error catcher
window.addEventListener('error', async e => {
  await logError('js_error', `${e.message} at ${e.filename}:${e.lineno}`);
});

window.addEventListener('unhandledrejection', async e => {
  await logError('promise_rejection', String(e.reason));
});

document.addEventListener('DOMContentLoaded', init);
