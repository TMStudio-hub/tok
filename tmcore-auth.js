import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as _signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAhHj6X7c61NMzwSG0zMkaQur-bAPmwkOo",
  authDomain: "tm-ops-44e43.firebaseapp.com",
  projectId: "tm-ops-44e43",
  storageBucket: "tm-ops-44e43.firebasestorage.app",
  messagingSenderId: "849196799707",
  appId: "1:849196799707:web:30346b456a8310657cdefe",
};

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
const _db = getFirestore(app);
const _accessRef = doc(_db, "config", "access");

export function getCurrentUser() {
  return auth.currentUser;
}

export async function getAllowedEmails() {
  const snap = await getDoc(_accessRef);
  return snap.exists() ? (snap.data().emails || []) : [];
}

export async function setAllowedEmails(emails) {
  await setDoc(_accessRef, { emails });
}

/**
 * Guards a page: waits for Firebase Auth to settle.
 * If no user is logged in, redirects to login.html and never resolves.
 * Returns the authenticated user.
 */
export async function guardPage(redirectTo = "login.html") {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) { window.location.replace(redirectTo); return; }
      try {
        const snap = await getDoc(_accessRef);
        if (snap.exists()) {
          const emails = snap.data().emails || [];
          if (emails.length > 0 && !emails.includes(user.email)) {
            await _signOut(auth);
            window.location.replace(redirectTo + (redirectTo.includes('?') ? '&' : '?') + 'blocked=1');
            return;
          }
        }
      } catch (_) { /* Si no se puede leer la config, dejamos pasar */ }
      resolve(user);
    });
  });
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function logOut(redirectTo = "login.html") {
  try { await _signOut(auth); } catch (_) { /* ignore */ }
  window.location.replace(redirectTo);
}

export { onAuthStateChanged };
