// ============================================================
// SWIFT SPEED SENDER — SUPABASE CLIENT
// Single source of truth for all database connections
// ============================================================

// These values come from your .env / Netlify environment
// They are safe to be in frontend JS — security comes from RLS
const SUPABASE_URL  = window.__SSS_ENV?.SUPABASE_URL  || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON = window.__SSS_ENV?.SUPABASE_ANON || 'YOUR_SUPABASE_ANON_KEY';

// Import Supabase from CDN (loaded in HTML)
const { createClient } = supabase;
export const db = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// ============================================================
// SESSION MANAGEMENT
// Auto-refresh session, handle expiry gracefully
// ============================================================
db.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    const isAdminPage = window.location.pathname.includes('/admin/dashboard');
    if (event === 'SIGNED_OUT' && isAdminPage) {
      window.location.href = '/pages/admin/index.html?reason=session_expired';
    }
  }
});

// ============================================================
// ERROR LOGGER — logs frontend errors to Supabase
// ============================================================
export async function logError(type, message, pageUrl = window.location.href) {
  try {
    await db.from('error_logs').insert({
      error_type: type,
      error_message: String(message).slice(0, 500),
      page_url: pageUrl,
      user_agent: navigator.userAgent.slice(0, 200)
    });
  } catch {
    // Fail silently — logging should never break the app
  }
}

// ============================================================
// SITE SETTINGS LOADER
// Fetches all settings and caches them in sessionStorage
// ============================================================
const SETTINGS_CACHE_KEY = 'sss_settings';
const SETTINGS_CACHE_TTL = 60 * 1000; // 1 minute

export async function loadSettings() {
  // Check cache
  const cached = sessionStorage.getItem(SETTINGS_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed._ts < SETTINGS_CACHE_TTL) {
        return parsed.data;
      }
    } catch {}
  }

  const { data, error } = await db
    .from('site_settings')
    .select('key, value');

  if (error) {
    await logError('settings_load', error.message);
    return {};
  }

  // Convert array to object for easy access: { key: value }
  const settings = {};
  data.forEach(row => { settings[row.key] = row.value; });

  // Cache it
  sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({
    _ts: Date.now(),
    data: settings
  }));

  return settings;
}

// ============================================================
// APPLY SETTINGS TO DOM
// Replaces [data-setting="key"] elements with DB values
// ============================================================
export async function applySettings() {
  const settings = await loadSettings();

  // Apply text content
  document.querySelectorAll('[data-setting]').forEach(el => {
    const key = el.dataset.setting;
    if (settings[key] !== undefined && settings[key] !== '') {
      el.textContent = settings[key];
    }
  });

  // Apply href links
  document.querySelectorAll('[data-setting-href]').forEach(el => {
    const key = el.dataset.settingHref;
    if (settings[key] !== undefined && settings[key] !== '') {
      el.href = settings[key];
    }
  });

  // Apply src for images
  document.querySelectorAll('[data-setting-src]').forEach(el => {
    const key = el.dataset.settingSrc;
    if (settings[key] !== undefined && settings[key] !== '') {
      el.src = settings[key];
    }
  });

  return settings;
}

// Clear settings cache (called after admin saves changes)
export function clearSettingsCache() {
  sessionStorage.removeItem(SETTINGS_CACHE_KEY);
}

export default db;
