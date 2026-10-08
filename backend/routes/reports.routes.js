const express = require("express");

const {
  getReports,
  getReportById
} = require("../controllers/reports.controller");

const router = express.Router();

// Get all analysis reports
router.get("/", getReports);

// Get a specific analysis report
router.get("/:id", getReportById);

module.exports = router;