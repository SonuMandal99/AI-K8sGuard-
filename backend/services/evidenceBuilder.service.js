const kubernetesService = require("./kubernetes.service");

const buildEvidence = async ({
  finding = null,
  yaml = null,
  namespace = null,
  podName = null,
  deploymentName = null,
  includeLogs = true
}) => {
  const evidence = {
    finding,
    configuration: yaml,
    runtime: {
      podStatus: null,
      deploymentStatus: null,
      events: [],
      logs: null
    }
  };

  if (podName) {
    const pods = await kubernetesService.getPods(namespace);

    evidence.runtime.podStatus =
      pods.find((pod) => pod.name === podName) || null;
  }

  if (deploymentName) {
    const deployments =
      await kubernetesService.getDeployments(namespace);

    evidence.runtime.deploymentStatus =
      deployments.find(
        (deployment) => deployment.name === deploymentName
      ) || null;
  }

  if (namespace) {
    evidence.runtime.events =
      await kubernetesService.getEvents(namespace);
  } else {
    evidence.runtime.events =
      await kubernetesService.getEvents();
  }

  if (includeLogs && podName) {
    try {
      const logResult =
        await kubernetesService.getPodLogs(
          namespace,
          podName
        );

      evidence.runtime.logs = logResult.logs;
    } catch (error) {
      evidence.runtime.logs = null;
      evidence.runtime.logError = error.message;
    }
  }

  return evidence;
};

const buildFailureEvidence = async ({
  failureType,
  yaml = null,
  namespace = null,
  podName = null,
  deploymentName = null
}) => {
  return buildEvidence({
    finding: {
      type: "failure",
      failureType
    },
    yaml,
    namespace,
    podName,
    deploymentName,
    includeLogs: true
  });
};

const buildSecurityEvidence = ({
  finding,
  yaml = null
}) => {
  return {
    finding,
    configuration: yaml,
    runtime: null
  };
};

module.exports = {
  buildEvidence,
  buildFailureEvidence,
  buildSecurityEvidence
};