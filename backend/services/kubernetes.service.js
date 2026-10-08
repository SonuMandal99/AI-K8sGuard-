const {
  coreApi,
  appsApi
} = require("../config/kubernetes");

const getClusterStatus = async () => {
  const versionApi = require("@kubernetes/client-node").KubeConfig;

  try {
    const nodesResponse = await coreApi.listNode();

    const nodes = nodesResponse.items || [];

    return {
      status: "Connected",
      nodeCount: nodes.length,
      nodes: nodes.map((node) => ({
        name: node.metadata?.name || null,
        status:
          node.status?.conditions?.find(
            (condition) => condition.type === "Ready"
          )?.status || "Unknown"
      }))
    };
  } catch (error) {
    throw new Error(
      `Failed to connect to Kubernetes cluster: ${error.message}`
    );
  }
};

const getPods = async (namespace) => {
  try {
    const response = namespace
      ? await coreApi.listNamespacedPod({ namespace })
      : await coreApi.listPodForAllNamespaces();

    return (response.items || []).map((pod) => ({
      name: pod.metadata?.name || null,
      namespace: pod.metadata?.namespace || null,
      phase: pod.status?.phase || null,
      podIP: pod.status?.podIP || null,
      nodeName: pod.spec?.nodeName || null,
      conditions: pod.status?.conditions || [],
      containerStatuses: pod.status?.containerStatuses || []
    }));
  } catch (error) {
    throw new Error(
      `Failed to retrieve pods: ${error.message}`
    );
  }
};

const getDeployments = async (namespace) => {
  try {
    const response = namespace
      ? await appsApi.listNamespacedDeployment({ namespace })
      : await appsApi.listDeploymentForAllNamespaces();

    return (response.items || []).map((deployment) => ({
      name: deployment.metadata?.name || null,
      namespace: deployment.metadata?.namespace || null,
      replicas: deployment.spec?.replicas || 0,
      availableReplicas:
        deployment.status?.availableReplicas || 0,
      readyReplicas:
        deployment.status?.readyReplicas || 0,
      updatedReplicas:
        deployment.status?.updatedReplicas || 0,
      conditions: deployment.status?.conditions || []
    }));
  } catch (error) {
    throw new Error(
      `Failed to retrieve deployments: ${error.message}`
    );
  }
};

const getServices = async (namespace) => {
  try {
    const response = namespace
      ? await coreApi.listNamespacedService({ namespace })
      : await coreApi.listServiceForAllNamespaces();

    return (response.items || []).map((service) => ({
      name: service.metadata?.name || null,
      namespace: service.metadata?.namespace || null,
      type: service.spec?.type || null,
      clusterIP: service.spec?.clusterIP || null,
      ports: service.spec?.ports || [],
      selector: service.spec?.selector || {}
    }));
  } catch (error) {
    throw new Error(
      `Failed to retrieve services: ${error.message}`
    );
  }
};

const getEvents = async (namespace) => {
  try {
    const response = namespace
      ? await coreApi.listNamespacedEvent({ namespace })
      : await coreApi.listEventForAllNamespaces();

    return (response.items || []).map((event) => ({
      name: event.metadata?.name || null,
      namespace: event.metadata?.namespace || null,
      reason: event.reason || null,
      type: event.type || null,
      message: event.message || null,
      involvedObject: {
        kind: event.involvedObject?.kind || null,
        name: event.involvedObject?.name || null,
        namespace: event.involvedObject?.namespace || null
      },
      firstTimestamp: event.firstTimestamp || null,
      lastTimestamp: event.lastTimestamp || null
    }));
  } catch (error) {
    throw new Error(
      `Failed to retrieve Kubernetes events: ${error.message}`
    );
  }
};

const getPodLogs = async (
  namespace,
  podName,
  container
) => {
  if (!podName) {
    throw new Error("Pod name is required");
  }

  const targetNamespace = namespace || "default";

  try {
    const logs = await coreApi.readNamespacedPodLog({
      name: podName,
      namespace: targetNamespace,
      container,
      tailLines: 200
    });

    return {
      podName,
      namespace: targetNamespace,
      container: container || null,
      logs
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve pod logs: ${error.message}`
    );
  }
};

module.exports = {
  getClusterStatus,
  getPods,
  getDeployments,
  getServices,
  getEvents,
  getPodLogs
};