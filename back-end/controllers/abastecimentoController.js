const db = require("../config/database");

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

exports.registrarAbastecimento = async (req, res) => {
    const veiculoId = Number(req.body.veiculo_id);
    const quilometragem = lerNumero(req.body.quilometragem);
    const litros = arredondar(lerNumero(req.body.quantidade_litros));
    const valorTotal = arredondar(lerNumero(req.body.valor_total));
    const dataHora = converterDataHora(req.body.data_abastecimento);

    if (!Number.isInteger(veiculoId) || veiculoId <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Selecione um veículo." });
    }

    if (!req.body.data_abastecimento) {
        return res.status(400).json({ sucesso: false, mensagem: "Informe a data e a hora do abastecimento." });
    }

    if (!dataHora) {
        return res.status(400).json({ sucesso: false, mensagem: "Data e hora inválidas." });
    }

    if (dataHora.data.getTime() > Date.now() + 5 * 60 * 1000) {
        return res.status(400).json({ sucesso: false, mensagem: "A data do abastecimento não pode estar no futuro." });
    }

    if (Number.isNaN(quilometragem) || quilometragem < 0) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "A quilometragem deve ser um número maior ou igual a zero."
        });
    }

    if (Number.isNaN(litros) || litros <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "A quantidade de litros deve ser maior que zero." });
    }

    if (Number.isNaN(valorTotal) || valorTotal <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "O valor pago deve ser maior que zero." });
    }

    try {
        const [veiculos] = await db.promise().query(
            "SELECT tipo_combustivel FROM veiculos WHERE id = ?",
            [veiculoId]
        );

        if (veiculos.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: "Veículo não encontrado." });
        }

        const valorLitro = arredondar(valorTotal / litros);

        const [resultado] = await db.promise().query(
            `INSERT INTO abastecimentos
             (veiculo_id, data_abastecimento, tipo_combustivel, quantidade_litros, valor_litro, valor_total, quilometragem)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                veiculoId,
                dataHora.texto,
                veiculos[0].tipo_combustivel,
                litros,
                valorLitro,
                valorTotal,
                quilometragem
            ]
        );

        res.status(201).json({
            sucesso: true,
            mensagem: "Abastecimento registrado com sucesso!",
            id: resultado.insertId
        });
    } catch (erro) {
        console.error("Erro ao registrar abastecimento:", erro.message);

        if (erro.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(404).json({ sucesso: false, mensagem: "Veículo não encontrado." });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível registrar o abastecimento."
        });
    }
};

exports.listarAbastecimentos = async (req, res) => {
    const sql = `
        SELECT
            a.id,
            a.veiculo_id,
            v.placa,
            v.modelo,
            DATE_FORMAT(a.data_abastecimento, '%d/%m/%Y %H:%i') AS data_abastecimento,
            a.tipo_combustivel,
            a.quilometragem,
            a.quantidade_litros,
            a.valor_litro,
            a.valor_total
        FROM abastecimentos a
        JOIN veiculos v ON v.id = a.veiculo_id
        ORDER BY a.data_abastecimento DESC, a.id DESC
    `;

    try {
        const [resultados] = await db.promise().query(sql);

        res.json({
            sucesso: true,
            abastecimentos: resultados
        });
    } catch (erro) {
        console.error("Erro ao consultar abastecimentos:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível consultar os abastecimentos."
        });
    }
};

exports.totaisPorVeiculo = async (req, res) => {
    const sql = `
        SELECT
            v.id AS veiculo_id,
            v.placa,
            v.modelo,
            COUNT(a.id) AS quantidade,
            COALESCE(SUM(a.quantidade_litros), 0) AS total_litros,
            COALESCE(SUM(a.valor_total), 0) AS total_gasto
        FROM veiculos v
        LEFT JOIN abastecimentos a ON a.veiculo_id = v.id
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
        console.error("Erro ao consultar totais de abastecimentos:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível consultar os totais."
        });
    }
};