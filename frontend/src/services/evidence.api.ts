import { post } from "./api";

import type {
  Pod,
  Deployment,
  KubernetesEvent,
} from "./cluster.api";

import type { SecurityFinding } from "./analysis.api";

/**
 * Request for building runtime evidence.
 *
 * Backend:
 * POST /api/evidence/build
 */
export interface EvidenceRequest {
  finding: SecurityFinding;
  yaml: string;
  namespace: string;
  podName?: string;
  deploymentName?: string;
  includeLogs?: boolean;
}

/**
 * Evidence returned by the backend Evidence Builder.
 */
export interface EvidenceResponse {
  finding: SecurityFinding;

  /**
   * Original Kubernetes YAML/configuration
   * associated with the finding.
   */
  configuration: unknown;

  runtime: {
    podStatus: Pod | null;

    deploymentStatus: Deployment | null;

    events: KubernetesEvent[];

    logs: string | null;

    logError?: string;
  };
}

/**
 * Build evidence for a verified security finding.
 *
 * Architecture:
 *
 * Security Finding
 *      ↓
 * POST /api/evidence/build
 *      ↓
 * Evidence Builder
 *      ↓
 * Kubernetes API
 *      ├── Pod
 *      ├── Deployment
 *      ├── Events
 *      └── Logs
 *      ↓
 * Structured Evidence
 */
export function buildSecurityEvidence(
  request: EvidenceRequest
) {
  return post<EvidenceResponse>(
    "/api/evidence/build",
    request
  );
}