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

// Configuração do provedor Google
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
  redirect_uri: window.location.origin // Adiciona o URI de redirecionamento explícito
});

export { db, auth, provider };
