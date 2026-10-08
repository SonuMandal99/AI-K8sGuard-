const diagnosisService = require("../services/diagnosis.service");

const diagnoseFailure = async (req, res) => {
  try {
    const {
      namespace,
      podName,
      deploymentName,
      failureType
    } = req.body;

    // Required inputs
    if (!namespace || !podName) {
      return res.status(400).json({
        success: false,
        message: "namespace and podName are required"
      });
    }

    // Delegate the complete diagnosis workflow
    const result = await diagnosisService.diagnoseFailure({
      namespace: namespace.trim(),
      podName: podName.trim(),
      deploymentName: deploymentName?.trim() || undefined,
      failureType: failureType?.trim() || undefined
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Failure diagnosis failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to diagnose Kubernetes failure",
      error: error.message
    });
  }
};

module.exports = {
  diagnoseFailure
};