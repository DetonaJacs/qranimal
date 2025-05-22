import { db, auth, provider } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Elementos do DOM
const ADMIN_UID = "P9V0pv5f1FUvv8HnFxZSx5m9bJq2";

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

// Função para verificar ID do animal na URL
function checkAnimalId() {
  const params = new URLSearchParams(window.location.search);
  animalId = params.get("id");
  
  if (!animalId || !/^[a-zA-Z0-9_-]{8,32}$/.test(animalId)) {
    showMessage("ID do animal inválido ou não especificado.", true);
    hideLoading();
    return;
  }
}

async function handleAuth() {
  try {
    // 1. Primeiro verifica o resultado do redirecionamento
    const result = await getRedirectResult(auth);
    if (result) {
      currentUser = result.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateUI();
      await loadAnimalData();
      return;
    }

    // 2. Depois verifica se há usuário no localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
    }

    // 3. Configura o observador de estado
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        currentUser = null;
        localStorage.removeItem('currentUser');
      }
      updateUI();
      loadAnimalData();
    });

  } catch (error) {
    console.error("Auth error:", error);
    showMessage(`Erro na autenticação: ${error.message}`, true);
    hideLoading();
  }
}
// Carrega os dados do animal
async function loadAnimalData() {
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

// Modifique a função showAnimalData
function showAnimalData() {
  document.getElementById("vNome").textContent = animalData?.nome || "Não informado";
  document.getElementById("vEspecie").textContent = animalData?.especie || "Não informado";
  document.getElementById("vRaca").textContent = animalData?.raca || "Não informado";
  document.getElementById("vObs").textContent = animalData?.observacoes || "Nenhuma observação";

  // Verifica permissões de edição
  const canEdit = currentUser && 
                 (currentUser.uid === animalData?.createdBy || 
                  currentUser.uid === ADMIN_UID);
  
  editBtn.style.display = canEdit ? "block" : "none";
  dataContainer.style.display = "block";
  formContainer.style.display = "none";
  loginContainer.style.display = "none";
}

function showAnimalForm() {
  if (!currentUser) {
    showMessage("Faça login para editar animais", true);
    return;
  }

  const isOwner = currentUser.uid === animalData?.createdBy;
  const isAdmin = currentUser.uid === ADMIN_UID;

  if (!isOwner && !isAdmin) {
    showMessage("Apenas o dono ou administrador pode editar", true);
    return;
  }

  formContainer.style.display = "block";
  dataContainer.style.display = "none";
  
  // Preenche o formulário
  document.getElementById('nome').value = animalData?.nome || '';
  document.getElementById('especie').value = animalData?.especie || '';
  document.getElementById('raca').value = animalData?.raca || '';
  document.getElementById('observacoes').value = animalData?.observacoes || '';
}

// Modifique a submissão do formulário:
form.onsubmit = async (e) => {
  e.preventDefault();
  
  try {
    const nome = document.getElementById("nome").value;
    const especie = document.getElementById("especie").value;
    const raca = document.getElementById("raca").value;
    const observacoes = document.getElementById("observacoes").value;

    if (!nome || !especie || !raca) {
      throw new Error("Preencha todos os campos obrigatórios");
    }

    const animalData = {
      nome,
      especie, 
      raca,
      observacoes,
      updatedAt: new Date(),
      updatedBy: currentUser.uid
    };

    // Mantém os dados originais se existirem
    if (animalData.createdBy) {
      animalData.createdBy = animalData.createdBy;
      animalData.createdAt = animalData.createdAt;
    } else {
      animalData.createdBy = currentUser.uid;
      animalData.createdAt = new Date();
    }

    await setDoc(doc(db, "animais", animalId), animalData);
    alert("Dados salvos com sucesso!");
    location.reload();
    
  } catch (error) {
    document.getElementById("error-message").textContent = error.message;
  }
};

// Configura os listeners de autenticação
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

  editBtn?.addEventListener('click', () => {
    if (!animalData) return;
    showAnimalForm();
    document.getElementById('nome').value = animalData.nome || '';
    document.getElementById('especie').value = animalData.especie || '';
    document.getElementById('raca').value = animalData.raca || '';
    document.getElementById('observacoes').value = animalData.observacoes || '';
  });
}

// Atualiza a interface com base no estado
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

// Mostra mensagens para o usuário
function showMessage(message, isError) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? '#d32f2f' : '#388e3c';
  authMessage.style.display = 'block';
}

// Esconde o elemento de loading
function hideLoading() {
  loadingElement.style.display = 'none';
}

// Sanitiza inputs para prevenir XSS
function sanitizeInput(str) {
  return String(str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").substring(0, 500);
}

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', async () => {
  checkAnimalId();
  setupAuthListeners();
  await handleAuth();
});
