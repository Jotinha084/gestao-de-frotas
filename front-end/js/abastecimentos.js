
const API_ABASTECIMENTOS = "http://localhost:3000/api/abastecimentos";

const listaTotaisAbastecimento = document.getElementById("listaTotaisAbastecimento");
const listaAbastecimentos = document.getElementById("listaAbastecimentos");
const totalGeralAbastecimentos = document.getElementById("totalGeralAbastecimentos");

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarLitros(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " L";
}

function agoraParaCampo() {
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    return agora.toISOString().slice(0, 16);
}

async function carregarAbastecimentos() {
    try {
        const [respostaHistorico, respostaTotais] = await Promise.all([
            fetch(API_ABASTECIMENTOS),
            fetch(API_ABASTECIMENTOS + "/totais")
        ]);

        if (!respostaHistorico.ok || !respostaTotais.ok) {
            throw new Error("Resposta inválida da API");
        }

        const dadosHistorico = await respostaHistorico.json();
        const dadosTotais = await respostaTotais.json();

        preencherHistoricoAbastecimentos(dadosHistorico.abastecimentos || []);
        preencherTotaisAbastecimentos(dadosTotais.totais || []);
    } catch (erro) {
        console.error("Erro ao carregar abastecimentos:", erro);

        const mensagem = "Não foi possível carregar os dados. Verifique se o servidor está ligado.";

        listaAbastecimentos.innerHTML = `<tr><td colspan="7">${mensagem}</td></tr>`;
        listaTotaisAbastecimento.innerHTML = `<tr><td colspan="4">${mensagem}</td></tr>`;
        totalGeralAbastecimentos.textContent = "";
    }
}

function preencherHistoricoAbastecimentos(abastecimentos) {
    if (abastecimentos.length === 0) {
        listaAbastecimentos.innerHTML = `
            <tr>
                <td colspan="7">Nenhum abastecimento registrado.</td>
            </tr>
        `;
        return;
    }

    listaAbastecimentos.innerHTML = abastecimentos.map(abastecimento => `
        <tr>
            <td>${escaparHtml(abastecimento.data_abastecimento)}</td>
            <td>${escaparHtml(abastecimento.placa)} - ${escaparHtml(abastecimento.modelo)}</td>
            <td>${escaparHtml(abastecimento.tipo_combustivel)}</td>
            <td>${Number(abastecimento.quilometragem)} km</td>
            <td>${formatarLitros(abastecimento.quantidade_litros)}</td>
            <td>${formatarMoeda(abastecimento.valor_litro)}</td>
            <td>${formatarMoeda(abastecimento.valor_total)}</td>
        </tr>
    `).join("");
}

function preencherTotaisAbastecimentos(totais) {
    if (totais.length === 0) {
        listaTotaisAbastecimento.innerHTML = `
            <tr>
                <td colspan="4">Nenhum veículo cadastrado.</td>
            </tr>
        `;
        totalGeralAbastecimentos.textContent = "";
        return;
    }

    listaTotaisAbastecimento.innerHTML = totais.map(total => `
        <tr>
            <td>${escaparHtml(total.placa)} - ${escaparHtml(total.modelo)}</td>
            <td>${Number(total.quantidade)}</td>
            <td>${formatarLitros(total.total_litros)}</td>
            <td>${formatarMoeda(total.total_gasto)}</td>
        </tr>
    `).join("");

    const totalGeral = totais.reduce((soma, total) => soma + Number(total.total_gasto), 0);
    totalGeralAbastecimentos.textContent = `Total geral gasto com combustível: ${formatarMoeda(totalGeral)}`;
}

const modalAbastecimento = document.getElementById("modalAbastecimento");
const formAbastecimento = document.getElementById("formAbastecimento");
const campoVeiculoAbastecimento = document.getElementById("campoVeiculoAbastecimento");
const campoDataAbastecimento = document.getElementById("campoDataAbastecimento");
const campoKmAbastecimento = document.getElementById("campoKmAbastecimento");
const campoLitros = document.getElementById("campoLitros");
const campoValorPago = document.getElementById("campoValorPago");
const mensagemFormAbastecimento = document.getElementById("mensagemFormAbastecimento");
const btnNovoAbastecimento = document.getElementById("btnNovoAbastecimento");
const btnCancelarAbastecimento = document.getElementById("btnCancelarAbastecimento");
const btnSalvarAbastecimento = document.getElementById("btnSalvarAbastecimento");

async function abrirModalAbastecimento() {
    formAbastecimento.reset();
    mensagemFormAbastecimento.textContent = "";

    await carregarVeiculos();

    preencherSelect(
        campoVeiculoAbastecimento,
        veiculosCarregados.map(v => ({
            valor: v.id,
            texto: `${v.placa} - ${v.marca} ${v.modelo}`
        })),
        "Nenhum veículo cadastrado"
    );

    campoDataAbastecimento.value = agoraParaCampo();

    modalAbastecimento.classList.add("aberto");
}

function fecharModalAbastecimento() {
    modalAbastecimento.classList.remove("aberto");
}

btnNovoAbastecimento.addEventListener("click", abrirModalAbastecimento);
btnCancelarAbastecimento.addEventListener("click", fecharModalAbastecimento);

modalAbastecimento.addEventListener("click", (evento) => {
    if (evento.target === modalAbastecimento) {
        fecharModalAbastecimento();
    }
});

campoVeiculoAbastecimento.addEventListener("change", () => {
    const veiculo = veiculosCarregados.find(v => v.id === Number(campoVeiculoAbastecimento.value));

    if (veiculo) {
        campoKmAbastecimento.value = Number(veiculo.quilometragem);
    }
});

formAbastecimento.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemFormAbastecimento.textContent = "";

    const abastecimento = {
        veiculo_id: Number(campoVeiculoAbastecimento.value),
        data_abastecimento: campoDataAbastecimento.value,
        quilometragem: campoKmAbastecimento.value,
        quantidade_litros: campoLitros.value,
        valor_total: campoValorPago.value
    };

    btnSalvarAbastecimento.disabled = true;

    try {
        const resposta = await fetch(API_ABASTECIMENTOS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(abastecimento)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            mensagemFormAbastecimento.textContent = resultado.mensagem || "Não foi possível registrar o abastecimento.";
            return;
        }

        fecharModalAbastecimento();
        carregarAbastecimentos();
    } catch (erro) {
        console.error("Erro ao registrar abastecimento:", erro);
        mensagemFormAbastecimento.textContent = "Não foi possível conectar ao servidor.";
    } finally {
        btnSalvarAbastecimento.disabled = false;
    }
});

carregarAbastecimentos();