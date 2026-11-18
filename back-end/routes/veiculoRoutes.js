
const express = require("express");
const router = express.Router();

const veiculoController = require("../controllers/veiculoController");

// Cadastrar veículo
router.post("/", veiculoController.cadastrarVeiculo);

// Listar veículos
router.get("/", veiculoController.listarVeiculos);

// Editar veículo
router.put("/:id", veiculoController.editarVeiculo);

// Excluir veículo
router.delete("/:id", veiculoController.excluirVeiculo);

module.exports = router;
