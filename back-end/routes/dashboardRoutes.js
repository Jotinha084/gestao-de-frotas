const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");

router.get("/", dashboardController.obterIndicadores);
router.get("/custo-por-km", dashboardController.custoPorKm);

module.exports = router;