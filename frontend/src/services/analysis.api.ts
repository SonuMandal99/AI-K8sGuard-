import { post } from "./api";

/**
 * Kubernetes resource returned by the backend.
 */
export interface AnalysisResource {
  apiVersion: string | null;
  kind: string;
  name: string | null;
  namespace: string | null;
}

/**
 * Security finding returned by the deterministic
 * Kubernetes security rule engine.
 *
 * This matches the backend rule output:
 * rule_id, title, severity, evidence, risk
 */
export interface SecurityFinding {
  rule_id: string;
  title: string;
  severity: string;
  evidence: string;
  risk: number;
}

/**
 * Response returned by:
 *
 * POST /api/analyze/yaml
 */
export interface YamlAnalysisResponse {
  resource: AnalysisResource;
  findings: SecurityFinding[];
  findingCount: number;
  highestSeverity: string | null;
  riskScore: number;
}

/**
 * Analyze Kubernetes Deployment YAML.
 *
 * Frontend
 *    ↓
 * POST /api/analyze/yaml
 *    ↓
 * Node/Express
 *    ↓
 * yamlAnalyzer.service.js
 *    ↓
 * Deterministic security rules
 */
export function analyzeYaml(yaml: string) {
  return post<YamlAnalysisResponse>(
    "/api/analyze/yaml",
    { yaml }
  );
}