// services.js
import db, { logError } from './supabase.js';
const ICON_MAP = { 'zap':'fa-bolt','package':'fa-box','anchor':'fa-anchor','clock':'fa-clock','thermometer':'fa-temperature-half','file-check':'fa-file-circle-check','truck':'fa-truck','globe':'fa-globe','shield':'fa-shield-halved' };
function escapeHtml(str) { const m={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}; return String(str||'').replace(/[&<>"']/g,c=>m[c]); }
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('services-full-grid');
  if (!grid) return;
  const { data, error } = await db.from('services').select('*').eq('is_active', true).order('sort_order',{ascending:true});
  if (error || !data || data.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-light)">Services temporarily unavailable.</div>`;
    if (error) await logError('services_page_load', error.message);
    return;
  }
  grid.innerHTML = data.map((s,i) => `
    <article class="svc-card" style="animation-delay:${i*0.08}s">
      <div class="svc-card__icon"><i class="fas ${ICON_MAP[s.icon]||'fa-box'}"></i></div>
      <h3 class="svc-card__title">${escapeHtml(s.title)}</h3>
      <p class="svc-card__desc">${escapeHtml(s.description)}</p>
      ${s.price_from ? `<div class="svc-card__price">From USD ${Number(s.price_from).toFixed(2)}</div>` : ''}
    </article>`).join('');
});
