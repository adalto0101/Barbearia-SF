import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-f47rzgtMlM-LQbVZt7TnPQhoYZadBQ4",
  authDomain: "barbearia-sf.firebaseapp.com",
  databaseURL: "https://barbearia-sf-default-rtdb.firebaseio.com/",
  projectId: "barbearia-sf",
  storageBucket: "barbearia-sf.firebasestorage.app",
  messagingSenderId: "36319269112",
  appId: "1:36319269112:web:a16611690889aeb5daeb0d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configura o Firebase para lembrar do login mesmo se fechar o navegador
setPersistence(auth, browserLocalPersistence);

const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const loginForm = document.getElementById("login-form");
const erroLogin = document.getElementById("erro-login");
const logoutBtn = document.getElementById("logout");
const toggleSenha = document.getElementById("toggle-senha");
const senhaInput = document.getElementById("senha");

// --- FUNÇÃO OLHO (MOSTRAR SENHA) ---
if (toggleSenha) {
  toggleSenha.addEventListener("click", () => {
    const type = senhaInput.getAttribute("type") === "password" ? "text" : "password";
    senhaInput.setAttribute("type", type);
    toggleSenha.textContent = type === "password" ? "👁️" : "🙈";
  });
}

// --- LOGIN ---
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const btn = loginForm.querySelector('button');

    btn.innerText = "Carregando...";
    btn.disabled = true;

    signInWithEmailAndPassword(auth, email, senha)
      .then(() => {
        if (erroLogin) erroLogin.textContent = "";
      })
      .catch((error) => {
        console.error(error);
        if (erroLogin) erroLogin.textContent = "❌ E-mail ou senha inválidos.";
      })
      .finally(() => {
        btn.innerText = "Entrar";
        btn.disabled = false;
      });
  });
}

// --- OBSERVADOR DE AUTENTICAÇÃO (PERSISTÊNCIA) ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Verificações adicionadas para evitar o erro de null no GitHub Pages
    if (loginSection) loginSection.style.display = "none";
    if (adminSection) adminSection.style.display = "block";
    
    // Dispara o evento para o admin.js carregar os dados
    window.dispatchEvent(new Event('auth-ready'));
  } else {
    if (loginSection) loginSection.style.display = "flex";
    if (adminSection) adminSection.style.display = "none";
  }
});

// --- LOGOUT (FIX) ---
if (logoutBtn) {
  logoutBtn.onclick = (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
      alert("Sessão encerrada.");
      window.location.reload(); // Recarrega para limpar tudo
    }).catch((error) => {
      console.error("Erro ao sair:", error);
    });
  };
}
