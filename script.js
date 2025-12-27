import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB-f47rzgtMlM-LQbVZt7TnPQhoYZadBQ4",
    authDomain: "barbearia-sf.firebaseapp.com",
    projectId: "barbearia-sf",
    storageBucket: "barbearia-sf.firebasestorage.app",
    messagingSenderId: "36319269112",
    appId: "1:36319269112:web:a16611690889aeb5daeb0d",
    measurementId: "G-6BQDW62M8B"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Capturar o formulário
const form = document.getElementById('form-agendamento');
const mensagemDiv = document.getElementById('mensagem');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value;
    const servico = document.getElementById('servico').value;
    const dataHora = document.getElementById('data-hora').value;

    try {
        // Envia para a coleção "agendamentos" no Firestore
        await addDoc(collection(db, "agendamentos"), {
            cliente: nome,
            servico: servico,
            horario: dataHora,
            dataCriacao: new Date()
        });

        mensagemDiv.innerText = "✅ Agendado com sucesso!";
        mensagemDiv.style.color = "#4CAF50";
        form.reset(); // Limpa o formulário
    } catch (error) {
        console.error("Erro ao salvar:", error);
        mensagemDiv.innerText = "❌ Erro ao agendar. Tente novamente.";
        mensagemDiv.style.color = "#f44336";
    }
});
