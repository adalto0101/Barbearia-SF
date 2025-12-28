// Importa módulos Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, remove,update, push } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// Configuração Firebase
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

const lista = document.getElementById("lista-agendamentos");

// Função para renderizar lista de agendamentos
function carregarAgendamentos() {
  onValue(ref(db, "agendamentos"), (snapshot) => {
    lista.innerHTML = "";
    const data = snapshot.val();

    if (data) {
      const itens = Object.entries(data)
        .filter(([, ag]) => ag.data && ag.hora && ag.cliente) // só pega completos
        .sort(([, a], [, b]) => a.data.localeCompare(b.data));


      itens.forEach(([id, ag]) => {
        const dataBR = ag.data.split("-").reverse().join("/");
        const msg = encodeURIComponent(
          `Olá ${ag.cliente}, confirmamos seu agendamento na Barbearia SF para o dia ${dataBR} às ${ag.hora}.`
        );
        const urlWhats = `https://wa.me/55${ag.whatsapp}?text=${msg}`;

        const card = document.createElement("div");
        card.classList.add("admin-card");
        card.innerHTML = `
          <div>
            <strong>${ag.hora}</strong> - ${ag.cliente}<br>
            <small>${dataBR} • ${ag.servico}</small>
          </div>
          <div class="btns-card">
            <a href="${urlWhats}" target="_blank" class="btn-whatsapp">WhatsApp</a>
            <button class="btn-edit">Editar</button>
            <button class="btn-delete">Excluir</button>
          </div>
        `;

        // --- EXCLUIR AGENDAMENTO ---
        card.querySelector(".btn-delete").onclick = () => {
          if (confirm(`Excluir agendamento de ${ag.cliente}?`)) {
            remove(ref(db, `agendamentos/${id}`))
              .then(() => alert("🗑️ Agendamento excluído com sucesso."))
              .catch((err) => alert("Erro ao excluir: " + err.message));
          }
        };

        // --- EDITAR AGENDAMENTO ---
        card.querySelector(".btn-edit").onclick = () => {
          const novoServico = prompt("Novo serviço:", ag.servico);
          const novaHora = prompt("Novo horário:", ag.hora);
          if (novoServico && novaHora) {
            update(ref(db, `agendamentos/${id}`), {
              servico: novoServico,
              hora: novaHora,
            })
              .then(() => alert("✅ Agendamento atualizado!"))
              .catch((err) => alert("Erro ao atualizar: " + err.message));
          }
        };

        lista.appendChild(card);
      });
    } else {
      lista.innerHTML = "<p>Nenhum agendamento encontrado.</p>";
    }
  });
}

// --- TROCANDO ABAS ---
const secAg = document.getElementById('sec-agendamentos');
const secServ = document.getElementById('sec-servicos');
document.getElementById('btn-agendamentos').onclick = () => {
  secAg.style.display = 'block';
  secServ.style.display = 'none';
  document.getElementById('btn-agendamentos').classList.add('active');
  document.getElementById('btn-servicos').classList.remove('active');
};
document.getElementById('btn-servicos').onclick = () => {
  secAg.style.display = 'none';
  secServ.style.display = 'block';
  document.getElementById('btn-servicos').classList.add('active');
  document.getElementById('btn-agendamentos').classList.remove('active');
};

// --- CRUD DE SERVIÇOS ---
const formServ = document.getElementById('form-servico');
const listaServ = document.getElementById('lista-servicos');

function carregarServicos() {
  onValue(ref(db, "servicos"), (snapshot) => {
    listaServ.innerHTML = "";
    const data = snapshot.val();
    if (data) {
      Object.entries(data).forEach(([id, s]) => {
        const card = document.createElement('div');
        card.classList.add('servico-card');
        card.innerHTML = `
          <div>
            <strong>${s.nome}</strong><br>
            <small>R$ ${s.preco} | ${s.duracao}min</small><br>
            <small>${s.inicio} às ${s.fim}</small>
          </div>
          <div>
            <button class="btn-edit-serv">✏️</button>
            <button class="btn-del-serv">🗑️</button>
          </div>
        `;

        card.querySelector('.btn-del-serv').onclick = () => {
          if (confirm(`Excluir serviço ${s.nome}?`))
            remove(ref(db, `servicos/${id}`));
        };

        card.querySelector('.btn-edit-serv').onclick = () => {
          const novoPreco = prompt("Novo preço (R$):", s.preco);
          const novaDuracao = prompt("Nova duração (min):", s.duracao);
          if (novoPreco && novaDuracao) {
            update(ref(db, `servicos/${id}`), {
              preco: novoPreco,
              duracao: novaDuracao
            });
          }
        };

        listaServ.appendChild(card);
      });
    } else {
      listaServ.innerHTML = "<p>Nenhum serviço cadastrado.</p>";
    }
  });
}

if (listaServ) carregarServicos();

formServ.onsubmit = (e) => {
  e.preventDefault();
  const nome = document.getElementById('serv-nome').value.trim();
  const preco = document.getElementById('serv-preco').value.trim();
  const duracao = document.getElementById('serv-duracao').value.trim();
  const inicio = document.getElementById('serv-inicio').value;
  const fim = document.getElementById('serv-fim').value;
  if (!nome || !preco || !duracao) return alert("Preencha todos os campos!");
  push(ref(db, 'servicos'), { nome, preco, duracao, inicio, fim })
    .then(() => formServ.reset());
};


// Chama ao carregar
if (lista) carregarAgendamentos();
