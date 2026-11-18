const API_MANUTENCOES = "http://localhost:3000/api/manutencoes";

const listaTotaisManutencao = document.getElementById("listaTotaisManutencao");
const listaManutencoes = document.getElementById("listaManutencoes");
const totalGeralManutencoes = document.getElementById("totalGeralManutencoes");

function classeStatusManutencao(status) {
    if (status === "Concluída") {
        return "badge-encerrada";
    }

    if (status === "Em andamento") {
        return "badge-aberta";
    }

    return "badge-pendente";
}

async function carregarManutencoes() {
    try {
        const [respostaHistorico, respostaTotais] = await Promise.all([
            fetch(API_MANUTENCOES),
            fetch(API_MANUTENCOES + "/totais")
        ]);

        if (!respostaHistorico.ok || !respostaTotais.ok) {
            throw new Error("Resposta inválida da API");
        }

        const dadosHistorico = await respostaHistorico.json();
        const dadosTotais = await respostaTotais.json();

        preencherHistoricoManutencoes(dadosHistorico.manutencoes || []);
        preencherTotaisManutencoes(dadosTotais.totais || []);
    } catch (erro) {
        console.error("Erro ao carregar manutenções:", erro);

        const mensagem = "Não foi possível carregar os dados. Verifique se o servidor está ligado.";

        listaManutencoes.innerHTML = `<tr><td colspan="8">${mensagem}</td></tr>`;
        listaTotaisManutencao.innerHTML = `<tr><td colspan="3">${mensagem}</td></tr>`;
        totalGeralManutencoes.textContent = "";
    }
}

function preencherHistoricoManutencoes(manutencoes) {
    if (manutencoes.length === 0) {
        listaManutencoes.innerHTML = `
            <tr>
                <td colspan="8">Nenhuma manutenção registrada.</td>
            </tr>
        `;
        return;
    }

    listaManutencoes.innerHTML = manutencoes.map(manutencao => {
        let acoes = "-";

        if (manutencao.status === "Pendente") {
            acoes = `
                <button class="btn-tabela" data-id="${manutencao.id}" data-status="Em andamento">Iniciar</button>
                <button class="btn-tabela" data-id="${manutencao.id}" data-status="Concluída">Concluir</button>
            `;
        } else if (manutencao.status === "Em andamento") {
            acoes = `
                <button class="btn-tabela" data-id="${manutencao.id}" data-status="Concluída">Concluir</button>
            `;
        }

        return `
            <tr>
                <td>${escaparHtml(manutencao.data_manutencao)}</td>
                <td>${escaparHtml(manutencao.placa)} - ${escaparHtml(manutencao.modelo)}</td>
                <td>${escaparHtml(manutencao.tipo)}</td>
                <td class="coluna-descricao">${escaparHtml(manutencao.descricao)}</td>
                <td>${Number(manutencao.quilometragem)} km</td>
                <td>${formatarMoeda(manutencao.custo)}</td>
                <td><span class="badge ${classeStatusManutencao(manutencao.status)}">${escaparHtml(manutencao.status)}</span></td>
                <td>${acoes}</td>
            </tr>
        `;
    }).join("");
}

function preencherTotaisManutencoes(totais) {
    if (totais.length === 0) {
        listaTotaisManutencao.innerHTML = `
            <tr>
                <td colspan="3">Nenhum veículo cadastrado.</td>
            </tr>
        `;
        totalGeralManutencoes.textContent = "";
        return;
    }

    listaTotaisManutencao.innerHTML = totais.map(total => `
        <tr>
            <td>${escaparHtml(total.placa)} - ${escaparHtml(total.modelo)}</td>
            <td>${Number(total.quantidade_concluidas)}</td>
            <td>${formatarMoeda(total.total_gasto)}</td>
        </tr>
    `).join("");

    const totalGeral = totais.reduce((soma, total) => soma + Number(total.total_gasto), 0);
    totalGeralManutencoes.textContent = `Total geral gasto com manutenção: ${formatarMoeda(totalGeral)}`;
}


listaManutencoes.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-status]");

    if (!botao) {
        return;
    }

    atualizarStatusManutencao(Number(botao.dataset.id), botao.dataset.status, botao);
});

async function atualizarStatusManutencao(id, novoStatus, botao) {
    botao.disabled = true;

    try {
        const resposta = await fetch(`${API_MANUTENCOES}/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: novoStatus })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            alert(resultado.mensagem || "Não foi possível atualizar o status.");
            return;
        }

        carregarManutencoes();
        carregarVeiculos();
    } catch (erro) {
        console.error("Erro ao atualizar status da manutenção:", erro);
        alert("Não foi possível conectar ao servidor.");
    } finally {
        botao.disabled = false;
    }
}


const modalManutencao = document.getElementById("modalManutencao");
const formManutencao = document.getElementById("formManutencao");
const campoVeiculoManutencao = document.getElementById("campoVeiculoManutencao");
const campoTipoManutencao = document.getElementById("campoTipoManutencao");
const campoDescricao = document.getElementById("campoDescricao");
const campoDataManutencao = document.getElementById("campoDataManutencao");
const campoKmManutencao = document.getElementById("campoKmManutencao");
const campoCustoManutencao = document.getElementById("campoCustoManutencao");
const campoStatusManutencao = document.getElementById("campoStatusManutencao");
const mensagemFormManutencao = document.getElementById("mensagemFormManutencao");
const btnNovaManutencao = document.getElementById("btnNovaManutencao");
const btnCancelarManutencao = document.getElementById("btnCancelarManutencao");
const btnSalvarManutencao = document.getElementById("btnSalvarManutencao");

async function abrirModalManutencao() {
    formManutencao.reset();
    mensagemFormManutencao.textContent = "";

    await carregarVeiculos();

    preencherSelect(
        campoVeiculoManutencao,
        veiculosCarregados.map(v => ({
            valor: v.id,
            texto: `${v.placa} - ${v.marca} ${v.modelo}`
        })),
        "Nenhum veículo cadastrado"
    );

    campoDataManutencao.value = agoraParaCampo();

    modalManutencao.classList.add("aberto");
}

function fecharModalManutencao() {
    modalManutencao.classList.remove("aberto");
}

btnNovaManutencao.addEventListener("click", abrirModalManutencao);
btnCancelarManutencao.addEventListener("click", fecharModalManutencao);

modalManutencao.addEventListener("click", (evento) => {
    if (evento.target === modalManutencao) {
        fecharModalManutencao();
    }
});

campoVeiculoManutencao.addEventListener("change", () => {
    const veiculo = veiculosCarregados.find(v => v.id === Number(campoVeiculoManutencao.value));

    if (veiculo) {
        campoKmManutencao.value = Number(veiculo.quilometragem);
    }
});

formManutencao.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemFormManutencao.textContent = "";

    const manutencao = {
        veiculo_id: Number(campoVeiculoManutencao.value),
        tipo: campoTipoManutencao.value,
        descricao: campoDescricao.value,
        data_manutencao: campoDataManutencao.value,
        quilometragem: campoKmManutencao.value,
        custo: campoCustoManutencao.value,
        status: campoStatusManutencao.value
    };

    btnSalvarManutencao.disabled = true;

    try {
        const resposta = await fetch(API_MANUTENCOES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(manutencao)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            mensagemFormManutencao.textContent = resultado.mensagem || "Não foi possível registrar a manutenção.";
            return;
        }

        fecharModalManutencao();
        carregarManutencoes();
        carregarVeiculos();
    } catch (erro) {
        console.error("Erro ao registrar manutenção:", erro);
        mensagemFormManutencao.textContent = "Não foi possível conectar ao servidor.";
    } finally {
        btnSalvarManutencao.disabled = false;
    }
});

carregarManutencoes();