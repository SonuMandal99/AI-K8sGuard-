const RULE_ID = "K8S-008";

const checkCapabilities = (deployment) => {
  const findings = [];

  const containers =
    deployment?.spec?.template?.spec?.containers || [];

  for (const container of containers) {
    const capabilities =
      container?.securityContext?.capabilities;

    const addedCapabilities = Array.isArray(capabilities?.add)
      ? capabilities.add
      : [];

    if (addedCapabilities.length === 0) {
      continue;
    }

    const excessiveCapabilities = addedCapabilities.filter(
      (capability) => {
        if (typeof capability !== "string") {
          return false;
        }

        return capability.toUpperCase() !== "NET_BIND_SERVICE";
      }
    );

    if (excessiveCapabilities.length > 0) {
      findings.push({
        rule_id: RULE_ID,
        title: "Excessive capabilities",
        severity: "HIGH",
        evidence: `Container "${container.name}" adds excessive capabilities: ${excessiveCapabilities.join(", ")}`,
        risk: 7
      });
    }
  }

  return findings;
};

module.exports = {
  RULE_ID,
  checkCapabilities
};