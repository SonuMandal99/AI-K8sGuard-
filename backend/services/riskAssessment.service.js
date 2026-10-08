const calculateRiskScore = (findings = []) => {
  if (!Array.isArray(findings)) {
    throw new Error("Findings must be an array");
  }

  return findings.reduce((total, finding) => {
    const risk = Number(finding?.risk) || 0;
    return total + risk;
  }, 0);
};

const getHighestSeverity = (findings = []) => {
  if (!Array.isArray(findings) || findings.length === 0) {
    return null;
  }

  const severityPriority = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  return findings.reduce((highest, finding) => {
    const currentSeverity = finding?.severity;

    if (!currentSeverity) {
      return highest;
    }

    if (
      !highest ||
      severityPriority[currentSeverity] >
        severityPriority[highest]
    ) {
      return currentSeverity;
    }

    return highest;
  }, null);
};

const getRiskSummary = (findings = []) => {
  const riskScore = calculateRiskScore(findings);

  const severity = getHighestSeverity(findings);

  return {
    riskScore,
    severity,
    findingCount: findings.length
  };
};

module.exports = {
  calculateRiskScore,
  getHighestSeverity,
  getRiskSummary
};