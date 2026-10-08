const reportModel = require("../models/report.model");

const getReports = async (req, res) => {
  try {
    const reports = await reportModel.find().sort({
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error("Failed to retrieve reports:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve analysis reports",
      error: error.message
    });
  }
};

const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await reportModel.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Analysis report not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error("Failed to retrieve report:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve analysis report",
      error: error.message
    });
  }
};

module.exports = {
  getReports,
  getReportById
};