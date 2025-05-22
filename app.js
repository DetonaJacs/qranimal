import { db, auth, provider } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

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



// ========== FUNÇÕES PRINCIPAIS ==========
async function loadAnimalData() {
  if (!animalId) return;
  
  try {
    const docRef = doc(db, "animais", animalId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      animalData = docSnap.data();
      showAnimalData();
    } else {
      showMessage("Animal não encontrado.", true);
    }
  } catch (error) {
    showMessage(`Erro ao carregar dados: ${error.message}`, true);
  } finally {
    hideLoading();
  }
}

// 2. Mostra dados do animal (público)
function showAnimalData() {
  document.getElementById("vNome").textContent = animalData?.nome || "Não informado";
  document.getElementById("vEspecie").textContent = animalData?.especie || "Não informado";
  document.getElementById("vRaca").textContent = animalData?.raca || "Não informado";
  document.getElementById("vObs").textContent = animalData?.observacoes || "Nenhuma observação";

  dataContainer.style.display = "block";
  formContainer.style.display = "none";
  
  // Mostra opção de login se não estiver autenticado
  if (!currentUser) {
    loginContainer.style.display = 'block';
  } else {
    // Verifica se pode editar
    const canEdit = currentUser.uid === animalData?.createdBy || currentUser.uid === ADMIN_UID;
    editBtn.style.display = canEdit ? "block" : "none";
    loginContainer.style.display = 'none';
  }
}

// 3. Configura autenticação
async function setupAuth() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      currentUser = result.user;
      updateUI();
    }

    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      updateUI();
      // Atualiza visibilidade do botão de edição
      if (animalData) {
        const canEdit = user?.uid === animalData.createdBy || user?.uid === ADMIN_UID;
        editBtn.style.display = canEdit ? "block" : "none";
      }
    });
  } catch (error) {
    console.error("Auth error:", error);
    showMessage(`Erro na autenticação: ${error.message}`, true);
  }
}

// 4. Formulário de edição
function showAnimalForm() {
  if (!currentUser) {
    showMessage("Faça login para editar", true);
    return;
  }

  const canEdit = currentUser.uid === animalData?.createdBy || currentUser.uid === ADMIN_UID;
  if (!canEdit) {
    showMessage("Apenas o dono pode editar este animal", true);
    return;
  }

  formContainer.style.display = "block";
  dataContainer.style.display = "none";
  
  // Preenche formulário
  document.getElementById('nome').value = animalData.nome || '';
  document.getElementById('especie').value = animalData.especie || '';
  document.getElementById('raca').value = animalData.raca || '';
  document.getElementById('observacoes').value = animalData.observacoes || '';
}

// 5. Configura eventos
function setupListeners() {
  googleLoginBtn.addEventListener('click', async () => {
    try {
      await signInWithRedirect(auth, provider);
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

  editBtn?.addEventListener('click', showAnimalForm);

  animalForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const nome = document.getElementById("nome").value.trim();
      const especie = document.getElementById("especie").value.trim();
      const raca = document.getElementById("raca").value.trim();
      const observacoes = document.getElementById("observacoes").value.trim();

      if (!nome || !especie || !raca) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      await setDoc(doc(db, "animais", animalId), { 
        nome, especie, raca, observacoes,
        updatedAt: new Date(),
        updatedBy: currentUser.uid,
        // Mantém dados originais
        createdBy: animalData.createdBy,
        createdAt: animalData.createdAt
      });

      alert("Dados atualizados com sucesso!");
      location.reload();
    } catch (error) {
      document.getElementById("error-message").textContent = error.message;
    }
  });
}

// Funções auxiliares que estavam faltando
function updateUI() {
  if (currentUser) {
    // Mostra informações do usuário
    userInfoElement.style.display = 'flex';
    userEmail.textContent = currentUser.email;
    userAvatar.src = currentUser.photoURL || 'https://via.placeholder.com/40';
    
    // Esconde o container de login
    loginContainer.style.display = 'none';
    
    // Verifica se pode editar
    const canEdit = currentUser.uid === animalData?.createdBy || currentUser.uid === ADMIN_UID;
    editBtn.style.display = canEdit ? "block" : "none";
  } else {
    // Usuário não logado
    userInfoElement.style.display = 'none';
    loginContainer.style.display = 'block';
  }
}

function hideLoading() {
  loadingElement.style.display = 'none';
}

function showMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.display = 'block';
  authMessage.style.color = isError ? '#d32f2f' : '#388e3c';
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Obtém ID do animal da URL
  const params = new URLSearchParams(window.location.search);
  animalId = params.get("id");
  
  if (!animalId) {
    showMessage("ID do animal não especificado", true);
    return;
  }

  setupListeners();
  loadAnimalData(); // Carrega dados imediatamente
  setupAuth(); // Configura autenticação em segundo plano
});
