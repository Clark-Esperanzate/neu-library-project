/* =========================================================
   auth.js  –  Authentication & Authorization
   Google Sign-In ONLY — no password login
   ========================================================= */

const AUTH = {
  DOMAIN: '@neu.edu.ph',

  isInstitutionalEmail(email) {
    return typeof email === 'string' && email.trim().toLowerCase().endsWith(this.DOMAIN);
  },

  /* Google Sign-In callback — primary auth method */
  handleGoogleSignIn(googleUser) {
    const email = googleUser.email || (googleUser.getBasicProfile?.()?.getEmail?.());
    if (!email) return { success: false, error: 'Could not retrieve email from Google account.' };
    if (!this.isInstitutionalEmail(email))
      return { success: false, error: 'Only @neu.edu.ph Google accounts are permitted.' };

    let user = DB.getUserByEmail(email);
    if (!user) {
      const name  = googleUser.name || googleUser.getBasicProfile?.()?.getName?.() || '';
      const parts = name.trim().split(' ');
      user = DB.addUser({
        schoolId: '', firstName: parts[0] || 'User', middleInitial: '',
        lastName: parts.slice(1).join(' ') || '',
        email: email.toLowerCase(), college: '', program: '',
        password: '', role: 'visitor', roles: ['visitor'],
        userType: 'student', googleAccount: true
      });
    }

    if (user.isBlocked)
      return { success: false, error: 'This account has been suspended. Please contact library administration.' };

    return this._createSession(user);
  },

  _createSession(user) {
    const { password: _, ...safe } = user;
    const roles = DB.getUserRoles(user.email);
    safe.activeRole = roles.includes('admin') ? 'admin' : 'visitor';
    safe.roles = roles;
    DB.setSession(safe);
    return { success: true, user: safe };
  },

  /* Registration — still used for first-time Google users completing profile */
  register(data) {
    const { schoolId, firstName, lastName, email, college, program, userType } = data;
    if (!schoolId || !firstName || !lastName || !email || !college || !program)
      return { success: false, error: 'All required fields must be completed.' };
    if (!this.isInstitutionalEmail(email))
      return { success: false, error: 'Only @neu.edu.ph institutional email addresses are accepted.' };
    if (!/^\d{2}-\d{4,6}-\d{3,4}$/.test(schoolId.trim()))
      return { success: false, error: 'School ID must follow the format: YY-NNNNN-NNN (e.g. 24-*****-***).' };
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

  switchRole(role) {
    const ok = DB.switchSessionRole(role);
    if (!ok) return false;
    if (role === 'admin') window.location.href = 'admin-dashboard.html';
    else window.location.href = 'visitor-checkin.html';
    return true;
  }
};

function logout() { DB.clearSession(); window.location.href = 'index.html'; }

function togglePassword(id, btn) {
  const inp = document.getElementById(id); if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.style.opacity = inp.type === 'text' ? '1' : '0.55';
}
