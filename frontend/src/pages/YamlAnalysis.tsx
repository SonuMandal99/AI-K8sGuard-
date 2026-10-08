import { useEffect, useState } from "react";
import {
  SeverityBadge,
  Panel,
  InfoRow,
  Chip,
  EmptyState,
  ErrorBanner,
  C,
} from "../components/shared";

import {
  analyzeYaml,
  type YamlAnalysisResponse,
  type SecurityFinding,
} from "../services/analysis.api";

const EXAMPLE_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: privileged-container-test
  namespace: ai-k8sguard
  labels:
    app: test
    purpose: security-research
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
        - name: nginx
          image: nginx:1.27.1
          ports:
            - containerPort: 80
          securityContext:
            privileged: true
            allowPrivilegeEscalation: true
            runAsUser: 0
          resources:
            requests:
              memory: "64Mi"
              cpu: "250m"
            limits:
              memory: "128Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /
              port: 80
          livenessProbe:
            httpGet:
              path: /
              port: 80`;

const SECURE_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-baseline
  namespace: ai-k8sguard
spec:
  replicas: 1
  selector:
    matchLabels:
      app: secure-baseline
  template:
    metadata:
      labels:
        app: secure-baseline
    spec:
      containers:
        - name: app
          image: myapp:1.2.3
          resources:
            requests:
              memory: "64Mi"
              cpu: "250m"
            limits:
              memory: "128Mi"
              cpu: "500m"
          securityContext:
            privileged: false
            runAsNonRoot: true
            runAsUser: 1000
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10`;

const INVALID_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: bad-yaml
spec:
  replicas: 1
   selector:
    matchLabels:
      app: bad`;

type AnalysisState =
  | "idle"
  | "loading"
  | "done"
  | "error";

const PIPELINE_STEPS = [
  { id: "yaml", label: "YAML" },
  { id: "parser", label: "Parser" },
  { id: "rules", label: "Security Rules" },
  { id: "findings", label: "Findings" },
  { id: "risk", label: "Risk Assessment" },
];

interface YamlAnalysisProps {
  onYamlChange?: (yaml: string) => void;
  onOpenSecurity?: () => void;
}

function highlightYaml(line: string): React.ReactNode {
  const trimmed = line.trimStart();
  const indent = line.length - trimmed.length;
  const pad = " ".repeat(indent);

  if (trimmed.startsWith("#")) {
    return (
      <span style={{ color: "#6b7280" }}>
        {line}
      </span>
    );
  }

  const kvMatch = trimmed.match(/^([^:]+):\s*(.*)$/);

  if (kvMatch) {
    const key = kvMatch[1];
    const val = kvMatch[2];

    let valNode: React.ReactNode = null;

    if (val === "true" || val === "false") {
      valNode = (
        <span
          style={{
            color: "#dc2626",
            fontWeight: 600,
          }}
        >
          {val}
        </span>
      );
    } else if (val === "0" || /^\d+$/.test(val)) {
      valNode = (
        <span style={{ color: "#d97706" }}>
          {val}
        </span>
      );
    } else if (
      val.startsWith('"') ||
      val.startsWith("'")
    ) {
      valNode = (
        <span style={{ color: "#16a34a" }}>
          {val}
        </span>
      );
    } else if (val !== "") {
      valNode = (
        <span style={{ color: "#c8d3e0" }}>
          {val}
        </span>
      );
    }

    return (
      <span>
        {pad}

        <span style={{ color: "#93c5fd" }}>
          {key}
        </span>

        <span style={{ color: "#6b7280" }}>
          :
        </span>

        {val !== "" ? (
          <span> {valNode}</span>
        ) : null}
      </span>
    );
  }

  if (trimmed.startsWith("- ")) {
    return (
      <span>
        {pad}

        <span style={{ color: "#6b7280" }}>
          -{" "}
        </span>

        <span style={{ color: "#c8d3e0" }}>
          {trimmed.slice(2)}
        </span>
      </span>
    );
  }

  return (
    <span style={{ color: "#c8d3e0" }}>
      {line}
    </span>
  );
}

function getSeverityColor(severity: string) {
  return (
    (C as Record<string, string>)[
      severity.toLowerCase()
    ] || C.sub
  );
}

function getSeverityBackground(severity: string) {
  return (
    (C as Record<string, string>)[
      `${severity.toLowerCase()}Bg`
    ] || C.bg
  );
}

export default function YamlAnalysis({
  onYamlChange,
  onOpenSecurity,
}: YamlAnalysisProps) {
  const [yaml, setYaml] = useState(EXAMPLE_YAML);

  const [state, setState] =
    useState<AnalysisState>("idle");

  const [activeStep, setActiveStep] =
    useState(-1);

  const [result, setResult] =
    useState<YamlAnalysisResponse | null>(null);

  const [selectedFinding, setSelectedFinding] =
    useState<SecurityFinding | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Keep the YAML Analysis editor synchronized
   * with the YAML state stored in App.tsx.
   *
   * This allows:
   *
   * YAML Analysis
   *      ↓
   * App shared YAML state
   *      ↓
   * Security Analysis
   */
  useEffect(() => {
    onYamlChange?.(yaml);
  }, [yaml, onYamlChange]);

  const showResults = state === "done";

  const lines = yaml.split("\n");

  async function runAnalysis() {
    if (!yaml.trim() || state === "loading") {
      return;
    }

    setState("loading");
    setActiveStep(0);
    setResult(null);
    setSelectedFinding(null);
    setError(null);

    try {
      /*
       * Real backend request:
       *
       * React
       *   ↓
       * analysis.api.ts
       *   ↓
       * POST /api/analyze/yaml
       *   ↓
       * Node/Express
       *   ↓
       * yamlAnalyzer.service.js
       *   ↓
       * Deterministic Security Rules
       */

      setActiveStep(1);

      const response = await analyzeYaml(yaml);

      if (response.error) {
        setError(response.error);
        setState("error");
        setActiveStep(-1);
        return;
      }

      if (!response.data) {
        setError(
          "The backend returned an empty analysis result."
        );
        setState("error");
        setActiveStep(-1);
        return;
      }

      setActiveStep(2);
      setActiveStep(3);
      setActiveStep(4);

      setResult(response.data);

      if (response.data.findings.length > 0) {
        setSelectedFinding(
          response.data.findings[0]
        );
      }

      setState("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete YAML analysis."
      );

      setState("error");
      setActiveStep(-1);
    }
  }

  function handleAnalyze() {
    runAnalysis();
  }

  function resetAnalysis() {
    setResult(null);
    setSelectedFinding(null);
    setError(null);
    setState("idle");
    setActiveStep(-1);
  }

  function handleLoadExample() {
    setYaml(EXAMPLE_YAML);
    resetAnalysis();
  }

  function handleSecureBaseline() {
    setYaml(SECURE_YAML);
    resetAnalysis();
  }

  function handleInvalidYaml() {
    setYaml(INVALID_YAML);
    resetAnalysis();
  }

  function handleClear() {
    setYaml("");
    resetAnalysis();
  }

  const findings = result?.findings ?? [];

  const primaryFinding =
    selectedFinding ??
    findings[0] ??
    null;

  const isBaseline =
    showResults &&
    findings.length === 0;

  /*
   * The backend is authoritative for severity.
   * No local severity calculation is used.
   */
  const highestSeverity =
    result?.highestSeverity ||
    (findings.length > 0
      ? findings[0].severity
      : "NONE");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        height: "100%",
        maxWidth: 1200,
      }}
    >
      {/* Title */}
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
          YAML Analysis
        </h2>

        <p
          style={{
            margin: "2px 0 0",
            fontSize: 12,
            color: C.muted,
          }}
        >
          Analyze a Kubernetes Deployment
          configuration
        </p>
      </div>

      {/* Pipeline */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {PIPELINE_STEPS.map((step, i) => {
          const done =
            showResults ||
            (state === "loading" &&
              activeStep > i);

          const active =
            state === "loading" &&
            activeStep === i;

          return (
            <div
              key={step.id}
              style={{
                display: "flex",
                alignItems: "center",
                flex:
                  i <
                  PIPELINE_STEPS.length - 1
                    ? 1
                    : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: done
                      ? C.low
                      : active
                      ? C.accent
                      : C.bg,
                    border: `1px solid ${
                      done
                        ? C.low
                        : active
                        ? C.accent
                        : C.border
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                  }}
                >
                  {done ? (
                    <span
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span
                      style={{
                        fontFamily:
                          "var(--font-mono)",
                        fontSize: 8,
                        fontWeight: 700,
                        color: active
                          ? "#fff"
                          : C.muted,
                      }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: active
                      ? 600
                      : 400,
                    color: done
                      ? C.low
                      : active
                      ? C.accent
                      : C.muted,
                  }}
                >
                  {step.label}
                </span>
              </div>

              {i <
                PIPELINE_STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    margin: "0 10px",
                    background:
                      done
                        ? C.low
                        : C.border,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Workspace */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 430px",
          gap: 14,
          minHeight: 0,
        }}
      >
        {/* YAML Editor */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              padding: "8px 12px",
              borderBottom:
                `1px solid ${C.border}`,
              background: C.bg,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.text,
                }}
              >
                YAML Editor
              </span>

              <span
                style={{
                  fontFamily:
                    "var(--font-mono)",
                  fontSize: 10,
                  color: C.muted,
                }}
              >
                {lines.length} lines
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={handleLoadExample}
                style={buttonStyle}
              >
                Load Example
              </button>

              <button
                onClick={handleSecureBaseline}
                style={buttonStyle}
              >
                Secure Baseline
              </button>

              <button
                onClick={handleInvalidYaml}
                style={buttonStyle}
              >
                Invalid YAML
              </button>

              <button
                onClick={handleClear}
                style={buttonStyle}
              >
                Clear
              </button>

              <button
                onClick={handleAnalyze}
                disabled={
                  !yaml.trim() ||
                  state === "loading"
                }
                style={{
                  padding: "4px 14px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#fff",
                  background:
                    !yaml.trim() ||
                    state === "loading"
                      ? "#93c5fd"
                      : C.accent,
                  border: "none",
                  borderRadius: 4,
                  cursor:
                    !yaml.trim() ||
                    state === "loading"
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {state === "loading"
                  ? "Analyzing…"
                  : "Analyze"}
              </button>
            </div>
          </div>

          {/* Code editor */}
          <div
            style={{
              flex: 1,
              display: "flex",
              overflow: "hidden",
              background: "#1e2535",
            }}
          >
            {/* Line numbers */}
            <div
              style={{
                background: "#181f2e",
                borderRight:
                  "1px solid #2d3a4f",
                padding: "12px 0",
                userSelect: "none",
                minWidth: 40,
              }}
            >
              {lines.map((_, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily:
                      "var(--font-mono)",
                    fontSize: 11,
                    lineHeight:
                      "20px",
                    color: "#4a5568",
                    textAlign: "right",
                    paddingRight: 10,
                    paddingLeft: 8,
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editor */}
            <div
              style={{
                flex: 1,
                position: "relative",
                overflow: "auto",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  padding:
                    "12px 14px",
                  pointerEvents:
                    "none",
                  zIndex: 1,
                  fontFamily:
                    "var(--font-mono)",
                  fontSize: 11.5,
                  lineHeight:
                    "20px",
                  whiteSpace: "pre",
                }}
              >
                {lines.map(
                  (line, i) => (
                    <div
                      key={i}
                      style={{
                        minHeight: 20,
                      }}
                    >
                      {highlightYaml(line)}
                    </div>
                  )
                )}
              </div>

              <textarea
                value={yaml}
                onChange={(e) => {
                  setYaml(e.target.value);

                  if (state !== "idle") {
                    resetAnalysis();
                  }
                }}
                spellCheck={false}
                style={{
                  position: "relative",
                  zIndex: 2,
                  width: "100%",
                  height: "100%",
                  minHeight: 400,
                  padding:
                    "12px 14px",
                  fontFamily:
                    "var(--font-mono)",
                  fontSize: 11.5,
                  lineHeight:
                    "20px",
                  background:
                    "transparent",
                  color: "transparent",
                  caretColor:
                    "#93c5fd",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  whiteSpace: "pre",
                }}
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Error */}
          {state === "error" && (
            <>
              <ErrorBanner
                title="Security Analysis Failed"
                message={
                  error ||
                  "The backend could not analyze the Kubernetes YAML."
                }
                code="ANALYSIS_ERROR"
              />

              <button
                onClick={() => {
                  setState("idle");
                  setError(null);
                  setActiveStep(-1);
                }}
                style={{
                  padding: "5px 12px",
                  fontSize: 11,
                  color: C.accent,
                  background:
                    C.accentBg,
                  border: `1px solid ${C.accent}44`,
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
            </>
          )}

          {/* Idle / Loading */}
          {(state === "idle" ||
            state === "loading") && (
            <EmptyState
              message={
                state === "loading"
                  ? "Running analysis pipeline…"
                  : "No analysis yet"
              }
              sub={
                state === "loading"
                  ? "Sending YAML to the backend deterministic rule engine"
                  : "Click Analyze to scan the Kubernetes Deployment YAML"
              }
            />
          )}

          {/* Results */}
          {showResults && result && (
            <>
              {/* Resource */}
              <Panel
                title="Analysis Results"
                badge="DETERMINISTIC ENGINE"
                badgeColor={C.low}
                badgeBg="#f0fdf4"
              >
                <InfoRow
                  label="API Version"
                  value={
                    result.resource
                      .apiVersion ||
                    "—"
                  }
                  mono
                />

                <InfoRow
                  label="Kind"
                  value={
                    result.resource.kind
                  }
                  mono
                />

                <InfoRow
                  label="Resource"
                  value={
                    result.resource.name ||
                    "(unnamed)"
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
                  label="Finding Count"
                  value={`${result.findingCount} ${
                    result.findingCount === 1
                      ? "finding"
                      : "findings"
                  }`}
                />

                <InfoRow
                  label="Highest Severity"
                  value={
                    result.highestSeverity ||
                    "NONE"
                  }
                  mono
                  color={
                    result.findingCount === 0
                      ? C.low
                      : getSeverityColor(
                          result.highestSeverity ||
                            "NONE"
                        )
                  }
                />

                <InfoRow
                  label="Risk Score"
                  value={`${result.riskScore} points`}
                  mono
                  color={
                    result.riskScore === 0
                      ? C.low
                      : getSeverityColor(
                          highestSeverity
                        )
                  }
                  last
                />
              </Panel>

              {/* Baseline */}
              {isBaseline && (
                <div
                  style={{
                    background:
                      "#f0fdf4",
                    border:
                      "1px solid #86efac",
                    borderRadius: 8,
                    padding:
                      "14px 16px",
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 10,
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
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#166534",
                    }}
                  >
                    No security
                    violations
                    detected
                  </span>
                </div>
              )}

              {/* Findings */}
              {findings.length > 0 && (
                <>
                  <Panel
                    title="Findings"
                    badge={`${findings.length} DETECTED`}
                    badgeColor={getSeverityColor(
                      highestSeverity
                    )}
                    badgeBg={getSeverityBackground(
                      highestSeverity
                    )}
                  >
                    <div>
                      {findings.map(
                        (finding, index) => {
                          const color =
                            getSeverityColor(
                              finding.severity
                            );

                          const active =
                            primaryFinding?.rule_id ===
                            finding.rule_id;

                          return (
                            <button
                              key={`${finding.rule_id}-${index}`}
                              onClick={() =>
                                setSelectedFinding(
                                  finding
                                )
                              }
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems:
                                  "center",
                                gap: 10,
                                padding:
                                  "9px 14px",
                                textAlign:
                                  "left",
                                background:
                                  active
                                    ? getSeverityBackground(
                                        finding.severity
                                      )
                                    : "transparent",
                                border: "none",
                                borderBottom:
                                  index <
                                  findings.length -
                                    1
                                    ? `1px solid ${C.borderLight}`
                                    : "none",
                                cursor:
                                  "pointer",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily:
                                    "var(--font-mono)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color,
                                  minWidth: 60,
                                }}
                              >
                                {
                                  finding.rule_id
                                }
                              </span>

                              <span
                                style={{
                                  flex: 1,
                                  fontSize: 11,
                                  color: C.text,
                                }}
                              >
                                {
                                  finding.title
                                }
                              </span>

                              <SeverityBadge
                                severity={
                                  finding.severity as any
                                }
                              />

                              <span
                                style={{
                                  fontFamily:
                                    "var(--font-mono)",
                                  fontSize: 10,
                                  color: C.muted,
                                }}
                              >
                                Risk{" "}
                                {finding.risk}{" "}
                                points
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </Panel>

                  {/* Selected finding */}
                  {primaryFinding && (
                    <Panel
                      title={`Finding: ${primaryFinding.rule_id}`}
                      badge="VERIFIED FINDING"
                      badgeColor={C.low}
                      badgeBg="#f0fdf4"
                    >
                      <div
                        style={{
                          padding:
                            "10px 14px",
                          borderBottom:
                            `1px solid ${C.border}`,
                          background:
                            getSeverityBackground(
                              primaryFinding.severity
                            ),
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontFamily:
                                "var(--font-mono)",
                              fontSize: 12,
                              fontWeight: 700,
                              color:
                                getSeverityColor(
                                  primaryFinding.severity
                                ),
                            }}
                          >
                            {
                              primaryFinding.rule_id
                            }
                          </span>

                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: C.text,
                            }}
                          >
                            {
                              primaryFinding.title
                            }
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "center",
                            gap: 6,
                          }}
                        >
                          <SeverityBadge
                            severity={
                              primaryFinding.severity as any
                            }
                          />

                          <span
                            style={{
                              fontFamily:
                                "var(--font-mono)",
                              fontSize: 11,
                              fontWeight: 700,
                              color:
                                getSeverityColor(
                                  primaryFinding.severity
                                ),
                            }}
                          >
                            Risk{" "}
                            {
                              primaryFinding.risk
                            }{" "}
                            points
                          </span>
                        </div>
                      </div>

                      <InfoRow
                        label="Rule"
                        value={
                          primaryFinding.rule_id
                        }
                        mono
                      />

                      <InfoRow
                        label="Finding Type"
                        value={
                          primaryFinding.title
                        }
                      />

                      <InfoRow
                        label="Severity"
                        value={
                          primaryFinding.severity
                        }
                        mono
                        color={getSeverityColor(
                          primaryFinding.severity
                        )}
                      />

                      <InfoRow
                        label="Risk Score"
                        value={`${primaryFinding.risk} points`}
                        mono
                        color={getSeverityColor(
                          primaryFinding.severity
                        )}
                      />

                      <InfoRow
                        label="Evidence"
                        value={
                          primaryFinding.evidence ||
                          "No evidence provided."
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
                  )}

                  {/* Continue to Security Analysis */}
                  <button
                    onClick={() => {
                      onYamlChange?.(yaml);
                      onOpenSecurity?.();
                    }}
                    disabled={
                      !yaml.trim()
                    }
                    style={{
                      width: "100%",
                      padding: "9px 14px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#fff",
                      background: yaml.trim()
                        ? C.accent
                        : "#93c5fd",
                      border: "none",
                      borderRadius: 6,
                      cursor: yaml.trim()
                        ? "pointer"
                        : "not-allowed",
                    }}
                  >
                    Open in Security Analysis →
                  </button>
                </>
              )}

              {/* Secure baseline navigation */}
              {isBaseline && (
                <button
                  onClick={() => {
                    onYamlChange?.(yaml);
                    onOpenSecurity?.();
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#fff",
                    background: C.accent,
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Open in Security Analysis →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "4px 9px",
  fontSize: 10,
  fontWeight: 500,
  color: C.sub,
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  cursor: "pointer",
} as const;