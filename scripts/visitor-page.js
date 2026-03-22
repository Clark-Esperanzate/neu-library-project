/* =========================================================
   visitor-page.js
   ========================================================= */

let selectedPurpose = '';

document.addEventListener('DOMContentLoaded', () => {
  const session = AUTH.requireAuth();
  if (!session) return;

  // If admin role is active, redirect to admin dashboard
  if (session.activeRole === 'admin') {
    window.location.href = 'admin-dashboard.html';
    return;
  }

  // If Google user has no name/college yet, send to complete profile
  if (session.googleAccount && session.needsProfile) {
    window.location.href = 'complete-profile.html';
    return;
  }

  populateTerminal(session);
  updateClock();
  setInterval(updateClock, 1000);
  loadRecentVisits(session.email);
  loadLibraryStats();
  setInterval(loadLibraryStats, 30000);
  prefillCollege(session);

  // Purpose grid
  document.querySelectorAll('.purpose-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.purpose-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedPurpose = btn.dataset.value;
      document.getElementById('purpose').value = selectedPurpose;
    });
  });

  // Check-in form — plain (non-async) handler so nothing breaks silently
  document.getElementById('checkin-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const errEl   = document.getElementById('error-alert');
    const college = document.getElementById('checkin-college').value;
    const notes   = document.getElementById('reason').value.trim();

    if (!selectedPurpose) {
      errEl.textContent = 'Please select the purpose of your visit.';
      errEl.classList.remove('hidden');
      return;
    }
    if (!college) {
      errEl.textContent = 'Please select your college or department.';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    const name = buildName(session);
    const visitData = {
      userId:   session.id || session.firebaseUid || '',
      email:    session.email,
      name,
      schoolId: session.schoolId || '—',
      college,
      purpose:  selectedPurpose,
      notes,
      userType: session.userType || 'student',
      timestamp: new Date().toISOString()
    };

    // Save locally
    const visit = DB.addVisit(visitData);

    // Fire-and-forget Firestore write — doesn't block UI
    writeVisitToFirestore(visitData);

    // Show welcome modal immediately
    showWelcomeModal(session, visit);
    loadRecentVisits(session.email);
    loadLibraryStats();

    const total = DB.getVisitsByUser(session.email).length;
    const tvEl = document.getElementById('t-visits');
    if (tvEl) tvEl.textContent = total + ' total';
  });
});

/* ── Fire-and-forget Firestore visit write ─────── */
function writeVisitToFirestore(visitData) {
  // Uses window global set by the module bridge in visitor-checkin.html
  // Dynamic import() doesn't work in regular (non-module) scripts
  if (typeof window._addVisitToFirestore === 'function') {
    window._addVisitToFirestore(visitData)
      .catch(function(e) { console.warn('Firestore visit write failed:', e.message); });
  } else {
    // Bridge not ready yet — retry once after a short delay
    setTimeout(function() {
      if (typeof window._addVisitToFirestore === 'function') {
        window._addVisitToFirestore(visitData)
          .catch(function(e) { console.warn('Firestore visit write failed (retry):', e.message); });
      }
    }, 2000);
  }
}

/* ── Terminal ───────────────────────────────────── */
function buildName(s) {
  return `${s.firstName || ''}${s.middleInitial ? ' ' + s.middleInitial : ''} ${s.lastName || ''}`.trim() || s.email;
}

function populateTerminal(s) {
  const name = buildName(s);
  const typeLabel = { student: 'STUDENT', faculty: 'FACULTY', staff: 'STAFF' }[s.userType] || 'VISITOR';
  const nameEl = document.getElementById('header-user-name');
  if (nameEl) nameEl.textContent = name;
  setText('t-name',    name);
  setText('t-id',      s.schoolId || '—');
  setText('t-usertype',typeLabel);
  setText('t-college', s.college  || '—');
  setText('t-program', s.program  || '—');
  setText('t-email',   s.email    || '—');
  const total = DB.getVisitsByUser(s.email).length;
  setText('t-visits',  total + ' total');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updateClock() {
  const now = new Date();
  setText('t-date', now.toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', year:'numeric' }));
  setText('t-time', now.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
}

function loadLibraryStats() {
  const today = DB.getTodayVisits();
  const week  = DB.getThisWeekVisits();
  setText('ls-today',      today.length);
  setText('ls-week',       week.length);
  setText('ls-top-college', DB.getTopCollege(today));
}

function prefillCollege(s) {
  if (!s.college) return;
  const sel = document.getElementById('checkin-college');
  if (!sel) return;
  for (const opt of sel.options) {
    if (opt.value === s.college) { opt.selected = true; break; }
  }
}

function loadRecentVisits(email) {
  const visits = DB.getVisitsByUser(email).slice(-6).reverse();
  const list   = document.getElementById('recent-visits-list');
  if (!list) return;
  if (!visits.length) {
    list.innerHTML = '<li class="recent-item muted">No visits recorded yet.</li>';
    return;
  }
  list.innerHTML = visits.map(v => {
    const d = new Date(v.timestamp);
    return `<li class="recent-item">
      <strong>${esc(v.purpose)}</strong><br/>
      <small>${d.toLocaleDateString('en-PH',{month:'short',day:'numeric'})} &nbsp;•&nbsp;
             ${d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}</small>
    </li>`;
  }).join('');
}

function resetForm() {
  selectedPurpose = '';
  const pEl = document.getElementById('purpose');
  if (pEl) pEl.value = '';
  document.querySelectorAll('.purpose-btn').forEach(b => b.classList.remove('selected'));
  const rEl = document.getElementById('reason');
  if (rEl) rEl.value = '';
  prefillCollege(DB.getSession());
}

/* ── Welcome modal ──────────────────────────────── */
function showWelcomeModal(s, visit) {
  const name      = buildName(s);
  const d         = new Date(visit.timestamp);
  const typeLabel = { student: 'Student', faculty: 'Faculty', staff: 'Employee / Staff' }[s.userType] || 'Visitor';
  const visitNo   = DB.getVisitsByUser(s.email).length;

  setText('welcome-name-text', name);
  setText('welcome-id',        s.schoolId || '—');
  setText('welcome-usertype',  typeLabel);
  setText('welcome-college',   visit.college);
  setText('welcome-purpose',   visit.purpose);
  setText('welcome-date',      d.toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' }));
  setText('welcome-time',      d.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' }));
  setText('welcome-visitno',   '#' + visitNo);

  const modal = document.getElementById('welcome-modal');
  if (modal) modal.classList.remove('hidden');

  // 7-second countdown then auto-redirect
  let seconds = 7;
  setText('welcome-countdown', seconds);

  if (window._welcomeTimer) clearInterval(window._welcomeTimer);
  window._welcomeTimer = setInterval(() => {
    seconds--;
    setText('welcome-countdown', seconds);
    if (seconds <= 0) {
      clearInterval(window._welcomeTimer);
      window._welcomeTimer = null;
      closeWelcomeModal();
    }
  }, 1000);
}

function closeWelcomeModal() {
  if (window._welcomeTimer) {
    clearInterval(window._welcomeTimer);
    window._welcomeTimer = null;
  }
  const modal = document.getElementById('welcome-modal');
  if (modal) modal.classList.add('hidden');

  // Sign out and redirect to login so next visitor can log in
  DB.clearSession();
  window.location.href = 'index.html';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
