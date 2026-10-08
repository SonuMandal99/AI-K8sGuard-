const SEVERITY_LEVELS = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
};

const SEVERITY_PRIORITY = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

const isValidSeverity = (severity) => {
  return Object.prototype.hasOwnProperty.call(
    SEVERITY_PRIORITY,
    severity
  );
};

const getSeverityPriority = (severity) => {
  if (!isValidSeverity(severity)) {
    return 0;
  }

  return SEVERITY_PRIORITY[severity];
};

const getHighestSeverity = (findings = []) => {
  if (!Array.isArray(findings) || findings.length === 0) {
    return null;
  }

  return findings.reduce((highest, finding) => {
    const severity = finding?.severity;

    if (!isValidSeverity(severity)) {
      return highest;
    }

    if (
      !highest ||
      getSeverityPriority(severity) >
        getSeverityPriority(highest)
    ) {
      return severity;
    }

    return highest;
  }, null);
};

module.exports = {
  SEVERITY_LEVELS,
  SEVERITY_PRIORITY,
  isValidSeverity,
  getSeverityPriority,
  getHighestSeverity
};