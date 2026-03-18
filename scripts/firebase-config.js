/* =========================================================
   firebase-config.js
   ─────────────────────────────────────────────────────────
   INSTRUCTIONS:
   1. Go to console.firebase.google.com
   2. Open your project → Project Settings (gear icon)
   3. Scroll down to "Your apps" → click your web app (</>)
   4. Copy the firebaseConfig object and paste it below,
      replacing the placeholder values.
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyB0Ge9njb9YXDcy9XbGT7HNvV7glj9DXlQ",
  authDomain: "neu-library-1591c.firebaseapp.com",
  projectId: "neu-library-1591c",
  storageBucket: "neu-library-1591c.firebasestorage.app",
  messagingSenderId: "257690136796",
  appId: "1:257690136796:web:600af75aa873e6471bc419"
};

// ── Initialize Firebase ───────────────────────────────
import { initializeApp }                        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider,
         signInWithPopup, signOut,
         onAuthStateChanged }                   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc,
         collection, addDoc, query, where,
         orderBy, getDocs, updateDoc,
         serverTimestamp, Timestamp }           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

// Restrict Google Sign-In to NEU domain only
provider.setCustomParameters({ hd: 'neu.edu.ph' });

export { auth, db, provider, firebaseConfig, GoogleAuthProvider,
         signInWithPopup, signOut, onAuthStateChanged,
         doc, getDoc, setDoc, collection, addDoc,
         query, where, orderBy, getDocs, updateDoc,
         serverTimestamp, Timestamp };
