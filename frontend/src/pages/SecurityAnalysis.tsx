import { useState } from "react";

import {
  Panel,
  InfoRow,
  SeverityBadge,
  Chip,
  LoadingState,
  ErrorBanner,
  LLMSection,
  C,
} from "../components/shared";

import {
  analyzeYaml,
  type YamlAnalysisResponse,
  type SecurityFinding,
} from "../services/analysis.api";

import {
  buildSecurityEvidence,
  type EvidenceResponse,
} from "../services/evidence.api";

type ViewMode = "idle" | "loading" | "done" | "error";

interface SecurityAnalysisProps {
  yaml?: string;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
};

function getSeverityColor(severity: string) {
  return (
    (C as Record<string, string>)[severity.toLowerCase()] ||
    C.sub
  );
}

function getSeverityBackground(severity: string) {
  return (
    (C as Record<string, string>)[
      `${severity.toLowerCase()}Bg`
    ] || C.bg
  );
}

function getSeverityBorder(severity: string) {
  return (
    (C as Record<string, string>)[
      `${severity.toLowerCase()}Border`
    ] || C.border
  );
}

function getHighestSeverity(findings: SecurityFinding[]): string {
  if (!findings.length) {
    return "NONE";
  }

  return [...findings].sort(
    (a, b) =>
      (SEVERITY_ORDER[b.severity] ?? 0) -
      (SEVERITY_ORDER[a.severity] ?? 0)
  )[0].severity;
}

export default function SecurityAnalysis({
  yaml = "",
}: SecurityAnalysisProps) {
  const [mode, setMode] =
    useState<ViewMode>("idle");

  const [result, setResult] =
    useState<YamlAnalysisResponse | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [selectedFinding, setSelectedFinding] =
    useState<SecurityFinding | null>(null);

  /*
   * STEP 2 — Evidence Construction
   */
  const [evidence, setEvidence] =
    useState<EvidenceResponse | null>(null);

  const [evidenceLoading, setEvidenceLoading] =
    useState(false);

  const [evidenceError, setEvidenceError] =
    useState<string | null>(null);

  const [llmOpen, setLlmOpen] =
    useState(true);

  /*
   * Build Kubernetes runtime evidence
   * for a verified deterministic finding.
   */
  async function buildEvidenceForFinding(
    finding: SecurityFinding,
    analysisResult?: YamlAnalysisResponse
  ) {
    if (!yaml.trim()) {
      setEvidenceError(
        "No Kubernetes YAML is available for evidence construction."
      );
      return;
    }

    setEvidenceLoading(true);
    setEvidenceError(null);
    setEvidence(null);

    const currentResult =
      analysisResult || result;

    const namespace =
      currentResult?.resource.namespace ||
      "default";

    const deploymentName =
      currentResult?.resource.name ||
      undefined;

    try {
      const response =
        await buildSecurityEvidence({
          finding,
          yaml,
          namespace,
          deploymentName,
          includeLogs: true,
        });

      if (response.error) {
        setEvidenceError(response.error);
        return;
      }

      if (!response.data) {
        setEvidenceError(
          "Evidence Builder returned an empty response."
        );
        return;
      }

      setEvidence(response.data);
    } catch (err) {
      setEvidenceError(
        err instanceof Error
          ? err.message
          : "Failed to build Kubernetes evidence."
      );
    } finally {
      setEvidenceLoading(false);
    }
  }

  /*
   * STEP 1
   *
   * Run deterministic security analysis.
   *
   * STEP 2
   *
   * Automatically build evidence for
   * the first verified finding.
   */
  async function runAnalysis() {
    if (!yaml.trim()) {
      setError(
        "No Kubernetes YAML was provided."
      );

      setMode("error");
      return;
    }

    setMode("loading");
    setError(null);
    setResult(null);
    setSelectedFinding(null);

    setEvidence(null);
    setEvidenceError(null);
    setEvidenceLoading(false);

    try {
      const response =
        await analyzeYaml(yaml);

      if (response.error) {
        setError(response.error);
        setMode("error");
        return;
      }

      if (!response.data) {
        setError(
          "Backend returned an empty analysis result."
        );

        setMode("error");
        return;
      }

      setResult(response.data);

      /*
       * If deterministic rules detected
       * a security violation, select the
       * first verified finding and build
       * runtime evidence.
       */
      if (
        response.data.findings.length > 0
      ) {
        const firstFinding =
          response.data.findings[0];

        setSelectedFinding(
          firstFinding
        );

        await buildEvidenceForFinding(
          firstFinding,
          response.data
        );
      }

      setMode("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete security analysis."
      );

      setMode("error");
    }
  }

  const findings =
    result?.findings ?? [];

  /*
   * Backend value is authoritative.
   */
  const highestSeverity =
    result?.highestSeverity ||
    getHighestSeverity(findings);

  const selectedRule =
    selectedFinding;

  const isSecure =
    result !== null &&
    findings.length === 0;

  const selectedSeverity =
    selectedRule?.severity || "NONE";

  const selectedSeverityColor =
    getSeverityColor(
      selectedSeverity
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxWidth: 960,
      }}
    >
      {/* ===================================== */}
      {/* TITLE */}
      {/* ===================================== */}

      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: C.text,
            letterSpacing: "-0.02em",
          }}
        >
          Security Analysis
        </h2>

        <p
          style={{
            margin: "2px 0 0",
            fontSize: 12,
            color: C.muted,
          }}
        >
          Deterministic Kubernetes security
          analysis with runtime evidence
          construction
        </p>
      </div>

      {/* ===================================== */}
      {/* AUTHORITY NOTICE */}
      {/* ===================================== */}

      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 6,
          padding: "9px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Chip
          label="AUTHORITATIVE"
          color="#166534"
          bg="#dcfce7"
          border="#86efac"
        />

        <span
          style={{
            fontSize: 12,
            color: "#166534",
          }}
        >
          Security decisions are determined
          by the{" "}
          <strong>
            deterministic rule engine
          </strong>
          . LLM output is supplementary
          context only and does not override
          rule findings.
        </span>
      </div>

      {/* ===================================== */}
      {/* ANALYSIS SOURCE */}
      {/* ===================================== */}

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: C.sub,
              marginBottom: 4,
            }}
          >
            Kubernetes Manifest
          </div>

          <div
            style={{
              fontSize: 11,
              color: yaml.trim()
                ? C.text
                : C.muted,
              fontFamily:
                "var(--font-mono)",
            }}
          >
            {yaml.trim()
              ? "YAML manifest ready for analysis"
              : "No YAML manifest provided"}
          </div>
        </div>

        <button
          onClick={runAnalysis}
          disabled={
            !yaml.trim() ||
            mode === "loading"
          }
          style={{
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: 600,
            color:
              !yaml.trim() ||
              mode === "loading"
                ? C.muted
                : C.accent,
            background:
              !yaml.trim() ||
              mode === "loading"
                ? C.bg
                : C.accentBg,
            border: `1px solid ${
              !yaml.trim() ||
              mode === "loading"
                ? C.border
                : `${C.accent}44`
            }`,
            borderRadius: 4,
            cursor:
              !yaml.trim() ||
              mode === "loading"
                ? "not-allowed"
                : "pointer",
          }}
        >
          {mode === "loading"
            ? "Analyzing..."
            : "Run Security Analysis"}
        </button>
      </div>

      {/* ===================================== */}
      {/* LOADING */}
      {/* ===================================== */}

      {mode === "loading" && (
        <LoadingState
          message="Analyzing Kubernetes configuration…"
          sub="Running deterministic security rules against the supplied manifest"
        />
      )}

      {/* ===================================== */}
      {/* ERROR */}
      {/* ===================================== */}

      {mode === "error" && (
        <ErrorBanner
          title="Security Analysis Failed"
          message={
            error ||
            "The backend could not analyze the Kubernetes manifest."
          }
          code="ANALYSIS_ERROR"
        />
      )}

      {/* ===================================== */}
      {/* RESULTS */}
      {/* ===================================== */}

      {mode === "done" &&
        result && (
          <>
            {/* ================================= */}
            {/* SECURE BASELINE */}
            {/* ================================= */}

            {isSecure && (
              <div
                style={{
                  background: "#f0fdf4",
                  border:
                    "1px solid #86efac",
                  borderRadius: 8,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Chip
                  label="SECURE BASELINE"
                  color="#166534"
                  bg="#dcfce7"
                  border="#86efac"
                />

                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#166534",
                  }}
                >
                  No security violations
                  detected
                </span>
              </div>
            )}

            {/* ================================= */}
            {/* RESOURCE INFORMATION */}
            {/* ================================= */}

            <Panel
              title="Analyzed Resource"
              badge="MANIFEST"
              badgeColor={C.accent}
              badgeBg={C.accentBg}
            >
              <InfoRow
                label="Kind"
                value={
                  result.resource.kind
                }
                mono
              />

              <InfoRow
                label="Name"
                value={
                  result.resource.name ||
                  "Unknown"
                }
                mono
              />

              <InfoRow
                label="Namespace"
                value={
                  result.resource.namespace ||
                  "default"
                }
                mono
                last
              />
            </Panel>

            {/* ================================= */}
            {/* RISK ASSESSMENT */}
            {/* ================================= */}

            <Panel
              title="Risk Assessment"
              badge="DETERMINISTIC"
              badgeColor={C.accent}
              badgeBg={C.accentBg}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                }}
              >
                {[
                  {
                    label: "Risk Score",
                    value: `${result.riskScore} points`,
                    color:
                      result.riskScore === 0
                        ? C.low
                        : getSeverityColor(
                            highestSeverity
                          ),
                  },
                  {
                    label:
                      "Highest Severity",
                    value:
                      highestSeverity,
                    color:
                      highestSeverity ===
                      "NONE"
                        ? C.sub
                        : getSeverityColor(
                            highestSeverity
                          ),
                  },
                  {
                    label:
                      "Finding Count",
                    value: `${result.findingCount} ${
                      result.findingCount === 1
                        ? "finding"
                        : "findings"
                    }`,
                    color: C.text,
                  },
                ].map(
                  (item, index) => (
                    <div
                      key={item.label}
                      style={{
                        padding:
                          "14px 16px",
                        borderRight:
                          index < 2
                            ? `1px solid ${C.border}`
                            : undefined,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          marginBottom: 5,
                        }}
                      >
                        {item.label}
                      </div>

                      <div
                        style={{
                          fontFamily:
                            "var(--font-mono)",
                          fontSize: 18,
                          fontWeight: 700,
                          color:
                            item.color,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  )
                )}
              </div>
            </Panel>

            {/* ================================= */}
            {/* RULE ENGINE RESULTS */}
            {/* ================================= */}

            <Panel
              title="Rule Engine Results"
              badge="DETERMINISTIC ENGINE"
              badgeColor={C.low}
              badgeBg="#f0fdf4"
            >
              {findings.length === 0 ? (
                <div
                  style={{
                    padding:
                      "14px 16px",
                    fontSize: 12,
                    color: C.low,
                  }}
                >
                  ✓ All configured security
                  rules passed.
                </div>
              ) : (
                <div
                  style={{
                    padding:
                      "14px 16px",
                    display: "flex",
                    flexDirection:
                      "column",
                    gap: 8,
                  }}
                >
                  {findings.map(
                    (finding) => {
                      const active =
                        selectedFinding?.rule_id ===
                        finding.rule_id;

                      const color =
                        getSeverityColor(
                          finding.severity
                        );

                      return (
                        <button
                          key={
                            finding.rule_id
                          }
                          onClick={() => {
                            setSelectedFinding(
                              finding
                            );

                            buildEvidenceForFinding(
                              finding
                            );
                          }}
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 10,
                            width: "100%",
                            padding:
                              "7px 8px",
                            textAlign:
                              "left",
                            background:
                              active
                                ? getSeverityBackground(
                                    finding.severity
                                  )
                                : "transparent",
                            border:
                              active
                                ? `1px solid ${getSeverityBorder(
                                    finding.severity
                                  )}`
                                : "1px solid transparent",
                            borderRadius: 4,
                            cursor:
                              "pointer",
                          }}
                        >
                          <span
                            style={{
                              fontFamily:
                                "var(--font-mono)",
                              fontSize: 11,
                              fontWeight:
                                600,
                              color,
                              minWidth: 78,
                            }}
                          >
                            {
                              finding.rule_id
                            }
                          </span>

                          <span
                            style={{
                              fontSize: 11,
                              color: C.sub,
                              flex: 1,
                            }}
                          >
                            {
                              finding.title
                            }
                          </span>

                          <span
                            style={{
                              fontFamily:
                                "var(--font-mono)",
                              fontSize: 10,
                              fontWeight:
                                600,
                              color,
                            }}
                          >
                            {
                              finding.severity
                            }
                          </span>

                          <span
                            style={{
                              fontFamily:
                                "var(--font-mono)",
                              fontSize: 10,
                              color: C.sub,
                            }}
                          >
                            Risk{" "}
                            {
                              finding.risk
                            }
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </Panel>

            {/* ================================= */}
            {/* SELECTED FINDING */}
            {/* ================================= */}

            {selectedRule && (
              <>
                <Panel
                  title={`Finding: ${selectedRule.rule_id}`}
                  badge="VERIFIED FINDING"
                  badgeColor={C.low}
                  badgeBg="#f0fdf4"
                >
                  <div
                    style={{
                      padding:
                        "11px 14px",
                      borderBottom:
                        `1px solid ${C.border}`,
                      background:
                        getSeverityBackground(
                          selectedRule.severity
                        ),
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontFamily:
                            "var(--font-mono)",
                          fontSize: 13,
                          fontWeight:
                            700,
                          color:
                            selectedSeverityColor,
                        }}
                      >
                        {
                          selectedRule.rule_id
                        }
                      </span>

                      <span
                        style={{
                          fontSize: 13,
                          fontWeight:
                            600,
                          color: C.text,
                        }}
                      >
                        {
                          selectedRule.title
                        }
                      </span>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 8,
                      }}
                    >
                      <SeverityBadge
                        severity={
                          selectedRule.severity as any
                        }
                      />

                      <span
                        style={{
                          fontFamily:
                            "var(--font-mono)",
                          fontSize: 11,
                          fontWeight:
                            700,
                          color:
                            selectedSeverityColor,
                        }}
                      >
                        Risk{" "}
                        {
                          selectedRule.risk
                        }
                      </span>
                    </div>
                  </div>

                  <InfoRow
                    label="Rule ID"
                    value={
                      selectedRule.rule_id
                    }
                    mono
                  />

                  <InfoRow
                    label="Finding Type"
                    value={
                      selectedRule.title
                    }
                  />

                  <InfoRow
                    label="Severity"
                    value={
                      selectedRule.severity
                    }
                    mono
                    color={
                      selectedSeverityColor
                    }
                  />

                  <InfoRow
                    label="Risk Score"
                    value={`${selectedRule.risk} points`}
                    mono
                    color={
                      selectedSeverityColor
                    }
                  />

                  <InfoRow
                    label="Resource"
                    value={
                      result.resource
                        .name ||
                      "Unknown resource"
                    }
                    mono
                  />

                  <InfoRow
                    label="Namespace"
                    value={
                      result.resource
                        .namespace ||
                      "default"
                    }
                    mono
                  />

                  <InfoRow
                    label="Evidence"
                    value={
                      <span
                        style={{
                          fontFamily:
                            "var(--font-mono)",
                          fontSize: 11,
                          fontWeight:
                            600,
                          color:
                            selectedSeverityColor,
                          background:
                            getSeverityBackground(
                              selectedRule.severity
                            ),
                          border:
                            `1px solid ${getSeverityBorder(
                              selectedRule.severity
                            )}`,
                          borderRadius: 3,
                          padding:
                            "1px 6px",
                        }}
                      >
                        {selectedRule.evidence ||
                          "No additional evidence was returned by the deterministic rule engine."}
                      </span>
                    }
                  />

                  <InfoRow
                    label="Source"
                    value={
                      <Chip
                        label="DETERMINISTIC RULE ENGINE"
                        color={C.low}
                        bg="#f0fdf4"
                        border="#86efac"
                      />
                    }
                    last
                  />
                </Panel>

                {/* ================================= */}
                {/* RUNTIME EVIDENCE */}
                {/* ================================= */}

                <Panel
                  title="Runtime Evidence"
                  badge="KUBERNETES"
                  badgeColor={C.accent}
                  badgeBg={C.accentBg}
                >
                  {evidenceLoading && (
                    <LoadingState
                      message="Building Kubernetes evidence…"
                      sub="Collecting Pod status, Deployment status, Events, and logs"
                    />
                  )}

                  {!evidenceLoading &&
                    evidenceError && (
                      <ErrorBanner
                        title="Evidence Construction Failed"
                        message={
                          evidenceError
                        }
                        code="EVIDENCE_ERROR"
                      />
                    )}

                  {!evidenceLoading &&
                    !evidenceError &&
                    !evidence && (
                      <div
                        style={{
                          padding:
                            "14px 16px",
                          fontSize: 12,
                          color: C.muted,
                        }}
                      >
                        Select a security
                        finding to build
                        its Kubernetes
                        runtime evidence.
                      </div>
                    )}

                  {!evidenceLoading &&
                    !evidenceError &&
                    evidence && (
                      <>
                        <InfoRow
                          label="Finding"
                          value={
                            evidence
                              .finding
                              .title
                          }
                        />

                        <InfoRow
                          label="Rule"
                          value={
                            evidence
                              .finding
                              .rule_id
                          }
                          mono
                        />

                        <InfoRow
                          label="Pod Status"
                          value={
                            evidence.runtime
                              .podStatus
                              ? `${
                                  evidence
                                    .runtime
                                    .podStatus
                                    .name ||
                                  "Unknown"
                                } — ${
                                  evidence
                                    .runtime
                                    .podStatus
                                    .phase ||
                                  "Unknown"
                                }`
                              : "No Pod found"
                          }
                        />

                        <InfoRow
                          label="Deployment Status"
                          value={
                            evidence.runtime
                              .deploymentStatus
                              ? `${
                                  evidence
                                    .runtime
                                    .deploymentStatus
                                    .name ||
                                  "Unknown"
                                } — ${
                                  evidence
                                    .runtime
                                    .deploymentStatus
                                    .readyReplicas ??
                                  0
                                }/${
                                  evidence
                                    .runtime
                                    .deploymentStatus
                                    .replicas ??
                                  0
                                } ready`
                              : "No Deployment found"
                          }
                        />

                        <InfoRow
                          label="Events"
                          value={`${evidence.runtime.events.length} Kubernetes events collected`}
                        />

                        <InfoRow
                          label="Logs"
                          value={
                            evidence
                              .runtime
                              .logs
                              ? `${evidence.runtime.logs.length} characters collected`
                              : "No logs collected"
                          }
                        />

                        {evidence.runtime
                          .logError && (
                          <InfoRow
                            label="Log Collection"
                            value={
                              evidence
                                .runtime
                                .logError
                            }
                          />
                        )}

                        <InfoRow
                          label="Configuration"
                          value={
                            evidence.configuration
                              ? "YAML/configuration evidence collected"
                              : "No configuration evidence"
                          }
                          last
                        />
                      </>
                    )}
                </Panel>

                {/* ================================= */}
                {/* LLM — DEFERRED */}
                {/* ================================= */}

                <Panel
                  title="Local LLM Interpretation"
                  badge="DEFERRED"
                  badgeColor={C.amber}
                  badgeBg={C.amberBg}
                >
                  <div
                    style={{
                      padding:
                        "10px 14px",
                      fontSize: 12,
                      color: C.sub,
                      lineHeight: 1.6,
                      borderBottom:
                        `1px solid ${C.border}`,
                    }}
                  >
                    Ollama / Qwen2.5 3B
                    is not enabled yet.
                    Therefore, this
                    analysis does not
                    generate an LLM
                    interpretation.
                  </div>

                  <button
                    onClick={() =>
                      setLlmOpen(
                        (value) => !value
                      )
                    }
                    style={{
                      display:
                        "flex",
                      width: "100%",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      padding:
                        "9px 14px",
                      background:
                        "transparent",
                      border: "none",
                      borderBottom:
                        llmOpen
                          ? `1px solid ${C.border}`
                          : undefined,
                      cursor:
                        "pointer",
                      fontSize: 12,
                      fontWeight: 500,
                      color: C.sub,
                    }}
                  >
                    <span>
                      LLM Interpretation
                      (Deferred)
                    </span>

                    <span
                      style={{
                        fontFamily:
                          "var(--font-mono)",
                        fontSize: 11,
                      }}
                    >
                      {llmOpen
                        ? "▲"
                        : "▼"}
                    </span>
                  </button>

                  {llmOpen && (
                    <div>
                      <LLMSection label="Rule Evidence">
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: C.text,
                            lineHeight: 1.65,
                          }}
                        >
                          {
                            selectedRule.evidence
                          }
                        </p>
                      </LLMSection>

                      <LLMSection label="Finding">
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: C.text,
                            lineHeight: 1.65,
                          }}
                        >
                          {
                            selectedRule.title
                          }
                        </p>
                      </LLMSection>

                      <LLMSection label="Risk">
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: C.text,
                            lineHeight: 1.65,
                          }}
                        >
                          Deterministic risk
                          score:{" "}
                          <strong>
                            {
                              selectedRule.risk
                            }{" "}
                            points
                          </strong>
                        </p>
                      </LLMSection>

                      <LLMSection label="Status">
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: C.text,
                            lineHeight: 1.65,
                          }}
                        >
                          LLM diagnosis is
                          deferred until
                          Ollama /
                          Qwen2.5 3B is
                          configured.
                          No LLM output is
                          being fabricated.
                        </p>
                      </LLMSection>
                    </div>
                  )}
                </Panel>
              </>
            )}
          </>
        )}
    </div>
  );
}