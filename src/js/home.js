// ============================================================
// SWIFT SPEED SENDER — HOME PAGE JS
// ============================================================

import db, { logError } from './supabase.js';
import { showToast, haptics } from './main.js';

// ============================================================
// SERVICE ICONS MAP (Feather/FA icon names → FA classes)
// ============================================================
const ICON_MAP = {
  'zap':           'fa-bolt',
  'package':       'fa-box',
  'anchor':        'fa-anchor',
  'clock':         'fa-clock',
  'thermometer':   'fa-temperature-half',
  'file-check':    'fa-file-circle-check',
  'truck':         'fa-truck',
  'plane':         'fa-plane',
  'globe':         'fa-globe',
  'shield':        'fa-shield-halved',
};

// ============================================================
// LOAD SERVICES FROM SUPABASE
// ============================================================
async function loadServices() {
  const grid = document.getElementById('services-grid');
  if (!grid) return;

  const { data, error } = await db
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(6);

  if (error) {
    await logError('home_services_load', error.message);
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-light)">
        <i class="fas fa-triangle-exclamation" style="font-size:2rem;margin-bottom:0.5rem;display:block;color:var(--gold)"></i>
        Services temporarily unavailable. <a href="contact.html">Contact us</a> for assistance.
      </div>`;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-light)">
        No services available at this time.
      </div>`;
    return;
  }

  grid.innerHTML = data.map((service, i) => {
    const iconClass = ICON_MAP[service.icon] || 'fa-box';
    const priceText = service.price_from
      ? `From ${service.currency} ${Number(service.price_from).toFixed(2)}`
      : '';
    return `
      <article class="service-card" style="animation-delay:${i * 0.08}s" role="article">
        <div class="service-card__icon" aria-hidden="true">
          <i class="fas ${iconClass}"></i>
        </div>
        <h3 class="service-card__title">${escapeHtml(service.title)}</h3>
        <p class="service-card__desc">${escapeHtml(service.description)}</p>
        ${priceText ? `<div class="service-card__price">${escapeHtml(priceText)}</div>` : ''}
      </article>`;
  }).join('');
}

// ============================================================
// HERO TRACK FORM
// ============================================================
function initHeroTrackForm() {
  const form  = document.getElementById('hero-track-form');
  const input = document.getElementById('hero-track-input');
  const demo  = document.getElementById('demo-track-btn');

  if (!form || !input) return;

  // Demo button
  if (demo) {
    demo.addEventListener('click', () => {
      input.value = 'SSS-2024-DEMO1';
      input.focus();
      haptics.select();
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const trackingNum = input.value.trim().toUpperCase();

    if (!trackingNum) {
      input.focus();
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 400);
      haptics.error();
      return;
    }

    haptics.medium();
    // Navigate to track page with number pre-filled
    window.location.href = `track.html?tracking=${encodeURIComponent(trackingNum)}`;
  });
}

// ============================================================
// FOOTER YEAR
// ============================================================
function setFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
}

// ============================================================
// UTILITY
// ============================================================
function escapeHtml(str) {
  const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadServices();
  initHeroTrackForm();
  setFooterYear();
});

// Shake animation for invalid input
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-6px)}
    40%{transform:translateX(6px)}
    60%{transform:translateX(-4px)}
    80%{transform:translateX(4px)}
  }
  .shake { animation: shake 0.4s ease; }
`;
document.head.appendChild(style);
