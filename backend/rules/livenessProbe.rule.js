const RULE_ID = "K8S-006";

const checkLivenessProbe = (deployment) => {
  const findings = [];

  const containers =
    deployment?.spec?.template?.spec?.containers || [];

  for (const container of containers) {
    const livenessProbe = container?.livenessProbe;

    if (!livenessProbe) {
      findings.push({
        rule_id: RULE_ID,
        title: "Missing liveness probe",
        severity: "MEDIUM",
        evidence: `Container "${container.name}" does not define a liveness probe`,
        risk: 4
      });
    }
  }

  return findings;
};

module.exports = {
  RULE_ID,
  checkLivenessProbe
};