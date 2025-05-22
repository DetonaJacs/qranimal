import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwvoBfcMcpQEoPvEril8iGbDMOviLDdxI",
  authDomain: "qranimal-c7da5.firebaseapp.com",
  projectId: "qranimal-c7da5",
  storageBucket: "qranimal-c7da5.appspot.com",
  messagingSenderId: "418822013678",
  appId: "1:418822013678:web:52355af7cb57e61fbd29ff",
  measurementId: "G-7NV3NQN1TE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Configurações adicionais do provedor Google
provider.setCustomParameters({
  prompt: 'select_account'
});

export { db, auth, provider };
