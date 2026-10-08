const RULE_ID = "K8S-001";

const checkPrivilegedContainer = (deployment) => {
  const findings = [];

  const containers =
    deployment?.spec?.template?.spec?.containers || [];

  for (const container of containers) {
    const privileged =
      container?.securityContext?.privileged;

    if (privileged === true) {
      findings.push({
        rule_id: RULE_ID,
        title: "Privileged container",
        severity: "CRITICAL",
        evidence: `Container "${container.name}" has securityContext.privileged=true`,
        risk: 10
      });
    }
  }

  return findings;
};

module.exports = {
  RULE_ID,
  checkPrivilegedContainer
};