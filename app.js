import { db, auth, provider } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { 
  signInWithRedirect, 
  signOut, 
  onAuthStateChanged, 
  getRedirectResult,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Configurações
const ADMIN_UID = "P9V0pv5f1FUvv8HnFxZSx5m9bJq2";

// Configura persistência de autenticação
(async function() {
  try {
    await auth.setPersistence(browserLocalPersistence);
    console.log('Persistência configurada com sucesso');
  } catch (error) {
    console.error('Erro ao configurar persistência:', error);
  }
})();

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
  animalData: null,
  isInitialized: false
};

// Funções utilitárias
const utils = {
  showElement: (element) => element && element.classList.remove('hidden'),
  hideElement: (element) => element && element.classList.add('hidden'),
  showMessage: (message, isError = false) => {
    if (!elements.authMessage) return;
    elements.authMessage.textContent = message;
    elements.authMessage.style.color = isError ? '#d32f2f' : '#388e3c';
    elements.authMessage.classList.remove('hidden');
  },
  checkPermissions: () => {
    if (!state.currentUser || !state.animalData) {
      console.log('Permissões: Dados insuficientes para verificar');
      return false;
    }
    
    const isOwner = state.currentUser.uid === state.animalData.createdBy;
    const isAdmin = state.currentUser.uid === ADMIN_UID;
    
    console.log('Verificação de permissões:', {
      userUID: state.currentUser.uid,
      animalOwner: state.animalData.createdBy,
      isOwner,
      isAdmin
    });
    
    return isOwner || isAdmin;
  },
  validateAnimalData: (data) => {
    if (!data) return false;
    if (!data.createdBy) {
      console.error('Dados do animal inválidos - falta createdBy');
      return false;
    }
    return true;
  }
};

// Funções de autenticação
// Funções de autenticação
const authFunctions = {
  initializeAuth: async () => {
    try {
      console.log('Iniciando autenticação...');
      
      // 1. Configura o observer de estado de autenticação
      const authObserver = onAuthStateChanged(auth, async (user) => {
        console.group('Mudança de estado:');
        console.log('Usuário:', user ? user.email : 'null');
        console.log('UID:', user?.uid);
        console.groupEnd();
        
        state.currentUser = user;
        
        // Atualiza a UI imediatamente
        ui.updateUI();
        
        if (user) {
          // 2. Verifica token
          try {
            const token = await user.getIdToken();
            console.debug('Token ID:', token.slice(0, 10) + '...');
          } catch (tokenError) {
            console.error('Erro no token:', tokenError);
          }
          
          // 3. Carrega dados se necessário
          if (state.animalId && !state.animalData) {
            console.log('Carregando dados do animal após autenticação...');
            await animalFunctions.loadAnimalData();
          }
        }
      });

      // 4. Verifica redirecionamento do login
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log('Resultado do redirecionamento:', result.user.email);
          state.currentUser = result.user;
        }
      } catch (redirectError) {
        console.error('Erro no redirecionamento:', redirectError);
      }

      state.isInitialized = true;
      return authObserver; // Retorna o observer para limpeza
      
    } catch (error) {
      console.error('Falha na inicialização:', error);
      utils.showMessage("Erro ao iniciar autenticação", true);
      throw error;
    }
  },
  
  setupAuthObserver: () => {
    return onAuthStateChanged(auth, async (user) => {
      console.log('Estado de autenticação alterado:', user ? `Logado: ${user.email}` : 'Deslogado');
      
      state.currentUser = user;
      ui.updateUI();
      
      if (user) {
        // Verifica token
        try {
          const tokenResult = await user.getIdTokenResult();
          console.log('Token válido até:', tokenResult.expirationTime);
        } catch (tokenError) {
          console.error('Erro ao verificar token:', tokenError);
        }
        
        // Carrega dados do animal se necessário
        if (state.animalId && !state.animalData) {
          await animalFunctions.loadAnimalData();
        }
      }
    });
  },
  
  handleLogin: async () => {
    if (!navigator.onLine) {
      utils.showMessage("Sem conexão com a internet", true);
      return;
    }
    
    try {
      console.log('Iniciando login...');
      utils.showElement(elements.loading);
      elements.googleLoginBtn.disabled = true;
      
      // Força novo login
      await signOut(auth);
      sessionStorage.setItem('isRedirecting', 'true');
      await signInWithRedirect(auth, provider);
      
      // Timeout de segurança
      setTimeout(() => {
        if (!state.currentUser) {
          utils.showMessage("Tempo excedido no login. Tente novamente.", true);
          elements.googleLoginBtn.disabled = false;
          utils.hideElement(elements.loading);
        }
      }, 15000);
    } catch (error) {
      console.error('Erro no login:', error);
      elements.googleLoginBtn.disabled = false;
      utils.hideElement(elements.loading);
      
      let errorMessage = `Erro no login: ${error.message}`;
      if (error.code === 'auth/network-request-failed') {
        errorMessage = "Erro de conexão. Verifique sua internet.";
      }
      utils.showMessage(errorMessage, true);
    }
  },
  
  handleLogout: async () => {
    try {
      console.log('Iniciando logout...');
      utils.showElement(elements.loading);
      await signOut(auth);
    } catch (error) {
      console.error('Erro no logout:', error);
      utils.showMessage(`Erro ao sair: ${error.message}`, true);
    } finally {
      utils.hideElement(elements.loading);
    }
  }
};

// Funções de interface
const ui = {
  updateUI: () => {
    if (!state.isInitialized) {
  console.log('UI: Aguardando inicialização...');
  return;
}
    
    console.log('Atualizando UI... Estado atual:', {
      user: state.currentUser?.email,
      animalData: !!state.animalData
    });
    
    if (state.currentUser) {
      // Usuário logado
      utils.showElement(elements.userInfo);
      elements.userEmail.textContent = state.currentUser.email;
      elements.userAvatar.src = state.currentUser.photoURL || 'https://via.placeholder.com/40';
      utils.hideElement(elements.loginContainer);
      
      // Verifica permissões se tiver dados do animal
      if (state.animalData) {
        elements.editBtn.style.display = utils.checkPermissions() ? "block" : "none";
      }
    } else {
      // Usuário não logado
      utils.hideElement(elements.userInfo);
      utils.showElement(elements.loginContainer);
      if (elements.editBtn) elements.editBtn.style.display = 'none';
    }
  },
  
  showAnimalData: () => {
    if (!utils.validateAnimalData(state.animalData)) {
      console.warn('Tentativa de mostrar dados inválidos');
      utils.showMessage("Dados do animal estão incompletos", true);
      return;
    }
    
    console.log('Mostrando dados do animal:', state.animalData);
    
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

    if (!utils.validateAnimalData(state.animalData)) {
      utils.showMessage("Dados do animal não carregados corretamente", true);
      return;
    }

    if (!utils.checkPermissions()) {
      utils.showMessage("Apenas o dono ou administrador pode editar este animal", true);
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
    if (!state.animalId) {
      console.error('Nenhum animalId definido');
      utils.showMessage("ID do animal não especificado", true);
      return;
    }
    
    console.log('Carregando dados do animal ID:', state.animalId);
    
    try {
      utils.showElement(elements.loading);
      const docRef = doc(db, "animais", state.animalId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        state.animalData = docSnap.data();
        
        if (!utils.validateAnimalData(state.animalData)) {
          throw new Error("Dados do animal estão incompletos");
        }
        
        ui.showAnimalData();
      } else {
        console.warn('Animal não encontrado no Firestore');
        utils.showMessage("Animal não encontrado.", true);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do animal:', error);
      utils.showMessage(`Erro ao carregar dados: ${error.message}`, true);
    } finally {
      utils.hideElement(elements.loading);
      ui.updateUI();
    }
  },
  
  saveAnimalData: async (e) => {
    e.preventDefault();
    
    if (!utils.checkPermissions()) {
      utils.showMessage("Você não tem permissão para editar este animal", true);
      return;
    }

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
        nome, 
        especie, 
        raca, 
        observacoes,
        updatedAt: new Date(),
        updatedBy: state.currentUser.uid,
        createdBy: state.animalData.createdBy,
        createdAt: state.animalData.createdAt
      });

      alert("Dados atualizados com sucesso!");
      location.reload();
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      document.getElementById("error-message").textContent = error.message;
    } finally {
      utils.hideElement(elements.loading);
    }
  }
};

// Inicialização
const init = () => {
  // Verifica redirecionamento
  if (sessionStorage.getItem('isRedirecting') === 'true') {
    sessionStorage.removeItem('isRedirecting');
    utils.showElement(elements.loading);
  }

  // Obtém ID do animal
  state.animalId = new URLSearchParams(window.location.search).get("id");
  
  if (!state.animalId) {
    utils.showMessage("ID do animal não especificado na URL", true);
    return;
  }

  // Configura listeners
  if (elements.googleLoginBtn) {
    elements.googleLoginBtn.addEventListener('click', authFunctions.handleLogin);
  }
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', authFunctions.handleLogout);
  }
  if (elements.editBtn) {
    elements.editBtn.addEventListener('click', ui.showAnimalForm);
  }
  if (elements.animalForm) {
    elements.animalForm.addEventListener('submit', animalFunctions.saveAnimalData);
  }

  // Inicia processos
  authFunctions.initializeAuth();
  animalFunctions.loadAnimalData();
};

// Inicia a aplicação
document.addEventListener('DOMContentLoaded', init);
