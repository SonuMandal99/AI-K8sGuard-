import { get } from "./api";

/*
 * Kubernetes Cluster Status
 *
 * Backend endpoint:
 * GET /api/cluster/status
 *
 * Response:
 * {
 *   status: "Connected",
 *   nodeCount: number,
 *   nodes: [...]
 * }
 */
export interface ClusterNode {
  name: string | null;
  status: string;
}

export interface ClusterStatus {
  status: string;
  nodeCount: number;
  nodes: ClusterNode[];
}

/*
 * Kubernetes Pod
 *
 * Backend endpoint:
 * GET /api/cluster/pods
 */
export interface Pod {
  name: string | null;
  namespace: string | null;
  phase: string | null;
  podIP: string | null;
  nodeName: string | null;
  conditions: KubernetesCondition[];
  containerStatuses: KubernetesContainerStatus[];
}

/*
 * Pod condition
 */
export interface KubernetesCondition {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
  lastProbeTime?: string | null;
  lastTransitionTime?: string | null;
}

/*
 * Container status
 */
export interface KubernetesContainerStatus {
  name?: string;
  ready?: boolean;
  restartCount?: number;
  image?: string;
  imageID?: string;
  state?: {
    waiting?: {
      reason?: string;
      message?: string;
    };
    running?: {
      startedAt?: string;
    };
    terminated?: {
      reason?: string;
      message?: string;
      exitCode?: number;
      startedAt?: string;
      finishedAt?: string;
    };
  };
}

/*
 * Kubernetes Deployment
 *
 * Backend endpoint:
 * GET /api/cluster/deployments
 */
export interface Deployment {
  name: string | null;
  namespace: string | null;
  replicas: number;
  availableReplicas: number;
  readyReplicas: number;
  updatedReplicas: number;
  conditions: KubernetesDeploymentCondition[];
}

/*
 * Deployment condition
 */
export interface KubernetesDeploymentCondition {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
  lastUpdateTime?: string;
  lastTransitionTime?: string;
}

/*
 * Kubernetes Service
 *
 * Backend endpoint:
 * GET /api/cluster/services
 */
export interface Service {
  name: string | null;
  namespace: string | null;
  type: string | null;
  clusterIP: string | null;
  ports: KubernetesServicePort[];
  selector: Record<string, string>;
}

/*
 * Service port
 */
export interface KubernetesServicePort {
  name?: string;
  protocol?: string;
  port?: number;
  targetPort?: number | string;
  nodePort?: number;
}

/*
 * Kubernetes Event
 *
 * Backend endpoint:
 * GET /api/cluster/events
 */
export interface KubernetesEvent {
  name: string | null;
  namespace: string | null;
  reason: string | null;
  type: string | null;
  message: string | null;
  involvedObject: {
    kind: string | null;
    name: string | null;
    namespace: string | null;
  };
  firstTimestamp: string | null;
  lastTimestamp: string | null;
}

/*
 * Kubernetes Pod Logs
 *
 * Backend endpoint:
 * GET /api/cluster/logs
 */
export interface ClusterLogsResponse {
  podName: string;
  namespace: string;
  container: string | null;
  logs: string;
}

/*
 * Get overall Kubernetes cluster status
 */
export function getClusterStatus() {
  return get<ClusterStatus>("/api/cluster/status");
}

/*
 * Get Pods
 *
 * Optional namespace:
 * GET /api/cluster/pods
 * GET /api/cluster/pods?namespace=default
 */
export function getPods(namespace?: string) {
  const endpoint = namespace
    ? `/api/cluster/pods?namespace=${encodeURIComponent(namespace)}`
    : "/api/cluster/pods";

  return get<Pod[]>(endpoint);
}

/*
 * Get Deployments
 *
 * Optional namespace:
 * GET /api/cluster/deployments
 * GET /api/cluster/deployments?namespace=default
 */
export function getDeployments(namespace?: string) {
  const endpoint = namespace
    ? `/api/cluster/deployments?namespace=${encodeURIComponent(namespace)}`
    : "/api/cluster/deployments";

  return get<Deployment[]>(endpoint);
}

/*
 * Get Services
 *
 * Optional namespace:
 * GET /api/cluster/services
 * GET /api/cluster/services?namespace=default
 */
export function getServices(namespace?: string) {
  const endpoint = namespace
    ? `/api/cluster/services?namespace=${encodeURIComponent(namespace)}`
    : "/api/cluster/services";

  return get<Service[]>(endpoint);
}

/*
 * Get Kubernetes Events
 *
 * Optional namespace:
 * GET /api/cluster/events
 * GET /api/cluster/events?namespace=default
 */
export function getEvents(namespace?: string) {
  const endpoint = namespace
    ? `/api/cluster/events?namespace=${encodeURIComponent(namespace)}`
    : "/api/cluster/events";

  return get<KubernetesEvent[]>(endpoint);
}

/*
 * Get Pod Logs
 *
 * GET /api/cluster/logs?namespace=...&podName=...
 */
export function getPodLogs(
  namespace: string,
  podName: string,
  container?: string
) {
  const params = new URLSearchParams({
    namespace,
    podName,
  });

  if (container) {
    params.set("container", container);
  }

  return get<ClusterLogsResponse>(
    `/api/cluster/logs?${params.toString()}`
  );
}