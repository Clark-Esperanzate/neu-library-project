/* =========================================================
   data-store.js  –  localStorage data layer
   ID format: YY-NNNNN-NNN  (e.g. 24-13268-870)
   Roles: 'visitor' | 'admin'  (one account can hold both)
   userType: 'student' | 'faculty' | 'staff'
   ========================================================= */

const DB = {

  _get(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  _set(key, data) { localStorage.setItem(key, JSON.stringify(data)); },

  /* ── Users ──────────────────────────────────────── */
  getUsers()   { return this._get('neu_users'); },
  saveUsers(u) { this._set('neu_users', u); },

  getUserByEmail(email) {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  getUserBySchoolId(id) {
    const norm = s => String(s).replace(/[\s\-]/g, '').toLowerCase();
    return this.getUsers().find(u => norm(u.schoolId) === norm(id));
  },

  addUser(data) {
    const users = this.getUsers();
    const user = {
      ...data,
      id: 'u_' + Date.now(),
      registeredAt: new Date().toISOString(),
      isBlocked: false,
      role: data.role || 'visitor',
      roles: data.roles || [data.role || 'visitor'],
      userType: data.userType || 'student'
    };
    users.push(user);
    this.saveUsers(users);
    return user;
  },

  updateUser(email, changes) {
    const users = this.getUsers();
    const i = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (i !== -1) { users[i] = { ...users[i], ...changes }; this.saveUsers(users); return users[i]; }
    return null;
  },

  updateUserBlockStatus(email, isBlocked) { return !!this.updateUser(email, { isBlocked }); },

  grantAdminRole(email) {
    const users = this.getUsers();
    const i = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (i === -1) return false;
    users[i].roles = [...new Set([...(users[i].roles || []), 'admin'])];
    users[i].role = 'admin';
    this.saveUsers(users);
    return true;
  },

  revokeAdminRole(email) {
    const users = this.getUsers();
    const i = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (i === -1) return false;
    users[i].roles = (users[i].roles || ['visitor']).filter(r => r !== 'admin');
    if (!users[i].roles.length) users[i].roles = ['visitor'];
    users[i].role = users[i].roles[0];
    this.saveUsers(users);
    return true;
  },

  getUserRoles(email) {
    const u = this.getUserByEmail(email);
    if (!u) return ['visitor'];
    return u.roles || [u.role || 'visitor'];
  },

  /* ── Visits ─────────────────────────────────────── */
  getVisits()   { return this._get('neu_visits'); },
  saveVisits(v) { this._set('neu_visits', v); },

  addVisit(data) {
    const visits = this.getVisits();
    const visit = { ...data, id: 'v_' + Date.now(), timestamp: new Date().toISOString() };
    visits.push(visit);
    this.saveVisits(visits);
    return visit;
  },

  getVisitsByUser(email) {
    return this.getVisits().filter(v => v.email.toLowerCase() === email.toLowerCase());
  },

  getVisitsByRange(start, end) {
    const s = new Date(start); s.setHours(0,0,0,0);
    const e = new Date(end);   e.setHours(23,59,59,999);
    return this.getVisits().filter(v => { const d = new Date(v.timestamp); return d >= s && d <= e; });
  },

  getTodayVisits()    { const t = new Date(); return this.getVisitsByRange(t, t); },
  getThisWeekVisits() { const t = new Date(); const s = new Date(t); s.setDate(t.getDate() - t.getDay()); return this.getVisitsByRange(s, t); },
  getThisMonthVisits(){ const t = new Date(); return this.getVisitsByRange(new Date(t.getFullYear(), t.getMonth(), 1), t); },

  /* Advanced filter: { purpose, college, userType } all optional */
  filterVisits(visits, f = {}) {
    return visits.filter(v => {
      if (f.purpose  && f.purpose  !== 'all' && v.purpose  !== f.purpose)  return false;
      if (f.college  && f.college  !== 'all' && v.college  !== f.college)  return false;
      if (f.userType && f.userType !== 'all' && v.userType !== f.userType) return false;
      return true;
    });
  },

  /* ── Analytics ──────────────────────────────────── */
  groupByCollege(v)  { return v.reduce((a,x)=>{ const k=x.college||'Unknown'; a[k]=(a[k]||0)+1; return a; },{}); },
  groupByPurpose(v)  { return v.reduce((a,x)=>{ const k=x.purpose||'Unknown'; a[k]=(a[k]||0)+1; return a; },{}); },
  groupByUserType(v) { return v.reduce((a,x)=>{ const k=x.userType||'student'; a[k]=(a[k]||0)+1; return a; },{}); },
  groupByDay(v)      { return v.reduce((a,x)=>{ const k=x.timestamp.slice(0,10); a[k]=(a[k]||0)+1; return a; },{}); },
  groupByHour(v)     { const h={}; for(let i=0;i<24;i++) h[i]=0; v.forEach(x=>{ const hr=new Date(x.timestamp).getHours(); h[hr]=(h[hr]||0)+1; }); return h; },

  getPeakHour(v) {
    if (!v.length) return null;
    const h = this.groupByHour(v);
    const [hr, ct] = Object.entries(h).sort((a,b)=>b[1]-a[1])[0] || [];
    if (!ct) return null;
    const n = parseInt(hr);
    return `${n===0?12:n>12?n-12:n}:00 ${n<12?'AM':'PM'}`;
  },
  getTopCollege(v)  { if (!v.length) return '—'; const g=this.groupByCollege(v); return Object.entries(g).sort((a,b)=>b[1]-a[1])[0]?.[0]?.replace('College of ','') || '—'; },
  getTopPurpose(v)  { if (!v.length) return '—'; const g=this.groupByPurpose(v); return Object.entries(g).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—'; },
  getThisHourCount(v){ const hr=new Date().getHours(); return v.filter(x=>new Date(x.timestamp).getHours()===hr).length; },

  /* ── Session ────────────────────────────────────── */
  setSession(u)  { sessionStorage.setItem('neu_session', JSON.stringify(u)); },
  getSession()   { try { return JSON.parse(sessionStorage.getItem('neu_session')); } catch { return null; } },
  clearSession() { sessionStorage.removeItem('neu_session'); },

  switchSessionRole(role) {
    const s = this.getSession(); if (!s) return false;
    if (!this.getUserRoles(s.email).includes(role)) return false;
    s.activeRole = role;
    this.setSession(s);
    return true;
  },

  /* ── Seed accounts only — ZERO visits ──────────── */
  seedDemoData() {
    if (this.getUsers().length > 0) return;

    // Admin (also visitor role for switching)
    this.addUser({ schoolId:'ADM-001', firstName:'J.', middleInitial:'C.', lastName:'Esperanza',
      email:'jcesperanza@neu.edu.ph', college:'Office / Administration', program:'Library Services',
      password:'', role:'admin', roles:['admin','visitor'], userType:'staff' });

    // Demo visitor/admin
    this.addUser({ schoolId:'24-13268-870', firstName:'Clark', middleInitial:'L.', lastName:'Esperanzate',
      email:'clark.esperanzate@neu.edu.ph', college:'College of Computer Studies', program:'BS Information Technology',
      password:'Taskaru777', role:'admin', roles:['admin','visitor'], userType:'student' });

    // No visits seeded — log is empty until real users check in
  }
};

/* ── Schema version guard ───────────────────────────
   Bumping SCHEMA_VERSION wipes all old localStorage
   data and re-seeds clean accounts with zero visits.
   Change this number any time a breaking data change
   is made.
   ─────────────────────────────────────────────────── */
const SCHEMA_VERSION = '7';

(function migrateIfNeeded() {
  const stored = localStorage.getItem('neu_schema_version');
  if (stored !== SCHEMA_VERSION) {
    // Clear all app data
    ['neu_users', 'neu_visits'].forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem('neu_session');
    localStorage.setItem('neu_schema_version', SCHEMA_VERSION);
  }
})();

DB.seedDemoData();
