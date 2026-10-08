const k8s = require("@kubernetes/client-node");

const kc = new k8s.KubeConfig();

// Load Kubernetes configuration
// Uses KUBECONFIG when provided,
// otherwise uses the in-cluster configuration.
if (process.env.KUBECONFIG) {
  kc.loadFromFile(process.env.KUBECONFIG);
} else {
  try {
    kc.loadFromDefault();
  } catch (error) {
    console.error("Failed to load Kubernetes configuration:");
    console.error(error.message);
    process.exit(1);
  }
}

// Kubernetes API clients
const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const appsApi = kc.makeApiClient(k8s.AppsV1Api);

module.exports = {
  kc,
  coreApi,
  appsApi
};