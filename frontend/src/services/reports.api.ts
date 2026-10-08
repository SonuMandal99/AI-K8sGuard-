import { get } from "./api";

export type AnalysisType = "yaml" | "security" | "failure";

export interface ReportFinding {
  id?: string;
  label?: string;
  severity?: string;
  risk?: number | string;
  description?: string;

  [key: string]: unknown;
}

export interface ReportPerformance {
  latency: number | null;
  cpuUsage: number | null;
  memoryUsage: number | null;
}

export interface ReportEvidence {
  [key: string]: unknown;
}

export interface Report {
  _id: string;
  analysisId: string;
  analysisType: AnalysisType;
  findings: ReportFinding[];
  severity: string | null;
  risk: number;
  evidence: ReportEvidence;
  explanation: string | null;
  cause: string | null;
  recommendation: string | null;
  llmResponse: unknown;
  diagnosis: unknown;
  performance: ReportPerformance;
  createdAt: string;
  updatedAt: string;
}

export function getReports() {
  return get<Report[]>("/api/reports");
}

export function getReportDetail(id: string) {
  return get<Report>(
    `/api/reports/${encodeURIComponent(id)}`
  );
}