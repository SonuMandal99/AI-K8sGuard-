const RULE_ID = "K8S-002";

const checkRootUser = (deployment) => {
  const findings = [];

  const podSpec = deployment?.spec?.template?.spec;

  const containers = podSpec?.containers || [];

  const podSecurityContext = podSpec?.securityContext || {};

  for (const container of containers) {
    const containerSecurityContext =
      container?.securityContext || {};

    /*
     * Container-level runAsUser takes precedence over
     * the Pod-level runAsUser.
     */
    const runAsUser =
      containerSecurityContext.runAsUser !== undefined
        ? containerSecurityContext.runAsUser
        : podSecurityContext.runAsUser;

    if (runAsUser === 0) {
      const source =
        containerSecurityContext.runAsUser !== undefined
          ? "container"
          : "pod";

      findings.push({
        rule_id: RULE_ID,
        title: "Root execution",
        severity: "HIGH",
        evidence:
          source === "container"
            ? `Container "${container.name}" is configured to run as root (runAsUser=0)`
            : `Container "${container.name}" inherits root execution from the Pod securityContext (runAsUser=0)`,
        risk: 7
      });
    }
  }

  return findings;
};

module.exports = {
  RULE_ID,
  checkRootUser
};