const express = require("express");
const router = express.Router();

const utilizacaoController = require("../controllers/utilizacaoController");

router.get("/", utilizacaoController.listarUtilizacoes);
router.post("/", utilizacaoController.registrarSaida);
router.put("/:id/retorno", utilizacaoController.registrarRetorno);

module.exports = router;