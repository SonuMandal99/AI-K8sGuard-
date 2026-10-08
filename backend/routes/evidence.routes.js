const express = require("express");

const {
  buildEvidence
} = require("../controllers/evidence.controller");

const router = express.Router();

router.post("/build", buildEvidence);

module.exports = router;