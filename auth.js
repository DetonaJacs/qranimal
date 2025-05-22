import { db, auth, provider } from './firebase-config.js';
import { 
  doc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { 
  signInWithPopup, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Configuração inicial
const loginContainer = document.getElementById('login-container');
const authMessage = document.getElementById('auth-message');
const formContainer = document.getElementById('form-container');
const dataContainer = document.getElementById('dados-animal');
const googleLoginBtn = document.getElementById('googleLogin');

let currentUser = null;
let animalId = null;

// Verificar ID do animal na URL
function getAnimalId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  
  if (!id || !/^[a-zA-Z0-9_-]{8,32}$/.test(id)) {
    showMessage("ID do animal inválido ou não especificado.", true);
    return null;
  }
  return id;
}

// Configurar autenticação
function setupAuth() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateUI();
    
    if (user) {
      checkAnimalData();
    }
  });

  googleLoginBtn.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      showMessage(`Erro no login: ${error.message}`, true);
    }
  });
}

// Atualizar interface
function updateUI() {
  if (currentUser) {
    loginContainer.style.display = 'none';
    showMessage(`Logado como: ${currentUser.email}`, false);
  } else {
    loginContainer.style.display = 'block';
    formContainer.style.display = 'none';
    dataContainer.style.display = 'none';
  }
}

// Verificar dados do animal
async function checkAnimalData() {
  animalId = getAnimalId();
  if (!animalId) return;

  try {
    const docRef = doc(db, "animais", animalId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      showAnimalData(docSnap.data());
    } else if (currentUser) {
      showAnimalForm();
    }
  } catch (error) {
    showMessage(`Erro ao acessar dados: ${error.message}`, true);
  }
}

// Mostrar dados do animal
function showAnimalData(data) {
  document.getElementById("vNome").textContent = data.nome || "Não informado";
  document.getElementById("vEspecie").textContent = data.especie || "Não informado";
  document.getElementById("vRaca").textContent = data.raca || "Não informado";
  document.getElementById("vObs").textContent = data.observacoes || "Nenhuma observação";
  dataContainer.style.display = "block";
  formContainer.style.display = "none";
}

// Mostrar formulário para cadastro
function showAnimalForm() {
  formContainer.style.display = "block";
  dataContainer.style.display = "none";
  
  document.getElementById("animalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    const errorElement = document.getElementById("error-message");
    errorElement.textContent = "";
    
    try {
      const nome = sanitizeInput(document.getElementById("nome").value);
      const especie = sanitizeInput(document.getElementById("especie").value);
      const raca = sanitizeInput(document.getElementById("raca").value);
      const observacoes = sanitizeInput(document.getElementById("observacoes").value);

      if (!nome || !especie || !raca) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      await setDoc(doc(db, "animais", animalId), { 
        nome, 
        especie, 
        raca, 
        observacoes,
        createdAt: new Date(),
        createdBy: currentUser.uid,
        createdByEmail: currentUser.email
      });

      alert("Dados salvos com sucesso!");
      location.reload();
    } catch (error) {
      errorElement.textContent = error.message;
      submitBtn.disabled = false;
    }
  });
}

// Mostrar mensagens
function showMessage(message, isError) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? '#d32f2f' : '#388e3c';
  authMessage.style.display = 'block';
}

// Sanitizar inputs
function sanitizeInput(str) {
  return String(str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").substring(0, 500);
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  animalId = getAnimalId();
  if (animalId) checkAnimalData();
});
