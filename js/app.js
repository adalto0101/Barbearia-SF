import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

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

// Seletores
const containerAgendamentos = document.getElementById('container-agendamentos');
const btnAddPessoa = document.getElementById('btn-add-pessoa');
const btnConfirmarTudo = document.getElementById('btn-confirmar-tudo');
const modalGestao = document.getElementById('modal-gestao');
const btnAbrirGestao = document.getElementById('btn-abrir-gestao');
const btnBuscarGestao = document.getElementById('btn-buscar-gestao');
const modalSucesso = document.getElementById('modal-sucesso');

let horariosFuncionamento = {};
let servicosDisponiveis = {};

function paraMinutos(horaStr) {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

// --- 1 CARREGA SERVIÇOS E HORÁRIOS ---
onValue(ref(db, 'servicos'), (snapshot) => {
  servicosDisponiveis = snapshot.val() || {};
  renderizarSelectServicos();
});

onValue(ref(db, 'horarios_funcionamento'), (snapshot) => {
  horariosFuncionamento = snapshot.val() || {};
});

function renderizarSelectServicos() {
  const selects = document.querySelectorAll('.cliente-servico');
  const listaOrdenada = Object.entries(servicosDisponiveis).sort(([, a], [, b]) => (a.ordem || 99) - (b.ordem || 99));

  selects.forEach(sel => {
    const valorAtual = sel.value;
    sel.innerHTML = `<option value="">Selecione um serviço</option>`;
    listaOrdenada.forEach(([id, s]) => {
      sel.innerHTML += `<option value="${id}">${s.nome} — R$${s.preco}</option>`;
    });
    sel.value = valorAtual;
  });
}

// Lógica para evitar horários duplicados entre blocos na tela
function atualizarBloqueiosLocais() {
  const selecionados = Array.from(document.querySelectorAll('.bloco-agendamento'))
    .map(b => b.dataset.hora).filter(h => h);

  document.querySelectorAll('.horario').forEach(div => {
    if (selecionados.includes(div.innerText) && !div.classList.contains('active')) {
      div.classList.add('indisponivel');
      div.style.opacity = "0.2";
      div.style.pointerEvents = "none";
    }
  });
}

// --- 2 LÓGICA DE MULTI-AGENDAMENTO ---
btnAddPessoa.onclick = () => {
  const totalAtual = document.querySelectorAll('.bloco-agendamento').length;
  if (totalAtual >= 4) return alert("Limite de 4 pessoas por vez.");

  const novoBloco = document.querySelector('.bloco-agendamento').cloneNode(true);
  novoBloco.id = `agendamento-${totalAtual + 1}`;
  novoBloco.querySelector('h3').innerText = `Acompanhante ${totalAtual}`;
  novoBloco.querySelector('.cliente-nome').value = "";
  novoBloco.querySelector('.secao-horarios').style.display = 'none';
  novoBloco.querySelector('.grid-horarios').innerHTML = "";
  novoBloco.dataset.hora = "";

  containerAgendamentos.appendChild(novoBloco);
  atribuirEventosBloco(novoBloco);
};

function atribuirEventosBloco(bloco) {
  const inputData = bloco.querySelector('.data-agenda');
  const inputServico = bloco.querySelector('.cliente-servico');
  inputData.onchange = () => gerarHorarios(bloco);
  inputServico.onchange = () => gerarHorarios(bloco);
}
atribuirEventosBloco(document.querySelector('.bloco-agendamento'));

// --- NOVA FUNÇÃO: VERIFICAR RECESSO DINÂMICO ---
async function verificarRecesso(dataSelecionada, bloco) {
  const snapshot = await get(ref(db, 'configuracoes/recesso'));
  const config = snapshot.val();

  if (config && config.ativo && dataSelecionada >= config.inicio && dataSelecionada <= config.fim) {
    // 1. Calcula dia de retorno (dia seguinte ao fim)
    const dataFimObj = new Date(config.fim + 'T12:00:00');
    dataFimObj.setDate(dataFimObj.getDate() + 1);

    // Formato Brasileiro para Texto (Ex: 27/01/2026)
    const retornoStr = dataFimObj.toLocaleDateString('pt-BR');

    // Formato ISO para o Input Date (Ex: 2026-01-27)
    const ano = dataFimObj.getFullYear();
    const mes = String(dataFimObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dataFimObj.getDate()).padStart(2, '0');
    const retornoISO = `${ano}-${mes}-${dia}`;

    // Limpa a data selecionada errada e esconde horários
    bloco.querySelector('.data-agenda').value = "";
    bloco.querySelector('.secao-horarios').style.display = 'none';

    // Remove overlay antigo se existir
    const oldOverlay = document.querySelector('.overlay-recesso');
    if (oldOverlay) oldOverlay.remove();

    const overlay = document.createElement('div');
    overlay.className = 'overlay-recesso';
    overlay.style = `position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(rgba(0,0,0,0.8),rgba(0,0,0,0.8)),url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80');background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;backdrop-filter:blur(5px);`;

    overlay.innerHTML = `
      <div style="background:rgba(20,20,20,0.98);border:2px solid #d4af37;border-radius:20px;padding:40px 30px;max-width:450px;text-align:center;color:white;box-shadow:0 15px 50px rgba(0,0,0,1);">
        <div style="font-size:50px;">🏖️</div>
        <h2 style="color:#d4af37;margin:15px 0;font-family:'Cinzel Decorative',serif;">Pausa para Descanso</h2>
        <p style="color:#eee;margin-bottom:20px;">Informamos que nesta data estaremos fechados para repor as energias.</p>
        <div style="background:rgba(212,175,55,0.1);padding:15px;border-radius:10px;border:1px dashed #d4af37;margin-bottom:20px;">
          <p style="margin:0;">Estaremos de volta dia:<br><strong>${retornoStr}</strong></p>
        </div>
        <button id="btn-reagendar-retorno" style="background:#d4af37;color:#000;border:none;padding:15px;width:100%;border-radius:8px;font-weight:bold;cursor:pointer; text-transform: uppercase;">Agendar para dia ${retornoStr}</button>
      </div>`;

    document.body.appendChild(overlay);

    // LÓGICA DO BOTÃO "AGENDAR PARA DIA X"
    document.getElementById('btn-reagendar-retorno').onclick = () => {
      overlay.remove();
      const inputData = bloco.querySelector('.data-agenda');
      // Define a nova data automaticamente
      inputData.value = retornoISO;
      // Força a geração dos horários para a nova data
      gerarHorarios(bloco);
    };

    return true;
  }
  return false;
}

// --- 3 GERA HORÁRIOS (ATUALIZADO) ---
async function gerarHorarios(bloco) {
  const grid = bloco.querySelector('.grid-horarios');
  const dataAg = bloco.querySelector('.data-agenda').value;
  const servId = bloco.querySelector('.cliente-servico').value;

  if (!dataAg || !servId) return;

  // 1. VERIFICA SE ESTÁ EM RECESSO (NOVO)
  const estaDeFolga = await verificarRecesso(dataAg, bloco);
  if (estaDeFolga) return;

  bloco.querySelector('.secao-horarios').style.display = 'block';
  grid.innerHTML = "Carregando...";

  const servico = servicosDisponiveis[servId];
  const diaChave = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][new Date(dataAg + 'T00:00:00').getDay()];
  const config = horariosFuncionamento[diaChave];

  if (!config || config.fechado) {
    grid.innerHTML = "<p>Fechado neste dia</p>";
    return;
  }

  onValue(ref(db, 'agendamentos'), (snapshot) => {
    const ags = Object.values(snapshot.val() || {}).filter(a => a.data === dataAg);
    grid.innerHTML = "";

    for (let t = paraMinutos(config.inicio); t <= paraMinutos(config.fim); t += 20) {
      const fimN = t + Number(servico.duracao);

      // NOVA LÓGICA DE CONFLITO:
      // Considera agendamentos normais E bloqueios manuais (assumindo 20min se duracao for null)
      const conflito = ags.some(a => {
        const inicioAg = paraMinutos(a.hora);
        const duracaoAg = Number(a.duracao) || 20;
        const fimAg = inicioAg + duracaoAg;

        return t < fimAg && fimN > inicioAg;
      });

      const horaStr = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      const div = document.createElement('div');
      div.className = `horario ${conflito ? 'indisponivel' : ''}`;
      div.innerText = horaStr;

      if (!conflito) {
        div.onclick = () => {
          bloco.querySelectorAll('.horario').forEach(h => h.classList.remove('active'));
          div.classList.add('active');
          bloco.dataset.hora = horaStr;
          btnConfirmarTudo.style.display = 'block';
          atualizarBloqueiosLocais();
        };
      } else {
        div.style.opacity = "0.3";
        div.style.pointerEvents = "none";
      }
      grid.appendChild(div);
    }
    atualizarBloqueiosLocais();
  }, { onlyOnce: true });
}

// --- 4 FINALIZAR AGENDAMENTOS ---
btnConfirmarTudo.onclick = async (e) => {
  e.preventDefault();
  const blocos = document.querySelectorAll('.bloco-agendamento');
  const agendamentosParaSubir = [];

  for (let bloco of blocos) {
    const nome = bloco.querySelector('.cliente-nome').value;
    const whats = bloco.querySelector('.cliente-whatsapp').value.replace(/\D/g, '');
    const servId = bloco.querySelector('.cliente-servico').value;
    const data = bloco.querySelector('.data-agenda').value;
    const hora = bloco.dataset.hora;

    if (!nome || !whats || !hora) return alert("Preencha todos os campos e selecione o horário!");

    agendamentosParaSubir.push({
      cliente: nome, whatsapp: whats, servico: servicosDisponiveis[servId].nome,
      data: data.split('-').reverse().join('/'), hora, duracao: Number(servicosDisponiveis[servId].duracao), timestamp: Date.now()
    });
  }

  localStorage.setItem('listaAgendamentos', JSON.stringify(agendamentosParaSubir));

  for (let ag of agendamentosParaSubir) {
    const agParaFirebase = { ...ag, data: ag.data.split('/').reverse().join('-'), notificado: false };
    await push(ref(db, 'agendamentos'), agParaFirebase);
  }
  mostrarFeedback();
};

// --- 5 SISTEMA DE GESTÃO (ABORDAGEM DE DELEGAÇÃO) ---

btnAbrirGestao.onclick = () => {
  const mg = document.getElementById('modal-gestao');
  if (mg) mg.style.display = 'flex';
};

btnBuscarGestao.onclick = () => {
  const tel = document.getElementById('busca-tel-gestao').value.replace(/\D/g, '');
  if (!tel) return;

  onValue(ref(db, 'agendamentos'), (snapshot) => {
    const ags = snapshot.val() || {};
    const resultado = document.getElementById('resultado-gestao');
    resultado.innerHTML = "";

    Object.entries(ags).forEach(([id, ag]) => {
      if (ag.whatsapp === tel) {
        const item = document.createElement('div');
        item.className = 'item-gestao';
        item.innerHTML = `
                  <p><strong>${ag.data.split('-').reverse().join('/')} às ${ag.hora}</strong><br>${ag.servico}</p>
                  <div class="acoes-gestao">
                    <button class="btn-reagendar" onclick="window.processarAcao('${id}', 'reagendar', '${ag.cliente}', '${ag.whatsapp}')">Reagendar</button>
                    <button class="btn-desistir" onclick="window.processarAcao('${id}', 'excluir')">Desistir</button>
                  </div>
                `;
        resultado.appendChild(item);
      }
    });
  }, { onlyOnce: true });
};

// FUNÇÃO GLOBAL DE PROCESSAMENTO
window.processarAcao = (id, tipo, nome = '', whatsapp = '') => {
  const agRef = ref(db, `agendamentos/${id}`);

  remove(agRef).then(() => {
    if (modalGestao) modalGestao.style.display = 'none';

    const mc = document.getElementById('modal-cancelamento');
    if (mc) {
      const titulo = mc.querySelector('h2');
      const texto = mc.querySelector('p');
      const botao = document.getElementById('btn-reload-gestao');

      if (tipo === 'excluir') {
        if (titulo) titulo.innerText = "Atendimento Descartado";
        if (texto) texto.innerHTML = "Seu agendamento foi excluído com sucesso. <br> Você pode se quiser, prosseguir criando um novo agendamento agora.";
      } else {
        // Reagendamento: preenche os inputs
        const inputNome = document.querySelector('.cliente-nome');
        const inputWhats = document.querySelector('.cliente-whatsapp');
        if (inputNome) inputNome.value = nome;
        if (inputWhats) inputWhats.value = whatsapp;

        if (titulo) titulo.innerText = "HORÁRIO LIBERADO";
        if (texto) texto.innerHTML = "O horário anterior foi removido com sucesso. <br> Escolha o seu novo horário agora.";
      }
      mc.style.display = 'flex';
    }
  }).catch(err => console.error("Erro Firebase:", err));
};

// --- 6 ABORDAGEM DEFINITIVA PARA O BOTÃO (DELEGAÇÃO DE EVENTO) ---

// Ouvimos o clique no documento inteiro
document.addEventListener('click', (event) => {
  // Verificamos se o clique foi no botão pelo ID ou pela CLASSE
  if (event.target && (event.target.id === 'btn-reload-gestao' || event.target.classList.contains('btn-novo-agendamento'))) {
    const mc = document.getElementById('modal-cancelamento');
    if (mc) {
      mc.style.display = 'none'; // Fecha o card
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

function mostrarFeedback() {
  window.location.href = "confirmacao.html";
}
