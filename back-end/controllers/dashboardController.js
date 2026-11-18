const db = require("../config/database");

exports.obterIndicadores = async (req, res) => {
    const sql = `
        SELECT
            (SELECT COALESCE(SUM(valor_total), 0) FROM abastecimentos) AS total_combustivel,
            (SELECT COALESCE(SUM(valor), 0) FROM manutencoes WHERE status = 'Concluída') AS total_manutencao,
            (SELECT COUNT(*) FROM utilizacoes) AS total_utilizacoes,
            (SELECT COUNT(*) FROM utilizacoes WHERE data_retorno IS NULL) AS utilizacoes_em_aberto
    `;

    try {
        const [linhas] = await db.promise().query(sql);

        res.json({
            sucesso: true,
            indicadores: linhas[0]
        });
    } catch (erro) {
        console.error("Erro ao consultar indicadores:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível consultar os indicadores."
        });
    }
};


function dataValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return false;
    }

    const [ano, mes, dia] = texto.split("-").map(Number);
    const data = new Date(ano, mes - 1, dia);

    return (
        ano >= 2000 &&
        ano <= 2100 &&
        data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia
    );
}

function arredondar(numero) {
    return Math.round(numero * 100) / 100;
}

function calcularCustoPorKm(custoTotal, km) {
    return km > 0 ? arredondar(custoTotal / km) : null;
}

exports.custoPorKm = async (req, res) => {
    const inicio = String(req.query.inicio || "").trim();
    const fim = String(req.query.fim || "").trim();

    if (!inicio || !fim) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe a data inicial e a data final."
        });
    }

    if (!dataValida(inicio) || !dataValida(fim)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Datas inválidas. Use datas reais no formato AAAA-MM-DD."
        });
    }

    if (inicio > fim) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "A data inicial não pode ser posterior à data final."
        });
    }

    const sql = `
        SELECT
            v.id AS veiculo_id,
            v.placa,
            v.modelo,
            COALESCE((
                SELECT SUM(a.valor_total)
                FROM abastecimentos a
                WHERE a.veiculo_id = v.id
                  AND a.data_abastecimento >= ?
                  AND a.data_abastecimento < DATE_ADD(?, INTERVAL 1 DAY)
            ), 0) AS total_combustivel,
            COALESCE((
                SELECT SUM(m.valor)
                FROM manutencoes m
                WHERE m.veiculo_id = v.id
                  AND m.status = 'Concluída'
                  AND m.data_manutencao >= ?
                  AND m.data_manutencao < DATE_ADD(?, INTERVAL 1 DAY)
            ), 0) AS total_manutencao,
            COALESCE((
                SELECT SUM(u.km_final - u.km_inicial)
                FROM utilizacoes u
                WHERE u.veiculo_id = v.id
                  AND u.data_retorno IS NOT NULL
                  AND u.data_retorno >= ?
                  AND u.data_retorno < DATE_ADD(?, INTERVAL 1 DAY)
            ), 0) AS km_percorridos
        FROM veiculos v
        ORDER BY v.placa
    `;

    const parametros = [inicio, fim, inicio, fim, inicio, fim];

    try {
        const [linhas] = await db.promise().query(sql, parametros);

        const veiculos = linhas.map(linha => {
            const combustivel = arredondar(Number(linha.total_combustivel));
            const manutencao = arredondar(Number(linha.total_manutencao));
            const km = arredondar(Number(linha.km_percorridos));
            const custoTotal = arredondar(combustivel + manutencao);

            return {
                veiculo_id: linha.veiculo_id,
                placa: linha.placa,
                modelo: linha.modelo,
                total_combustivel: combustivel,
                total_manutencao: manutencao,
                custo_total: custoTotal,
                km_percorridos: km,
                custo_por_km: calcularCustoPorKm(custoTotal, km)
            };
        });

        const somar = (campo) => arredondar(veiculos.reduce((total, v) => total + v[campo], 0));

        const resumo = {
            total_combustivel: somar("total_combustivel"),
            total_manutencao: somar("total_manutencao"),
            custo_total: somar("custo_total"),
            km_percorridos: somar("km_percorridos")
        };

        resumo.custo_por_km = calcularCustoPorKm(resumo.custo_total, resumo.km_percorridos);

        res.json({
            sucesso: true,
            periodo: { inicio, fim },
            veiculos,
            resumo
        });
    } catch (erro) {
        console.error("Erro ao calcular custo por km:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível calcular o custo por km."
        });
    }
};