// ============================================================
// SWIFT SPEED SENDER — ADMIN LOGIN JS
// ============================================================

const { createClient } = supabase;
const db = createClient(
  window.__SSS_ENV.SUPABASE_URL,
  window.__SSS_ENV.SUPABASE_ANON
);

// Check session expired message from URL
const params = new URLSearchParams(window.location.search);
if (params.get('reason') === 'session_expired') {
  document.getElementById('session-notice')?.classList.remove('hidden');
}

// If already logged in, redirect to dashboard
db.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    window.location.href = 'dashboard.html';
  }
});

// ---- Login Form ----
const loginForm = document.getElementById('login-form');
const loginBtn  = document.getElementById('login-btn');
const loginErr  = document.getElementById('login-error');

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('admin-email')?.value.trim();
  const password = document.getElementById('admin-password')?.value;

  loginErr.classList.add('hidden');
  loginErr.textContent = '';

  // Client-side validation
  if (!email || !password) {
    loginErr.textContent = 'Email and password are required.';
    loginErr.classList.remove('hidden');
    return;
  }

  // Loading state
  loginBtn.textContent = 'Signing in…';
  loginBtn.disabled = true;

  try {
    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      let msg = 'Invalid email or password. Please try again.';
      if (error.message?.includes('Email not confirmed')) {
        msg = 'Please confirm your email address before signing in.';
      }
      loginErr.textContent = msg;
      loginErr.classList.remove('hidden');
      loginBtn.textContent = 'Sign In';
      loginBtn.disabled = false;
      return;
    }

    // Success — redirect
    window.location.href = 'dashboard.html';

  } catch (err) {
    loginErr.textContent = 'Connection error. Please check your internet and try again.';
    loginErr.classList.remove('hidden');
    loginBtn.textContent = 'Sign In';
    loginBtn.disabled = false;
  }
});

// ---- Password Toggle ----
document.getElementById('toggle-pw')?.addEventListener('click', function () {
  const input = document.getElementById('admin-password');
  const icon  = this.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
});

// ---- Forgot Password ----
const forgotBtn      = document.getElementById('forgot-btn');
const resetFormWrap  = document.getElementById('reset-form-wrap');
const resetForm      = document.getElementById('reset-form');
const resetCancel    = document.getElementById('reset-cancel');
const resetBtn       = document.getElementById('reset-btn');
const resetMsg       = document.getElementById('reset-msg');

forgotBtn?.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  forgotBtn.closest('div').classList.add('hidden');
  resetFormWrap.classList.remove('hidden');
  document.getElementById('reset-email').value =
    document.getElementById('admin-email').value;
});

resetCancel?.addEventListener('click', () => {
  resetFormWrap.classList.add('hidden');
  loginForm.classList.remove('hidden');
  forgotBtn.closest('div').classList.remove('hidden');
  resetMsg.classList.add('hidden');
});

resetForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('reset-email').value.trim();
  if (!email) return;

  resetBtn.disabled = true;
  resetBtn.textContent = 'Sending…';

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/pages/admin/index.html`
  });

  resetMsg.classList.remove('hidden');
  if (error) {
    resetMsg.style.background = '#FEE2E2';
    resetMsg.style.color = '#991B1B';
    resetMsg.textContent = 'Could not send reset email. Please try again.';
  } else {
    resetMsg.style.background = '#D1FAE5';
    resetMsg.style.color = '#065F46';
    resetMsg.textContent = 'Reset link sent! Check your email inbox.';
  }

  resetBtn.disabled = false;
  resetBtn.textContent = 'Send Reset Link';
});
