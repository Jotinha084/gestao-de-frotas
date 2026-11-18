const db = require("../config/database");

function erroRegra(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

exports.registrarSaida = async (req, res) => {
    const veiculoId = Number(req.body.veiculo_id);
    const motoristaId = Number(req.body.motorista_id);
    const finalidade = String(req.body.finalidade || "").trim();

    if (!Number.isInteger(veiculoId) || veiculoId <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Selecione um veículo." });
    }

    if (!Number.isInteger(motoristaId) || motoristaId <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Selecione um motorista." });
    }

    if (!finalidade) {
        return res.status(400).json({ sucesso: false, mensagem: "A finalidade é obrigatória." });
    }

    if (finalidade.length > 150) {
        return res.status(400).json({ sucesso: false, mensagem: "A finalidade deve ter no máximo 150 caracteres." });
    }

    const conexao = await db.promise().getConnection();

    try {
        await conexao.beginTransaction();

        const [veiculos] = await conexao.query(
            "SELECT id, quilometragem, status FROM veiculos WHERE id = ? FOR UPDATE",
            [veiculoId]
        );

        if (veiculos.length === 0) {
            throw erroRegra(404, "Veículo não encontrado.");
        }

        const [motoristas] = await conexao.query(
            "SELECT id, status, (validade_cnh < CURDATE()) AS cnh_vencida FROM motoristas WHERE id = ? FOR UPDATE",
            [motoristaId]
        );

        if (motoristas.length === 0) {
            throw erroRegra(404, "Motorista não encontrado.");
        }

        const veiculo = veiculos[0];
        const motorista = motoristas[0];

        const [veiculoEmAberto] = await conexao.query(
            "SELECT id FROM utilizacoes WHERE veiculo_id = ? AND data_retorno IS NULL",
            [veiculoId]
        );

        const [motoristaEmAberto] = await conexao.query(
            "SELECT id FROM utilizacoes WHERE motorista_id = ? AND data_retorno IS NULL",
            [motoristaId]
        );

        if (veiculo.status === "Em manutenção") {
            throw erroRegra(409, "Veículo em manutenção não pode iniciar uma nova utilização.");
        }

        if (veiculoEmAberto.length > 0) {
            throw erroRegra(409, "Este veículo já possui uma utilização em aberto.");
        }

        if (veiculo.status !== "Disponível") {
            throw erroRegra(409, `O veículo não está disponível (status atual: ${veiculo.status}).`);
        }

        if (motorista.status !== "Ativo") {
            throw erroRegra(409, "Motorista inativo não pode realizar uma nova saída.");
        }

        if (Number(motorista.cnh_vencida) === 1) {
            throw erroRegra(409, "Motorista com CNH vencida não pode realizar uma nova saída.");
        }

        if (motoristaEmAberto.length > 0) {
            throw erroRegra(409, "Este motorista já está associado a uma utilização em aberto.");
        }

        const [resultado] = await conexao.query(
            `INSERT INTO utilizacoes
             (veiculo_id, motorista_id, finalidade, data_saida, km_inicial)
             VALUES (?, ?, ?, NOW(), ?)`,
            [veiculoId, motoristaId, finalidade, veiculo.quilometragem]
        );

        await conexao.query(
            "UPDATE veiculos SET status = 'Em uso' WHERE id = ?",
            [veiculoId]
        );

        await conexao.commit();

        res.status(201).json({
            sucesso: true,
            mensagem: "Saída registrada com sucesso!",
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

        console.error("Erro ao registrar saída:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível registrar a saída."
        });
    } finally {
        conexao.release();
    }
};

exports.registrarRetorno = async (req, res) => {
    const id = Number(req.params.id);
    const kmInformado = req.body.km_final;
    const kmFinal = Number(kmInformado);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Utilização inválida." });
    }

    if (kmInformado === undefined || kmInformado === null || kmInformado === "" || Number.isNaN(kmFinal) || kmFinal < 0) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe a quilometragem final (um número maior ou igual a zero)."
        });
    }

    const conexao = await db.promise().getConnection();

    try {
        await conexao.beginTransaction();

        const [utilizacoes] = await conexao.query(
            "SELECT id, veiculo_id, km_inicial, data_retorno FROM utilizacoes WHERE id = ? FOR UPDATE",
            [id]
        );

        if (utilizacoes.length === 0) {
            throw erroRegra(404, "Utilização não encontrada.");
        }

        const utilizacao = utilizacoes[0];

        if (utilizacao.data_retorno !== null) {
            throw erroRegra(409, "Esta utilização já foi encerrada.");
        }

        const kmInicial = Number(utilizacao.km_inicial);

        if (kmFinal < kmInicial) {
            throw erroRegra(400, `A quilometragem final não pode ser inferior à inicial (${kmInicial} km).`);
        }

        await conexao.query(
            "SELECT id FROM veiculos WHERE id = ? FOR UPDATE",
            [utilizacao.veiculo_id]
        );

        await conexao.query(
            "UPDATE utilizacoes SET data_retorno = NOW(), km_final = ? WHERE id = ?",
            [kmFinal, id]
        );

        await conexao.query(
            `UPDATE veiculos
             SET quilometragem = GREATEST(quilometragem, ?),
                 status = IF(status = 'Em uso', 'Disponível', status)
             WHERE id = ?`,
            [kmFinal, utilizacao.veiculo_id]
        );

        await conexao.commit();

        res.json({
            sucesso: true,
            mensagem: "Retorno registrado com sucesso!"
        });
    } catch (erro) {
        await conexao.rollback().catch(() => {});

        if (erro.status) {
            return res.status(erro.status).json({
                sucesso: false,
                mensagem: erro.message
            });
        }

        console.error("Erro ao registrar retorno:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível registrar o retorno."
        });
    } finally {
        conexao.release();
    }
};

exports.listarUtilizacoes = async (req, res) => {
    const sql = `
        SELECT
            u.id,
            u.veiculo_id,
            u.motorista_id,
            v.placa,
            v.modelo,
            m.nome AS motorista,
            u.finalidade,
            DATE_FORMAT(u.data_saida, '%d/%m/%Y %H:%i') AS data_saida,
            DATE_FORMAT(u.data_retorno, '%d/%m/%Y %H:%i') AS data_retorno,
            u.km_inicial,
            u.km_final,
            (u.data_retorno IS NULL) AS em_aberto
        FROM utilizacoes u
        JOIN veiculos v ON v.id = u.veiculo_id
        JOIN motoristas m ON m.id = u.motorista_id
        ORDER BY u.id DESC
    `;

    try {
        const [resultados] = await db.promise().query(sql);

        res.json({
            sucesso: true,
            utilizacoes: resultados
        });
    } catch (erro) {
        console.error("Erro ao consultar utilizações:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível consultar as utilizações."
        });
    }
};