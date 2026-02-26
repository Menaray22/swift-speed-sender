// ============================================================
// SWIFT SPEED SENDER — TRACK PAGE JS
// ============================================================

import db, { logError } from './supabase.js';
import { showToast, haptics, statusBadge, setButtonLoading } from './main.js';

let map = null;
let mapMarkers = [];
let mapPolyline = null;

// ============================================================
// STATUS DISPLAY NAMES
// ============================================================
const STATUS_LABELS = {
  pending:           'Pending Pickup',
  picked_up:         'Picked Up',
  in_transit:        'In Transit',
  customs:           'Customs Clearance',
  out_for_delivery:  'Out for Delivery',
  delivered:         'Delivered',
  exception:         'Exception — Contact Us',
  returned:          'Returned to Sender'
};

// ============================================================
// INIT MAP (Leaflet)
// ============================================================
function initMap(lat, lng, zoom = 4) {
  // Check if Leaflet loaded
  if (typeof L === 'undefined') {
    document.getElementById('track-map').classList.add('hidden');
    document.getElementById('map-fallback').classList.remove('hidden');
    return null;
  }

  // Destroy existing map if re-searching
  if (map) {
    map.remove();
    map = null;
    mapMarkers = [];
    mapPolyline = null;
  }

  try {
    map = L.map('track-map', {
      // Prevent scroll-trap on mobile
      scrollWheelZoom: false,
      tap: false
    }).setView([lat, lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(map);

    return map;
  } catch (err) {
    logError('map_init', err.message);
    document.getElementById('track-map').classList.add('hidden');
    document.getElementById('map-fallback').classList.remove('hidden');
    return null;
  }
}

// Custom gold marker
function goldMarker(isCurrent = false) {
  if (typeof L === 'undefined') return null;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${isCurrent ? 18 : 12}px;
      height:${isCurrent ? 18 : 12}px;
      background:${isCurrent ? '#C9A84C' : '#1A2D42'};
      border:3px solid ${isCurrent ? '#E2C47A' : '#C9A84C'};
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      ${isCurrent ? 'animation:pulse-marker 2s infinite;' : ''}
    "></div>`,
    iconSize: [isCurrent ? 18 : 12, isCurrent ? 18 : 12],
    iconAnchor: [isCurrent ? 9 : 6, isCurrent ? 9 : 6]
  });
}

// ============================================================
// DRAW CHECKPOINTS ON MAP
// ============================================================
function drawMap(checkpoints, currentLat, currentLng) {
  if (!map || typeof L === 'undefined') return;

  // Clear old markers
  mapMarkers.forEach(m => m.remove());
  mapMarkers = [];
  if (mapPolyline) { mapPolyline.remove(); mapPolyline = null; }

  const coords = checkpoints
    .filter(c => c.lat && c.lng)
    .map(c => [parseFloat(c.lat), parseFloat(c.lng)]);

  if (coords.length === 0) return;

  // Draw route line
  mapPolyline = L.polyline(coords, {
    color: '#C9A84C',
    weight: 2.5,
    opacity: 0.6,
    dashArray: '6, 4'
  }).addTo(map);

  // Add markers
  checkpoints.forEach((c, i) => {
    if (!c.lat || !c.lng) return;
    const isCurrent = i === checkpoints.length - 1;
    const marker = L.marker(
      [parseFloat(c.lat), parseFloat(c.lng)],
      { icon: goldMarker(isCurrent) }
    )
    .bindPopup(`
      <div style="font-family:'DM Sans',sans-serif;min-width:160px">
        <strong style="font-size:0.875rem">${escapeHtml(c.location_name)}</strong><br>
        <span style="font-size:0.78rem;color:#6B7C8D">${formatDate(c.occurred_at)}</span><br>
        <span style="font-size:0.8rem">${escapeHtml(c.description || '')}</span>
      </div>
    `)
    .addTo(map);
    mapMarkers.push(marker);
  });

  // Fit bounds
  if (coords.length > 1) {
    map.fitBounds(mapPolyline.getBounds(), { padding: [40, 40] });
  } else {
    map.setView(coords[0], 8);
  }

  // Open popup on current marker
  if (mapMarkers.length) {
    mapMarkers[mapMarkers.length - 1].openPopup();
  }
}

// ============================================================
// RENDER SUMMARY CARD
// ============================================================
function renderSummary(pkg) {
  const el = document.getElementById('track-summary');
  const statusLabel = STATUS_LABELS[pkg.status] || pkg.status;
  const eta = pkg.estimated_delivery
    ? new Date(pkg.estimated_delivery).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : 'Calculating…';

  el.innerHTML = `
    <div class="track-summary__top">
      <div>
        <div class="track-summary__tracking">Tracking Number</div>
        <div class="track-summary__number">${escapeHtml(pkg.tracking_number)}</div>
      </div>
      <div>${statusBadge(pkg.status)}</div>
    </div>
    <div class="track-summary__grid">
      <div class="track-summary__item">
        <div class="track-summary__label">From</div>
        <div class="track-summary__value">${escapeHtml(pkg.sender_country)}</div>
      </div>
      <div class="track-summary__item">
        <div class="track-summary__label">To</div>
        <div class="track-summary__value">${escapeHtml(pkg.receiver_country)}</div>
      </div>
      <div class="track-summary__item">
        <div class="track-summary__label">Service</div>
        <div class="track-summary__value" style="text-transform:capitalize">${escapeHtml(pkg.service_type)}</div>
      </div>
      <div class="track-summary__item">
        <div class="track-summary__label">${pkg.status === 'delivered' ? 'Delivered On' : 'Est. Delivery'}</div>
        <div class="track-summary__value">${pkg.actual_delivery ? formatDate(pkg.actual_delivery) : eta}</div>
      </div>
    </div>
    ${pkg.current_location_name ? `
    <div style="margin-top:var(--gap-sm);padding-top:var(--gap-sm);border-top:1px solid rgba(13,27,42,0.06)">
      <span style="font-family:var(--font-mono);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light)">Current Location</span><br>
      <span style="font-weight:600;color:var(--navy)">
        <i class="fas fa-location-dot" style="color:var(--gold);margin-right:0.3rem"></i>
        ${escapeHtml(pkg.current_location_name)}
      </span>
    </div>` : ''}
  `;
}

// ============================================================
// RENDER TIMELINE
// ============================================================
function renderTimeline(checkpoints) {
  const el = document.getElementById('timeline-items');
  if (!checkpoints || checkpoints.length === 0) {
    el.innerHTML = `<div style="padding:var(--gap-md);color:var(--text-light);text-align:center;font-size:0.875rem">No tracking history yet.</div>`;
    return;
  }

  // Reverse so most recent is first
  const sorted = [...checkpoints].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));

  el.innerHTML = sorted.map((c, i) => {
    const isCurrent = i === 0;
    const isDelivered = c.status === 'delivered';
    return `
      <div class="timeline-item ${isCurrent ? 'current' : ''} ${isDelivered ? 'delivered' : ''}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-status">${escapeHtml(STATUS_LABELS[c.status] || c.status)}</div>
          <div class="timeline-location">
            <i class="fas fa-location-dot"></i>
            ${escapeHtml(c.location_name)}
          </div>
          ${c.description ? `<div class="timeline-desc">${escapeHtml(c.description)}</div>` : ''}
          <div class="timeline-time">${formatDateTime(c.occurred_at)}</div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// MAIN TRACK FUNCTION
// ============================================================
async function trackPackage(trackingNumber) {
  const btn      = document.getElementById('track-btn');
  const results  = document.getElementById('track-results');
  const empty    = document.getElementById('track-empty');
  const errorEl  = document.getElementById('track-error');

  // Hide previous results
  results.classList.add('hidden');
  empty.classList.add('hidden');
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  setButtonLoading(btn, true, 'Searching…');

  try {
    // Fetch package (non-deleted)
    const { data: pkg, error: pkgErr } = await db
      .from('packages')
      .select('*')
      .eq('tracking_number', trackingNumber.toUpperCase().trim())
      .is('deleted_at', null)
      .single();

    if (pkgErr || !pkg) {
      // Show empty state
      haptics.error();
      empty.classList.remove('hidden');
      document.getElementById('empty-tracking-num').textContent = trackingNumber;
      return;
    }

    // Fetch checkpoints
    const { data: checkpoints, error: cpErr } = await db
      .from('tracking_checkpoints')
      .select('*')
      .eq('package_id', pkg.id)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: true });

    if (cpErr) await logError('track_checkpoints', cpErr.message);

    // Render
    renderSummary(pkg);
    renderTimeline(checkpoints || []);

    // Map
    const mapLat = pkg.current_lat || 40.7128;
    const mapLng = pkg.current_lng || -74.006;
    const fallback = document.getElementById('map-fallback');
    const fallbackLoc = document.getElementById('fallback-location');

    if (typeof L !== 'undefined') {
      fallback.classList.add('hidden');
      document.getElementById('track-map').classList.remove('hidden');
      const m = initMap(mapLat, mapLng);
      if (m && checkpoints && checkpoints.length > 0) {
        drawMap(checkpoints, mapLat, mapLng);
      } else if (m) {
        // Just show current pin
        L.marker([mapLat, mapLng], { icon: goldMarker(true) })
          .bindPopup(escapeHtml(pkg.current_location_name || 'Current Location'))
          .addTo(m)
          .openPopup();
      }
    } else {
      document.getElementById('track-map').classList.add('hidden');
      fallback.classList.remove('hidden');
      if (fallbackLoc) fallbackLoc.textContent = pkg.current_location_name || 'Unknown';
    }

    haptics.success();
    results.classList.remove('hidden');

    // Scroll to results
    setTimeout(() => {
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

  } catch (err) {
    await logError('track_search', err.message);
    haptics.error();
    errorEl.textContent = 'Something went wrong. Please try again or contact us.';
    errorEl.classList.remove('hidden');
  } finally {
    setButtonLoading(btn, false);
  }
}

// ============================================================
// FORM INIT
// ============================================================
function initTrackForm() {
  const form  = document.getElementById('track-form');
  const input = document.getElementById('track-input');
  const demo  = document.getElementById('demo-btn');

  if (!form || !input) return;

  // Demo button
  if (demo) {
    demo.addEventListener('click', () => {
      input.value = 'SSS-2024-DEMO1';
      input.focus();
      haptics.select();
    });
  }

  // Check URL params on load
  const params = new URLSearchParams(window.location.search);
  const preTracking = params.get('tracking');
  if (preTracking) {
    input.value = preTracking;
    trackPackage(preTracking);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) {
      input.focus();
      haptics.error();
      const err = document.getElementById('track-error');
      err.textContent = 'Please enter a tracking number.';
      err.classList.remove('hidden');
      return;
    }
    trackPackage(val);
  });
}

// ============================================================
// HELPERS
// ============================================================
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function escapeHtml(str) {
  const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' };
  return String(str || '').replace(/[&<>"']/g, c => map[c]);
}

// Pulse animation for current map marker
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse-marker {
    0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.5)}
    50%{box-shadow:0 0 0 8px rgba(201,168,76,0)}
  }
`;
document.head.appendChild(style);

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', initTrackForm);
