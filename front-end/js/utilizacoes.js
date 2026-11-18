const API_UTILIZACOES = "http://localhost:3000/api/utilizacoes";

const listaUtilizacoes = document.getElementById("listaUtilizacoes");

let utilizacoesCarregadas = [];

let utilizacaoRetornoId = null;

async function carregarUtilizacoes() {
    try {
        const resposta = await fetch(API_UTILIZACOES);

        if (!resposta.ok) {
            throw new Error("Resposta inválida da API: " + resposta.status);
        }

        const dados = await resposta.json();
        utilizacoesCarregadas = Array.isArray(dados) ? dados : (dados.utilizacoes || []);

        preencherTabelaUtilizacoes(utilizacoesCarregadas);
    } catch (erro) {
        console.error("Erro ao carregar utilizações:", erro);
        listaUtilizacoes.innerHTML = `
            <tr>
                <td colspan="9">
                    Não foi possível carregar as utilizações. Verifique se o servidor está ligado.
                </td>
            </tr>
        `;
    }
}

function preencherTabelaUtilizacoes(utilizacoes) {
    if (utilizacoes.length === 0) {
        listaUtilizacoes.innerHTML = `
            <tr>
                <td colspan="9">Nenhuma utilização registrada.</td>
            </tr>
        `;
        return;
    }

    listaUtilizacoes.innerHTML = utilizacoes.map(utilizacao => {
        const emAberto = Number(utilizacao.em_aberto) === 1;

        const situacao = emAberto
            ? '<span class="badge badge-aberta">Em aberto</span>'
            : '<span class="badge badge-encerrada">Encerrada</span>';

        const acoes = emAberto
            ? `<button class="btn-tabela" data-acao="retorno" data-id="${utilizacao.id}">Registrar retorno</button>`
            : "-";

        const retorno = utilizacao.data_retorno || "-";
        const kmFinal = utilizacao.km_final !== null ? `${Number(utilizacao.km_final)} km` : "-";

        return `
            <tr>
                <td>${escaparHtml(utilizacao.placa)} - ${escaparHtml(utilizacao.modelo)}</td>
                <td>${escaparHtml(utilizacao.motorista)}</td>
                <td>${escaparHtml(utilizacao.finalidade)}</td>
                <td>${escaparHtml(utilizacao.data_saida)}</td>
                <td>${escaparHtml(retorno)}</td>
                <td>${Number(utilizacao.km_inicial)} km</td>
                <td>${escaparHtml(kmFinal)}</td>
                <td>${situacao}</td>
                <td>${acoes}</td>
            </tr>
        `;
    }).join("");
}

listaUtilizacoes.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");

    if (!botao) {
        return;
    }

    if (botao.dataset.acao === "retorno") {
        const id = Number(botao.dataset.id);
        const utilizacao = utilizacoesCarregadas.find(u => u.id === id);

        if (utilizacao) {
            abrirModalRetorno(utilizacao);
        }
    }
});


const modalSaida = document.getElementById("modalSaida");
const formSaida = document.getElementById("formSaida");
const campoVeiculoSaida = document.getElementById("campoVeiculoSaida");
const campoMotoristaSaida = document.getElementById("campoMotoristaSaida");
const campoFinalidade = document.getElementById("campoFinalidade");
const mensagemFormSaida = document.getElementById("mensagemFormSaida");
const btnNovaSaida = document.getElementById("btnNovaSaida");
const btnCancelarSaida = document.getElementById("btnCancelarSaida");
const btnSalvarSaida = document.getElementById("btnSalvarSaida");

function preencherSelect(select, opcoes, textoVazio) {
    if (opcoes.length === 0) {
        select.innerHTML = `<option value="">${textoVazio}</option>`;
        return;
    }

    select.innerHTML =
        '<option value="">Selecione...</option>' +
        opcoes.map(opcao => `<option value="${opcao.valor}">${escaparHtml(opcao.texto)}</option>`).join("");
}

async function abrirModalSaida() {
    formSaida.reset();
    mensagemFormSaida.textContent = "";

    await Promise.all([carregarVeiculos(), carregarMotoristas(), carregarUtilizacoes()]);

    const motoristasEmUso = utilizacoesCarregadas
        .filter(u => Number(u.em_aberto) === 1)
        .map(u => u.motorista_id);

    const veiculosLivres = veiculosCarregados.filter(v => v.status === "Disponível");

    const motoristasLivres = motoristasCarregados.filter(m =>
        m.status === "Ativo" &&
        Number(m.cnh_vencida) !== 1 &&
        !motoristasEmUso.includes(m.id)
    );

    preencherSelect(
        campoVeiculoSaida,
        veiculosLivres.map(v => ({
            valor: v.id,
            texto: `${v.placa} - ${v.marca} ${v.modelo} (${Number(v.quilometragem)} km)`
        })),
        "Nenhum veículo disponível"
    );

    preencherSelect(
        campoMotoristaSaida,
        motoristasLivres.map(m => ({ valor: m.id, texto: m.nome })),
        "Nenhum motorista disponível"
    );

    modalSaida.classList.add("aberto");
}

function fecharModalSaida() {
    modalSaida.classList.remove("aberto");
}

btnNovaSaida.addEventListener("click", abrirModalSaida);
btnCancelarSaida.addEventListener("click", fecharModalSaida);

modalSaida.addEventListener("click", (evento) => {
    if (evento.target === modalSaida) {
        fecharModalSaida();
    }
});

formSaida.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemFormSaida.textContent = "";

    const saida = {
        veiculo_id: Number(campoVeiculoSaida.value),
        motorista_id: Number(campoMotoristaSaida.value),
        finalidade: campoFinalidade.value
    };

    btnSalvarSaida.disabled = true;

    try {
        const resposta = await fetch(API_UTILIZACOES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(saida)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            mensagemFormSaida.textContent = resultado.mensagem || "Não foi possível registrar a saída.";
            return;
        }

        fecharModalSaida();
        carregarUtilizacoes();
        carregarVeiculos();
    } catch (erro) {
        console.error("Erro ao registrar saída:", erro);
        mensagemFormSaida.textContent = "Não foi possível conectar ao servidor.";
    } finally {
        btnSalvarSaida.disabled = false;
    }
});

const modalRetorno = document.getElementById("modalRetorno");
const formRetorno = document.getElementById("formRetorno");
const infoRetorno = document.getElementById("infoRetorno");
const campoKmFinal = document.getElementById("campoKmFinal");
const mensagemFormRetorno = document.getElementById("mensagemFormRetorno");
const btnCancelarRetorno = document.getElementById("btnCancelarRetorno");
const btnSalvarRetorno = document.getElementById("btnSalvarRetorno");

function abrirModalRetorno(utilizacao) {
    formRetorno.reset();
    mensagemFormRetorno.textContent = "";

    utilizacaoRetornoId = utilizacao.id;

    infoRetorno.textContent =
        `${utilizacao.placa} - ${utilizacao.modelo} | Motorista: ${utilizacao.motorista} | ` +
        `Quilometragem inicial: ${Number(utilizacao.km_inicial)} km`;

    modalRetorno.classList.add("aberto");
}

function fecharModalRetorno() {
    modalRetorno.classList.remove("aberto");
}

btnCancelarRetorno.addEventListener("click", fecharModalRetorno);

modalRetorno.addEventListener("click", (evento) => {
    if (evento.target === modalRetorno) {
        fecharModalRetorno();
    }
});

formRetorno.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemFormRetorno.textContent = "";

    btnSalvarRetorno.disabled = true;

    try {
        const resposta = await fetch(`${API_UTILIZACOES}/${utilizacaoRetornoId}/retorno`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ km_final: Number(campoKmFinal.value) })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            mensagemFormRetorno.textContent = resultado.mensagem || "Não foi possível registrar o retorno.";
            return;
        }

        fecharModalRetorno();
        carregarUtilizacoes();
        carregarVeiculos();
    } catch (erro) {
        console.error("Erro ao registrar retorno:", erro);
        mensagemFormRetorno.textContent = "Não foi possível conectar ao servidor.";
    } finally {
        btnSalvarRetorno.disabled = false;
    }
});

carregarUtilizacoes();