/* =========================================================
   firebase-auth.js
   Handles Firebase Google Sign-In + Firestore user sync.
   ========================================================= */

import {
  auth, db, provider,
  signInWithPopup, signOut,
  onAuthStateChanged,
  doc, getDoc, setDoc, updateDoc,
  collection, query, where, getDocs, addDoc, deleteDoc
} from './firebase-config.js';

const NEU_DOMAIN = '@neu.edu.ph';

/* ── Google Sign-In via Firebase ──────────────────── */
async function firebaseGoogleSignIn() {
  const btn   = document.getElementById('google-signin-btn');
  const errEl = document.getElementById('error-alert');
  errEl.classList.add('hidden');

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

    // Step 1: Check Firestore by UID
    const userRef  = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    let profile;

    if (userSnap.exists()) {
      // Found by UID — use Firestore as source of truth
      profile = userSnap.data();

    } else {
      // Step 2: Not found by UID — check Firestore by email
      const emailQuery = query(collection(db, 'users'), where('email', '==', email));
      const emailSnap  = await getDocs(emailQuery);

      if (!emailSnap.empty) {
        // Found by email in Firestore — update UID and reuse
        const existingDoc  = emailSnap.docs[0];
        profile = existingDoc.data();
        // Link this Firebase UID to the existing Firestore record
        await updateDoc(doc(db, 'users', existingDoc.id), {
          uid: user.uid, googleAccount: true
        });
        // Copy to the correct UID-keyed document
        await setDoc(userRef, { ...profile, uid: user.uid, googleAccount: true });

      } else {
        // Step 3: Check localStorage by email (password accounts not yet in Firestore)
        const localUser = DB.getUserByEmail(email);

        if (localUser) {
          // Migrate localStorage account to Firestore — preserve roles
          const { password: _, ...safeLocal } = localUser;
          const migratedRoles = localUser.roles || [localUser.role || 'visitor'];
          profile = {
            ...safeLocal,
            uid:           user.uid,
            googleAccount: true,
            needsProfile:  false,
            roles:         migratedRoles,
            role:          migratedRoles.includes('admin') ? 'admin' : 'visitor'
          };
          await setDoc(userRef, profile);
          DB.updateUser(email, { uid: user.uid, googleAccount: true });

        } else {
          // Brand new user — needs to complete profile
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
    }

    // Blocked check
    if (profile.isBlocked) {
      await signOut(auth);
      showError('This account has been suspended. Please contact library administration.');
      return;
    }

    // Build session — roles from Firestore are the source of truth
    const roles      = profile.roles || [profile.role || 'visitor'];
    const activeRole = roles.includes('admin') ? 'admin' : 'visitor';
    const session    = { ...profile, activeRole, roles, firebaseUid: user.uid };

    // Sync to localStorage so the rest of the app works
    DB.setSession(session);

    // Also sync to localStorage users so admin dashboard can see them
    if (!DB.getUserByEmail(email)) {
      const { password: _, ...safe } = profile;
      DB.addUser({ ...safe, password: '' });
    } else {
      DB.updateUser(email, { roles, role: profile.role, uid: user.uid });
    }

    // Redirect
    if (profile.needsProfile) {
      window.location.href = 'complete-profile.html';
    } else if (activeRole === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'visitor-checkin.html';
    }

  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request') {
      // Silent — user closed popup
    } else if (err.code === 'auth/popup-blocked') {
      showError('Popup was blocked. Please allow popups for this site and try again.');
    } else {
      showError('Google Sign-In failed. Please try again or use email/password.');
      console.error('Firebase sign-in error:', err);
    }
  } finally {
    btn.innerHTML = originalHTML;
    btn.disabled  = false;
  }
}

/* ── Delete a user account (admin use) ───────────── */
async function deleteUserAccount(email) {
  // Delete from Firestore
  try {
    const q    = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, 'users', d.id));
    }
  } catch (err) {
    console.error('Firestore delete error:', err);
  }

  // Delete from localStorage
  const users = DB.getUsers().filter(u => u.email.toLowerCase() !== email.toLowerCase());
  DB.saveUsers(users);

  // Also delete their visits from localStorage
  const visits = DB.getVisits().filter(v => v.email.toLowerCase() !== email.toLowerCase());
  DB.saveVisits(visits);
}

/* ── Firebase logout ─────────────────────────────── */
async function firebaseLogout() {
  try { await signOut(auth); } catch {}
  DB.clearSession();
  window.location.href = 'index.html';
}

/* ── Auth state watcher ──────────────────────────── */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    const session = DB.getSession();
    if (session?.firebaseUid) {
      DB.clearSession();
      if (!window.location.pathname.includes('index.html') &&
          !window.location.pathname.endsWith('/')) {
        window.location.href = 'index.html';
      }
    }
  }
});

/* ── Helper ──────────────────────────────────────── */
function showError(msg) {
  const el = document.getElementById('error-alert');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}


/* ── Write visit to Firestore ────────────────────── */
async function addVisitToFirestore(visitData) {
  try {
    const docRef = await addDoc(collection(db, 'visits'), {
      userId:    visitData.userId    || '',
      email:     visitData.email     || '',
      name:      visitData.name      || '',
      schoolId:  visitData.schoolId  || '—',
      college:   visitData.college   || '',
      purpose:   visitData.purpose   || '',
      notes:     visitData.notes     || '',
      userType:  visitData.userType  || 'student',
      timestamp: visitData.timestamp || new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.warn('Firestore visit write failed:', e.message);
    return null;
  }
}

/* ── Sync visits from Firestore into localStorage ── */
async function syncVisitsFromFirestore() {
  try {
    const snap = await getDocs(collection(db, 'visits'));
    const firestoreVisits = snap.docs.map(d => {
      const data = d.data();
      return {
        id:        d.id,
        userId:    data.userId    || '',
        email:     data.email     || '',
        name:      data.name      || '',
        schoolId:  data.schoolId  || '—',
        college:   data.college   || '',
        purpose:   data.purpose   || '',
        notes:     data.notes     || '',
        userType:  data.userType  || 'student',
        timestamp: data.timestamp || new Date().toISOString()
      };
    });

    // MERGE: don't wipe local visits — combine with Firestore visits
    // Local visits that aren't in Firestore yet (e.g. just written) are kept
    const localVisits  = DB.getVisits();
    const firestoreIds = new Set(firestoreVisits.map(v => v.id));

    // Keep local visits that don't have a Firestore ID match
    const localOnly = localVisits.filter(v => !firestoreIds.has(v.id));

    // Also push any local-only visits up to Firestore so they persist
    for (const v of localOnly) {
      try {
        await addDoc(collection(db, 'visits'), {
          userId:    v.userId    || '',
          email:     v.email     || '',
          name:      v.name      || '',
          schoolId:  v.schoolId  || '—',
          college:   v.college   || '',
          purpose:   v.purpose   || '',
          notes:     v.notes     || '',
          userType:  v.userType  || 'student',
          timestamp: v.timestamp || new Date().toISOString()
        });
      } catch (e) { /* will retry next sync */ }
    }

    // Re-fetch after uploading local-only visits
    const finalSnap = localOnly.length > 0
      ? await getDocs(collection(db, 'visits'))
      : snap;

    const allVisits = (localOnly.length > 0 ? finalSnap : snap).docs.map(d => {
      const data = d.data();
      return {
        id:        d.id,
        userId:    data.userId    || '',
        email:     data.email     || '',
        name:      data.name      || '',
        schoolId:  data.schoolId  || '—',
        college:   data.college   || '',
        purpose:   data.purpose   || '',
        notes:     data.notes     || '',
        userType:  data.userType  || 'student',
        timestamp: data.timestamp || new Date().toISOString()
      };
    });

    allVisits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    DB.saveVisits(allVisits);
    return allVisits;

  } catch (e) {
    console.warn('Firestore visit sync failed:', e.message);
    return DB.getVisits(); // return local data unchanged
  }
}

/* ── Sync users from Firestore into localStorage ─── */
async function syncUsersFromFirestore() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const firestoreUsers = snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));

    firestoreUsers.forEach(fu => {
      if (!fu.email) return; // skip malformed records

      const existing = DB.getUserByEmail(fu.email);
      if (!existing) {
        // New user found in Firestore — add to localStorage
        // Users with needsProfile:true still appear in User Management
        DB.addUser({
          schoolId:      fu.schoolId      || '—',
          firstName:     fu.firstName     || fu.email.split('@')[0],
          middleInitial: fu.middleInitial || '',
          lastName:      fu.lastName      || '',
          email:         fu.email,
          college:       fu.college       || '(profile incomplete)',
          program:       fu.program       || '(profile incomplete)',
          password:      '',
          role:          fu.role          || 'visitor',
          roles:         fu.roles         || ['visitor'],
          userType:      fu.userType      || 'student',
          isBlocked:     fu.isBlocked     || false,
          googleAccount: true,
          registeredAt:  fu.registeredAt  || new Date().toISOString(),
          needsProfile:  fu.needsProfile  || false,
          uid:           fu.uid           || fu.firestoreId
        });
      } else {
        // Update existing — Firestore is source of truth
        DB.updateUser(fu.email, {
          roles:     fu.roles      || existing.roles,
          role:      fu.role       || existing.role,
          isBlocked: fu.isBlocked  !== undefined ? fu.isBlocked : existing.isBlocked,
          college:   fu.college    || existing.college,
          program:   fu.program    || existing.program,
          schoolId:  fu.schoolId   || existing.schoolId,
          firstName: fu.firstName  || existing.firstName,
          lastName:  fu.lastName   || existing.lastName,
        });
      }
    });
    return DB.getUsers();
  } catch (e) {
    console.warn('Firestore user sync failed:', e.message);
    return DB.getUsers();
  }
}

export { firebaseGoogleSignIn, firebaseLogout, deleteUserAccount,
         addVisitToFirestore, syncVisitsFromFirestore, syncUsersFromFirestore };