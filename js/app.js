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
        
        console.log("Botão clicado!"); // Para você testar no F12 se está funcionando
        
        const mc = document.getElementById('modal-cancelamento');
        if (mc) {
            mc.style.display = 'none'; // Fecha o card
        }
        
        // Sobe para o topo suavemente
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

function mostrarFeedback() {
    window.location.href = "confirmacao.html";
}
