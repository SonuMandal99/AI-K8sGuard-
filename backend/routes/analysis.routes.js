const express = require("express");

const {
  analyzeYAML
} = require("../controllers/analysis.controller");

const router = express.Router();

// Analyze Kubernetes YAML configuration
router.post("/yaml", analyzeYAML);

module.exports = router;