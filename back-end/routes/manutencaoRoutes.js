const express = require("express");
const router = express.Router();

const manutencaoController = require("../controllers/manutencaoController");

router.get("/", manutencaoController.listarManutencoes);
router.get("/totais", manutencaoController.totaisPorVeiculo);
router.post("/", manutencaoController.registrarManutencao);
router.put("/:id/status", manutencaoController.atualizarStatus);

module.exports = router;