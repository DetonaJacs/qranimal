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

// Função principal de autenticação
async function handleAuth() {
  try {
    // Verifica se está retornando de um redirecionamento de login
    const result = await getRedirectResult(auth);
    if (result?.user) {
      currentUser = result.user;
      updateUI();
      await loadAnimalData();
      return;
    }

    // Monitora mudanças no estado de autenticação
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      updateUI();
      if (user) {
        await loadAnimalData();
      }
    });
  } catch (error) {
    console.error("Erro na autenticação:", error);
    showMessage(`Erro no login: ${error.message}`, true);
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

// Mostra os dados do animal
// Mostrar dados do animal (público)
function showAnimalData() {
  document.getElementById("vNome").textContent = animalData?.nome || "Não informado";
  document.getElementById("vEspecie").textContent = animalData?.especie || "Não informado";
  document.getElementById("vRaca").textContent = animalData?.raca || "Não informado";
  document.getElementById("vObs").textContent = animalData?.observacoes || "Nenhuma observação";

  // Mostrar botão de edição APENAS para o criador ou admin
  const isOwner = currentUser?.uid === animalData?.createdBy;
  const isAdmin = currentUser?.uid === "P9V0pv5f1FUvv8HnFxZSx5m9bJq2";
  
  editBtn.style.display = (isOwner || isAdmin) ? "block" : "none";
}

// Mostra o formulário para edição
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
