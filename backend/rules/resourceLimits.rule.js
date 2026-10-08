const RULE_ID = "K8S-004";

const checkResourceLimits = (deployment) => {
  const findings = [];

  const containers =
    deployment?.spec?.template?.spec?.containers || [];

  for (const container of containers) {
    const limits = container?.resources?.limits;

    if (!limits) {
      findings.push({
        rule_id: RULE_ID,
        title: "Missing resource limits",
        severity: "HIGH",
        evidence: `Container "${container.name}" does not define resource limits`,
        risk: 7
      });

      continue;
    }

    const hasCpuLimit = limits.cpu !== undefined;
    const hasMemoryLimit = limits.memory !== undefined;

    if (!hasCpuLimit || !hasMemoryLimit) {
      const missing = [];

      if (!hasCpuLimit) {
        missing.push("cpu");
      }

      if (!hasMemoryLimit) {
        missing.push("memory");
      }

      findings.push({
        rule_id: RULE_ID,
        title: "Missing resource limits",
        severity: "HIGH",
        evidence: `Container "${container.name}" is missing resource limit(s): ${missing.join(", ")}`,
        risk: 7
      });
    }
  }

  return findings;
};

module.exports = {
  RULE_ID,
  checkResourceLimits
};