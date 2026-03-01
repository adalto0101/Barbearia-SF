import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1mkw9lTCa1khBcTNBHf4nC_MkC9lECIk",
  authDomain: "barbearia-sf1-0.firebaseapp.com",
  databaseURL: "https://barbearia-sf1-0-default-rtdb.firebaseio.com",
  projectId: "barbearia-sf1-0",
  storageBucket: "barbearia-sf1-0.firebasestorage.app",
  messagingSenderId: "638200163686",
  appId: "1:638200163686:web:d6e615289d181b9da62ca7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

const loginSection = document.getElementById("login-section");
const loginForm = document.getElementById("login-form");
const erroLogin = document.getElementById("erro-login");
const toggleSenha = document.getElementById("toggle-senha");
const senhaInput = document.getElementById("senha");

// --- FUNÇÃO MOSTRAR SENHA ---
if (toggleSenha && senhaInput) {
  toggleSenha.onclick = () => {
    const type = senhaInput.type === "password" ? "text" : "password";
    senhaInput.type = type;
    toggleSenha.textContent = type === "password" ? "👁️" : "🙈";
  };
}

// --- LOGIN ---
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const btn = loginForm.querySelector('button');

    if (btn) {
      btn.innerText = "Carregando...";
      btn.disabled = true;
    }

    signInWithEmailAndPassword(auth, email, senha)
      .then(() => {
        window.location.href = "admin.html";
      })
      .catch((error) => {
        console.error(error);
        if (erroLogin) erroLogin.textContent = "❌ E-mail ou senha inválidos.";
      })
      .finally(() => {
        if (btn) {
          btn.innerText = "Entrar";
          btn.disabled = false;
        }
      });
  });
}

// --- OBSERVADOR DE AUTENTICAÇÃO (AJUSTADO) ---
onAuthStateChanged(auth, (user) => {
  const estaNaLogin = window.location.pathname.includes("login.html");

  if (user) {
    // SÓ redireciona para admin se ele estiver na página de login
    if (estaNaLogin) {
      window.location.href = "admin.html";
    }
  } else {
    if (loginSection) loginSection.style.display = "flex";
  }
});
