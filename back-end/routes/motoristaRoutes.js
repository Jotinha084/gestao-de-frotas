const express = require("express");
const router = express.Router();

const motoristaController = require("../controllers/motoristaController");

router.get("/", motoristaController.listarMotoristas);
router.post("/", motoristaController.cadastrarMotorista);
router.put("/:id", motoristaController.editarMotorista);
router.delete("/:id", motoristaController.excluirMotorista);

module.exports = router;