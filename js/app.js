import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

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

const inputData = document.getElementById('data-agenda');
const inputServico = document.getElementById('cliente-servico');
const secaoServico = document.getElementById('secao-servico');
const secaoHorarios = document.getElementById('secao-horarios');
const gridHorarios = document.getElementById('grid-horarios');
const btnAgendar = document.getElementById('btn-agendar');

let horaSelecionada = null;
let servicoSelecionado = null;
let horariosFuncionamento = {};
let servicosDisponiveis = {};

function paraMinutos(horaStr) {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

// --- 1️⃣ CARREGA SERVIÇOS ORDENADOS ---
onValue(ref(db, 'servicos'), (snapshot) => {
  servicosDisponiveis = snapshot.val() || {};
  inputServico.innerHTML = `<option value="">Selecione um serviço</option>`;

  const listaOrdenada = Object.entries(servicosDisponiveis).sort(([, a], [, b]) => (a.ordem || 99) - (b.ordem || 99));

  listaOrdenada.forEach(([id, s]) => {
    inputServico.innerHTML += `<option value="${id}">${s.nome} — R$${s.preco}</option>`;
  });
});

onValue(ref(db, 'horarios_funcionamento'), (snapshot) => {
  horariosFuncionamento = snapshot.val() || {};
});

// --- 2️⃣ EVENTOS ---
if (inputData) {
  inputData.onchange = () => {
    if (inputData.value) {
      secaoServico.style.display = 'block';
      if (inputServico.value) gerarHorarios();
    }
  };

  inputServico.onchange = () => {
    const servicoID = inputServico.value;
    if (!servicoID) return;
    servicoSelecionado = servicosDisponiveis[servicoID];
    gerarHorarios();
  };
}

// --- 4️⃣ GERA HORÁRIOS (20 MIN E FECHAMENTO INCLUSO) ---
function gerarHorarios() {
  secaoHorarios.style.display = 'block';
  gridHorarios.innerHTML = "<p>Verificando disponibilidade...</p>";

  const dataSelecionada = inputData.value;
  if (!dataSelecionada || !servicoSelecionado) return;

  const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
  const dataObj = new Date(ano, mes - 1, dia);
  const indiceDia = dataObj.getDay();

  const diasMap = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const diaChave = diasMap[indiceDia];
  const horarioDia = horariosFuncionamento[diaChave];

  if (!horarioDia || horarioDia.fechado === true || horarioDia.fechado === "true") {
    gridHorarios.innerHTML = `<p style="color:#ff4d4d;">❌ Barbearia fechada neste dia.</p>`;
    return;
  }

  const minInicio = paraMinutos(horarioDia.inicio);
  const minFim = paraMinutos(horarioDia.fim);
  const duracaoNovo = Number(servicoSelecionado.duracao);

  onValue(ref(db, 'agendamentos'), (snapshot) => {
    const agendamentos = snapshot.val() || {};
    const agendadosHoje = Object.values(agendamentos).filter(a => a.data === dataSelecionada);

    gridHorarios.innerHTML = "";

    // Loop de 20 em 20 minutos. tempo <= minFim permite agendar no horário de fechamento.
    for (let tempo = minInicio; tempo <= minFim; tempo += 20) {
      const fimNovo = tempo + duracaoNovo;
      let conflito = false;

      agendadosHoje.forEach(ag => {
        const inicioExistente = paraMinutos(ag.hora);
        const duracaoExistente = Number(ag.duracao) || 30;
        const fimExistente = inicioExistente + duracaoExistente;

        if (tempo < fimExistente && fimNovo > inicioExistente) {
          conflito = true;
        }
      });

      const horaStr = `${String(Math.floor(tempo / 60)).padStart(2, '0')}:${String(tempo % 60).padStart(2, '0')}`;
      const btn = document.createElement('div');
      btn.classList.add('time-slot');
      btn.innerText = horaStr;

      if (conflito) {
        btn.classList.add('indisponivel');
        btn.style.opacity = "0.3";
        btn.style.pointerEvents = "none";
      } else {
        btn.onclick = () => {
          document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
          btn.classList.add('selected');
          horaSelecionada = horaStr;
          btnAgendar.style.display = 'block';
        };
      }
      gridHorarios.appendChild(btn);
    }
  }, { onlyOnce: true });
}

btnAgendar.onclick = async () => {
  const nome = document.getElementById('cliente-nome').value.trim();
  const whatsapp = document.getElementById('cliente-whatsapp').value.replace(/\D/g, '');
  const servicoID = inputServico.value;
  const data = inputData.value;

  if (!nome || !whatsapp || !servicoID || !data || !horaSelecionada) {
    alert("⚠️ Preencha tudo!");
    return;
  }

  await push(ref(db, 'agendamentos'), {
    cliente: nome, whatsapp, servico: servicoSelecionado.nome,
    data, hora: horaSelecionada, duracao: Number(servicoSelecionado.duracao),
    timestamp: Date.now()
  });

  document.getElementById('modal-sucesso').style.display = 'flex';
  document.getElementById('fechar-modal').onclick = () => window.location.reload();

 await push(ref(db, 'agendamentos'), {
    cliente: nome,
    whatsapp,
    servico: servicoSelecionado.nome,
    data,
    hora: horaSelecionada,
    duracao: Number(servicoSelecionado.duracao),
    timestamp: Date.now()
  });


  window.location.href = 'confirmacao.html';

};
