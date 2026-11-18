const API_URL = "http://localhost:3000/api/veiculos";

const listaVeiculos = document.getElementById("listaVeiculos");
const totalVeiculos = document.getElementById("totalVeiculos");
const veiculosDisponiveis = document.getElementById("veiculosDisponiveis");
const veiculosManutencao = document.getElementById("veiculosManutencao");
const veiculosUtilizacao = document.getElementById("veiculosUtilizacao");

let veiculosCarregados = [];

let veiculoEditandoId = null;

function escaparHtml(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function carregarVeiculos() {
    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error("Resposta inválida da API: " + resposta.status);
        }

        const dados = await resposta.json();
        veiculosCarregados = Array.isArray(dados) ? dados : (dados.veiculos || []);

        preencherTabela(veiculosCarregados);
        atualizarDashboard(veiculosCarregados);
    } catch (erro) {
        console.error("Erro ao carregar veículos:", erro);
        listaVeiculos.innerHTML = `
            <tr>
                <td colspan="8">
                    Não foi possível carregar os veículos. Verifique se o servidor está ligado.
                </td>
            </tr>
        `;
    }
}

function preencherTabela(veiculos) {
    if (veiculos.length === 0) {
        listaVeiculos.innerHTML = `
            <tr>
                <td colspan="8">Nenhum veículo cadastrado.</td>
            </tr>
        `;
        return;
    }

    listaVeiculos.innerHTML = veiculos.map(veiculo => `
        <tr>
            <td>${escaparHtml(veiculo.placa)}</td>
            <td>${escaparHtml(veiculo.marca)}</td>
            <td>${escaparHtml(veiculo.modelo)}</td>
            <td>${escaparHtml(veiculo.ano)}</td>
            <td>${escaparHtml(veiculo.quilometragem)} km</td>
            <td>${escaparHtml(veiculo.tipo_combustivel)}</td>
            <td>${escaparHtml(veiculo.status)}</td>
            <td>
                <button class="btn-tabela" data-acao="editar" data-id="${veiculo.id}">Editar</button>
                <button class="btn-tabela btn-excluir" data-acao="excluir" data-id="${veiculo.id}">Excluir</button>
            </td>
        </tr>
    `).join("");
}

function atualizarDashboard(veiculos) {
    totalVeiculos.textContent = veiculos.length;

    veiculosDisponiveis.textContent =
        veiculos.filter(v => v.status === "Disponível").length;

    veiculosManutencao.textContent =
        veiculos.filter(v => v.status === "Em manutenção").length;

    veiculosUtilizacao.textContent =
        veiculos.filter(v => v.status === "Em uso").length;
}


listaVeiculos.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");

    if (!botao) {
        return;
    }

    const id = Number(botao.dataset.id);

    if (botao.dataset.acao === "editar") {
        const veiculo = veiculosCarregados.find(v => v.id === id);

        if (veiculo) {
            abrirModal(veiculo);
        }
    } else if (botao.dataset.acao === "excluir") {
        excluirVeiculo(id);
    }
});

async function excluirVeiculo(id) {
    const veiculo = veiculosCarregados.find(v => v.id === id);
    const nome = veiculo ? `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})` : "este veículo";

    if (!confirm(`Tem certeza que deseja excluir ${nome}?`)) {
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        const resultado = await resposta.json();

        if (!resposta.ok) {
            alert(resultado.mensagem || "Não foi possível excluir o veículo.");
            return;
        }

        carregarVeiculos();
    } catch (erro) {
        console.error("Erro ao excluir veículo:", erro);
        alert("Não foi possível conectar ao servidor.");
    }
}


const modalVeiculo = document.getElementById("modalVeiculo");
const tituloModal = document.getElementById("tituloModal");
const formVeiculo = document.getElementById("formVeiculo");
const mensagemForm = document.getElementById("mensagemForm");
const btnNovoVeiculo = document.getElementById("btnNovoVeiculo");
const btnCancelar = document.getElementById("btnCancelar");
const btnSalvar = document.getElementById("btnSalvar");

function abrirModal(veiculo = null) {
    formVeiculo.reset();
    mensagemForm.textContent = "";

    if (veiculo) {
        veiculoEditandoId = veiculo.id;
        tituloModal.textContent = "Editar veículo";

        document.getElementById("campoPlaca").value = veiculo.placa;
        document.getElementById("campoMarca").value = veiculo.marca;
        document.getElementById("campoModelo").value = veiculo.modelo;
        document.getElementById("campoAno").value = veiculo.ano;
        document.getElementById("campoKm").value = veiculo.quilometragem;
        document.getElementById("campoCombustivel").value = veiculo.tipo_combustivel;
    } else {
        veiculoEditandoId = null;
        tituloModal.textContent = "Novo veículo";
    }

    modalVeiculo.classList.add("aberto");
}

function fecharModal() {
    modalVeiculo.classList.remove("aberto");
}

btnNovoVeiculo.addEventListener("click", () => abrirModal());
btnCancelar.addEventListener("click", fecharModal);

modalVeiculo.addEventListener("click", (evento) => {
    if (evento.target === modalVeiculo) {
        fecharModal();
    }
});

formVeiculo.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemForm.textContent = "";

    const veiculo = {
        placa: document.getElementById("campoPlaca").value,
        marca: document.getElementById("campoMarca").value,
        modelo: document.getElementById("campoModelo").value,
        ano: Number(document.getElementById("campoAno").value),
        quilometragem: Number(document.getElementById("campoKm").value || 0),
                tipo_combustivel: document.getElementById("campoCombustivel").value
    };

    const editando = veiculoEditandoId !== null;
    const url = editando ? `${API_URL}/${veiculoEditandoId}` : API_URL;
    const metodo = editando ? "PUT" : "POST";

    btnSalvar.disabled = true;

    try {
        const resposta = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(veiculo)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            mensagemForm.textContent = resultado.mensagem || "Não foi possível salvar o veículo.";
            return;
        }

        fecharModal();
        carregarVeiculos();
    } catch (erro) {
        console.error("Erro ao salvar veículo:", erro);
        mensagemForm.textContent = "Não foi possível conectar ao servidor.";
    } finally {
        btnSalvar.disabled = false;
    }
});

carregarVeiculos();



const itensMenu = document.querySelectorAll(".menu-item");
const secoes = document.querySelectorAll(".secao");
const tituloPagina = document.getElementById("tituloPagina");
const subtituloPagina = document.getElementById("subtituloPagina");

const textosPagina = {
    dashboard: {
        titulo: "Dashboard",
        subtitulo: "Bem-vindo ao sistema de Gestão de Frotas."
    },
    veiculos: {
        titulo: "Veículos",
        subtitulo: "Cadastre e gerencie os veículos da frota."
    },
        motoristas: {
        titulo: "Motoristas",
        subtitulo: "Cadastre e gerencie os motoristas da frota."
    },
        utilizacoes: {
        titulo: "Utilizações",
        subtitulo: "Registre a saída e o retorno dos veículos."
    },
        abastecimentos: {
        titulo: "Abastecimentos",
        subtitulo: "Registre os abastecimentos e acompanhe os gastos com combustível."
    },
    manutencoes: {
        titulo: "Manutenções",
        subtitulo: "Registre as manutenções e acompanhe os gastos com a frota."
    }
};

function mostrarSecao(nome) {
    const secao = document.getElementById("secao-" + nome);

    if (!secao) {
        return;
    }

    secoes.forEach(s => s.classList.remove("ativa"));
    secao.classList.add("ativa");

    itensMenu.forEach(item => {
        item.classList.toggle("active", item.dataset.secao === nome);
    });

    const textos = textosPagina[nome];

    if (textos) {
        tituloPagina.textContent = textos.titulo;
        subtituloPagina.textContent = textos.subtitulo;
    }

    if (nome === "dashboard") {
        carregarVeiculos();
        carregarDashboard();
        carregarCustoPorKm();
    }
}

itensMenu.forEach(item => {
    item.addEventListener("click", (evento) => {
        evento.preventDefault();
        mostrarSecao(item.dataset.secao);
    });
});