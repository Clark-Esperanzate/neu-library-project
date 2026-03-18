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

  populateTerminal(session);
  updateClock();
  setInterval(updateClock, 1000);
  loadRecentVisits(session.email);
  loadLibraryStats();
  setInterval(loadLibraryStats, 30000); // refresh every 30s so counts stay live
  prefillCollege(session);

  // Show "Switch to Admin" button if this account also has admin role
  const roles = session.roles || [session.role];
  if (roles.includes('admin')) {
    document.getElementById('switch-to-admin-btn').classList.remove('hidden');
  }

  // Purpose grid
  document.querySelectorAll('.purpose-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.purpose-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedPurpose = btn.dataset.value;
      document.getElementById('purpose').value = selectedPurpose;
    });
  });

  // Check-in form
  document.getElementById('checkin-form').addEventListener('submit', e => {
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

    const name = `${session.firstName}${session.middleInitial ? ' ' + session.middleInitial : ''} ${session.lastName}`;
    const visit = DB.addVisit({
      userId:   session.id,
      email:    session.email,
      name,
      schoolId: session.schoolId,
      college,
      purpose:  selectedPurpose,
      notes,
      userType: session.userType || 'student'
    });

    showWelcomeModal(session, visit);
    resetForm();
    loadRecentVisits(session.email);
    loadLibraryStats();

    // Update visit count in terminal
    const total = DB.getVisitsByUser(session.email).length;
    document.getElementById('t-visits').textContent = total + ' total';
  });
});

function populateTerminal(s) {
  const name = `${s.firstName}${s.middleInitial ? ' ' + s.middleInitial : ''} ${s.lastName}`;
  const typeLabel = { student: 'STUDENT', faculty: 'FACULTY', staff: 'STAFF' }[s.userType] || 'VISITOR';
  document.getElementById('header-user-name').textContent = name;
  document.getElementById('t-name').textContent     = name;
  document.getElementById('t-id').textContent       = s.schoolId || '—';
  document.getElementById('t-usertype').textContent = typeLabel;
  document.getElementById('t-college').textContent  = s.college  || '—';
  document.getElementById('t-program').textContent  = s.program  || '—';
  document.getElementById('t-email').textContent    = s.email    || '—';
  const total = DB.getVisitsByUser(s.email).length;
  document.getElementById('t-visits').textContent   = total + ' total';
}

function updateClock() {
  const now = new Date();
  const d = document.getElementById('t-date');
  const t = document.getElementById('t-time');
  if (d) d.textContent = now.toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
  if (t) t.textContent = now.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

function loadLibraryStats() {
  const today = DB.getTodayVisits();
  const week  = DB.getThisWeekVisits();
  document.getElementById('ls-today').textContent      = today.length;
  document.getElementById('ls-week').textContent       = week.length;
  document.getElementById('ls-top-college').textContent = DB.getTopCollege(today);
}

function prefillCollege(s) {
  if (!s.college) return;
  const sel = document.getElementById('checkin-college');
  for (const opt of sel.options) {
    if (opt.value === s.college) { opt.selected = true; break; }
  }
}

function loadRecentVisits(email) {
  const visits = DB.getVisitsByUser(email).slice(-6).reverse();
  const list   = document.getElementById('recent-visits-list');
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
  document.getElementById('purpose').value = '';
  document.querySelectorAll('.purpose-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('reason').value = '';
  prefillCollege(DB.getSession());
}

function showWelcomeModal(s, visit) {
  const name     = `${s.firstName}${s.middleInitial ? ' ' + s.middleInitial : ''} ${s.lastName}`;
  const d        = new Date(visit.timestamp);
  const typeLabel = { student: 'Student', faculty: 'Faculty', staff: 'Employee / Staff' }[s.userType] || 'Visitor';
  const visitNo  = DB.getVisitsByUser(s.email).length;

  document.getElementById('welcome-name-text').textContent  = name;
  document.getElementById('welcome-id').textContent         = s.schoolId || '—';
  document.getElementById('welcome-usertype').textContent   = typeLabel;
  document.getElementById('welcome-college').textContent    = visit.college;
  document.getElementById('welcome-purpose').textContent    = visit.purpose;
  document.getElementById('welcome-date').textContent       = d.toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  document.getElementById('welcome-time').textContent       = d.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' });
  document.getElementById('welcome-visitno').textContent    = `#${visitNo}`;

  document.getElementById('welcome-modal').classList.remove('hidden');
}

function closeWelcomeModal() {
  document.getElementById('welcome-modal').classList.add('hidden');
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
