// contact.js
import { showToast, haptics, setButtonLoading, validateEmail, validateRequired } from './main.js';

// Tab switching
document.querySelectorAll('.contact-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.contact-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
    document.querySelectorAll('.contact-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected','true');
    document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add('active');
    haptics.select();
  });
});

// If URL has #quote, open quote tab
if (window.location.hash === '#quote') {
  document.querySelector('[data-tab="quote"]')?.click();
}

// ---- CONTACT FORM ----
document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn     = document.getElementById('contact-submit');
  const resultEl = document.getElementById('contact-result');
  const name    = document.getElementById('contact-name').value.trim();
  const email   = document.getElementById('contact-email').value.trim();
  const phone   = document.getElementById('contact-phone').value.trim();
  const subject = document.getElementById('contact-subject').value.trim();
  const message = document.getElementById('contact-message').value.trim();

  resultEl.className = 'hidden';

  // Validate
  let valid = true;
  const nameGroup = document.getElementById('contact-name').closest('.form-group');
  const emailGroup = document.getElementById('contact-email').closest('.form-group');
  const msgGroup = document.getElementById('contact-message').closest('.form-group');

  if (!validateRequired(name)) { nameGroup.classList.add('has-error'); valid = false; } else nameGroup.classList.remove('has-error');
  if (!validateEmail(email))   { emailGroup.classList.add('has-error'); valid = false; } else emailGroup.classList.remove('has-error');
  if (!validateRequired(message) || message.length < 10) { msgGroup.classList.add('has-error'); valid = false; } else msgGroup.classList.remove('has-error');

  if (!valid) { haptics.error(); return; }

  setButtonLoading(btn, true, 'Sending…');
  haptics.medium();

  try {
    const res = await fetch('/.netlify/functions/send-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, subject, message })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      resultEl.className = 'contact-result--success';
      resultEl.textContent = '✓ Message sent! We will respond within 24 hours.';
      document.getElementById('contact-form').reset();
      haptics.success();
      showToast('Message sent successfully!', 'success');
    } else {
      throw new Error(data.error || 'Server error');
    }
  } catch (err) {
    resultEl.className = 'contact-result--error';
    resultEl.textContent = 'Something went wrong. Please try again or call us directly.';
    haptics.error();
    showToast('Failed to send message', 'error');
  }

  setButtonLoading(btn, false);
});

// ---- QUOTE FORM ----
document.getElementById('quote-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn     = document.getElementById('quote-submit');
  const resultEl = document.getElementById('quote-result');
  const origin  = document.getElementById('quote-origin').value.trim().toUpperCase();
  const dest    = document.getElementById('quote-dest').value.trim().toUpperCase();
  const weight  = parseFloat(document.getElementById('quote-weight').value);
  const type    = document.getElementById('quote-type').value;
  const value   = parseFloat(document.getElementById('quote-value').value) || null;
  const qEmail  = document.getElementById('quote-email').value.trim();

  resultEl.className = 'hidden';

  // Validate
  let valid = true;
  const originGroup = document.getElementById('quote-origin').closest('.form-group');
  const destGroup   = document.getElementById('quote-dest').closest('.form-group');
  const weightGroup = document.getElementById('quote-weight').closest('.form-group');

  if (!origin || origin.length < 2) { originGroup.classList.add('has-error'); valid = false; } else originGroup.classList.remove('has-error');
  if (!dest || dest.length < 2)     { destGroup.classList.add('has-error'); valid = false; } else destGroup.classList.remove('has-error');
  if (isNaN(weight) || weight <= 0) { weightGroup.classList.add('has-error'); valid = false; } else weightGroup.classList.remove('has-error');

  if (!valid) { haptics.error(); return; }

  setButtonLoading(btn, true, 'Calculating…');
  haptics.medium();

  try {
    const res = await fetch('/.netlify/functions/get-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_country: origin,
        destination_country: dest,
        weight_kg: weight,
        package_type: type,
        declared_value: value,
        requester_email: qEmail || null
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      const q = data.quote;
      resultEl.className = 'quote-result-card';
      resultEl.innerHTML = `
        <div class="quote-result-label">Estimated Price Range</div>
        <div class="quote-result-price">$${q.estimated_min.toFixed(2)} – $${q.estimated_max.toFixed(2)} USD</div>
        <div style="margin-top:0.75rem;font-size:0.875rem;color:rgba(250,247,240,0.7)">
          <i class="fas fa-clock" style="color:var(--gold);margin-right:0.4rem"></i>
          Transit: ${q.transit_days_min}–${q.transit_days_max} business days
          &nbsp;·&nbsp; ${q.origin_country} → ${q.destination_country}
          &nbsp;·&nbsp; ${weight} kg
        </div>
        <p style="font-size:0.75rem;color:rgba(250,247,240,0.45);margin-top:0.5rem">
          This is an estimate. Final price confirmed at booking. <a href="contact.html" style="color:var(--gold)">Contact us</a> to proceed.
        </p>`;
      haptics.success();
      showToast('Quote calculated!', 'success');
    } else {
      throw new Error(data.error || 'Calculation failed');
    }
  } catch (err) {
    resultEl.className = 'contact-result--error';
    resultEl.textContent = 'Could not calculate quote. Please contact us directly.';
    haptics.error();
  }

  setButtonLoading(btn, false);
});
