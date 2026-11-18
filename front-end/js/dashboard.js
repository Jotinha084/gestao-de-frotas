const API_DASHBOARD = "http://localhost:3000/api/dashboard";


const cartaoCombustivel = document.getElementById("cartaoCombustivel");
const cartaoManutencao = document.getElementById("cartaoManutencao");
const cartaoCustoTotal = document.getElementById("cartaoCustoTotal");
const cartaoUtilizacoes = document.getElementById("cartaoUtilizacoes");
const cartaoUtilizacoesAbertas = document.getElementById("cartaoUtilizacoesAbertas");

async function carregarDashboard() {
    try {
        const resposta = await fetch(API_DASHBOARD);

        if (!resposta.ok) {
            throw new Error("Resposta inválida da API: " + resposta.status);
        }

        const dados = await resposta.json();
        const indicadores = dados.indicadores;

        const combustivel = Number(indicadores.total_combustivel);
        const manutencao = Number(indicadores.total_manutencao);
        const emAberto = Number(indicadores.utilizacoes_em_aberto);

        cartaoCombustivel.textContent = formatarMoeda(combustivel);
        cartaoManutencao.textContent = formatarMoeda(manutencao);
        cartaoCustoTotal.textContent = formatarMoeda(combustivel + manutencao);
        cartaoUtilizacoes.textContent = Number(indicadores.total_utilizacoes);
        cartaoUtilizacoesAbertas.textContent = emAberto === 1 ? "1 em aberto" : `${emAberto} em aberto`;
    } catch (erro) {
        console.error("Erro ao carregar indicadores:", erro);

        cartaoCombustivel.textContent = "-";
        cartaoManutencao.textContent = "-";
        cartaoCustoTotal.textContent = "-";
        cartaoUtilizacoes.textContent = "-";
        cartaoUtilizacoesAbertas.textContent = "";
    }
}

carregarDashboard();