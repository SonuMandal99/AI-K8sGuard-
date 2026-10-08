const kubernetesService = require("../services/kubernetes.service");

const getClusterStatus = async (req, res) => {
  try {
    const result = await kubernetesService.getClusterStatus();

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Failed to retrieve cluster status:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Kubernetes cluster status",
      error: error.message
    });
  }
};

const getPods = async (req, res) => {
  try {
    const { namespace } = req.query;

    const pods = await kubernetesService.getPods(namespace);

    return res.status(200).json({
      success: true,
      data: pods
    });
  } catch (error) {
    console.error("Failed to retrieve pods:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Kubernetes pods",
      error: error.message
    });
  }
};

const getDeployments = async (req, res) => {
  try {
    const { namespace } = req.query;

    const deployments =
      await kubernetesService.getDeployments(namespace);

    return res.status(200).json({
      success: true,
      data: deployments
    });
  } catch (error) {
    console.error("Failed to retrieve deployments:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Kubernetes deployments",
      error: error.message
    });
  }
};

const getServices = async (req, res) => {
  try {
    const { namespace } = req.query;

    const services =
      await kubernetesService.getServices(namespace);

    return res.status(200).json({
      success: true,
      data: services
    });
  } catch (error) {
    console.error("Failed to retrieve services:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Kubernetes services",
      error: error.message
    });
  }
};

const getEvents = async (req, res) => {
  try {
    const { namespace } = req.query;

    const events =
      await kubernetesService.getEvents(namespace);

    return res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error("Failed to retrieve Kubernetes events:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Kubernetes events",
      error: error.message
    });
  }
};

const getPodLogs = async (req, res) => {
  try {
    const { namespace, podName, container } = req.query;

    if (!podName) {
      return res.status(400).json({
        success: false,
        message: "podName is required"
      });
    }

    const logs = await kubernetesService.getPodLogs(
      namespace,
      podName,
      container
    );

    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error("Failed to retrieve pod logs:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Kubernetes pod logs",
      error: error.message
    });
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