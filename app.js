import { db, auth, provider } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Configurações
const ADMIN_UID = "P9V0pv5f1FUvv8HnFxZSx5m9bJq2";

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
const animalForm = document.getElementById('animalForm');

// Variáveis de estado
let currentUser = null;
let animalId = null;
let animalData = null;

// Funções principais
function checkAnimalId() {
  const params = new URLSearchParams(window.location.search);
  animalId = params.get("id");
  
  if (!animalId || !/^[a-zA-Z0-9_-]{8,32}$/.test(animalId)) {
    showMessage("ID do animal inválido ou não especificado.", true);
    hideLoading();
    return false;
  }
  return true;
}

async function handleAuth() {
  try {
    // 1. Verifica redirecionamento de login
    const result = await getRedirectResult(auth);
    if (result?.user) {
      currentUser = result.user;
      updateUI();
      await loadAnimalData();
      return;
    }

    // 2. Configura observador de estado de autenticação
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      updateUI();
      loadAnimalData();
    });

  } catch (error) {
    console.error("Auth error:", error);
    showMessage(`Erro na autenticação: ${error.message}`, true);
    hideLoading();
  }
}

async function loadAnimalData() {
  if (!animalId) return;
  
  try {
    const docRef = doc(db, "animais", animalId);
    const docSnap = await getDoc(docRef);

    hideLoading();
    
    if (docSnap.exists()) {
      animalData = docSnap.data();
      showAnimalData();
    } else if (currentUser) {
      showAnimalForm();
    } else {
      showMessage("Animal não encontrado. Faça login para cadastrar.", false);
    }
  } catch (error) {
    hideLoading();
    showMessage(`Erro ao carregar dados: ${error.message}`, true);
  }
}

function showAnimalData() {
  if (!animalData) return;

  // Mostra dados
  document.getElementById("vNome").textContent = animalData.nome || "Não informado";
  document.getElementById("vEspecie").textContent = animalData.especie || "Não informado";
  document.getElementById("vRaca").textContent = animalData.raca || "Não informado";
  document.getElementById("vObs").textContent = animalData.observacoes || "Nenhuma observação";

  // Controle de edição
  const canEdit = currentUser && 
                 (currentUser.uid === animalData.createdBy || 
                  currentUser.uid === ADMIN_UID);
  
  editBtn.style.display = canEdit ? "block" : "none";
  dataContainer.style.display = "block";
  formContainer.style.display = "none";
  loginContainer.style.display = "none";
}

function showAnimalForm() {
  if (!currentUser) {
    showMessage("Faça login para continuar", true);
    return;
  }

  formContainer.style.display = "block";
  dataContainer.style.display = "none";
  
  // Preenche formulário se for edição
  if (animalData) {
    document.getElementById('nome').value = animalData.nome || '';
    document.getElementById('especie').value = animalData.especie || '';
    document.getElementById('raca').value = animalData.raca || '';
    document.getElementById('observacoes').value = animalData.observacoes || '';
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  const errorElement = document.getElementById("error-message");
  errorElement.textContent = "";

  try {
    const nome = document.getElementById("nome").value.trim();
    const especie = document.getElementById("especie").value.trim();
    const raca = document.getElementById("raca").value.trim();
    const observacoes = document.getElementById("observacoes").value.trim();

    if (!nome || !especie || !raca) {
      throw new Error("Preencha todos os campos obrigatórios");
    }

    const animalData = {
      nome,
      especie, 
      raca,
      observacoes,
      updatedAt: new Date(),
      updatedBy: currentUser.uid,
      createdBy: currentUser.uid,
      createdAt: new Date()
    };

    // Mantém dados originais se for edição
    if (animalData?.createdBy) {
      animalData.createdBy = animalData.createdBy;
      animalData.createdAt = animalData.createdAt;
    }

    await setDoc(doc(db, "animais", animalId), animalData);
    alert("Dados salvos com sucesso!");
    location.reload();

  } catch (error) {
    errorElement.textContent = error.message;
    submitBtn.disabled = false;
  }
}

function setupAuthListeners() {
  googleLoginBtn.addEventListener('click', async () => {
    try {
      loadingElement.style.display = 'block';
      await signInWithRedirect(auth, provider);
    } catch (error) {
      showMessage(`Erro no login: ${error.message}`, true);
      hideLoading();
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao sair:', error);
      showMessage('Erro ao fazer logout', true);
    }
  });

  editBtn?.addEventListener('click', showAnimalForm);
  animalForm.addEventListener('submit', handleFormSubmit);
}

function updateUI() {
  if (currentUser) {
    userInfoElement.style.display = 'flex';
    userAvatar.src = currentUser.photoURL || 'https://via.placeholder.com/40';
    userEmail.textContent = currentUser.email;
    loginContainer.style.display = 'none';
  } else {
    userInfoElement.style.display = 'none';
    if (!animalData) {
      loginContainer.style.display = 'block';
    }
  }
}

function showMessage(message, isError) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? '#d32f2f' : '#388e3c';
  authMessage.style.display = 'block';
}

function hideLoading() {
  loadingElement.style.display = 'none';
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAnimalId()) return;
  
  setupAuthListeners();
  await handleAuth();
  
  // Debug
  console.log("Current User:", currentUser);
  console.log("Animal ID:", animalId);
});
