
const express = require("express");
const cors = require("cors");
const db = require("./config/database");

require("dotenv").config();

const veiculoRoutes = require("./routes/veiculoRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/veiculos", veiculoRoutes);
app.use("/api/motoristas", require("./routes/motoristaRoutes"));
app.use("/api/utilizacoes", require("./routes/utilizacaoRoutes"));
app.use("/api/abastecimentos", require("./routes/abastecimentoRoutes"));
app.use("/api/manutencoes", require("./routes/manutencaoRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));

app.get("/api/status", (req, res) => {
    res.json({
        sucesso: true,
        mensagem: "Sistema de Gestão de Frotas funcionando!"
    });
});

app.get("/api/teste-banco", (req, res) => {
    db.query("SELECT 1 AS teste", (err, resultado) => {
        if (err) {
            console.error("Erro ao consultar o banco:", err.message);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao conectar ao banco de dados."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Conexão com MySQL funcionando!",
            resultado: resultado
        });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
