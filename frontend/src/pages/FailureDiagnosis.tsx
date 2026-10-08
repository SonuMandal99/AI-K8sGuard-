import { useEffect, useState } from "react";

import {
  Panel,
  InfoRow,
  Chip,
  SectionHeader,
  EvidencePanel,
  LoadingState,
  EmptyState,
  ErrorBanner,
  LLMModelBar,
  LLMDisclaimer,
  LLMSection,
  ConfidenceBar,
  C,
} from "../components/shared";

import {
  runDiagnosis,
  type DiagnosisResponse,
} from "../services/diagnosis.api";

import {
  getPods,
  type Pod,
} from "../services/cluster.api";

type ViewMode = "idle" | "loading" | "done" | "error";

/*
 * Controlled failure scenarios from the project methodology.
 */
const FAILURE_TYPES = [
  "CrashLoopBackOff",
  "ImagePullBackOff",
  "Missing Secret",
  "Missing ConfigMap",
  "Readiness probe failed",
  "Other",
];

const LOG_COLORS: Record<string, string> = {
  INFO: "#4ade80",
  ERROR: "#f87171",
  FATAL: "#fca5a5",
  WARN: "#fcd34d",
};

function getDiagnosisText(
  diagnosis: DiagnosisResponse["diagnosis"]
): string {
  if (typeof diagnosis === "string") {
    return diagnosis;
  }

  if (diagnosis && typeof diagnosis === "object") {
    const object = diagnosis as Record<string, unknown>;

    if (typeof object.explanation === "string") {
      return object.explanation;
    }

    if (typeof object.analysis === "string") {
      return object.analysis;
    }

    if (typeof object.diagnosis === "string") {
      return object.diagnosis;
    }

    if (typeof object.rawResponse === "string") {
      return object.rawResponse;
    }

    try {
      return JSON.stringify(diagnosis, null, 2);
    } catch {
      return "LLM returned structured diagnosis data.";
    }
  }

  return "No diagnosis was returned by the LLM.";
}

function getDiagnosisArray(
  diagnosis: DiagnosisResponse["diagnosis"],
  keys: string[]
): string[] {
  if (!diagnosis || typeof diagnosis !== "object") {
    return [];
  }

  const object = diagnosis as Record<string, unknown>;

  for (const key of keys) {
    const value = object[key];

    if (Array.isArray(value)) {
      return value.filter(
        (item): item is string =>
          typeof item === "string"
      );
    }
  }

  return [];
}

function getConfidence(
  diagnosis: DiagnosisResponse["diagnosis"]
): number | null {
  if (!diagnosis || typeof diagnosis !== "object") {
    return null;
  }

  const object = diagnosis as Record<string, unknown>;

  const value =
    object.confidence ??
    object.confidenceScore;

  if (typeof value !== "number") {
    return null;
  }

  return value > 1 ? value / 100 : value;
}

function formatContainerLogs(
  logs: string | null
) {
  if (!logs) {
    return [];
  }

  return logs
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      let level = "INFO";

      if (/fatal/i.test(line)) {
        level = "FATAL";
      } else if (/error/i.test(line)) {
        level = "ERROR";
      } else if (/warn/i.test(line)) {
        level = "WARN";
      }

      return {
        ts: "",
        level,
        msg: line,
      };
    });
}

export default function FailureDiagnosis() {
  /* ==========================================
   * INPUT STATE
   * ========================================== */

  const [namespace, setNamespace] =
    useState("ai-k8sguard");

  const [podName, setPodName] =
    useState("");

  const [deploymentName, setDeploymentName] =
    useState("");

  const [failureType, setFailureType] =
    useState("CrashLoopBackOff");

  /* ==========================================
   * LIVE KUBERNETES POD STATE
   * ========================================== */

  const [pods, setPods] =
    useState<Pod[]>([]);

  const [podsLoading, setPodsLoading] =
    useState(false);

  const [podsError, setPodsError] =
    useState<string | null>(null);

  /* ==========================================
   * DIAGNOSIS STATE
   * ========================================== */

  const [mode, setMode] =
    useState<ViewMode>("idle");

  const [diagnosis, setDiagnosis] =
    useState<DiagnosisResponse | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [llmExpanded, setLlmExpanded] =
    useState(true);

  /* ==========================================
   * STEP 3
   *
   * Load real Pods from Kubernetes.
   * ========================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadPods() {
      const currentNamespace =
        namespace.trim();

      if (!currentNamespace) {
        setPods([]);
        setPodName("");
        return;
      }

      setPodsLoading(true);
      setPodsError(null);

      try {
        const response =
          await getPods(currentNamespace);

        if (cancelled) {
          return;
        }

        if (response.error) {
          setPodsError(response.error);
          setPods([]);
          setPodName("");
          return;
        }

        const nextPods =
          response.data ?? [];

        setPods(nextPods);

        /*
         * Automatically select the first
         * real Kubernetes Pod when available.
         */
        if (nextPods.length > 0) {
          const currentPodExists =
            nextPods.some(
              (pod) =>
                pod.name === podName
            );

          if (!currentPodExists) {
            setPodName(
              nextPods[0].name
            );
          }
        } else {
          setPodName("");
        }
      } catch (err) {
        if (!cancelled) {
          setPodsError(
            err instanceof Error
              ? err.message
              : "Unable to load Kubernetes Pods."
          );

          setPods([]);
          setPodName("");
        }
      } finally {
        if (!cancelled) {
          setPodsLoading(false);
        }
      }
    }

    loadPods();

    return () => {
      cancelled = true;
    };
  }, [namespace]);

  /* ==========================================
   * STEP 5
   *
   * Run failure diagnosis.
   * ========================================== */

  async function handleDiagnose() {
    if (!namespace.trim()) {
      setError(
        "Namespace is required."
      );

      setMode("error");
      return;
    }

    if (!podName.trim()) {
      setError(
        "Select a Kubernetes Pod."
      );

      setMode("error");
      return;
    }

    setMode("loading");
    setError(null);
    setDiagnosis(null);

    try {
      const diagnosisResponse =
        await runDiagnosis({
          namespace:
            namespace.trim(),

          podName:
            podName.trim(),

          deploymentName:
            deploymentName.trim() ||
            undefined,

          failureType:
            failureType.trim() ||
            undefined,
        });

      if (diagnosisResponse.error) {
        setError(
          diagnosisResponse.error
        );

        setMode("error");
        return;
      }

      if (!diagnosisResponse.data) {
        setError(
          "The backend returned an empty diagnosis."
        );

        setMode("error");
        return;
      }

      setDiagnosis(
        diagnosisResponse.data
      );

      setMode("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete failure diagnosis."
      );

      setMode("error");
    }
  }

  /* ==========================================
   * REAL BACKEND EVIDENCE
   * ========================================== */

  const podStatus =
    diagnosis?.evidence.runtime
      .podStatus ?? null;

  const deploymentStatus =
    diagnosis?.evidence.runtime
      .deploymentStatus ?? null;

  const events =
    diagnosis?.evidence.runtime
      .events ?? [];

  const logs =
    diagnosis?.evidence.runtime
      .logs ?? null;

  /*
   * Prefer events belonging to the
   * selected Pod.
   */
  const podEvents =
    events.filter((event) => {
      return (
        event.involvedObject?.name ===
        diagnosis?.podName
      );
    });

  const relevantEvents =
    podEvents.length > 0
      ? podEvents
      : events;

  const logLines =
    formatContainerLogs(logs);

  /* ==========================================
   * CONTAINER STATUS
   * ========================================== */

  const containerStatuses =
    podStatus?.containerStatuses ?? [];

  const waitingContainer =
    containerStatuses.find(
      (container) =>
        container.state?.waiting
    );

  const terminatedContainer =
    containerStatuses.find(
      (container) =>
        container.state?.terminated
    );

  const runningContainer =
    containerStatuses.find(
      (container) =>
        container.state?.running
    );

  const containerState =
    waitingContainer
      ? "Waiting"
      : runningContainer
      ? "Running"
      : terminatedContainer
      ? "Terminated"
      : "Unknown";

  /*
   * Kubernetes reason has priority.
   */
  const reason =
    waitingContainer
      ?.state?.waiting?.reason ??
    terminatedContainer
      ?.state?.terminated?.reason ??
    failureType;

  const restartCount =
    containerStatuses.reduce(
      (total, container) =>
        total +
        (container.restartCount ?? 0),
      0
    );

  /* ==========================================
   * LLM OUTPUT
   *
   * Only displays real backend output.
   * Nothing is fabricated.
   * ========================================== */

  const diagnosisText =
    diagnosis
      ? getDiagnosisText(
          diagnosis.diagnosis
        )
      : "";

  const causes =
    diagnosis
      ? getDiagnosisArray(
          diagnosis.diagnosis,
          [
            "causes",
            "probableCauses",
            "possibleCauses",
          ]
        )
      : [];

  const recommendations =
    diagnosis
      ? getDiagnosisArray(
          diagnosis.diagnosis,
          [
            "recommendations",
            "recommendation",
            "remediation",
            "actions",
          ]
        )
      : [];

  const confidence =
    diagnosis
      ? getConfidence(
          diagnosis.diagnosis
        )
      : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxWidth: 1100,
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
          Failure Diagnosis
        </h2>

        <p
          style={{
            margin: "2px 0 0",
            fontSize: 12,
            color: C.muted,
          }}
        >
          Evidence-based Kubernetes
          failure diagnosis
        </p>
      </div>

      {/* ===================================== */}
      {/* SELECTOR */}
      {/* ===================================== */}

      <div
        style={{
          background: C.surface,
          border:
            `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "12px 16px",
          display: "flex",
          alignItems: "flex-end",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        {/* Failure Type */}

        <div style={fieldContainerStyle}>
          <label style={labelStyle}>
            Failure Type
          </label>

          <select
            value={failureType}
            onChange={(event) => {
              setFailureType(
                event.target.value
              );

              setMode("idle");
              setError(null);
              setDiagnosis(null);
            }}
            style={inputStyle}
          >
            {FAILURE_TYPES.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              )
            )}
          </select>
        </div>

        {/* Namespace */}

        <div style={fieldContainerStyle}>
          <label style={labelStyle}>
            Namespace
          </label>

          <input
            value={namespace}
            onChange={(event) => {
              setNamespace(
                event.target.value
              );

              setMode("idle");
              setError(null);
              setDiagnosis(null);
            }}
            placeholder="ai-k8sguard"
            style={{
              ...inputStyle,
              minWidth: 150,
            }}
          />
        </div>

        {/* REAL POD */}

        <div style={fieldContainerStyle}>
          <label style={labelStyle}>
            Kubernetes Pod
          </label>

          <select
            value={podName}
            onChange={(event) => {
              setPodName(
                event.target.value
              );

              setMode("idle");
              setError(null);
              setDiagnosis(null);
            }}
            disabled={
              podsLoading ||
              pods.length === 0
            }
            style={{
              ...inputStyle,
              minWidth: 280,
            }}
          >
            {podsLoading && (
              <option value="">
                Loading Pods…
              </option>
            )}

            {!podsLoading &&
              pods.length === 0 && (
                <option value="">
                  No Pods found
                </option>
              )}

            {!podsLoading &&
              pods.map((pod) => (
                <option
                  key={pod.name}
                  value={pod.name}
                >
                  {pod.name} —{" "}
                  {pod.phase ||
                    "Unknown"}
                </option>
              ))}
          </select>

          {podsError && (
            <span
              style={{
                fontSize: 10,
                color: C.high,
              }}
            >
              {podsError}
            </span>
          )}

          {!podsLoading &&
            !podsError && (
              <span
                style={{
                  fontSize: 10,
                  color: C.muted,
                }}
              >
                {pods.length} Pod
                {pods.length === 1
                  ? ""
                  : "s"}{" "}
                discovered
              </span>
            )}
        </div>

        {/* Deployment */}

        <div style={fieldContainerStyle}>
          <label style={labelStyle}>
            Deployment
          </label>

          <input
            value={deploymentName}
            onChange={(event) => {
              setDeploymentName(
                event.target.value
              );

              setMode("idle");
              setError(null);
              setDiagnosis(null);
            }}
            placeholder="deployment-name"
            style={{
              ...inputStyle,
              minWidth: 190,
            }}
          />
        </div>

        {/* Diagnose */}

        <button
          onClick={handleDiagnose}
          disabled={
            mode === "loading" ||
            podsLoading ||
            !podName
          }
          style={{
            padding:
              "7px 18px",
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            background:
              mode === "loading" ||
              podsLoading ||
              !podName
                ? "#93c5fd"
                : C.accent,
            border: "none",
            borderRadius: 5,
            cursor:
              mode === "loading" ||
              podsLoading ||
              !podName
                ? "not-allowed"
                : "pointer",
          }}
        >
          {mode === "loading"
            ? "Diagnosing…"
            : "Diagnose Failure"}
        </button>
      </div>

      {/* ===================================== */}
      {/* LIVE KUBERNETES STATUS */}
      {/* ===================================== */}

      {podsError && (
        <ErrorBanner
          title="Kubernetes Pod Discovery Failed"
          message={podsError}
          code="K8S_POD_ERROR"
        />
      )}

      {/* ===================================== */}
      {/* LOADING */}
      {/* ===================================== */}

      {mode === "loading" && (
        <LoadingState
          message="Running failure diagnosis…"
          sub="Collecting Kubernetes runtime evidence"
        />
      )}

      {/* ===================================== */}
      {/* ERROR */}
      {/* ===================================== */}

      {mode === "error" && (
        <>
          <ErrorBanner
            title="Failure Diagnosis Failed"
            message={
              error ||
              "Unable to diagnose the selected Kubernetes failure."
            }
            code="DIAGNOSIS_ERROR"
          />

          <button
            onClick={() =>
              setMode("idle")
            }
            style={{
              padding:
                "5px 12px",
              fontSize: 11,
              color: C.accent,
              background:
                C.accentBg,
              border:
                `1px solid ${C.accent}44`,
              borderRadius: 4,
              cursor:
                "pointer",
            }}
          >
            ← Back
          </button>
        </>
      )}

      {/* ===================================== */}
      {/* IDLE */}
      {/* ===================================== */}

      {mode === "idle" && (
        <EmptyState
          message="No diagnosis yet"
          sub={
            pods.length > 0
              ? "Select a Kubernetes Pod and click Diagnose Failure"
              : "No Kubernetes Pods were found in the selected namespace"
          }
        />
      )}

      {/* ===================================== */}
      {/* RESULTS */}
      {/* ===================================== */}

      {mode === "done" &&
        diagnosis && (
          <>
            {/* Summary */}

            <div
              style={{
                background:
                  "#fff7ed",
                border:
                  "1px solid #fdba74",
                borderRadius: 8,
                padding:
                  "12px 16px",
                display: "flex",
                alignItems:
                  "center",
                gap: 12,
                flexWrap:
                  "wrap",
              }}
            >
              <Chip
                label={
                  diagnosis.failure
                }
                color={C.high}
                bg="#fff7ed"
                border="#fdba74"
              />

              <span
                style={{
                  fontFamily:
                    "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.high,
                }}
              >
                {
                  diagnosis.podName
                }
              </span>

              <span
                style={{
                  fontSize: 11,
                  color: C.text,
                }}
              >
                Namespace:{" "}
                {
                  diagnosis.namespace
                }
              </span>

              <span
                style={{
                  marginLeft:
                    "auto",
                }}
              >
                <Chip
                  label="EVIDENCE COLLECTED"
                  color={C.low}
                  bg="#f0fdf4"
                  border="#86efac"
                />
              </span>
            </div>

            {/* ================================= */}
            {/* TWO COLUMN */}
            {/* ================================= */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 400px",
                gap: 14,
                alignItems:
                  "start",
              }}
            >
              {/* ================================= */}
              {/* EVIDENCE */}
              {/* ================================= */}

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap: 10,
                }}
              >
                <SectionHeader
                  label="OBSERVED EVIDENCE"
                  sub="Collected from Kubernetes by the backend"
                />

                {/* Pod Status */}

                <EvidencePanel
                  title="Pod Status"
                  defaultOpen
                  badge={
                    restartCount > 0
                      ? `${restartCount} RESTARTS`
                      : podStatus?.phase?.toUpperCase() ||
                        "OBSERVED"
                  }
                  badgeColor={
                    restartCount > 0
                      ? C.critical
                      : C.sub
                  }
                  badgeBg={
                    restartCount > 0
                      ? "#fef2f2"
                      : C.bg
                  }
                >
                  <InfoRow
                    label="Phase"
                    value={
                      podStatus?.phase ||
                      "Unknown"
                    }
                    mono
                  />

                  <InfoRow
                    label="Container State"
                    value={
                      containerState
                    }
                    mono
                  />

                  <InfoRow
                    label="Reason"
                    value={reason}
                    mono
                    color={C.high}
                  />

                  <InfoRow
                    label="Restart Count"
                    value={String(
                      restartCount
                    )}
                    mono
                    color={
                      restartCount > 0
                        ? C.critical
                        : C.sub
                    }
                  />

                  <InfoRow
                    label="Pod IP"
                    value={
                      podStatus?.podIP ||
                      "—"
                    }
                    mono
                  />

                  <InfoRow
                    label="Node"
                    value={
                      podStatus?.nodeName ||
                      "—"
                    }
                    mono
                    last
                  />
                </EvidencePanel>

                {/* Deployment Status */}

                <EvidencePanel
                  title="Deployment Status"
                  badge={
                    deploymentStatus
                      ? "OBSERVED"
                      : "NOT FOUND"
                  }
                  badgeColor={
                    deploymentStatus
                      ? C.low
                      : C.high
                  }
                  badgeBg={
                    deploymentStatus
                      ? "#f0fdf4"
                      : "#fff7ed"
                  }
                >
                  <InfoRow
                    label="Deployment"
                    value={
                      deploymentStatus?.name ||
                      diagnosis.deploymentName ||
                      "—"
                    }
                    mono
                  />

                  <InfoRow
                    label="Desired Replicas"
                    value={
                      deploymentStatus
                        ? String(
                            deploymentStatus.replicas
                          )
                        : "—"
                    }
                    mono
                  />

                  <InfoRow
                    label="Ready Replicas"
                    value={
                      deploymentStatus
                        ? String(
                            deploymentStatus.readyReplicas
                          )
                        : "—"
                    }
                    mono
                    color={
                      deploymentStatus &&
                      deploymentStatus.readyReplicas ===
                        0
                        ? C.critical
                        : C.low
                    }
                  />

                  <InfoRow
                    label="Available"
                    value={
                      deploymentStatus
                        ? String(
                            deploymentStatus.availableReplicas
                          )
                        : "—"
                    }
                    mono
                    last
                  />
                </EvidencePanel>

                {/* Events */}

                <EvidencePanel
                  title="Kubernetes Events"
                  defaultOpen
                  badge={`${relevantEvents.length} EVENTS`}
                  badgeColor={C.sub}
                  badgeBg={C.bg}
                >
                  {relevantEvents.length ===
                  0 ? (
                    <div
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 11,
                        color: C.muted,
                      }}
                    >
                      No matching
                      Kubernetes
                      events were
                      returned.
                    </div>
                  ) : (
                    <div
                      style={{
                        overflowX:
                          "auto",
                      }}
                    >
                      <table
                        style={{
                          width:
                            "100%",
                          borderCollapse:
                            "collapse",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background:
                                C.bg,
                            }}
                          >
                            {[
                              "Type",
                              "Reason",
                              "Object",
                              "Message",
                            ].map(
                              (
                                heading
                              ) => (
                                <th
                                  key={
                                    heading
                                  }
                                  style={{
                                    padding:
                                      "6px 12px",
                                    textAlign:
                                      "left",
                                    fontSize:
                                      10,
                                    fontWeight:
                                      600,
                                    color:
                                      C.muted,
                                    borderBottom:
                                      `1px solid ${C.border}`,
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {
                                    heading
                                  }
                                </th>
                              )
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          {relevantEvents.map(
                            (
                              event,
                              index
                            ) => (
                              <tr
                                key={`${event.name}-${index}`}
                                style={{
                                  borderBottom:
                                    index <
                                    relevantEvents.length -
                                      1
                                      ? `1px solid ${C.borderLight}`
                                      : undefined,
                                }}
                              >
                                <td
                                  style={{
                                    padding:
                                      "6px 12px",
                                  }}
                                >
                                  <Chip
                                    label={
                                      event.type ||
                                      "Unknown"
                                    }
                                    color={
                                      event.type ===
                                      "Warning"
                                        ? C.high
                                        : C.low
                                    }
                                    bg={
                                      event.type ===
                                      "Warning"
                                        ? "#fff7ed"
                                        : "#f0fdf4"
                                    }
                                    border={
                                      event.type ===
                                      "Warning"
                                        ? "#fdba74"
                                        : "#86efac"
                                    }
                                  />
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "6px 12px",
                                    fontFamily:
                                      "var(--font-mono)",
                                    fontSize:
                                      10,
                                  }}
                                >
                                  {
                                    event.reason
                                  }
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "6px 12px",
                                    fontFamily:
                                      "var(--font-mono)",
                                    fontSize:
                                      10,
                                    color:
                                      C.sub,
                                  }}
                                >
                                  {
                                    event
                                      .involvedObject
                                      ?.name ||
                                    event.name ||
                                    "—"
                                  }
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "6px 12px",
                                    fontSize:
                                      11,
                                    color:
                                      C.text,
                                  }}
                                >
                                  {
                                    event.message
                                  }
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </EvidencePanel>

                {/* Logs */}

                <EvidencePanel
                  title="Container Logs"
                  defaultOpen
                  badge={`${logLines.length} LINES`}
                  badgeColor={C.sub}
                  badgeBg={C.bg}
                >
                  {!logs ? (
                    <div
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 11,
                        color:
                          C.muted,
                      }}
                    >
                      No container
                      logs were
                      returned.
                    </div>
                  ) : (
                    <div
                      style={{
                        background:
                          "#1e2535",
                        padding:
                          "12px 14px",
                        fontFamily:
                          "var(--font-mono)",
                        fontSize: 11,
                        lineHeight:
                          1.7,
                        overflowX:
                          "auto",
                      }}
                    >
                      {logLines.map(
                        (
                          line,
                          index
                        ) => (
                          <div
                            key={
                              index
                            }
                            style={{
                              display:
                                "flex",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                minWidth:
                                  42,
                                fontWeight:
                                  700,
                                color:
                                  LOG_COLORS[
                                    line
                                      .level
                                  ] ??
                                  "#c8d3e0",
                              }}
                            >
                              {
                                line.level
                              }
                            </span>

                            <span
                              style={{
                                color:
                                  line.level ===
                                  "FATAL"
                                    ? "#fca5a5"
                                    : line.level ===
                                      "ERROR"
                                    ? "#f87171"
                                    : line.level ===
                                      "WARN"
                                    ? "#fcd34d"
                                    : "#c8d3e0",
                              }}
                            >
                              {
                                line.msg
                              }
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </EvidencePanel>

                {/* Configuration */}

                <EvidencePanel
                  title="Kubernetes Configuration"
                  badge="EVIDENCE"
                  badgeColor={C.accent}
                  badgeBg={C.accentBg}
                >
                  <InfoRow
                    label="Configuration"
                    value={
                      diagnosis
                        .evidence
                        .configuration
                        ? "YAML/configuration evidence collected"
                        : "No configuration evidence returned"
                    }
                    last
                  />
                </EvidencePanel>
              </div>

              {/* ================================= */}
              {/* LLM DIAGNOSIS */}
              {/* ================================= */}

              <div
                style={{
                  position:
                    "sticky",
                  top: 0,
                }}
              >
                <Panel
                  title="Local LLM Diagnosis"
                  badge="SUPPLEMENTARY"
                  badgeColor={C.amber}
                  badgeBg={C.amberBg}
                >
                  <LLMModelBar />

                  <LLMDisclaimer />

                  <button
                    onClick={() =>
                      setLlmExpanded(
                        (value) =>
                          !value
                      )
                    }
                    style={{
                      display:
                        "flex",
                      width:
                        "100%",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      padding:
                        "9px 14px",
                      background:
                        "transparent",
                      border:
                        "none",
                      borderBottom:
                        llmExpanded
                          ? `1px solid ${C.border}`
                          : undefined,
                      cursor:
                        "pointer",
                      fontSize:
                        12,
                      fontWeight:
                        500,
                      color:
                        C.sub,
                    }}
                  >
                    <span>
                      LLM Analysis
                      Details
                    </span>

                    <span
                      style={{
                        fontFamily:
                          "var(--font-mono)",
                        fontSize:
                          11,
                      }}
                    >
                      {llmExpanded
                        ? "▲"
                        : "▼"}
                    </span>
                  </button>

                  {llmExpanded && (
                    <div>
                      <LLMSection label="Diagnosis">
                        <p
                          style={{
                            margin: 0,
                            fontSize:
                              11.5,
                            color:
                              C.text,
                            lineHeight:
                              1.65,
                            whiteSpace:
                              "pre-wrap",
                          }}
                        >
                          {
                            diagnosisText
                          }
                        </p>
                      </LLMSection>

                      {causes.length >
                        0 && (
                        <LLMSection label="Probable Cause">
                          <ul
                            style={{
                              margin: 0,
                              padding:
                                "0 0 0 15px",
                              display:
                                "flex",
                              flexDirection:
                                "column",
                              gap: 4,
                            }}
                          >
                            {causes.map(
                              (
                                cause
                              ) => (
                                <li
                                  key={
                                    cause
                                  }
                                  style={{
                                    fontSize:
                                      11.5,
                                    color:
                                      C.text,
                                    lineHeight:
                                      1.55,
                                  }}
                                >
                                  {
                                    cause
                                  }
                                </li>
                              )
                            )}
                          </ul>
                        </LLMSection>
                      )}

                      {recommendations.length >
                        0 && (
                        <LLMSection label="Recommendation">
                          <ol
                            style={{
                              margin: 0,
                              padding:
                                "0 0 0 15px",
                              display:
                                "flex",
                              flexDirection:
                                "column",
                              gap: 4,
                            }}
                          >
                            {recommendations.map(
                              (
                                recommendation
                              ) => (
                                <li
                                  key={
                                    recommendation
                                  }
                                  style={{
                                    fontSize:
                                      11.5,
                                    color:
                                      C.text,
                                    lineHeight:
                                      1.55,
                                  }}
                                >
                                  {
                                    recommendation
                                  }
                                </li>
                              )
                            )}
                          </ol>
                        </LLMSection>
                      )}

                      {confidence !==
                        null && (
                        <ConfidenceBar
                          value={
                            confidence
                          }
                          label={
                            confidence >=
                            0.85
                              ? "High"
                              : confidence >=
                                0.5
                              ? "Moderate"
                              : "Low"
                          }
                        />
                      )}

                      {confidence ===
                        null && (
                        <LLMSection label="Model Output">
                          <p
                            style={{
                              margin: 0,
                              fontSize:
                                11,
                              color:
                                C.muted,
                              lineHeight:
                                1.6,
                            }}
                          >
                            Diagnosis
                            generated
                            by the
                            local
                            Ollama
                            model.
                            Confidence
                            was not
                            provided
                            in the
                            returned
                            structured
                            response.
                          </p>
                        </LLMSection>
                      )}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </>
        )}
    </div>
  );
}

/* ==========================================
 * STYLES
 * ========================================== */

const fieldContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
} as const;

const labelStyle = {
  fontSize: 10,
  fontWeight: 600,
  color: C.muted,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
} as const;

const inputStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 11.5,
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  padding: "6px 10px",
  color: C.text,
  fontWeight: 500,
  minWidth: 200,
  outline: "none",
} as const;