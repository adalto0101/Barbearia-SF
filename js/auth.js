// Importa Firebase Auth
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB-f47rzgtMlM-LQbVZt7TnPQhoYZadBQ4",
  authDomain: "barbearia-sf.firebaseapp.com",
  databaseURL: "https://barbearia-sf-default-rtdb.firebaseio.com/",
  projectId: "barbearia-sf",
  storageBucket: "barbearia-sf.firebasestorage.app",
  messagingSenderId: "36319269112",
  appId: "1:36319269112:web:a16611690889aeb5daeb0d"
};

// Inicializa o Firebase e Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Referências de elementos
const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const loginForm = document.getElementById("login-form");
const erroLogin = document.getElementById("erro-login");
const logoutBtn = document.getElementById("logout");

// --- LOGIN ---
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      erroLogin.textContent = "";
    } catch (error) {
      console.error(error);
      erroLogin.textContent = "❌ E-mail ou senha inválidos.";
    }
  });
}

// --- OBSERVADOR DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.style.display = "none";
    adminSection.style.display = "block";
  } else {
    loginSection.style.display = "flex";
    adminSection.style.display = "none";
  }
});

// --- LOGOUT ---
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    alert("Você saiu do painel.");
  });
}
