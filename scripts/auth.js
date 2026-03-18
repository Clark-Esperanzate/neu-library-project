/* =========================================================
   auth.js  –  Authentication & Authorization
   - Institutional domain enforcement (@neu.edu.ph)
   - Role-based access control (visitor / admin)
   - Role switching within the same session
   - Google Sign-In support (institutional domain restricted)
   ========================================================= */

const AUTH = {
  DOMAIN: '@neu.edu.ph',

  isInstitutionalEmail(email) {
    return typeof email === 'string' && email.trim().toLowerCase().endsWith(this.DOMAIN);
  },

  /* Standard login (email or school ID + password) */
  login(identifier, password) {
    if (!identifier || !password)
      return { success: false, error: 'Please enter your ID number or email, and password.' };

    let user = null;
    if (identifier.includes('@')) {
      if (!this.isInstitutionalEmail(identifier))
        return { success: false, error: 'Only @neu.edu.ph institutional email addresses are permitted.' };
      user = DB.getUserByEmail(identifier.trim());
    } else {
      user = DB.getUserBySchoolId(identifier.trim());
    }

    if (!user)
      return { success: false, error: 'No account found. Please check your credentials or register first.' };
    if (user.password !== password)
      return { success: false, error: 'Incorrect password. Please try again.' };
    if (user.isBlocked)
      return { success: false, error: 'This account has been suspended. Please contact library administration.' };

    return this._createSession(user);
  },

  /* Google Sign-In callback — called after Google OAuth resolves */
  handleGoogleSignIn(googleUser) {
    const email = googleUser.email || (googleUser.getBasicProfile?.()?.getEmail?.());
    if (!email) return { success: false, error: 'Could not retrieve email from Google account.' };
    if (!this.isInstitutionalEmail(email))
      return { success: false, error: 'Only @neu.edu.ph Google accounts are permitted.' };

    let user = DB.getUserByEmail(email);
    if (!user) {
      // Auto-register from Google profile
      const name  = googleUser.name || googleUser.getBasicProfile?.()?.getName?.() || '';
      const parts = name.trim().split(' ');
      const firstName = parts[0] || 'User';
      const lastName  = parts.slice(1).join(' ') || '';
      user = DB.addUser({
        schoolId: '', firstName, middleInitial: '', lastName,
        email: email.toLowerCase(),
        college: '', program: '',
        password: '', // no password — Google-only account
        role: 'visitor', roles: ['visitor'], userType: 'student',
        googleAccount: true
      });
    }

    if (user.isBlocked)
      return { success: false, error: 'This account has been suspended. Please contact library administration.' };

    return this._createSession(user);
  },

  _createSession(user) {
    const { password: _, ...safe } = user;
    const roles = DB.getUserRoles(user.email);
    // Active role: prefer the highest privilege available
    safe.activeRole = roles.includes('admin') ? 'admin' : 'visitor';
    safe.roles = roles;
    DB.setSession(safe);
    return { success: true, user: safe };
  },

  /* Registration */
  register(data) {
    const { schoolId, firstName, lastName, email, college, program, password, confirmPassword, userType } = data;
    if (!schoolId || !firstName || !lastName || !email || !college || !program || !password)
      return { success: false, error: 'All required fields must be completed.' };
    if (!this.isInstitutionalEmail(email))
      return { success: false, error: 'Only @neu.edu.ph institutional email addresses are accepted.' };
    if (!/^\d{2}-\d{4,6}-\d{3,4}$/.test(schoolId.trim()))
      return { success: false, error: 'School ID must follow the format: YY-NNNNN-NNN (e.g. 24-*****-***).' };
    if (password.length < 8)
      return { success: false, error: 'Password must be at least 8 characters.' };
    if (password !== confirmPassword)
      return { success: false, error: 'Passwords do not match.' };
    if (DB.getUserByEmail(email))
      return { success: false, error: 'An account with this email address already exists.' };
    if (DB.getUserBySchoolId(schoolId))
      return { success: false, error: 'An account with this School ID already exists.' };

    DB.addUser({ ...data, role: 'visitor', roles: ['visitor'], userType: userType || 'student' });
    return { success: true };
  },

  /* Route guards */
  requireAuth() {
    const s = DB.getSession();
    if (!s) { window.location.href = 'index.html'; return null; }
    return s;
  },

  requireAdmin() {
    const s = this.requireAuth();
    if (!s) return null;
    if (s.activeRole !== 'admin') { window.location.href = 'visitor-checkin.html'; return null; }
    return s;
  },

  requireVisitor() {
    const s = this.requireAuth();
    if (!s) return null;
    if (s.activeRole === 'admin') { window.location.href = 'admin-dashboard.html'; return null; }
    return s;
  },

  /* Switch active role without logging out */
  switchRole(role) {
    const ok = DB.switchSessionRole(role);
    if (!ok) return false;
    if (role === 'admin') window.location.href = 'admin-dashboard.html';
    else window.location.href = 'visitor-checkin.html';
    return true;
  }
};

/* ── Globals ──────────────────────────────────────── */
function logout() { DB.clearSession(); window.location.href = 'index.html'; }

function togglePassword(id, btn) {
  const inp = document.getElementById(id); if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.style.opacity = inp.type === 'text' ? '1' : '0.55';
}
