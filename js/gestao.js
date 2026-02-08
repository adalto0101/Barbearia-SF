import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// Configuração do Firebase (Mantida a sua)
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

// --- ELEMENTOS ---
const inputInicio = document.getElementById('filtro-inicio');
const inputFim = document.getElementById('filtro-fim');
const btnFiltrar = document.getElementById('btn-filtrar');
const btnLimpar = document.getElementById('btn-limpar');
const listaHistorico = document.getElementById('lista-historico');
const resumoFin = document.getElementById('resumo-financeiro');
const opcoesPagamento = document.querySelectorAll('.custom-option');

// --- LÓGICA DE SELEÇÃO DO DROPDOWN CUSTOMIZADO ---
opcoesPagamento.forEach(opcao => {
    opcao.onclick = () => {
        // Remove a classe selected de todas e adiciona na clicada
        opcoesPagamento.forEach(opt => opt.classList.remove('selected'));
        opcao.classList.add('selected');
    };
});

// --- LÓGICA DE FILTRAGEM UNIFICADA ---
btnFiltrar.onclick = () => {
    const inicio = inputInicio.value;
    const fim = inputFim.value;

    // Pega o método selecionado no momento
    const opcaoSelecionada = document.querySelector('.custom-option.selected');
    const metodo = opcaoSelecionada ? opcaoSelecionada.getAttribute('data-value') : 'todos';

    if (!inicio || !fim) return alert("Por favor, selecione as datas de início e fim.");

    onValue(ref(db, "agendamentos"), (snapAg) => {
        onValue(ref(db, "servicos"), (snapServ) => {
            const agendamentos = snapAg.val() || {};
            const servicos = snapServ.val() || {};

            let somaTotal = 0;
            let contador = 0;
            let htmlCards = "";

            // Filtro Único: Data + Método de Pagamento
            const filtrados = Object.values(agendamentos).filter(ag => {
                const passData = ag.data >= inicio && ag.data <= fim;
                const passMetodo = (metodo === 'todos') || (ag.formaPagamento === metodo);
                return passData && passMetodo;
            }).sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

            filtrados.forEach(ag => {
                // Busca o preço no banco de serviços
                const sInfo = Object.values(servicos).find(s => s.nome === ag.servico);
                let precoVal = 0;

                if (sInfo && typeof sInfo.preco === 'number') {
                    precoVal = sInfo.preco;
                } else if (sInfo && !isNaN(parseFloat(sInfo.preco))) {
                    precoVal = parseFloat(sInfo.preco);
                }

                somaTotal += precoVal;
                contador++;

                const dataBR = ag.data.split('-').reverse().join('/');

                // Cores dinâmicas para o badge
                let badgeColor = "#ffca28"; // Padrão Amarelo
                if (ag.formaPagamento === 'pendente') badgeColor = "#ff4444";
                if (ag.formaPagamento === 'digital') badgeColor = "#4db8ff";

                htmlCards += `
                    <div class="admin-card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 4px solid ${badgeColor};">
                        <div>
                            <strong>${ag.cliente}</strong> 
                            <span style="font-size: 10px; background: #222; color: ${badgeColor}; padding: 2px 6px; border-radius: 4px; border: 1px solid #444; margin-left: 8px; text-transform: uppercase;">
                                ${ag.formaPagamento ? ag.formaPagamento : 'N/D'}
                            </span><br>
                            <small>${dataBR} - ${ag.hora} | ${ag.servico}</small>
                        </div>
                        <div style="text-align: right;">
                            <span style="color: var(--verde); font-weight: bold; font-size: 1.1rem;">R$ ${precoVal.toFixed(2)}</span>
                        </div>
                    </div>`;
            });

            // Exibe o Resumo e a Lista ao mesmo tempo
            resumoFin.style.display = 'flex';
            document.getElementById('total-valor').innerText = `R$ ${somaTotal.toFixed(2)}`;
            document.getElementById('total-servicos').innerText = `${contador} atendimentos detalhados abaixo`;

            listaHistorico.innerHTML = htmlCards || "<p style='text-align:center; padding: 20px; opacity:0.6;'>Nenhum registro encontrado para este filtro.</p>";

        }, { onlyOnce: true });
    }, { onlyOnce: true });
};

// --- LIMPAR TUDO ---
btnLimpar.onclick = () => {
    inputInicio.value = "";
    inputFim.value = "";
    resumoFin.style.display = 'none';
    listaHistorico.innerHTML = "<p style='text-align:center; opacity:0.5; padding: 40px;'>Selecione o período e o método para buscar os dados.</p>";

    // Reseta o dropdown para 'todos'
    opcoesPagamento.forEach(opt => opt.classList.remove('selected'));
    const optTodos = document.querySelector('.custom-option[data-value="todos"]');
    if (optTodos) optTodos.classList.add('selected');
};
