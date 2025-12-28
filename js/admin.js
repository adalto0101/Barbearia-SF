import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, remove, update, push } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

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
const db = getDatabase(app);

const listaAgendamentos = document.getElementById("lista-agendamentos");
const listaServicos = document.getElementById("lista-servicos");
const formServico = document.getElementById('form-servico');

// --- 1️⃣ CARREGAR AGENDAMENTOS ---
function carregarAgendamentos() {
  onValue(ref(db, "agendamentos"), (snapshot) => {
    listaAgendamentos.innerHTML = "";
    const data = snapshot.val();
    if (data) {
      // Pega a data de hoje no formato YYYY-MM-DD
      const hoje = new Date().toISOString().split('T')[0];

      const itens = Object.entries(data)
        .filter(([, ag]) => ag.data && ag.hora && ag.cliente && ag.data >= hoje) // FILTRO ADICIONADO AQUI
        .sort(([, a], [, b]) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

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
          </div>`;

        card.querySelector(".btn-delete").onclick = () => {
          if (confirm(`Excluir agendamento?`)) remove(ref(db, `agendamentos/${id}`));
        };
        card.querySelector(".btn-edit").onclick = () => {
          const novaHora = prompt("Novo horário:", ag.hora);
          if (novaHora) update(ref(db, `agendamentos/${id}`), { hora: novaHora });
        };
        listaAgendamentos.appendChild(card);
      });
    } else {
      listaAgendamentos.innerHTML = "<p style='text-align:center; opacity:0.6;'>Nenhum agendamento encontrado.</p>";
    }
  });
}

// --- 2️⃣ CARREGAR SERVIÇOS (ORDENADOS) ---
function carregarServicos() {
  onValue(ref(db, "servicos"), (snapshot) => {
    listaServicos.innerHTML = "";
    const data = snapshot.val();
    if (data) {
      const servicosOrdenados = Object.entries(data).sort(([, a], [, b]) => (a.ordem || 99) - (b.ordem || 99));

      servicosOrdenados.forEach(([id, s]) => {
        const card = document.createElement('div');
        card.classList.add('servico-card');
        card.innerHTML = `
          <div>
            <strong>Posição ${s.ordem || '?'}: ${s.nome}</strong><br>
            <small>R$ ${s.preco} | ${s.duracao}min</small>
          </div>
          <div class="btns-card">
            <button class="btn-edit-ordem" title="Mudar Posição">🔢</button>
            <button class="btn-edit-serv" title="Editar Preço">💰</button>
            <button class="btn-del-serv" title="Excluir">🗑️</button>
          </div>`;

        card.querySelector('.btn-del-serv').onclick = () => {
          if (confirm(`Excluir serviço ${s.nome}?`)) remove(ref(db, `servicos/${id}`));
        };
        card.querySelector('.btn-edit-serv').onclick = () => {
          const novoPreco = prompt(`Novo preço para ${s.nome}:`, s.preco);
          if (novoPreco) update(ref(db, `servicos/${id}`), { preco: Number(novoPreco) });
        };
        card.querySelector('.btn-edit-ordem').onclick = () => {
          const novaOrdem = prompt(`Nova posição para ${s.nome}:`, s.ordem || "");
          if (novaOrdem) update(ref(db, `servicos/${id}`), { ordem: Number(novaOrdem) });
        };
        listaServicos.appendChild(card);
      });
    }
  });
}

// --- 3️⃣ CONTROLE DE ABAS ---
const btnTabAg = document.getElementById('btn-agendamentos');
const btnTabServ = document.getElementById('btn-servicos');

if (btnTabAg) btnTabAg.onclick = () => {
  document.getElementById('sec-agendamentos').style.display = 'block';
  document.getElementById('sec-servicos').style.display = 'none';
  btnTabAg.classList.add('active');
  btnTabServ.classList.remove('active');
};

if (btnTabServ) btnTabServ.onclick = () => {
  document.getElementById('sec-agendamentos').style.display = 'none';
  document.getElementById('sec-servicos').style.display = 'block';
  btnTabServ.classList.add('active');
  btnTabAg.classList.remove('active');
};

// --- 4️⃣ CADASTRO DE SERVIÇOS ---
if (formServico) formServico.onsubmit = (e) => {
  e.preventDefault();
  push(ref(db, 'servicos'), {
    nome: document.getElementById('serv-nome').value,
    preco: Number(document.getElementById('serv-preco').value),
    duracao: Number(document.getElementById('serv-duracao').value),
    ordem: Number(document.getElementById('serv-ordem').value)
  }).then(() => { formServico.reset(); alert("✅ Cadastrado!"); });
};

// --- 5️⃣ INICIALIZAÇÃO ---
window.addEventListener('auth-ready', () => {
  carregarAgendamentos();
  carregarServicos();
});
