const yaml = require("js-yaml");

const {
  checkPrivilegedContainer
} = require("../rules/privilegedContainer.rule");

const {
  checkRootUser
} = require("../rules/rootUser.rule");

const {
  checkPrivilegeEscalation
} = require("../rules/privilegeEscalation.rule");

const {
  checkResourceLimits
} = require("../rules/resourceLimits.rule");

const {
  checkReadinessProbe
} = require("../rules/readinessProbe.rule");

const {
  checkLivenessProbe
} = require("../rules/livenessProbe.rule");

const {
  checkImageTag
} = require("../rules/imageTag.rule");

const {
  checkCapabilities
} = require("../rules/capabilities.rule");

const RULES = [
  checkPrivilegedContainer,
  checkRootUser,
  checkPrivilegeEscalation,
  checkResourceLimits,
  checkReadinessProbe,
  checkLivenessProbe,
  checkImageTag,
  checkCapabilities
];

const analyzeYAML = async (yamlInput) => {
  if (typeof yamlInput !== "string" || !yamlInput.trim()) {
    throw new Error("YAML input is required");
  }

  let deployment;

  try {
    deployment = yaml.load(yamlInput);
  } catch (error) {
    throw new Error(`Invalid Kubernetes YAML: ${error.message}`);
  }

  if (!deployment || typeof deployment !== "object") {
    throw new Error(
      "Invalid Kubernetes YAML: empty or invalid document"
    );
  }

  if (Array.isArray(deployment)) {
    throw new Error(
      "Unsupported Kubernetes YAML: expected a single Deployment document"
    );
  }

  if (deployment.kind !== "Deployment") {
    throw new Error(
      `Unsupported Kubernetes resource: expected a Deployment, received ${
        deployment.kind || "unknown"
      }`
    );
  }

  if (!deployment.metadata) {
    throw new Error(
      "Invalid Kubernetes Deployment: metadata is required"
    );
  }

  const findings = [];

  for (const rule of RULES) {
    try {
      const ruleFindings = rule(deployment);

      if (Array.isArray(ruleFindings)) {
        findings.push(...ruleFindings);
      }
    } catch (error) {
      throw new Error(
        `Security rule evaluation failed: ${error.message}`
      );
    }
  }

  const riskScore = findings.reduce(
    (total, finding) => {
      const risk = Number(finding.risk);

      return total + (Number.isFinite(risk) ? risk : 0);
    },
    0
  );

  const severityOrder = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  const highestSeverity =
    findings.length === 0
      ? null
      : findings.reduce((highest, finding) => {
          const current = finding.severity || "LOW";

          if (!highest) {
            return current;
          }

          return (severityOrder[current] || 0) >
            (severityOrder[highest] || 0)
            ? current
            : highest;
        }, null);

  return {
    resource: {
      apiVersion: deployment.apiVersion || null,
      kind: deployment.kind,
      name: deployment.metadata.name || null,
      namespace: deployment.metadata.namespace || "default"
    },

    findings,

    findingCount: findings.length,

    highestSeverity,

    riskScore
  };
};

module.exports = {
  analyzeYAML
};