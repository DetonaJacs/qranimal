import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  // Elementos do DOM
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');
  const generateBtn = document.getElementById('generate-btn');
  const animalIdInput = document.getElementById('animalId');
  const qrCanvas = document.getElementById('qr');
  const qrLink = document.getElementById('qr-link');

  // Verifica autenticação
  auth.onAuthStateChanged((user) => {
    if (!user || user.email !== 'jacson311@gmail.com') {
      window.location.href = 'login.html';
      return;
    }

    // Mostra informações do usuário
    userAvatar.src = user.photoURL || 'https://via.placeholder.com/40';
    userName.textContent = user.displayName || 'Administrador';
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  });

  // Gerar QR Code
  generateBtn.addEventListener('click', () => {
    const animalId = animalIdInput.value.trim();
    
    if (!animalId) {
      alert('Por favor, insira um ID válido');
      return;
    }

const url = `https://qranimal.vercel.app/animal.html?id=${encodeURIComponent(id)}`;
    
    new QRious({
      element: qrCanvas,
      value: url,
      size: 250,
      level: 'H'
    });
    
    qrLink.innerHTML = `Link: <a href="${url}" target="_blank">${url}</a>`;
  });
});
