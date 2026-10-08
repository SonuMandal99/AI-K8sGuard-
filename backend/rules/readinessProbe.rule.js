const RULE_ID = "K8S-005";

const checkReadinessProbe = (deployment) => {
  const findings = [];

  const containers =
    deployment?.spec?.template?.spec?.containers || [];

  for (const container of containers) {
    const readinessProbe = container?.readinessProbe;

    if (!readinessProbe) {
      findings.push({
        rule_id: RULE_ID,
        title: "Missing readiness probe",
        severity: "MEDIUM",
        evidence: `Container "${container.name}" does not define a readiness probe`,
        risk: 4
      });
    }
  }

  return findings;
};

module.exports = {
  RULE_ID,
  checkReadinessProbe
};