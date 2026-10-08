import { post } from "./api";

import type {
  Pod,
  Deployment,
  KubernetesEvent,
} from "./cluster.api";

/**
 * Request sent to:
 *
 * POST /api/diagnosis
 */
export interface DiagnosisRequest {
  namespace: string;
  podName: string;
  deploymentName?: string;
  failureType?: string;
  yaml?: string | null;
}

/**
 * Finding information associated with the diagnosis.
 */
export interface DiagnosisFinding {
  type: string;
  failureType?: string;

  // Optional security-analysis fields.
  rule_id?: string;
  title?: string;
  severity?: string;
  evidence?: string;
  risk?: number;
}

/**
 * Kubernetes evidence collected by the backend.
 */
export interface DiagnosisEvidence {
  finding: DiagnosisFinding;

  /**
   * Kubernetes configuration/YAML evidence.
   */
  configuration: unknown;

  runtime: {
    /**
     * Actual Pod information collected from Kubernetes.
     */
    podStatus: Pod | null;

    /**
     * Actual Deployment information collected from Kubernetes.
     */
    deploymentStatus: Deployment | null;

    /**
     * Actual Kubernetes events collected from the namespace.
     */
    events: KubernetesEvent[];

    /**
     * Container logs collected from Kubernetes.
     */
    logs: string | null;

    /**
     * Present when Kubernetes log collection failed.
     */
    logError?: string;
  };
}

/**
 * Diagnosis returned by the local LLM.
 *
 * The LLM is supplementary and does not establish
 * Kubernetes security/failure truth.
 */
export type DiagnosisResult =
  | string
  | Record<string, unknown>;

/**
 * LLM execution state.
 *
 * Ollama/Qwen2.5 3B is intentionally optional.
 */
export interface DiagnosisLlmStatus {
  enabled: boolean;

  status:
    | "deferred"
    | "completed";

  message?: string;
}

/**
 * Complete response returned by:
 *
 * POST /api/diagnosis
 */
export interface DiagnosisResponse {
  /**
   * Requested failure type.
   */
  failure: string;

  /**
   * Kubernetes namespace used for evidence collection.
   */
  namespace: string;

  /**
   * Pod used for the diagnosis.
   */
  podName: string;

  /**
   * Deployment used for the diagnosis,
   * if supplied/found.
   */
  deploymentName: string | null;

  /**
   * Exact Kubernetes evidence collected
   * by the backend.
   */
  evidence: DiagnosisEvidence;

  /**
   * Local LLM diagnosis.
   *
   * This is null while LLM diagnosis
   * is deferred.
   */
  diagnosis: DiagnosisResult | null;

  /**
   * Indicates whether local LLM diagnosis
   * was executed.
   */
  llm: DiagnosisLlmStatus;
}

/**
 * Run Kubernetes failure diagnosis.
 *
 * The backend first collects real Kubernetes
 * evidence.
 *
 * Ollama is optional and controlled by the backend.
 */
export function runDiagnosis(
  request: DiagnosisRequest
) {
  return post<DiagnosisResponse>(
    "/api/diagnosis",
    request
  );
}