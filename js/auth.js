import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

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

const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const loginForm = document.getElementById("login-form");
const erroLogin = document.getElementById("erro-login");
const logoutBtn = document.getElementById("logout");

// --- LOGIN ---
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation(); // Impede que outros scripts interfiram no clique

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    const btn = loginForm.querySelector('button');
    btn.innerText = "Carregando...";
    btn.disabled = true;

    signInWithEmailAndPassword(auth, email, senha)
      .then(() => {
        erroLogin.textContent = "";
        btn.innerText = "Entrar";
        btn.disabled = false;
      })
      .catch((error) => {
        console.error("Erro no login:", error.code);
        btn.innerText = "Entrar";
        btn.disabled = false;
        
        if (error.code === 'auth/invalid-credential') {
            erroLogin.textContent = "❌ E-mail ou senha incorretos.";
        } else {
            erroLogin.textContent = "❌ Erro ao acessar o servidor.";
        }
      });
  });
}

// --- OBSERVADOR DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Se logado, limpa a tela de login e mostra o painel
    if (loginSection) loginSection.style.display = "none";
    if (adminSection) adminSection.style.display = "block";
    
    // Dispara um evento para o admin.js saber que pode carregar os dados
    window.dispatchEvent(new Event('auth-ready'));
  } else {
    // Se deslogado, volta para o login
    if (loginSection) loginSection.style.display = "flex";
    if (adminSection) adminSection.style.display = "none";
  }
});

// --- LOGOUT ---
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      // O onAuthStateChanged cuidará de esconder o painel
    });
  });
}
