import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, remove, update, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

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

// --- SELETORES GERAIS ---
const listaAgendamentos = document.getElementById("lista-agendamentos");
const filtroData = document.getElementById("filtro-data");
const buscaCliente = document.getElementById("pesquisa-cliente");
const listaServicos = document.getElementById("lista-servicos");
const formServico = document.getElementById('form-servico');
const gradeBloqueio = document.getElementById('grade-bloqueio');

// --- SISTEMA DE ÁUDIO E DESBLOQUEIO ---
const somNotificacao = new Audio('notificacao.mp3');

function liberarAudio() {
  somNotificacao.play().then(() => {
    somNotificacao.pause();
    somNotificacao.currentTime = 0;
    document.removeEventListener('click', liberarAudio);
  }).catch(() => { });
}
document.addEventListener('click', liberarAudio);

// Data de hoje como padrão
const hojeISO = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-');;
if (filtroData) filtroData.value = hojeISO;

// --- 1️⃣ NOTIFICAÇÕES EM TEMPO REAL ---
let primeiraCarga = true;
const agendamentosRef = ref(db, "agendamentos");

onChildAdded(agendamentosRef, (snapshot) => {
  if (!primeiraCarga) {
    const novoAg = snapshot.val();
    exibirModalNovoAgendamento(novoAg);
  }
});

onValue(agendamentosRef, () => { primeiraCarga = false; }, { onlyOnce: true });

function exibirModalNovoAgendamento(ag) {
  const modal = document.getElementById('modal-notificacao');
  if (modal) {
    const dataBR = ag.data ? ag.data.split("-").reverse().join("/") : "---";
    document.getElementById('notif-cliente').innerText = ag.cliente || "---";
    document.getElementById('notif-servico').innerText = ag.servico || "---";
    document.getElementById('notif-data').innerText = dataBR;
    document.getElementById('notif-hora').innerText = ag.hora || "---";

    modal.style.display = 'flex';
    somNotificacao.play().catch(e => console.log("Áudio aguardando interação."));
    setTimeout(() => {
      modal.style.display = 'none';
    }, 60000); // 60000 milissegundos = 60 segundos.
  }
}

// --- 2️⃣ CARREGAR E FILTRAR AGENDAMENTOS ---
function carregarAgendamentos() {
  onValue(agendamentosRef, (snapshot) => {
    if (!listaAgendamentos) return;
    listaAgendamentos.innerHTML = "";
    const data = snapshot.val();

    if (data) {
      const dataSelecionada = filtroData.value;
      const termoBusca = buscaCliente.value.toLowerCase();
      const agora = new Date();
      const minutosAtuais = (agora.getHours() * 60) + agora.getMinutes();

      const itens = Object.entries(data)
        .filter(([id, ag]) => {
          const dataAg = ag.data;
          const [hAg, mAg] = ag.hora.split(":").map(Number);
          const minutosAg = (hAg * 60) + mAg;
          const nomeAg = (ag.cliente || "").toLowerCase();
          const foneAg = (ag.whatsapp || "");

          const matchesData = dataAg === dataSelecionada;
          const matchesBusca = nomeAg.includes(termoBusca) || foneAg.includes(termoBusca);

          let matchesHorario = true;
          if (dataAg === hojeISO) {
            matchesHorario = minutosAg >= minutosAtuais;
          }

          return matchesData && matchesBusca && matchesHorario;
        })
        .sort(([, a], [, b]) => a.hora.localeCompare(b.hora));

      if (itens.length === 0) {
        listaAgendamentos.innerHTML = "<p style='text-align:center; padding:20px; opacity:0.6;'>Nenhum agendamento para este filtro.</p>";
        return;
      }

      itens.forEach(([id, ag]) => {
        const dataBR = ag.data.split("-").reverse().join("/");
        const urlWhats = `https://wa.me/55${ag.whatsapp}?text=Olá! Confirmamos seu agendamento em ${dataBR} às ${ag.hora}.`;
        const card = document.createElement("div");
        card.className = `admin-card ${ag.cliente === "BLOQUEADO" ? "bloqueado" : ""}`;

        card.innerHTML = `
          <div>
            <strong>${ag.hora} — ${ag.cliente}</strong><br>
            <small>${ag.servico || 'Bloqueio Manual'}</small>
          </div>
          <div class="btns-card">
            ${ag.cliente !== "BLOQUEADO" ? `<a href="${urlWhats}" target="_blank" class="btn-whatsapp">WhatsApp</a>` : ''}
            <button class="btn-delete">Excluir</button>
          </div>`;

        card.querySelector(".btn-delete").onclick = () => {
          if (confirm(`Excluir agendamento de ${ag.cliente}?`)) remove(ref(db, `agendamentos/${id}`));
        };
        listaAgendamentos.appendChild(card);
      });
    }
  });
}

// --- 3️⃣ MODAL DE CONFIRMAÇÃO PERSONALIZADO ---
function mostrarConfirmacao(titulo, mensagem, data, servico, acaoSim) {
  const overlay = document.getElementById('custom-confirm');
  const txtTitulo = document.getElementById('confirm-title');
  const txtMsg = document.getElementById('confirm-msg');
  const txtDate = document.getElementById('confirm-date');
  const txtServ = document.getElementById('confirm-service');
  const btnSim = document.getElementById('confirm-yes');
  const btnNao = document.getElementById('confirm-no');

  if (!overlay) return;

  txtTitulo.innerText = titulo;
  txtMsg.innerText = mensagem;
  txtDate.innerText = data || "---";
  txtServ.innerText = servico || "---";
  overlay.style.display = 'flex';

  const novoBtnSim = btnSim.cloneNode(true);
  btnSim.parentNode.replaceChild(novoBtnSim, btnSim);

  novoBtnSim.onclick = () => {
    acaoSim();
    overlay.style.display = 'none';
  };

  btnNao.onclick = () => {
    overlay.style.display = 'none';
  };
}

// --- 4️⃣ GRADE DE BLOQUEIO (20 EM 20 MINUTOS) ---
function gerarGradeBloqueio() {
  const dataSelecionada = filtroData.value;
  if (!dataSelecionada) return;

  const diasSemana = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const diaNome = diasSemana[new Date(dataSelecionada + 'T00:00:00').getDay()];

  onValue(ref(db, `horarios_funcionamento/${diaNome}`), (funcSnapshot) => {
    const config = funcSnapshot.val();
    if (!config || config.fechado) {
      gradeBloqueio.innerHTML = `<p style='grid-column: 1/-1; text-align:center; padding:20px; color:var(--vermelho);'>Barbearia fechada (${diaNome}).</p>`;
      return;
    }

    onValue(agendamentosRef, (snapshot) => {
      const agendados = snapshot.val() || {};
      gradeBloqueio.innerHTML = "";
      const dataBR = dataSelecionada.split('-').reverse().join('/');

      for (let h = parseInt(config.inicio); h < parseInt(config.fim); h++) {
        for (let m = 0; m < 60; m += 20) {
          const horaFormatada = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          const agId = Object.keys(agendados).find(id => agendados[id].data === dataSelecionada && agendados[id].hora === horaFormatada);
          const ocupado = !!agId;
          const ehBloqueio = ocupado && agendados[agId].cliente === "BLOQUEADO";

          const btn = document.createElement("button");
          btn.innerText = horaFormatada;
          btn.className = ehBloqueio ? "btn-hora bloqueado-red" : (ocupado ? "btn-hora ocupado" : "btn-hora livre");

          btn.onclick = () => {
            if (!ocupado) {
              mostrarConfirmacao("Bloquear Horário", `Bloquear ${horaFormatada}?`, dataBR, "Bloqueio Manual", () => {
                push(agendamentosRef, {
                  cliente: "BLOQUEADO",
                  data: dataSelecionada,
                  hora: horaFormatada,
                  whatsapp: "00000000000",
                  servico: "Bloqueio Manual"
                });
              });
            } else if (ehBloqueio) {
              mostrarConfirmacao("Liberar Horário", `Liberar ${horaFormatada}?`, dataBR, "Bloqueio Manual", () => {
                remove(ref(db, `agendamentos/${agId}`));
              });
            } else {
              alert("Horário ocupado por um cliente.");
            }
          };
          gradeBloqueio.appendChild(btn);
        }
      }
    });
  }, { onlyOnce: true });
}

// --- 5️⃣ GESTÃO DE SERVIÇOS ---
function carregarServicos() {
  onValue(ref(db, "servicos"), (snapshot) => {
    if (!listaServicos) return;
    listaServicos.innerHTML = "";
    const data = snapshot.val();
    if (data) {
      const ordenados = Object.entries(data).sort(([, a], [, b]) => (a.ordem || 99) - (b.ordem || 99));
      ordenados.forEach(([id, s]) => {
        const card = document.createElement('div');
        card.className = 'servico-card';
        card.innerHTML = `
          <div>
            <strong>${s.ordem || '?'}. ${s.nome}</strong><br>
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

// --- 6️⃣ NAVEGAÇÃO ENTRE ABAS ---
const btnTabAg = document.getElementById('btn-agendamentos');
const btnTabServ = document.getElementById('btn-servicos');
const btnTabBloq = document.getElementById('btn-bloqueio');

function gerenciarAbas(abaAtiva) {
  document.getElementById('sec-agendamentos').style.display = abaAtiva === 'ag' ? 'block' : 'none';
  document.getElementById('sec-servicos').style.display = abaAtiva === 'serv' ? 'block' : 'none';
  document.getElementById('sec-bloqueio').style.display = abaAtiva === 'bloq' ? 'block' : 'none';

  btnTabAg.classList.toggle('active', abaAtiva === 'ag');
  btnTabServ.classList.toggle('active', abaAtiva === 'serv');
  btnTabBloq.classList.toggle('active', abaAtiva === 'bloq');

  if (abaAtiva === 'bloq') gerarGradeBloqueio();
}

if (btnTabAg) btnTabAg.onclick = () => gerenciarAbas('ag');
if (btnTabServ) btnTabServ.onclick = () => gerenciarAbas('serv');
if (btnTabBloq) btnTabBloq.onclick = () => gerenciarAbas('bloq');

// --- 7️⃣ FORMULÁRIO DE SERVIÇOS E FILTROS ---
if (formServico) formServico.onsubmit = (e) => {
  e.preventDefault();
  push(ref(db, 'servicos'), {
    nome: document.getElementById('serv-nome').value,
    preco: Number(document.getElementById('serv-preco').value),
    duracao: Number(document.getElementById('serv-duracao').value),
    ordem: Number(document.getElementById('serv-ordem').value)
  }).then(() => {
    formServico.reset();
    alert("Serviço cadastrado com sucesso!");
  });
};

if (filtroData) filtroData.onchange = () => {
  carregarAgendamentos();
  if (document.getElementById('sec-bloqueio').style.display === 'block') gerarGradeBloqueio();
};

if (buscaCliente) buscaCliente.oninput = carregarAgendamentos;

// --- 8️⃣ INICIALIZAÇÃO ---
window.addEventListener('auth-ready', () => {
  carregarAgendamentos();
  carregarServicos();
});

// Atualização automática a cada 1 hora (3600000 ms)
setInterval(() => {
  carregarAgendamentos();
}, 3600000);
