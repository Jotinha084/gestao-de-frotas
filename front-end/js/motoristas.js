const API_MOTORISTAS = "http://localhost:3000/api/motoristas";

const listaMotoristas = document.getElementById("listaMotoristas");

let motoristasCarregados = [];

let motoristaEditandoId = null;

function formatarData(dataTexto) {
    if (!dataTexto) {
        return "";
    }

    const [ano, mes, dia] = dataTexto.split("-");
    return `${dia}/${mes}/${ano}`;
}

async function carregarMotoristas() {
    try {
        const resposta = await fetch(API_MOTORISTAS);

        if (!resposta.ok) {
            throw new Error("Resposta inválida da API: " + resposta.status);
        }

        const dados = await resposta.json();
        motoristasCarregados = Array.isArray(dados) ? dados : (dados.motoristas || []);

        preencherTabelaMotoristas(motoristasCarregados);
    } catch (erro) {
        console.error("Erro ao carregar motoristas:", erro);
        listaMotoristas.innerHTML = `
            <tr>
                <td colspan="6">
                    Não foi possível carregar os motoristas. Verifique se o servidor está ligado.
                </td>
            </tr>
        `;
    }
}

function preencherTabelaMotoristas(motoristas) {
    if (motoristas.length === 0) {
        listaMotoristas.innerHTML = `
            <tr>
                <td colspan="6">Nenhum motorista cadastrado.</td>
            </tr>
        `;
        return;
    }

    listaMotoristas.innerHTML = motoristas.map(motorista => {
        const vencida = Number(motorista.cnh_vencida) === 1;
        const validade = formatarData(motorista.validade_cnh);

        const validadeHtml = vencida
            ? `<span class="texto-alerta">${escaparHtml(validade)} (vencida)</span>`
            : escaparHtml(validade);

        return `
            <tr>
                <td>${escaparHtml(motorista.nome)}</td>
                <td>${escaparHtml(motorista.cnh)}</td>
                <td>${validadeHtml}</td>
                <td>${escaparHtml(motorista.telefone)}</td>
                <td>${escaparHtml(motorista.status)}</td>
                <td>
                    <button class="btn-tabela" data-acao="editar" data-id="${motorista.id}">Editar</button>
                    <button class="btn-tabela btn-excluir" data-acao="excluir" data-id="${motorista.id}">Excluir</button>
                </td>
            </tr>
        `;
    }).join("");
}


listaMotoristas.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");

    if (!botao) {
        return;
    }

    const id = Number(botao.dataset.id);

    if (botao.dataset.acao === "editar") {
        const motorista = motoristasCarregados.find(m => m.id === id);

        if (motorista) {
            abrirModalMotorista(motorista);
        }
    } else if (botao.dataset.acao === "excluir") {
        excluirMotorista(id);
    }
});

async function excluirMotorista(id) {
    const motorista = motoristasCarregados.find(m => m.id === id);
    const nome = motorista ? motorista.nome : "este motorista";

    if (!confirm(`Tem certeza que deseja excluir ${nome}?`)) {
        return;
    }

    try {
        const resposta = await fetch(`${API_MOTORISTAS}/${id}`, { method: "DELETE" });
        const resultado = await resposta.json();

        if (!resposta.ok) {
            alert(resultado.mensagem || "Não foi possível excluir o motorista.");
            return;
        }

        carregarMotoristas();
    } catch (erro) {
        console.error("Erro ao excluir motorista:", erro);
        alert("Não foi possível conectar ao servidor.");
    }
}


const modalMotorista = document.getElementById("modalMotorista");
const tituloModalMotorista = document.getElementById("tituloModalMotorista");
const formMotorista = document.getElementById("formMotorista");
const mensagemFormMotorista = document.getElementById("mensagemFormMotorista");
const btnNovoMotorista = document.getElementById("btnNovoMotorista");
const btnCancelarMotorista = document.getElementById("btnCancelarMotorista");
const btnSalvarMotorista = document.getElementById("btnSalvarMotorista");

function abrirModalMotorista(motorista = null) {
    formMotorista.reset();
    mensagemFormMotorista.textContent = "";

    if (motorista) {
        motoristaEditandoId = motorista.id;
        tituloModalMotorista.textContent = "Editar motorista";

        document.getElementById("campoNomeMotorista").value = motorista.nome;
        document.getElementById("campoCnh").value = motorista.cnh;
        document.getElementById("campoValidadeCnh").value = motorista.validade_cnh;
        document.getElementById("campoTelefone").value = motorista.telefone || "";
        document.getElementById("campoStatusMotorista").value = motorista.status;
    } else {
        motoristaEditandoId = null;
        tituloModalMotorista.textContent = "Novo motorista";
    }

    modalMotorista.classList.add("aberto");
}

function fecharModalMotorista() {
    modalMotorista.classList.remove("aberto");
}

btnNovoMotorista.addEventListener("click", () => abrirModalMotorista());
btnCancelarMotorista.addEventListener("click", fecharModalMotorista);

modalMotorista.addEventListener("click", (evento) => {
    if (evento.target === modalMotorista) {
        fecharModalMotorista();
    }
});

formMotorista.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemFormMotorista.textContent = "";

    const motorista = {
        nome: document.getElementById("campoNomeMotorista").value,
        cnh: document.getElementById("campoCnh").value,
        validade_cnh: document.getElementById("campoValidadeCnh").value,
        telefone: document.getElementById("campoTelefone").value,
        status: document.getElementById("campoStatusMotorista").value
    };

    const editando = motoristaEditandoId !== null;
    const url = editando ? `${API_MOTORISTAS}/${motoristaEditandoId}` : API_MOTORISTAS;
    const metodo = editando ? "PUT" : "POST";

    btnSalvarMotorista.disabled = true;

    try {
        const resposta = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(motorista)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            mensagemFormMotorista.textContent = resultado.mensagem || "Não foi possível salvar o motorista.";
            return;
        }

        fecharModalMotorista();
        carregarMotoristas();
    } catch (erro) {
        console.error("Erro ao salvar motorista:", erro);
        mensagemFormMotorista.textContent = "Não foi possível conectar ao servidor.";
    } finally {
        btnSalvarMotorista.disabled = false;
    }
});

carregarMotoristas();