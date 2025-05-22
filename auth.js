import { auth, provider } from './firebase-config.js';
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  const googleBtn = document.getElementById('googleLogin');
  const errorElement = document.getElementById('error-message');

  // Verifica se os elementos existem
  if (!googleBtn || !errorElement) {
    console.error('Elementos não encontrados no DOM');
    return;
  }

  googleBtn.addEventListener('click', async () => {
    try {
      googleBtn.disabled = true;
      errorElement.textContent = '';
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Verifica se é um email autorizado
      if (user.email === 'seu-email@gmail.com') {
        window.location.href = 'gerar-qrcode.html';
      } else {
        await auth.signOut();
        errorElement.textContent = 'Apenas o administrador pode acessar este sistema.';
      }
    } catch (error) {
      console.error('Erro no login:', error);
      errorElement.textContent = 'Erro ao fazer login. Tente novamente.';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorElement.textContent = 'A janela de login foi fechada. Tente novamente.';
      }
    } finally {
      googleBtn.disabled = false;
    }
  });
});
