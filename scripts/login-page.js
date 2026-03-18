/* =========================================================
   login-page.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const s = DB.getSession();
  if (s) { redirectUser(s); return; }

  const form  = document.getElementById('login-form');
  const errEl = document.getElementById('error-alert');
  const btn   = document.getElementById('login-btn');

  form.addEventListener('submit', e => {
    e.preventDefault();
    errEl.classList.add('hidden');
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-password').value;
    setLoading(true);
    setTimeout(() => {
      const r = AUTH.login(id, pw);
      setLoading(false);
      if (r.success) {
        redirectUser(r.user);
      } else {
        errEl.textContent = r.error;
        errEl.classList.remove('hidden');
        shake();
      }
    }, 360);
  });

  function setLoading(on) {
    btn.disabled = on;
    btn.querySelector('.btn-text').classList.toggle('hidden', on);
    btn.querySelector('.btn-loader').classList.toggle('hidden', !on);
  }

  function shake() {
    const card = document.querySelector('.login-card');
    card.style.animation = 'none'; card.offsetHeight;
    card.style.animation = 'shake .4s ease';
  }
});

function redirectUser(user) {
  if (user.activeRole === 'admin') window.location.href = 'admin-dashboard.html';
  else window.location.href = 'visitor-checkin.html';
}

const _s = document.createElement('style');
_s.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`;
document.head.appendChild(_s);
