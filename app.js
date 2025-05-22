import { db, auth, provider } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Elementos do DOM
const loadingElement = document.getElementById('loading');
const userInfoElement = document.getElementById('user-info');
const loginContainer = document.getElementById('login-container');
const authMessage = document.getElementById('auth-message');
const formContainer = document.getElementById('form-container');
const dataContainer = document.getElementById('dados-animal');
const googleLoginBtn = document.getElementById('googleLogin');
const logoutBtn = document.getElementById('logout-btn');
const editBtn = document.getElementById('editar-btn');
const userAvatar = document.getElementById('user-avatar');
const userEmail = document.getElementById('user-email');

// Variáveis de estado
let currentUser = null;
let animalId = null;
let animalData = null;

// Inicialização modificada
document.addEventListener('DOMContentLoaded', async () => {
  checkAnimalId();
  await setupAuth();
  
  // Verificar se estamos retornando de um redirecionamento de login
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // Usuário acabou de fazer login via redirecionamento
      currentUser = result.user;
      updateUI();
      loadAnimalData();
    }
  } catch (error) {
    showMessage(`Erro no login: ${error.message}`, true);
  }
});

// Configurar autenticação modificada
async function setupAuth() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateUI();
    
    if (user) {
      userInfoElement.style.display = 'flex';
      userAvatar.src = user.photoURL || 'https://via.placeholder.com/40';
      userEmail.textContent = user.email;
      loadAnimalData();
    } else {
      userInfoElement.style.display = 'none';
      if (!animalData) {
        loginContainer.style.display = 'block';
      }
    }
  });

  googleLoginBtn.addEventListener('click', async () => {
    try {
      // Substituído signInWithPopup por signInWithRedirect
      await signInWithRedirect(auth, provider);
    } catch (error) {
      showMessage(`Erro no login: ${error.message}`, true);
    }
  });

  googleLoginBtn.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      showMessage(`Erro no login: ${error.message}`, true);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  });

  editBtn?.addEventListener('click', () => {
    if (!animalData) return;
    
    showAnimalForm();
    document.getElementById('nome').value = animalData.nome || '';
    document.getElementById('especie').value = animalData.especie || '';
    document.getElementById('raca').value = animalData.raca || '';
    document.getElementById('observacoes').value = animalData.observacoes || '';
  });
}

// Carregar dados do animal
async function loadAnimalData() {
  try {
    const docRef = doc(db, "animais", animalId);
    const docSnap = await getDoc(docRef);

    hideLoading();
    
    if (docSnap.exists()) {
      animalData = docSnap.data();
      showAnimalData();
    } else if (currentUser) {
      // Se está logado e não existe cadastro, mostra formulário
      showAnimalForm();
    } else {
      // Se não está logado e não existe cadastro, mostra mensagem
      showMessage("Animal não encontrado. Faça login para cadastrar.", false);
    }
  } catch (error) {
    hideLoading();
    showMessage(`Erro ao carregar dados: ${error.message}`, true);
  }
}

// Mostrar dados do animal
function showAnimalData() {
  document.getElementById("vNome").textContent = animalData?.nome || "Não informado";
  document.getElementById("vEspecie").textContent = animalData?.especie || "Não informado";
  document.getElementById("vRaca").textContent = animalData?.raca || "Não informado";
  document.getElementById("vObs").textContent = animalData?.observacoes || "Nenhuma observação";
  
  dataContainer.style.display = "block";
  formContainer.style.display = "none";
  loginContainer.style.display = "none";
  
  // Mostrar botão de edição apenas se estiver logado
  editBtn.style.display = currentUser ? "block" : "none";
}

// Mostrar formulário para cadastro/edição
function showAnimalForm() {
  formContainer.style.display = "block";
  dataContainer.style.display = "none";
  loginContainer.style.display = "none";
  
  const form = document.getElementById("animalForm");
  form.onsubmit = async (e) => {
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
        updatedAt: new Date(),
        updatedBy: currentUser.uid,
        ...(animalData ? {} : { 
          createdAt: new Date(),
          createdBy: currentUser.uid 
        })
      });

      alert("Dados salvos com sucesso!");
      location.reload();
    } catch (error) {
      errorElement.textContent = error.message;
      submitBtn.disabled = false;
    }
  };
}

// Atualizar interface
function updateUI() {
  if (currentUser) {
    loginContainer.style.display = 'none';
  } else if (!animalData) {
    loginContainer.style.display = 'block';
  }
}

// Mostrar mensagens
function showMessage(message, isError) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? '#d32f2f' : '#388e3c';
  authMessage.style.display = 'block';
}

// Esconder loading
function hideLoading() {
  loadingElement.style.display = 'none';
}

// Sanitizar inputs
function sanitizeInput(str) {
  return String(str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").substring(0, 500);
}
