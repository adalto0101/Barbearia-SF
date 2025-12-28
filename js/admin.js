// Importa módulos Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, remove, update, push } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// Configuração Firebase (Sua configuração original)
const firebaseConfig = {
  apiKey: "AIzaSyB-f47rzgtMlM-LQbVZt7TnPQhoYZadBQ4",
  authDomain: "barbearia-sf.firebaseapp.com",
  databaseURL: "https://barbearia-sf-default-rtdb.firebaseio.com/",
  projectId: "barbearia-sf",
  storageBucket: "barbearia-sf.firebasestorage.app",
  messagingSenderId: "36319269112",
  appId: "1:36319269112:web:a16611690889aeb5daeb0d"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Elementos DOM
const listaAgendamentos = document.getElementById("lista-agendamentos");
const listaServicos = document.getElementById("lista-servicos");
const formServico = document.getElementById('form-servico');

// --- 1️⃣ CARREGAR AGENDAMENTOS ---
function carregarAgendamentos() {
  onValue(ref(db, "agendamentos"), (snapshot) => {
    listaAgendamentos.innerHTML = "";
    const data = snapshot.val();

    if (data) {
      const itens = Object.entries(data)
        .filter(([, ag]) => ag.data && ag.hora && ag.cliente)
        .sort(([, a], [, b]) => a.data.localeCompare(b.data));

      itens.forEach(([id, ag]) => {
        const dataBR = ag.data.split("-").reverse().join("/");
        const msg = encodeURIComponent(`Olá ${ag.cliente}, confirmamos seu agendamento na Barbearia SF para o dia ${dataBR} às ${ag.hora}.`);
        const urlWhats = `https://wa.me/55${ag.whatsapp}?text=${msg}`;

        const card = document.createElement("div");
        card.classList.add("admin-card");
        card.innerHTML = `
          <div>
            <strong>${ag.hora} — ${ag.cliente}</strong><br>
            <small>${dataBR} • ${ag.servico}</small>
          </div>
          <div class="btns-card">
            <a href="${urlWhats}" target="_blank" class="btn-whatsapp">WhatsApp</a>
            <button class="btn-edit">Editar</button>
            <button class="btn-delete">Excluir</button>
          </div>
        `;

        // Ações Agendamento
        card.querySelector(".btn-delete").onclick = () => {
          if (confirm(`Excluir agendamento de ${ag.cliente}?`)) {
            remove(ref(db, `agendamentos/${id}`));
          }
        };

        card.querySelector(".btn-edit").onclick = () => {
          const novaHora = prompt("Novo horário:", ag.hora);
          if (novaHora) {
            update(ref(db, `agendamentos/${id}`), { hora: novaHora });
          }
        };

        listaAgendamentos.appendChild(card);
      });
    } else {
      listaAgendamentos.innerHTML = "<p style='text-align:center; opacity:0.6;'>Nenhum agendamento encontrado.</p>";
    }
  });
}

// --- 2️⃣ CARREGAR SERVIÇOS ---
function carregarServicos() {
  onValue(ref(db, "servicos"), (snapshot) => {
    listaServicos.innerHTML = "";
    const data = snapshot.val();
    if (data) {
      Object.entries(data).forEach(([id, s]) => {
        const card = document.createElement('div');
        card.classList.add('servico-card');
        card.innerHTML = `
          <div>
              <strong>${s.nome}</strong><br>
              <small>R$ ${s.preco} | ${s.duracao}min</small>
            </div>
            <div class="btns-card">
              <button class="btn-edit-serv">✏️</button>
              <button class="btn-del-serv">🗑️</button>
            </div> 
             `;

        card.querySelector('.btn-del-serv').onclick = () => {
          if (confirm(`Excluir serviço ${s.nome}?`)) remove(ref(db, `servicos/${id}`));
        };

        card.querySelector('.btn-edit-serv').onclick = () => {
          const novoPreco = prompt("Novo preço (R$):", s.preco);
          if (novoPreco) update(ref(db, `servicos/${id}`), { preco: novoPreco });
        };

        listaServicos.appendChild(card);
      });
    } else {
      listaServicos.innerHTML = "<p style='text-align:center; opacity:0.6;'>Nenhum serviço cadastrado.</p>";
    }
  });
}

// --- 3️⃣ CONTROLE DE ABAS ---
const secAg = document.getElementById('sec-agendamentos');
const secServ = document.getElementById('sec-servicos');
const btnTabAg = document.getElementById('btn-agendamentos');
const btnTabServ = document.getElementById('btn-servicos');

btnTabAg.onclick = () => {
  secAg.style.display = 'block';
  secServ.style.display = 'none';
  btnTabAg.classList.add('active');
  btnTabServ.classList.remove('active');
};

btnTabServ.onclick = () => {
  secAg.style.display = 'none';
  secServ.style.display = 'block';
  btnTabServ.classList.add('active');
  btnTabAg.classList.remove('active');
};


// --- 4️⃣ CADASTRO DE SERVIÇOS ---
formServico.onsubmit = (e) => {
  e.preventDefault();
  const nome = document.getElementById('serv-nome').value.trim();
  const preco = document.getElementById('serv-preco').value.trim();
  const duracao = document.getElementById('serv-duracao').value.trim();

  // Agora salvamos apenas o necessário
  push(ref(db, 'servicos'), { 
    nome, 
    preco: Number(preco), 
    duracao: Number(duracao)
  }).then(() => {
    formServico.reset();
    alert("✅ Serviço cadastrado!");
  });
};

// --- 5️⃣ INICIALIZAÇÃO ---
// Lógica de Login simples para alternar as telas
// --- 5️⃣ INICIALIZAÇÃO ---

// Esta função garante que os dados só sejam buscados se o Firebase confirmar que você está logado.
// Ela resolve o problema de recarregar a página (F5) e o login sumir.
window.addEventListener('auth-ready', () => {
  console.log("Sessão ativa detectada. Carregando agendamentos e serviços...");
  
  if (typeof carregarAgendamentos === "function") carregarAgendamentos();
  if (typeof carregarServicos === "function") carregarServicos();
});

// Caso você use o Firebase Auth no auth.js, ele cuidará do redirecionamento.
// Se não, o submit acima garante a troca visual para você testar agora.
