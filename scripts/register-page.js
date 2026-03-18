/* =========================================================
   register-page.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const form    = document.getElementById('register-form');
  const errEl   = document.getElementById('error-alert');
  const okEl    = document.getElementById('success-alert');
  const pwInput = document.getElementById('reg-password');
  const fill    = document.getElementById('pw-strength-fill');
  const lbl     = document.getElementById('pw-strength-label');

  // Password strength meter
  pwInput?.addEventListener('input', () => {
    const v = pwInput.value; let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    fill.className = 'pw-fill'; lbl.className = 'pw-label';
    if (!v) { fill.style.width = '0'; lbl.textContent = ''; return; }
    if (score <= 1) { fill.classList.add('weak');   lbl.classList.add('weak');   lbl.textContent = 'Weak'; }
    else if (score <= 2) { fill.classList.add('fair');   lbl.classList.add('fair');   lbl.textContent = 'Fair'; }
    else                 { fill.classList.add('strong'); lbl.classList.add('strong'); lbl.textContent = 'Strong'; }
  });

  // Auto-format School ID as user types
  document.getElementById('school-id')?.addEventListener('input', function() {
    let v = this.value.replace(/[^0-9]/g, '');
    if (v.length > 2)  v = v.slice(0,2) + '-' + v.slice(2);
    if (v.length > 8)  v = v.slice(0,8) + '-' + v.slice(8);
    if (v.length > 13) v = v.slice(0,13);
    this.value = v;
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    errEl.classList.add('hidden');
    okEl.classList.add('hidden');

    const data = {
      schoolId:        document.getElementById('school-id').value.trim(),
      firstName:       document.getElementById('first-name').value.trim(),
      middleInitial:   document.getElementById('middle-initial').value.trim(),
      lastName:        document.getElementById('last-name').value.trim(),
      email:           document.getElementById('reg-email').value.trim().toLowerCase(),
      college:         document.getElementById('college').value,
      program:         document.getElementById('program').value.trim(),
      password:        document.getElementById('reg-password').value,
      confirmPassword: document.getElementById('confirm-password').value,
      userType:        document.getElementById('user-type').value,
    };

    const r = AUTH.register(data);
    if (r.success) {
      okEl.textContent = '✓ Account created successfully. Redirecting to sign in…';
      okEl.classList.remove('hidden');
      form.reset();
      fill.style.width = '0'; lbl.textContent = '';
      setTimeout(() => window.location.href = 'index.html', 2200);
    } else {
      errEl.textContent = r.error;
      errEl.classList.remove('hidden');
      errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
});
