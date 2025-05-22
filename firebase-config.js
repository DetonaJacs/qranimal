import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDwvoBfcMcpQEoPvEril8iGbDMOviLDdxI",
  authDomain: "qranimal-c7da5.firebaseapp.com",
  projectId: "qranimal-c7da5",
  storageBucket: "qranimal-c7da5.firebasestorage.app",
  messagingSenderId: "418822013678",
  appId: "1:418822013678:web:52355af7cb57e61fbd29ff",
  measurementId: "G-7NV3NQN1TE"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
