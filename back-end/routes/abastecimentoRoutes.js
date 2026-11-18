const express = require("express");
const router = express.Router();

const abastecimentoController = require("../controllers/abastecimentoController");

router.get("/", abastecimentoController.listarAbastecimentos);
router.get("/totais", abastecimentoController.totaisPorVeiculo);
router.post("/", abastecimentoController.registrarAbastecimento);

module.exports = router;