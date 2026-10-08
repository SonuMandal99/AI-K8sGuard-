const RULE_ID = "K8S-003";

const checkPrivilegeEscalation = (deployment) => {
  const findings = [];

  const containers =
    deployment?.spec?.template?.spec?.containers || [];

  for (const container of containers) {
    const allowPrivilegeEscalation =
      container?.securityContext?.allowPrivilegeEscalation;

    if (allowPrivilegeEscalation === true) {
      findings.push({
        rule_id: RULE_ID,
        title: "Privilege escalation enabled",
        severity: "HIGH",
        evidence: `Container "${container.name}" has securityContext.allowPrivilegeEscalation=true`,
        risk: 7
      });
    }
  }

  return findings;
};

module.exports = {
  RULE_ID,
  checkPrivilegeEscalation
};