import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// --- CONFIG FIREBASE ---
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

// --- ELEMENTOS DOM ---
const inputData = document.getElementById('data-agenda');
const inputServico = document.getElementById('cliente-servico');
const secaoServico = document.getElementById('secao-servico');
const secaoHorarios = document.getElementById('secao-horarios');
const gridHorarios = document.getElementById('grid-horarios');
const btnAgendar = document.getElementById('btn-agendar');

let horaSelecionada = null;
let servicoSelecionado = null;
let duracaoSelecionada = 0;
let horariosFuncionamento = {};
let servicosDisponiveis = {};

// --- 1️⃣ CARREGA SERVIÇOS E HORÁRIOS DE FUNCIONAMENTO ---
onValue(ref(db, 'servicos'), (snapshot) => {
  servicosDisponiveis = snapshot.val() || {};
  inputServico.innerHTML = `<option value="">Selecione um serviço</option>`;
  Object.entries(servicosDisponiveis).forEach(([id, s]) => {
    inputServico.innerHTML += `
      <option value="${id}">
        ${s.nome} — ${typeof s.preco === 'number' ? `R$${s.preco}` : s.preco}
      </option>
    `;
  });
});

onValue(ref(db, 'horarios_funcionamento'), (snapshot) => {
  horariosFuncionamento = snapshot.val() || {};
});

// --- 2️⃣ AO ESCOLHER DATA → MOSTRA SERVIÇOS ---
if (inputData) {
  inputData.onchange = () => {
    if (inputData.value) secaoServico.style.display = 'block';
  };

  // --- 3️⃣ AO ESCOLHER SERVIÇO → MOSTRA HORÁRIOS DISPONÍVEIS ---
  inputServico.onchange = () => {
    const servicoID = inputServico.value;
    if (!servicoID) return;
    servicoSelecionado = servicosDisponiveis[servicoID];
    duracaoSelecionada = Number(servicoSelecionado?.duracao) || 30;
    gerarHorarios();
  };
}

// --- 4️⃣ GERA HORÁRIOS DISPONÍVEIS ---
  function gerarHorarios() {
    secaoHorarios.style.display = 'block';
    gridHorarios.innerHTML = "";

    const dataSelecionada = inputData.value;
    if (!dataSelecionada) return;

    const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);

    // Define o dia da semana (local)
    const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const diaSemana = dias[dataObj.getDay()];

    // Corrige acentos e busca no Firebase
    const diaChave = Object.keys(horariosFuncionamento).find(k =>
      k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
      diaSemana.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );

    const horarioDia = horariosFuncionamento[diaChave];

    if (!horarioDia || horarioDia.fechado) {
      gridHorarios.innerHTML = `<p style="color:#ff4d4d;">❌ Barbearia fechada neste dia.</p>`;
      return;
    }

    const inicio = horarioDia.inicio;
    const fim = horarioDia.fim;
    const duracao = servicoSelecionado?.duracao || 30;

    const [horaInicio, minInicio] = inicio.split(':').map(Number);
    const [horaFim, minFim] = fim.split(':').map(Number);

    const horarios = [];
    let hora = horaInicio;
    let minuto = minInicio;

    // gera blocos de horário conforme duração do serviço
    while (hora < horaFim || (hora === horaFim && minuto < minFim)) {
      const horaStr = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
      horarios.push(horaStr);
      minuto += duracao;
      if (minuto >= 60) {
        hora++;
        minuto -= 60;
      }
    }

    // verifica horários já agendados
    onValue(ref(db, 'agendamentos'), (snapshot) => {
      const agendados = snapshot.val() || {};
      const ocupados = Object.values(agendados)
        .filter(a => a.data === dataSelecionada)
        .map(a => a.hora);

      gridHorarios.innerHTML = "";
      horarios.forEach(hora => {
        const btn = document.createElement('div');
        btn.classList.add('time-slot');
        btn.innerText = hora;

        if (ocupados.includes(hora)) {
          btn.classList.add('indisponivel');
          btn.innerText = `${hora} ✖`;
          btn.style.opacity = "0.5";
          btn.style.pointerEvents = "none";
        } else {
          btn.onclick = () => {
            document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
            btn.classList.add('selected');
            horaSelecionada = hora;
            btnAgendar.style.display = 'block';
          };
        }
        gridHorarios.appendChild(btn);
      });
    }, { onlyOnce: true });
}

// --- 5️⃣ CONFIRMA AGENDAMENTO ---
btnAgendar.onclick = async () => {
  const nome = document.getElementById('cliente-nome').value.trim();
  const whatsapp = document.getElementById('cliente-whatsapp').value.replace(/\D/g, '');
  const servicoID = inputServico.value;
  const data = inputData.value;

  if (!nome || !whatsapp || !servicoID || !data || !horaSelecionada) {
    alert("⚠️ Preencha todos os campos antes de confirmar!");
    return;
  }

  const servicoInfo = servicosDisponiveis[servicoID];
  const nomeServico = servicoInfo?.nome || 'Serviço';

  await push(ref(db, 'agendamentos'), {
    cliente: nome,
    whatsapp,
    servico: nomeServico,
    data,
    hora: horaSelecionada,
    duracao: servicoInfo?.duracao || 30,
    timestamp: Date.now()
  });

  const dataBR = data.split('-').reverse().join('/');
  const msg = encodeURIComponent(`Olá ${nome}, confirmamos seu agendamento na Barbearia SF para ${dataBR} às ${horaSelecionada} (${nomeServico}).`);
  const urlWhats = `https://wa.me/55${whatsapp}?text=${msg}`;

  document.getElementById('modal-sucesso').style.display = 'flex';
  document.getElementById('fechar-modal').onclick = () => {
    document.getElementById('modal-sucesso').style.display = 'none';
    window.location.reload();
  };

  // window.open(urlWhats, "_blank"); // opcional
};

