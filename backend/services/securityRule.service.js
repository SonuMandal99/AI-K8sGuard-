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

const securityRules = [
  checkPrivilegedContainer,
  checkRootUser,
  checkPrivilegeEscalation,
  checkResourceLimits,
  checkReadinessProbe,
  checkLivenessProbe,
  checkImageTag,
  checkCapabilities
];

const runSecurityRules = (deployment) => {
  if (!deployment || typeof deployment !== "object") {
    throw new Error("Deployment object is required");
  }

  const findings = [];

  for (const rule of securityRules) {
    try {
      const ruleFindings = rule(deployment);

      if (Array.isArray(ruleFindings)) {
        findings.push(...ruleFindings);
      }
    } catch (error) {
      console.error(
        `Security rule execution failed: ${error.message}`
      );
    }
  }

  return findings;
};

const getRuleCount = () => {
  return securityRules.length;
};

module.exports = {
  runSecurityRules,
  getRuleCount
};