const evidenceBuilder = require("../services/evidenceBuilder.service");

const buildEvidence = async (req, res) => {
  try {
    const {
      finding,
      yaml,
      namespace,
      podName,
      deploymentName,
      includeLogs
    } = req.body;

    const evidence = await evidenceBuilder.buildEvidence({
      finding,
      yaml,
      namespace,
      podName,
      deploymentName,
      includeLogs
    });

    return res.status(200).json({
      success: true,
      data: evidence
    });
  } catch (error) {
    console.error("Evidence building failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to build Kubernetes evidence",
      error: error.message
    });
  }
};

module.exports = {
  buildEvidence
};