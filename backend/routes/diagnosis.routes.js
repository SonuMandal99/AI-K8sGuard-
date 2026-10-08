const express = require("express");

const {
  diagnoseFailure
} = require("../controllers/diagnosis.controller");

const router = express.Router();

// Diagnose a Kubernetes failure
router.post("/", diagnoseFailure);

module.exports = router;