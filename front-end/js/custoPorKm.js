const API_CUSTO_KM = "http://localhost:3000/api/dashboard/custo-por-km";

const formPeriodo = document.getElementById("formPeriodo");
const campoPeriodoInicio = document.getElementById("campoPeriodoInicio");
const campoPeriodoFim = document.getElementById("campoPeriodoFim");
const mensagemPeriodo = document.getElementById("mensagemPeriodo");
const btnCalcularCusto = document.getElementById("btnCalcularCusto");
const listaCustoKm = document.getElementById("listaCustoKm");

function dataParaCampoData(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function definirPeriodoPadrao() {
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(hoje.getDate() - 30);

    campoPeriodoInicio.value = dataParaCampoData(inicio);
    campoPeriodoFim.value = dataParaCampoData(hoje);
}

function textoCustoPorKm(custoPorKm) {
    if (custoPorKm === null) {
        return "Sem km percorrido";
    }

    return `${formatarMoeda(custoPorKm)} / km`;
}

function textoKmPercorridos(km) {
    return `${Number(km).toLocaleString("pt-BR")} km`;
}

function preencherTabelaCustoKm(veiculos, resumo) {
    if (veiculos.length === 0) {
        listaCustoKm.innerHTML = `
            <tr>
                <td colspan="6">Nenhum veículo cadastrado.</td>
            </tr>
        `;
        return;
    }

    const linhasVeiculos = veiculos.map(veiculo => `
        <tr>
            <td>${escaparHtml(veiculo.placa)} - ${escaparHtml(veiculo.modelo)}</td>
            <td>${formatarMoeda(veiculo.total_combustivel)}</td>
            <td>${formatarMoeda(veiculo.total_manutencao)}</td>
            <td>${formatarMoeda(veiculo.custo_total)}</td>
            <td>${textoKmPercorridos(veiculo.km_percorridos)}</td>
            <td>${textoCustoPorKm(veiculo.custo_por_km)}</td>
        </tr>
    `).join("");

    const linhaTotal = `
        <tr class="linha-total">
            <td>Total da frota</td>
            <td>${formatarMoeda(resumo.total_combustivel)}</td>
            <td>${formatarMoeda(resumo.total_manutencao)}</td>
            <td>${formatarMoeda(resumo.custo_total)}</td>
            <td>${textoKmPercorridos(resumo.km_percorridos)}</td>
            <td>${textoCustoPorKm(resumo.custo_por_km)}</td>
        </tr>
    `;

    listaCustoKm.innerHTML = linhasVeiculos + linhaTotal;
}

async function carregarCustoPorKm() {
    mensagemPeriodo.textContent = "";

    const inicio = campoPeriodoInicio.value;
    const fim = campoPeriodoFim.value;

    btnCalcularCusto.disabled = true;

    try {
        const resposta = await fetch(`${API_CUSTO_KM}?inicio=${inicio}&fim=${fim}`);
        const dados = await resposta.json();

        if (!resposta.ok) {
            mensagemPeriodo.textContent = dados.mensagem || "Não foi possível calcular o custo por km.";
            return;
        }

        preencherTabelaCustoKm(dados.veiculos, dados.resumo);
    } catch (erro) {
        console.error("Erro ao calcular custo por km:", erro);
        mensagemPeriodo.textContent = "Não foi possível conectar ao servidor.";
    } finally {
        btnCalcularCusto.disabled = false;
    }
}
formPeriodo.addEventListener("submit", (evento) => {
    evento.preventDefault();
    carregarCustoPorKm();
});

definirPeriodoPadrao();
carregarCustoPorKm();