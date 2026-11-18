const db = require("../config/database");

const COMBUSTIVEIS_VALIDOS = ["Gasolina", "Etanol", "Flex", "Diesel", "GNV", "Elétrico"];

function validarVeiculo(corpo) {
    const placa = String(corpo.placa || "").replace(/[-\s]/g, "").toUpperCase();
    const marca = String(corpo.marca || "").trim();
    const modelo = String(corpo.modelo || "").trim();
    const ano = Number(corpo.ano);
    const quilometragem =
        corpo.quilometragem === undefined || corpo.quilometragem === null || corpo.quilometragem === ""
            ? 0
            : Number(corpo.quilometragem);
    const tipoCombustivel = corpo.tipo_combustivel || "Flex";

    if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) {
        return { erro: "Placa inválida. Use o formato ABC1D23 ou ABC-1234." };
    }

    if (!marca) {
        return { erro: "A marca é obrigatória." };
    }

    if (!modelo) {
        return { erro: "O modelo é obrigatório." };
    }

    const anoMaximo = new Date().getFullYear() + 1;
    if (!Number.isInteger(ano) || ano < 1900 || ano > anoMaximo) {
        return { erro: `Ano inválido. Informe um ano entre 1900 e ${anoMaximo}.` };
    }

    if (Number.isNaN(quilometragem) || quilometragem < 0) {
        return { erro: "A quilometragem deve ser um número maior ou igual a zero." };
    }

    if (!COMBUSTIVEIS_VALIDOS.includes(tipoCombustivel)) {
        return { erro: "Tipo de combustível inválido." };
    }

    return {
        dados: { placa, marca, modelo, ano, quilometragem, tipoCombustivel }
    };
}

exports.cadastrarVeiculo = (req, res) => {
    const { erro, dados } = validarVeiculo(req.body);

    if (erro) {
        return res.status(400).json({
            sucesso: false,
            mensagem: erro
        });
    }

    const sql = `
        INSERT INTO veiculos
        (placa, marca, modelo, ano, quilometragem, tipo_combustivel, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Disponível')
    `;

    const valores = [
        dados.placa,
        dados.marca,
        dados.modelo,
        dados.ano,
        dados.quilometragem,
        dados.tipoCombustivel
    ];

    db.query(sql, valores, (err, resultado) => {
        if (err) {
            console.error("Erro ao cadastrar veículo:", err.message);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: "Já existe um veículo com esta placa."
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível cadastrar o veículo."
            });
        }

        res.status(201).json({
            sucesso: true,
            mensagem: "Veículo cadastrado com sucesso!",
            id: resultado.insertId
        });
    });
};

exports.listarVeiculos = (req, res) => {
    const sql = "SELECT * FROM veiculos ORDER BY id DESC";

    db.query(sql, (err, resultados) => {
        if (err) {
            console.error("Erro ao consultar veículos:", err.message);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível consultar os veículos."
            });
        }

        res.json({
            sucesso: true,
            veiculos: resultados
        });
    });
};

exports.editarVeiculo = (req, res) => {
    const { id } = req.params;

    const { erro, dados } = validarVeiculo(req.body);

    if (erro) {
        return res.status(400).json({
            sucesso: false,
            mensagem: erro
        });
    }

    const sql = `
        UPDATE veiculos
        SET placa = ?,
            marca = ?,
            modelo = ?,
            ano = ?,
            quilometragem = ?,
            tipo_combustivel = ?
        WHERE id = ?
    `;

    const valores = [
        dados.placa,
        dados.marca,
        dados.modelo,
        dados.ano,
        dados.quilometragem,
        dados.tipoCombustivel,
        id
    ];

    db.query(sql, valores, (err, resultado) => {
        if (err) {
            console.error("Erro ao editar veículo:", err.message);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: "Já existe outro veículo com esta placa."
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível editar o veículo."
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Veículo não encontrado."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Veículo atualizado com sucesso!"
        });
    });
};

exports.excluirVeiculo = (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM veiculos WHERE id = ?";

    db.query(sql, [id], (err, resultado) => {
        if (err) {
            console.error("Erro ao excluir veículo:", err.message);

            if (err.code === "ER_ROW_IS_REFERENCED_2") {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: "Não é possível excluir: o veículo possui utilizações, abastecimentos ou manutenções registrados."
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível excluir o veículo."
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Veículo não encontrado."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Veículo excluído com sucesso!"
        });
    });
};