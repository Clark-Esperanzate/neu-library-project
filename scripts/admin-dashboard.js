/* =========================================================
   admin-dashboard.js  –  Admin Dashboard Logic
   Charts, advanced filters, visitor logs, user management,
   activity feed, RBAC role display
   ========================================================= */

let charts = {};
let currentRange        = 'today';
let currentVisitorRange = 'today';
let currentUserFilter   = 'all';
let visitorPage         = 1;
const PAGE_SIZE         = 15;
let filteredVisits      = [];
let advFilters          = { purpose: 'all', college: 'all', userType: 'all' };

/* ── Boot ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const s = AUTH.requireAdmin();
  if (!s) return;

  const name = `${s.firstName} ${s.lastName}`;
  document.getElementById('admin-display-name').textContent  = name;
  document.getElementById('admin-display-email').textContent = s.email;
  document.getElementById('admin-avatar-letter').textContent = (s.firstName || 'A')[0].toUpperCase();

  // Show "Switch to Visitor" if account also has visitor role
  const roles = s.roles || [s.role];
  if (roles.includes('visitor')) {
    document.getElementById('switch-to-visitor-btn').classList.remove('hidden');
  }

  tick(); setInterval(tick, 1000);

  const todayCount = DB.getTodayVisits().length;
  document.getElementById('topbar-today-count').textContent = todayCount;
  const badge = document.getElementById('nav-badge-visitors');
  if (todayCount > 0) { badge.textContent = todayCount; badge.classList.add('show'); }

  loadDashboard('today');
  loadVisitorLogs('today');
  loadUserManagement('all');
  startActivityFeed();

  document.getElementById('report-range').addEventListener('change', function () {
    document.getElementById('report-custom-dates').classList.toggle('hidden', this.value !== 'custom');
  });
});

/* ── Clock ────────────────────────────────────────── */
function tick() {
  const el = document.getElementById('current-datetime');
  if (el) el.textContent = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/* ── Navigation ───────────────────────────────────── */
function navTo(section, linkEl) {
  event.preventDefault();
  document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`section-${section}`).classList.remove('hidden');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');
  const labels = { dashboard: 'Dashboard', visitors: 'Visitor Logs', users: 'User Management', activity: 'Live Activity', reports: 'Reports' };
  document.getElementById('page-heading').textContent = labels[section] || section;
  document.querySelector('.admin-sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
  if (section === 'activity') refreshActivityFeed();
}

function toggleSidebar() {
  document.querySelector('.admin-sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}

/* ── Range helpers ────────────────────────────────── */
function getVisitsForRange(range, from, to) {
  if (range === 'today') return DB.getTodayVisits();
  if (range === 'week')  return DB.getThisWeekVisits();
  if (range === 'month') return DB.getThisMonthVisits();
  if (range === 'all')   return DB.getVisits();
  if (range === 'custom' && from && to) return DB.getVisitsByRange(from, to);
  return DB.getVisits();
}

/* ── Dashboard ────────────────────────────────────── */
function loadDashboard(range, from, to) {
  currentRange = range;
  const raw     = getVisitsForRange(range, from, to);
  const visits  = DB.filterVisits(raw, advFilters);
  const todayV  = DB.getTodayVisits();
  const users   = DB.getUsers().filter(u => u.role !== 'admin' && !u.roles?.includes('admin') || u.roles?.length > 1);
  const allUsers = DB.getUsers().filter(u => !(u.roles?.length === 1 && u.roles[0] === 'admin'));
  const blocked  = DB.getUsers().filter(u => u.isBlocked).length;

  animateCount('stat-total',    visits.length);
  animateCount('stat-today',    DB.filterVisits(todayV, advFilters).length);
  animateCount('stat-colleges', Object.keys(DB.groupByCollege(visits)).length);
  animateCount('stat-users',    allUsers.length);
  animateCount('stat-blocked',  blocked);
  document.getElementById('stat-peak').textContent = DB.getPeakHour(visits) || '—';
  document.getElementById('topbar-today-count').textContent = todayV.length;

  // Visitor type breakdown
  const byType = DB.groupByUserType(visits);
  animateCount('stat-students', byType['student'] || 0);
  animateCount('stat-faculty',  byType['faculty'] || 0);
  animateCount('stat-staff',    byType['staff']   || 0);

  const sub = document.getElementById('chart-daily-sub');
  if (sub) sub.textContent = `${visits.length} visits shown`;

  renderDailyChart(visits, range);
  renderCollegeChart(visits);
  renderPurposeChart(visits);
  renderUserTypeChart(visits);
  renderCollegeBreakdown(visits);
}

function setRange(range, btn) {
  currentRange = range;
  document.querySelectorAll('#section-dashboard .filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('custom-range-inputs').classList.toggle('hidden', range !== 'custom');
  if (range !== 'custom') loadDashboard(range);
}

function applyCustomRange() {
  const from = document.getElementById('date-from').value;
  const to   = document.getElementById('date-to').value;
  if (!from || !to) { alert('Please select both start and end dates.'); return; }
  loadDashboard('custom', from, to);
}

/* ── Advanced filters ─────────────────────────────── */
function applyAdvFilters() {
  advFilters = {
    purpose:  document.getElementById('filter-purpose').value,
    college:  document.getElementById('filter-college').value,
    userType: document.getElementById('filter-usertype').value,
  };
  const active = Object.values(advFilters).some(v => v !== 'all');
  document.getElementById('adv-filter-badge').classList.toggle('hidden', !active);
  loadDashboard(currentRange);
}

function resetAdvFilters() {
  document.getElementById('filter-purpose').value  = 'all';
  document.getElementById('filter-college').value  = 'all';
  document.getElementById('filter-usertype').value = 'all';
  advFilters = { purpose: 'all', college: 'all', userType: 'all' };
  document.getElementById('adv-filter-badge').classList.add('hidden');
  loadDashboard(currentRange);
}

/* ── Animated counter ─────────────────────────────── */
function animateCount(id, target) {
  const el = document.getElementById(id); if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const dur = 550; const step = 16; let t = 0;
  const timer = setInterval(() => {
    t += step;
    const p = Math.min(t / dur, 1);
    el.textContent = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3)));
    if (p >= 1) clearInterval(timer);
  }, step);
}

/* ── Charts ───────────────────────────────────────── */
const BLUES   = ['#0047AB','#1a6dd1','#3a8de8','#7bb3ef','#b3d1f7','#002f73','#003f96','#4a91d6','#6faedd','#c0d9f5','#0055cc','#2271d6'];
const YELLOWS = ['#FFD700','#f5c800','#e8b800','#d4a500','#c09200','#a07a00','#fde57a','#f7d85d','#f0cd46','#e8c12e'];

function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

function renderDailyChart(visits, range) {
  destroyChart('daily');
  let labels, data;
  if (range === 'today') {
    const h = DB.groupByHour(visits);
    labels = Object.keys(h).map(hr => { const n = parseInt(hr); return `${n === 0 ? 12 : n > 12 ? n - 12 : n}${n < 12 ? 'am' : 'pm'}`; });
    data   = Object.values(h);
  } else {
    const g = DB.groupByDay(visits); const sorted = Object.keys(g).sort();
    labels = sorted.map(d => new Date(d + 'T00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }));
    data   = sorted.map(k => g[k]);
  }
  const ctx = document.getElementById('chart-daily'); if (!ctx) return;
  charts['daily'] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Visitors', data, backgroundColor: BLUES[0], borderRadius: 6, hoverBackgroundColor: YELLOWS[0] }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }
  });
}

function renderCollegeChart(visits) {
  destroyChart('college');
  const g = DB.groupByCollege(visits);
  const ctx = document.getElementById('chart-college'); if (!ctx) return;
  charts['college'] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: Object.keys(g).map(l => l.replace('College of ', '').replace('Office / ', '')), datasets: [{ data: Object.values(g), backgroundColor: BLUES, borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12, padding: 8 } } } }
  });
}

function renderPurposeChart(visits) {
  destroyChart('purpose');
  const g = DB.groupByPurpose(visits);
  const ctx = document.getElementById('chart-purpose'); if (!ctx) return;
  charts['purpose'] = new Chart(ctx, {
    type: 'bar', indexAxis: 'y',
    data: { labels: Object.keys(g), datasets: [{ label: 'Count', data: Object.values(g), backgroundColor: YELLOWS, borderRadius: 5 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { grid: { display: false } } } }
  });
}

function renderUserTypeChart(visits) {
  destroyChart('usertype');
  const g = DB.groupByUserType(visits);
  const typeLabels = { student: 'Students', faculty: 'Faculty', staff: 'Staff' };
  const labels = Object.keys(g).map(k => typeLabels[k] || k);
  const ctx = document.getElementById('chart-usertype'); if (!ctx) return;
  charts['usertype'] = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data: Object.values(g), backgroundColor: [BLUES[0], YELLOWS[0], '#16a34a'], borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 14, padding: 10 } } } }
  });
}

function renderCollegeBreakdown(visits) {
  const g = DB.groupByCollege(visits);
  const sorted = Object.entries(g).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  const el = document.getElementById('college-breakdown-table'); if (!el) return;
  if (!sorted.length) { el.innerHTML = '<p style="color:var(--gray-400);text-align:center;padding:1.5rem;font-style:italic">No data for this period.</p>'; return; }
  el.innerHTML = sorted.map(([name, count], i) => `
    <div class="cbk-row">
      <div class="cbk-rank">${i + 1}</div>
      <div class="cbk-name">${esc(name)}</div>
      <div class="cbk-bar-wrap"><div class="cbk-bar" style="width:${(count / max) * 100}%"></div></div>
      <div class="cbk-count">${count}</div>
    </div>`).join('');
}

/* ── Visitor Logs ─────────────────────────────────── */
function loadVisitorLogs(range) {
  currentVisitorRange = range;
  filteredVisits = range === 'all' ? DB.getVisits() : getVisitsForRange(range);
  visitorPage = 1;
  renderVisitorTable();
}

function setVisitorRange(range, btn) {
  document.querySelectorAll('#section-visitors .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('visitor-search').value = '';
  document.getElementById('vsearch-clear').style.display = 'none';
  loadVisitorLogs(range);
}

function searchVisitors(q) {
  document.getElementById('vsearch-clear').style.display = q ? 'block' : 'none';
  const base = currentVisitorRange === 'all' ? DB.getVisits() : getVisitsForRange(currentVisitorRange);
  if (!q.trim()) { filteredVisits = base; }
  else {
    const lo = q.toLowerCase();
    filteredVisits = base.filter(v =>
      (v.name     || '').toLowerCase().includes(lo) ||
      (v.email    || '').toLowerCase().includes(lo) ||
      (v.college  || '').toLowerCase().includes(lo) ||
      (v.purpose  || '').toLowerCase().includes(lo) ||
      (v.schoolId || '').toLowerCase().includes(lo) ||
      (v.userType || '').toLowerCase().includes(lo)
    );
  }
  visitorPage = 1;
  renderVisitorTable();
}

function clearVisitorSearch() {
  document.getElementById('visitor-search').value = '';
  document.getElementById('vsearch-clear').style.display = 'none';
  filteredVisits = currentVisitorRange === 'all' ? DB.getVisits() : getVisitsForRange(currentVisitorRange);
  visitorPage = 1;
  renderVisitorTable();
}

function renderVisitorTable() {
  const sorted = [...filteredVisits].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const total  = sorted.length;
  const pages  = Math.ceil(total / PAGE_SIZE) || 1;
  const start  = (visitorPage - 1) * PAGE_SIZE;
  const slice  = sorted.slice(start, start + PAGE_SIZE);

  const meta = document.getElementById('visitor-table-meta');
  if (meta) meta.innerHTML = `Showing <strong>${slice.length ? start + 1 : 0}–${start + slice.length}</strong> of <strong>${total}</strong> records`;

  const typeMap = { student: 'Student', faculty: 'Faculty', staff: 'Staff' };
  const badgeMap = { student: 'badge-student', faculty: 'badge-faculty', staff: 'badge-staff' };
  const tbody = document.getElementById('visitors-tbody');
  if (!slice.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No records found.</td></tr>'; }
  else {
    tbody.innerHTML = slice.map((v, i) => {
      const d = new Date(v.timestamp);
      const typeLabel = typeMap[v.userType] || 'Student';
      const badgeClass = badgeMap[v.userType] || 'badge-student';
      return `<tr>
        <td>${start + i + 1}</td>
        <td><strong>${esc(v.name || '—')}</strong></td>
        <td><code style="font-size:.8rem">${esc(v.schoolId || '—')}</code></td>
        <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
        <td style="font-size:.82rem">${esc(v.email || '—')}</td>
        <td>${esc((v.college || '—').replace('College of ', ''))}</td>
        <td><span class="badge badge-student" style="background:var(--blue-faint);color:var(--blue)">${esc(v.purpose || '—')}</span></td>
        <td style="white-space:nowrap">${d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</td>
      </tr>`;
    }).join('');
  }

  const pg = document.getElementById('visitor-pagination'); if (!pg) return;
  if (pages <= 1) { pg.innerHTML = ''; return; }
  let html = `<span class="pg-info">Page ${visitorPage} of ${pages}</span>`;
  html += `<button class="pg-btn" onclick="changeVisitorPage(${visitorPage - 1})" ${visitorPage <= 1 ? 'disabled' : ''}>← Prev</button>`;
  for (let p = Math.max(1, visitorPage - 2); p <= Math.min(pages, visitorPage + 2); p++)
    html += `<button class="pg-btn ${p === visitorPage ? 'active' : ''}" onclick="changeVisitorPage(${p})">${p}</button>`;
  html += `<button class="pg-btn" onclick="changeVisitorPage(${visitorPage + 1})" ${visitorPage >= pages ? 'disabled' : ''}>Next →</button>`;
  pg.innerHTML = html;
}

function changeVisitorPage(p) {
  const pages = Math.ceil(filteredVisits.length / PAGE_SIZE) || 1;
  if (p < 1 || p > pages) return;
  visitorPage = p;
  renderVisitorTable();
  document.getElementById('section-visitors').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── User Management ──────────────────────────────── */
function loadUserManagement(filter) {
  currentUserFilter = filter;
  let users = DB.getUsers();
  if (filter === 'active')  users = users.filter(u => !u.isBlocked);
  if (filter === 'blocked') users = users.filter(u => u.isBlocked);
  renderUsersTable(users);
}

function setUserFilter(filter, btn) {
  document.querySelectorAll('#section-users .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('user-search').value = '';
  loadUserManagement(filter);
}

function searchUsers(q) {
  let users = DB.getUsers();
  if (currentUserFilter === 'active')  users = users.filter(u => !u.isBlocked);
  if (currentUserFilter === 'blocked') users = users.filter(u => u.isBlocked);
  if (!q.trim()) { renderUsersTable(users); return; }
  const lo = q.toLowerCase();
  renderUsersTable(users.filter(u =>
    (`${u.firstName} ${u.lastName}`).toLowerCase().includes(lo) ||
    (u.email    || '').toLowerCase().includes(lo) ||
    (u.schoolId || '').toLowerCase().includes(lo)
  ));
}

function renderUsersTable(users) {
  const meta = document.getElementById('user-table-meta');
  if (meta) meta.innerHTML = `<strong>${users.length}</strong> user${users.length !== 1 ? 's' : ''} found`;

  const tbody = document.getElementById('users-tbody');
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-row">No users found.</td></tr>'; return; }

  const typeMap  = { student: 'Student', faculty: 'Faculty', staff: 'Staff' };
  const badgeMap = { student: 'badge-student', faculty: 'badge-faculty', staff: 'badge-staff' };

  tbody.innerHTML = users.map(u => {
    const name     = `${u.firstName}${u.middleInitial ? ' ' + u.middleInitial : ''} ${u.lastName}`;
    const regDate  = new Date(u.registeredAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const visits   = DB.getVisitsByUser(u.email).length;
    const typeLabel = typeMap[u.userType] || 'Student';
    const badgeClass = badgeMap[u.userType] || 'badge-student';
    const roles    = u.roles || [u.role || 'visitor'];
    const rolePills = roles.map(r => r === 'admin'
      ? `<span class="badge" style="background:var(--blue);color:#fff">Admin</span>`
      : `<span class="badge badge-active">Visitor</span>`).join(' ');
    const statusBadge = u.isBlocked ? '<span class="badge badge-blocked">Blocked</span>' : '<span class="badge badge-active">Active</span>';
    const blockBtn = u.isBlocked
      ? `<button class="btn-block btn-unblock-action" onclick="toggleBlockUser('${u.email}',false)">Unblock</button>`
      : `<button class="btn-block btn-block-action" onclick="toggleBlockUser('${u.email}',true)">Block</button>`;
    const adminBtn = roles.includes('admin')
      ? `<button class="btn-revoke-admin" onclick="toggleAdminRole('${u.email}',false)" title="Remove admin role">− Admin</button>`
      : `<button class="btn-grant-admin" onclick="toggleAdminRole('${u.email}',true)" title="Grant admin role">+ Admin</button>`;

    return `<tr>
      <td><strong>${esc(name)}</strong><br/><small style="color:var(--gray-400);font-size:.72rem">${esc(u.schoolId || '')}</small></td>
      <td style="font-size:.82rem">${esc(u.email)}</td>
      <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
      <td style="font-size:.82rem">${esc((u.college || '—').replace('College of ', ''))}</td>
      <td style="font-size:.8rem">${regDate}</td>
      <td style="text-align:center;font-weight:700;color:var(--blue)">${visits}</td>
      <td>${rolePills}</td>
      <td>${statusBadge}</td>
      <td style="display:flex;gap:.35rem;flex-wrap:wrap">${blockBtn} ${adminBtn}</td>
    </tr>`;
  }).join('');
}

function toggleBlockUser(email, block) {
  if (!confirm(`Are you sure you want to ${block ? 'block' : 'unblock'} ${email}?`)) return;
  DB.updateUserBlockStatus(email, block);
  loadUserManagement(currentUserFilter);
}

function toggleAdminRole(email, grant) {
  const action = grant ? 'grant admin role to' : 'revoke admin role from';
  if (!confirm(`Are you sure you want to ${action} ${email}?`)) return;
  grant ? DB.grantAdminRole(email) : DB.revokeAdminRole(email);
  loadUserManagement(currentUserFilter);
}

/* ── Activity Feed ────────────────────────────────── */
function startActivityFeed() { refreshActivityFeed(); setInterval(refreshActivityFeed, 10000); }

function refreshActivityFeed() {
  const today = DB.getTodayVisits();
  const el = document.getElementById('act-today'); if (el) el.textContent = today.length;
  const el2 = document.getElementById('act-hour'); if (el2) el2.textContent = DB.getThisHourCount(today);
  const el3 = document.getElementById('act-top');  if (el3) el3.textContent = DB.getTopPurpose(today) || '—';

  const all    = [...DB.getVisits()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 40);
  const feed   = document.getElementById('activity-feed'); if (!feed) return;
  if (!all.length) { feed.innerHTML = '<p class="activity-empty">No check-ins recorded yet.</p>'; return; }

  feed.innerHTML = all.map(v => {
    const typeMap  = { student: 'Student', faculty: 'Faculty', staff: 'Staff' };
    return `<div class="activity-item">
      <div class="ai-avatar">${esc((v.name || '?')[0].toUpperCase())}</div>
      <div class="ai-body">
        <p class="ai-name">${esc(v.name || 'Unknown')}</p>
        <p class="ai-detail">${esc((v.college || '').replace('College of ', ''))} &nbsp;•&nbsp; ${typeMap[v.userType] || 'Student'}</p>
      </div>
      <span class="ai-purpose">${esc(v.purpose || '—')}</span>
      <span class="ai-time">${timeAgo(new Date(v.timestamp))}</span>
    </div>`;
  }).join('');
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

/* ── Utility ──────────────────────────────────────── */
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
