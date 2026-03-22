/* =========================================================
   login-page.js — Google-only login
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect immediately
  const s = DB.getSession();
  if (s) {
    if (s.activeRole === 'admin') window.location.href = 'admin-dashboard.html';
    else window.location.href = 'visitor-checkin.html';
  }
});
