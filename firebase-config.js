import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwvoBfcMcpQEoPvEril8iGbDMOviLDdxI",
  authDomain: "qranimal-c7da5.firebaseapp.com",
  projectId: "qranimal-c7da5",
  storageBucket: "qranimal-c7da5.firebasestorage.app",
  messagingSenderId: "418822013678",
  appId: "1:418822013678:web:52355af7cb57e61fbd29ff",
  measurementId: "G-7NV3NQN1TE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Configure o provedor do Google para seu email específico
provider.setCustomParameters({
  login_hint: 'jacson311@gmail.com' // Substitua pelo seu email
});

export { db, auth, provider };
