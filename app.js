import { db, auth, provider } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Configura persistência
auth.setPersistence(browserLocalPersistence)
  .then(() => console.log('Persistência configurada'))
  .catch((error) => console.error('Erro na persistência:', error));
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
  },
  // Nova função para verificar permissões
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
      isAdmin,
      adminUID: ADMIN_UID
    });
    
    return isOwner || isAdmin;
  }
};

// Funções de autenticação
const authFunctions = {
  initializeAuth: async () => {
    try {
      // Primeiro verifica se já está autenticado
      const user = auth.currentUser;
      if (user) {
        state.currentUser = user;
        ui.updateUI();
      }

      // Depois configura o observer
onAuthStateChanged(auth, (user) => {
  console.group('Mudança de estado de autenticação');
  console.log('Usuário:', user);
  console.log('Token:', user?.accessToken);
  console.log('UID:', user?.uid);
  console.groupEnd();
  
  state.currentUser = user;
  ui.updateUI();
  
  if (user) {
    // Verifica se o token é válido
    user.getIdTokenResult()
      .then((idTokenResult) => {
        console.log('Token válido até:', idTokenResult.expirationTime);
      })
      .catch((error) => {
        console.error('Erro ao verificar token:', error);
      });
    
    if (state.animalId && !state.animalData) {
      animalFunctions.loadAnimalData();
    }
  }
});

      // Por último verifica redirecionamento
      const result = await getRedirectResult(auth);
      if (result?.user) {
        state.currentUser = result.user;
        ui.updateUI();
      }
    } catch (error) {
      console.error('Erro na inicialização da autenticação:', error);
      utils.showMessage(`Erro na autenticação: ${error.message}`, true);
    }
  },
  
handleLogin: async () => {
  sessionStorage.setItem('isRedirecting', 'true');
    
    // Força novo login sempre
    await auth.signOut();
    await signInWithRedirect(auth, provider);
    
    // Adiciona timeout para evitar loops
    setTimeout(() => {
      if (!state.currentUser) {
        utils.showMessage("Tempo excedido no login. Tente novamente.", true);
        elements.googleLoginBtn.disabled = false;
        utils.hideElement(elements.loading);
      }
    }, 10000);
  } catch (error) {
    console.error('Erro no login:', error);
    elements.googleLoginBtn.disabled = false;
    utils.hideElement(elements.loading);
    utils.showMessage(`Erro no login: ${error.message}`, true);
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
      
      // Se tem dados do animal, verifica permissões
      if (state.animalData) {
        const canEdit = utils.checkPermissions();
        console.log('Usuário pode editar?', canEdit);
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
    if (!state.animalData) {
      console.warn('Tentativa de mostrar dados sem animalData');
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
    console.log('Tentando mostrar formulário de edição...');
    
    if (!state.currentUser) {
      console.log('Usuário não autenticado - mostrando mensagem de login');
      utils.showMessage("Faça login para editar", true);
      return;
    }

    if (!state.animalData) {
      console.warn('Dados do animal não carregados');
      utils.showMessage("Dados do animal não carregados", true);
      return;
    }

    const canEdit = utils.checkPermissions();
    console.log('Permissão para editar:', canEdit);
    
    if (!canEdit) {
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
      return;
    }
    
    console.log('Carregando dados do animal ID:', state.animalId);
    
    try {
      utils.showElement(elements.loading);
      const docRef = doc(db, "animais", state.animalId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        state.animalData = docSnap.data();
        console.log('Dados do animal carregados:', state.animalData);
        
        // Verificação crítica - garante que createdBy existe
        if (!state.animalData.createdBy) {
          console.error('Animal sem createdBy!', state.animalData);
          throw new Error("Dados do animal estão incompletos (falta createdBy)");
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
    console.log('Salvando dados do animal...');
    
    try {
      const nome = document.getElementById("nome").value.trim();
      const especie = document.getElementById("especie").value.trim();
      const raca = document.getElementById("raca").value.trim();
      const observacoes = document.getElementById("observacoes").value.trim();

      if (!nome || !especie || !raca) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      if (!utils.checkPermissions()) {
        throw new Error("Você não tem permissão para editar este animal");
      }

      utils.showElement(elements.loading);
      
      console.log('Atualizando dados no Firestore...');
      await setDoc(doc(db, "animais", state.animalId), { 
        nome, 
        especie, 
        raca, 
        observacoes,
        updatedAt: new Date(),
        updatedBy: state.currentUser.uid,
        // Mantém os dados originais
        createdBy: state.animalData.createdBy,
        createdAt: state.animalData.createdAt
      });

      console.log('Dados atualizados com sucesso!');
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
  // Verifica se está voltando de redirecionamento
  const isRedirectBack = sessionStorage.getItem('isRedirecting') === 'true';
  
  if (isRedirectBack) {
    sessionStorage.removeItem('isRedirecting');
    utils.showElement(elements.loading);
  };
  
  // Obtém ID do animal da URL
  const params = new URLSearchParams(window.location.search);
  state.animalId = params.get("id");
  console.log('Animal ID da URL:', state.animalId);
  
  if (!state.animalId) {
    console.error('Nenhum animalId especificado na URL');
    utils.showMessage("ID do animal não especificado", true);
    return;
  }

  // Event listeners
  elements.googleLoginBtn?.addEventListener('click', authFunctions.handleLogin);
  elements.logoutBtn?.addEventListener('click', authFunctions.handleLogout);
  elements.editBtn?.addEventListener('click', ui.showAnimalForm);
  elements.animalForm?.addEventListener('submit', animalFunctions.saveAnimalData);

  // Debug: mostra estado inicial
  console.log('Estado inicial:', {
    currentUser: state.currentUser,
    animalId: state.animalId,
    animalData: state.animalData,
    adminUID: ADMIN_UID
  });

  // Inicia processos
  authFunctions.initializeAuth();
  animalFunctions.loadAnimalData();
};

// Inicia a aplicação
document.addEventListener('DOMContentLoaded', init);
