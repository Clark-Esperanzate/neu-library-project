/* =========================================================
   firebase-auth.js
   Handles Firebase Google Sign-In + Firestore user sync.
   Drop this into /scripts/ and add it to index.html AFTER
   firebase-config.js.

   This REPLACES the Google Sign-In portion of auth.js.
   The email/password login in auth.js still works as-is
   (stored in localStorage for offline use).
   ========================================================= */

import {
  auth, db, provider,
  signInWithPopup, signOut,
  onAuthStateChanged,
  doc, getDoc, setDoc
} from './firebase-config.js';

const NEU_DOMAIN = '@neu.edu.ph';

/* ── Google Sign-In via Firebase ──────────────────── */
async function firebaseGoogleSignIn() {
  const btn    = document.getElementById('google-signin-btn');
  const errEl  = document.getElementById('error-alert');
  errEl.classList.add('hidden');

  // Show loading state on button
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span style="letter-spacing:.15em;opacity:.7">● ● ●</span>`;

  try {
    const result = await signInWithPopup(auth, provider);
    const user   = result.user;
    const email  = user.email?.toLowerCase();

    // Enforce institutional domain
    if (!email || !email.endsWith(NEU_DOMAIN)) {
      await signOut(auth);
      showError(`Only @neu.edu.ph Google accounts are permitted. You signed in with: ${user.email}`);
      return;
    }

    // Look up user profile — check Firestore by UID first, then by email
    const userRef  = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    let profile;
    if (userSnap.exists()) {
      // Found in Firestore by UID
      profile = userSnap.data();
    } else {
      // Not found by UID — check localStorage by email
      // (accounts originally created via password login)
      const localUser = DB.getUserByEmail(email);

      if (localUser) {
        // Existing account found — migrate it to Firestore
        const { password: _, ...safeLocal } = localUser;
        profile = {
          ...safeLocal,
          uid:           user.uid,
          googleAccount: true,
          needsProfile:  false  // already has full profile
        };
        // Save to Firestore so future Google logins work
        await setDoc(userRef, profile);
        // Update localStorage record with Firebase UID
        DB.updateUser(email, { uid: user.uid, googleAccount: true });
      } else {
        // Truly new user — needs to complete profile
        const nameParts = (user.displayName || '').trim().split(' ');
        profile = {
          uid:           user.uid,
          email,
          firstName:     nameParts[0] || 'User',
          middleInitial: '',
          lastName:      nameParts.slice(1).join(' ') || '',
          schoolId:      '',
          college:       '',
          program:       '',
          userType:      'student',
          role:          'visitor',
          roles:         ['visitor'],
          isBlocked:     false,
          googleAccount: true,
          registeredAt:  new Date().toISOString(),
          needsProfile:  true
        };
        await setDoc(userRef, profile);
      }
    }

    // Blocked check — applies regardless of how profile was found
    if (profile.isBlocked) {
      await signOut(auth);
      showError('This account has been suspended. Please contact library administration.');
      return;
    }

    // Sync into localStorage session (keeps the rest of the app working)
    const roles      = profile.roles || [profile.role || 'visitor'];
    const activeRole = roles.includes('admin') ? 'admin' : 'visitor';
    const session    = { ...profile, activeRole, roles, firebaseUid: user.uid };
    DB.setSession(session);

    // Redirect based on role
    if (profile.needsProfile) {
      // New Google user — send to a profile completion page first
      window.location.href = 'complete-profile.html';
    } else if (activeRole === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'visitor-checkin.html';
    }

  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      // User closed the popup — not an error, just restore button
    } else if (err.code === 'auth/popup-blocked') {
      showError('Popup was blocked by your browser. Please allow popups for this site and try again.');
    } else {
      showError('Google Sign-In failed. Please try again or use email/password.');
      console.error('Firebase sign-in error:', err);
    }
  } finally {
    btn.innerHTML = originalHTML;
    btn.disabled  = false;
  }
}

/* ── Firebase logout (in addition to local logout) ── */
async function firebaseLogout() {
  try { await signOut(auth); } catch {}
  DB.clearSession();
  window.location.href = 'index.html';
}

/* ── Auth state watcher ───────────────────────────── */
// Keeps the local session in sync if Firebase session expires
onAuthStateChanged(auth, (user) => {
  if (!user) {
    const session = DB.getSession();
    if (session?.firebaseUid) {
      // Firebase session expired — clear local session too
      DB.clearSession();
      if (!window.location.pathname.includes('index.html') &&
          !window.location.pathname.endsWith('/')) {
        window.location.href = 'index.html';
      }
    }
  }
});

/* ── Helper ───────────────────────────────────────── */
function showError(msg) {
  const el = document.getElementById('error-alert');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

export { firebaseGoogleSignIn, firebaseLogout };