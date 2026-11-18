const db = require("../config/database");

const STATUS_VALIDOS = ["Ativo", "Inativo"];

function dataValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return false;
    }

    const [ano, mes, dia] = texto.split("-").map(Number);
    const data = new Date(ano, mes - 1, dia);

    return (
        ano >= 1900 &&
        ano <= 2100 &&
        data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia
    );
}

function validarMotorista(corpo) {
    const nome = String(corpo.nome || "").trim();
    const cnh = String(corpo.cnh || "").replace(/\D/g, "");
    const validadeCnh = String(corpo.validade_cnh || "").trim();
    const telefone = String(corpo.telefone || "").trim();
    const status = corpo.status || "Ativo";

    if (!nome) {
        return { erro: "O nome é obrigatório." };
    }

    if (cnh.length !== 11) {
        return { erro: "CNH inválida. Ela deve ter 11 números." };
    }

    if (!dataValida(validadeCnh)) {
        return { erro: "Validade da CNH inválida. Use uma data real no formato AAAA-MM-DD." };
    }

    if (telefone) {
        const digitosTelefone = telefone.replace(/\D/g, "");

        if (digitosTelefone.length < 10 || digitosTelefone.length > 11) {
            return { erro: "Telefone inválido. Informe o DDD e o número (10 ou 11 dígitos)." };
        }
    }

    if (!STATUS_VALIDOS.includes(status)) {
        return { erro: "Status inválido. Use Ativo ou Inativo." };
    }

    return {
        dados: { nome, cnh, validadeCnh, telefone: telefone || null, status }
    };
}

exports.cadastrarMotorista = (req, res) => {
    const { erro, dados } = validarMotorista(req.body);

    if (erro) {
        return res.status(400).json({
            sucesso: false,
            mensagem: erro
        });
    }

    const sql = `
        INSERT INTO motoristas
        (nome, cnh, validade_cnh, telefone, status)
        VALUES (?, ?, ?, ?, ?)
    `;

    const valores = [
        dados.nome,
        dados.cnh,
        dados.validadeCnh,
        dados.telefone,
        dados.status
    ];

    db.query(sql, valores, (err, resultado) => {
        if (err) {
            console.error("Erro ao cadastrar motorista:", err.message);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: "Já existe um motorista com esta CNH."
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível cadastrar o motorista."
            });
        }

        res.status(201).json({
            sucesso: true,
            mensagem: "Motorista cadastrado com sucesso!",
            id: resultado.insertId
        });
    });
};

exports.listarMotoristas = (req, res) => {
    const sql = `
        SELECT
            id,
            nome,
            cnh,
            DATE_FORMAT(validade_cnh, '%Y-%m-%d') AS validade_cnh,
            telefone,
            status,
            (validade_cnh < CURDATE()) AS cnh_vencida
        FROM motoristas
        ORDER BY nome
    `;

    db.query(sql, (err, resultados) => {
        if (err) {
            console.error("Erro ao consultar motoristas:", err.message);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível consultar os motoristas."
            });
        }

        res.json({
            sucesso: true,
            motoristas: resultados
        });
    });
};

exports.editarMotorista = (req, res) => {
    const { id } = req.params;

    const { erro, dados } = validarMotorista(req.body);

    if (erro) {
        return res.status(400).json({
            sucesso: false,
            mensagem: erro
        });
    }

    const sql = `
        UPDATE motoristas
        SET nome = ?,
            cnh = ?,
            validade_cnh = ?,
            telefone = ?,
            status = ?
        WHERE id = ?
    `;

    const valores = [
        dados.nome,
        dados.cnh,
        dados.validadeCnh,
        dados.telefone,
        dados.status,
        id
    ];

    db.query(sql, valores, (err, resultado) => {
        if (err) {
            console.error("Erro ao editar motorista:", err.message);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: "Já existe outro motorista com esta CNH."
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível editar o motorista."
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Motorista não encontrado."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Motorista atualizado com sucesso!"
        });
    });
};

exports.excluirMotorista = (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM motoristas WHERE id = ?";

    db.query(sql, [id], (err, resultado) => {
        if (err) {
            console.error("Erro ao excluir motorista:", err.message);

            if (err.code === "ER_ROW_IS_REFERENCED_2") {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: "Não é possível excluir: o motorista possui utilizações ou abastecimentos registrados. Inative o motorista em vez de excluir."
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível excluir o motorista."
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Motorista não encontrado."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Motorista excluído com sucesso!"
        });
    });
};