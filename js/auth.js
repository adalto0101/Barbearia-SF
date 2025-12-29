import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

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

// --- 3 GERA HORÁRIOS ---
function gerarHorarios(bloco) {
  const grid = bloco.querySelector('.grid-horarios');
  const dataAg = bloco.querySelector('.data-agenda').value;
  const servId = bloco.querySelector('.cliente-servico').value;

  // ================================================================
  // INICIO DO BLOCO DE RECESSO - APAGAR TUDO ATÉ O FIM DO BLOCO
  // ================================================================
  const INICIO_RECESSO = '2026-01-01';
  const FIM_RECESSO = '2026-01-26';

  if (dataAg >= INICIO_RECESSO && dataAg <= FIM_RECESSO) {
    // 1. Limpa a data selecionada
    bloco.querySelector('.data-agenda').value = "";
    bloco.querySelector('.secao-horarios').style.display = 'none';

    // 2. Cria o Modal Inline (Com imagem de fundo)
    const overlay = document.createElement('div');
    // Adicionei uma imagem de praia profissional via Unsplash e um degradê para escurecer um pouco
    overlay.style = `
      position:fixed; top:0; left:0; width:100%; height:100%; 
      background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80');
      background-size: cover; background-position: center;
      display:flex; align-items:center; justify-content:center; 
      z-index:10000; font-family:'Poppins', sans-serif; padding:20px; 
      backdrop-filter: blur(3px);
    `;

    overlay.innerHTML = `
      <div style="background:rgba(26, 26, 26, 0.95); border:2px solid #d4af37; border-radius:20px; padding:40px 30px; max-width:450px; text-align:center; color:white; box-shadow:0 15px 50px rgba(0,0,0,0.8);">
        <div style="font-size:60px; margin-bottom:15px;">🏖️</div>
        <h2 style="color:#d4af37; margin:0 0 15px 0; font-family:'Cinzel Decorative', serif; font-size:1.8rem;">Recesso SF</h2>
        
        <p style="color:#eee; margin-bottom:25px; font-size:1.05rem; line-height:1.6;">
          Estamos fazendo uma breve pausa para <strong>recarregar as energias</strong> e voltar melhores e mais fortes para você. <br><br>
          Informamos que no período de <strong>01/01 a 26/01</strong> não haverá atendimento, mas a nossa agenda continua ativa!
        </p>
        
        <div style="background:rgba(212,175,55,0.15); border-radius:12px; padding:18px; margin-bottom:25px; border:1px dashed #d4af37;">
          <p style="margin:0; font-size:15px; color:#fff;">
            Você já pode <strong>garantir o seu horário</strong> <br> para o nosso retorno no dia <strong>27 de Janeiro</strong> <br> ou datas posteriores.
          </p>
        </div>

        <button id="fechar-recesso" style="background:#d4af37; color:black; border:none; padding:16px 40px; border-radius:8px; font-weight:bold; cursor:pointer; width:100%; font-size:14px; text-transform:uppercase; letter-spacing:1px; box-shadow: 0 4px 15px rgba(212,175,55,0.3);">Agendar para o dia 27 ou depois</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // 3. Função para fechar o modal
    document.getElementById('fechar-recesso').onclick = () => {
      overlay.remove();
    };

    return; // Para a execução do agendamento
  }
  // ================================================================
  // FIM DO BLOCO DE RECESSO
  // ================================================================

  if (!dataAg || !servId) return;

  bloco.querySelector('.secao-horarios').style.display = 'block';
  grid.innerHTML = "Carregando...";

  const servico = servicosDisponiveis[servId];
  const diaChave = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][new Date(dataAg + 'T00:00:00').getDay()];
  const config = horariosFuncionamento[diaChave];

  if (!config || config.fechado) {
    grid.innerHTML = "<p>Fechado</p>";
    return;
  }

  onValue(ref(db, 'agendamentos'), (snapshot) => {
    const ags = Object.values(snapshot.val() || {}).filter(a => a.data === dataAg);
    grid.innerHTML = "";

    for (let t = paraMinutos(config.inicio); t <= paraMinutos(config.fim); t += 20) {
      const fimN = t + Number(servico.duracao);
      const conflito = ags.some(a => t < (paraMinutos(a.hora) + Number(a.duracao)) && fimN > paraMinutos(a.hora));

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
    const agParaFirebase = { ...ag, data: ag.data.split('/').reverse().join('-') };
    await push(ref(db, 'agendamentos'), agParaFirebase);
  }
  mostrarFeedback();
};

// --- 5 SISTEMA DE GESTÃO ---
btnAbrirGestao.onclick = () => modalGestao.style.display = 'flex';

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
            <button class="btn-reagendar" onclick="window.reagendarAg('${id}', '${ag.cliente}', '${ag.whatsapp}')">Reagendar</button>
            <button class="btn-desistir" onclick="window.excluirAg('${id}')">Desistir</button>
          </div>
        `;
        resultado.appendChild(item);
      }
    });
  }, { onlyOnce: true });
};

window.excluirAg = (id) => {
  if (confirm("Deseja realmente cancelar este horário?")) {
    remove(ref(db, `agendamentos/${id}`));
    modalGestao.style.display = 'none';
    mostrarFeedback("Cancelado!", "O horário foi liberado com sucesso.");
  }
};

window.reagendarAg = (id, nome, whatsapp) => {
  if (confirm("Para reagendar, este horário será removido e você poderá escolher um novo. Deseja continuar?")) {
    remove(ref(db, `agendamentos/${id}`));
    document.querySelector('.cliente-nome').value = nome;
    document.querySelector('.cliente-whatsapp').value = whatsapp;
    modalGestao.style.display = 'none';
    alert("Horário removido. Agora escolha a nova data e horário no formulário.");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// --- 6 REDIRECIONAMENTO IMEDIATO ---
function mostrarFeedback() {
  window.location.href = "confirmacao.html";
}
