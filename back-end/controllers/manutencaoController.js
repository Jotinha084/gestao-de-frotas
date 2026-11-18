const db = require("../config/database");

const TIPOS_VALIDOS = ["Preventiva", "Corretiva"];
const STATUS_VALIDOS = ["Pendente", "Em andamento", "Concluída"];

const TRANSICOES = {
    "Pendente": ["Em andamento", "Concluída"],
    "Em andamento": ["Concluída"],
    "Concluída": []
};

function erroRegra(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

function lerNumero(valor) {
    if (valor === undefined || valor === null || String(valor).trim() === "") {
        return NaN;
    }

    return Number(valor);
}

function arredondar(numero) {
    return Math.round(numero * 100) / 100;
}

function converterDataHora(texto) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(texto || "").trim());

    if (!partes) {
        return null;
    }

    const [, ano, mes, dia, hora, minuto, segundo = "00"] = partes;

    const data = new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia),
        Number(hora),
        Number(minuto),
        Number(segundo)
    );

    if (
        data.getFullYear() !== Number(ano) ||
        data.getMonth() !== Number(mes) - 1 ||
        data.getDate() !== Number(dia) ||
        data.getHours() !== Number(hora) ||
        data.getMinutes() !== Number(minuto)
    ) {
        return null;
    }

    return {
        data,
        texto: `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`
    };
}

async function garantirVeiculoForaDeUso(conexao, veiculo) {
    const [utilizacoesAbertas] = await conexao.query(
        "SELECT id FROM utilizacoes WHERE veiculo_id = ? AND data_retorno IS NULL",
        [veiculo.id]
    );

    if (veiculo.status === "Em uso" || utilizacoesAbertas.length > 0) {
        throw erroRegra(409, "Veículo em uso não pode entrar em manutenção. Registre o retorno antes.");
    }
}

exports.registrarManutencao = async (req, res) => {
    const veiculoId = Number(req.body.veiculo_id);
    const tipo = String(req.body.tipo || "").trim();
    const descricao = String(req.body.descricao || "").trim();
    const status = req.body.status || "Pendente";
    const quilometragem = lerNumero(req.body.quilometragem);
    const custo = arredondar(lerNumero(req.body.custo));
    const dataHora = converterDataHora(req.body.data_manutencao);

    if (!Number.isInteger(veiculoId) || veiculoId <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Selecione um veículo." });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
        return res.status(400).json({ sucesso: false, mensagem: "Tipo inválido. Use Preventiva ou Corretiva." });
    }

    if (!descricao) {
        return res.status(400).json({ sucesso: false, mensagem: "A descrição é obrigatória." });
    }

    if (descricao.length > 500) {
        return res.status(400).json({ sucesso: false, mensagem: "A descrição deve ter no máximo 500 caracteres." });
    }

    if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({ sucesso: false, mensagem: "Status inválido." });
    }

    if (!req.body.data_manutencao) {
        return res.status(400).json({ sucesso: false, mensagem: "Informe a data e a hora da manutenção." });
    }

    if (!dataHora) {
        return res.status(400).json({ sucesso: false, mensagem: "Data e hora inválidas." });
    }

    const dataNoFuturo = dataHora.data.getTime() > Date.now() + 5 * 60 * 1000;

    if (dataNoFuturo && status !== "Pendente") {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Somente uma manutenção pendente pode ter data no futuro."
        });
    }

    if (Number.isNaN(quilometragem) || quilometragem < 0) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "A quilometragem deve ser um número maior ou igual a zero."
        });
    }

    if (Number.isNaN(custo) || custo < 0) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "O custo deve ser um número maior ou igual a zero."
        });
    }

    const conexao = await db.promise().getConnection();

    try {
        await conexao.beginTransaction();

        const [veiculos] = await conexao.query(
            "SELECT id, status FROM veiculos WHERE id = ? FOR UPDATE",
            [veiculoId]
        );

        if (veiculos.length === 0) {
            throw erroRegra(404, "Veículo não encontrado.");
        }

        if (status === "Em andamento") {
            await garantirVeiculoForaDeUso(conexao, veiculos[0]);
        }

        const [resultado] = await conexao.query(
            `INSERT INTO manutencoes
             (veiculo_id, tipo, descricao, data_manutencao, quilometragem, valor, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [veiculoId, tipo, descricao, dataHora.texto, quilometragem, custo, status]
        );

        if (status === "Em andamento") {
            await conexao.query(
                "UPDATE veiculos SET status = 'Em manutenção' WHERE id = ?",
                [veiculoId]
            );
        }

        await conexao.commit();

        res.status(201).json({
            sucesso: true,
            mensagem: "Manutenção registrada com sucesso!",
            id: resultado.insertId
        });
    } catch (erro) {
        await conexao.rollback().catch(() => {});

        if (erro.status) {
            return res.status(erro.status).json({
                sucesso: false,
                mensagem: erro.message
            });
        }

        console.error("Erro ao registrar manutenção:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível registrar a manutenção."
        });
    } finally {
        conexao.release();
    }
};

exports.atualizarStatus = async (req, res) => {
    const id = Number(req.params.id);
    const novoStatus = req.body.status;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Manutenção inválida." });
    }

    if (!STATUS_VALIDOS.includes(novoStatus)) {
        return res.status(400).json({ sucesso: false, mensagem: "Status inválido." });
    }

    const conexao = await db.promise().getConnection();

    try {
        await conexao.beginTransaction();

        const [manutencoes] = await conexao.query(
            "SELECT id, veiculo_id, status FROM manutencoes WHERE id = ? FOR UPDATE",
            [id]
        );

        if (manutencoes.length === 0) {
            throw erroRegra(404, "Manutenção não encontrada.");
        }

        const manutencao = manutencoes[0];

        if (!TRANSICOES[manutencao.status].includes(novoStatus)) {
            throw erroRegra(409, `Não é possível mudar o status de "${manutencao.status}" para "${novoStatus}".`);
        }

        // Bloqueia o veículo
        const [veiculos] = await conexao.query(
            "SELECT id, status FROM veiculos WHERE id = ? FOR UPDATE",
            [manutencao.veiculo_id]
        );

        if (novoStatus === "Em andamento") {
            await garantirVeiculoForaDeUso(conexao, veiculos[0]);

            await conexao.query(
                "UPDATE manutencoes SET status = ? WHERE id = ?",
                [novoStatus, id]
            );

            await conexao.query(
                "UPDATE veiculos SET status = 'Em manutenção' WHERE id = ?",
                [manutencao.veiculo_id]
            );
        } else {
            await conexao.query(
                "UPDATE manutencoes SET status = ? WHERE id = ?",
                [novoStatus, id]
            );

            const [outrasEmAndamento] = await conexao.query(
                "SELECT id FROM manutencoes WHERE veiculo_id = ? AND status = 'Em andamento' AND id <> ?",
                [manutencao.veiculo_id, id]
            );

            if (outrasEmAndamento.length === 0) {
                await conexao.query(
                    "UPDATE veiculos SET status = IF(status = 'Em manutenção', 'Disponível', status) WHERE id = ?",
                    [manutencao.veiculo_id]
                );
            }
        }

        await conexao.commit();

        res.json({
            sucesso: true,
            mensagem: "Status atualizado com sucesso!"
        });
    } catch (erro) {
        await conexao.rollback().catch(() => {});

        if (erro.status) {
            return res.status(erro.status).json({
                sucesso: false,
                mensagem: erro.message
            });
        }

        console.error("Erro ao atualizar status da manutenção:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível atualizar o status."
        });
    } finally {
        conexao.release();
    }
};

exports.listarManutencoes = async (req, res) => {
    const sql = `
        SELECT
            m.id,
            m.veiculo_id,
            v.placa,
            v.modelo,
            m.tipo,
            m.descricao,
            DATE_FORMAT(m.data_manutencao, '%d/%m/%Y %H:%i') AS data_manutencao,
            m.quilometragem,
            m.valor AS custo,
            m.status
        FROM manutencoes m
        JOIN veiculos v ON v.id = m.veiculo_id
        ORDER BY m.data_manutencao DESC, m.id DESC
    `;

    try {
        const [resultados] = await db.promise().query(sql);

        res.json({
            sucesso: true,
            manutencoes: resultados
        });
    } catch (erro) {
        console.error("Erro ao consultar manutenções:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível consultar as manutenções."
        });
    }
};

exports.totaisPorVeiculo = async (req, res) => {
    const sql = `
        SELECT
            v.id AS veiculo_id,
            v.placa,
            v.modelo,
            COALESCE(SUM(m.status = 'Concluída'), 0) AS quantidade_concluidas,
            COALESCE(SUM(CASE WHEN m.status = 'Concluída' THEN m.valor END), 0) AS total_gasto
        FROM veiculos v
        LEFT JOIN manutencoes m ON m.veiculo_id = v.id
        GROUP BY v.id, v.placa, v.modelo
        ORDER BY total_gasto DESC, v.placa
    `;

    try {
        const [resultados] = await db.promise().query(sql);

        res.json({
            sucesso: true,
            totais: resultados
        });
    } catch (erro) {
        console.error("Erro ao consultar totais de manutenções:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível consultar os totais."
        });
    }
};