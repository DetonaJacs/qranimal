import { db, auth, provider } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Configurações
const ADMIN_UID = "P9V0pv5f1FUvv8HnFxZSx5m9bJq2";

// Elementos DOM
const elements = {
  loading: document.getElementById('loading'),
  userInfo: document.getElementById('user-info'),
  loginContainer: document.getElementById('login-container'),
  authMessage: document.getElementById('auth-message'),
  formContainer: document.getElementById('form-container'),
  dataContainer: document.getElementById('dados-animal'),
  googleLoginBtn: document.getElementById('googleLogin'),
  logoutBtn: document.getElementById('logout-btn'),
  editBtn: document.getElementById('editar-btn'),
  userAvatar: document.getElementById('user-avatar'),
  userEmail: document.getElementById('user-email'),
  animalForm: document.getElementById('animalForm')
};

// Estado da aplicação
const state = {
  currentUser: null,
  animalId: null,
  animalData: null
};

// Funções utilitárias
const utils = {
  showElement: (element) => element.classList.remove('hidden'),
  hideElement: (element) => element.classList.add('hidden'),
  showMessage: (message, isError = false) => {
    elements.authMessage.textContent = message;
    elements.authMessage.style.color = isError ? '#d32f2f' : '#388e3c';
    utils.showElement(elements.authMessage);
  }
};

// Funções de autenticação
const authFunctions = {
  initializeAuth: async () => {
    try {
      // Verifica resultado de redirecionamento
      const result = await getRedirectResult(auth);
      if (result?.user) {
        state.currentUser = result.user;
      }

      // Observa mudanças de estado
      onAuthStateChanged(auth, (user) => {
        state.currentUser = user;
        ui.updateUI();
        
        // Se usuário logado e dados não carregados
        if (user && !state.animalData) {
          animalFunctions.loadAnimalData();
        }
      });
    } catch (error) {
      utils.showMessage(`Erro na autenticação: ${error.message}`, true);
    }
  },
  
  handleLogin: async () => {
    try {
      utils.showElement(elements.loading);
      await signInWithRedirect(auth, provider);
    } catch (error) {
      utils.hideElement(elements.loading);
      utils.showMessage(`Erro no login: ${error.message}`, true);
    }
  },
  
  handleLogout: async () => {
    try {
      utils.showElement(elements.loading);
      await signOut(auth);
    } catch (error) {
      utils.showMessage(`Erro ao sair: ${error.message}`, true);
    } finally {
      utils.hideElement(elements.loading);
    }
  }
};

// Funções de interface
const ui = {
  updateUI: () => {
    if (state.currentUser) {
      // Usuário logado
      utils.showElement(elements.userInfo);
      elements.userEmail.textContent = state.currentUser.email;
      elements.userAvatar.src = state.currentUser.photoURL || 'https://via.placeholder.com/40';
      utils.hideElement(elements.loginContainer);
      
      // Se tem dados do animal, verifica permissões
      if (state.animalData) {
        const canEdit = state.currentUser.uid === state.animalData.createdBy || state.currentUser.uid === ADMIN_UID;
        elements.editBtn.style.display = canEdit ? "block" : "none";
      }
    } else {
      // Usuário não logado
      utils.hideElement(elements.userInfo);
      utils.showElement(elements.loginContainer);
      if (elements.editBtn) elements.editBtn.style.display = 'none';
    }
  },
  
  showAnimalData: () => {
    if (!state.animalData) return;
    
    document.getElementById("vNome").textContent = state.animalData.nome || "Não informado";
    document.getElementById("vEspecie").textContent = state.animalData.especie || "Não informado";
    document.getElementById("vRaca").textContent = state.animalData.raca || "Não informado";
    document.getElementById("vObs").textContent = state.animalData.observacoes || "Nenhuma observação";

    utils.showElement(elements.dataContainer);
    utils.hideElement(elements.formContainer);
  },
  
  showAnimalForm: () => {
    if (!state.currentUser) {
      utils.showMessage("Faça login para editar", true);
      return;
    }

    if (!state.animalData) {
      utils.showMessage("Dados do animal não carregados", true);
      return;
    }

    const canEdit = state.currentUser.uid === state.animalData.createdBy || state.currentUser.uid === ADMIN_UID;
    if (!canEdit) {
      utils.showMessage("Apenas o dono pode editar este animal", true);
      return;
    }

    // Preenche formulário
    document.getElementById('nome').value = state.animalData.nome || '';
    document.getElementById('especie').value = state.animalData.especie || '';
    document.getElementById('raca').value = state.animalData.raca || '';
    document.getElementById('observacoes').value = state.animalData.observacoes || '';

    utils.showElement(elements.formContainer);
    utils.hideElement(elements.dataContainer);
  }
};

// Funções de dados do animal
const animalFunctions = {
  loadAnimalData: async () => {
    if (!state.animalId) return;
    
    try {
      utils.showElement(elements.loading);
      const docRef = doc(db, "animais", state.animalId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        state.animalData = docSnap.data();
        ui.showAnimalData();
      } else {
        utils.showMessage("Animal não encontrado.", true);
      }
    } catch (error) {
      utils.showMessage(`Erro ao carregar dados: ${error.message}`, true);
    } finally {
      utils.hideElement(elements.loading);
      ui.updateUI();
    }
  },
  
  saveAnimalData: async (e) => {
    e.preventDefault();
    
    try {
      const nome = document.getElementById("nome").value.trim();
      const especie = document.getElementById("especie").value.trim();
      const raca = document.getElementById("raca").value.trim();
      const observacoes = document.getElementById("observacoes").value.trim();

      if (!nome || !especie || !raca) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      utils.showElement(elements.loading);
      
      await setDoc(doc(db, "animais", state.animalId), { 
        nome, especie, raca, observacoes,
        updatedAt: new Date(),
        updatedBy: state.currentUser.uid,
        createdBy: state.animalData.createdBy,
        createdAt: state.animalData.createdAt
      });

      alert("Dados atualizados com sucesso!");
      location.reload();
    } catch (error) {
      document.getElementById("error-message").textContent = error.message;
    } finally {
      utils.hideElement(elements.loading);
    }
  }
};

// Inicialização
const init = () => {
  // Obtém ID do animal da URL
  const params = new URLSearchParams(window.location.search);
  state.animalId = params.get("id");
  
  if (!state.animalId) {
    utils.showMessage("ID do animal não especificado", true);
    return;
  }

  // Event listeners
  elements.googleLoginBtn?.addEventListener('click', authFunctions.handleLogin);
  elements.logoutBtn?.addEventListener('click', authFunctions.handleLogout);
  elements.editBtn?.addEventListener('click', ui.showAnimalForm);
  elements.animalForm?.addEventListener('submit', animalFunctions.saveAnimalData);

  // Inicia processos
  authFunctions.initializeAuth();
  animalFunctions.loadAnimalData();
};

// Inicia a aplicação
document.addEventListener('DOMContentLoaded', init);
