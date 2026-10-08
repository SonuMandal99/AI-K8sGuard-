import { useEffect, useState } from "react";

import {
  Panel,
  InfoRow,
  Chip,
  EmptyState,
  ErrorBanner,
  C,
} from "../components/shared";

import {
  getClusterStatus,
  getPods,
  getDeployments,
  getServices,
  getEvents,
  type ClusterStatus,
  type Pod,
  type Deployment,
  type Service,
  type KubernetesEvent,
} from "../services/cluster.api";

import {
  getReports,
  type Report,
} from "../services/reports.api";

type LoadState =
  | "loading"
  | "success"
  | "error";

type Severity =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW";

const SEVERITY_STYLE: Record<
  Severity,
  {
    color: string;
    bg: string;
  }
> = {
  CRITICAL: {
    color: "#dc2626",
    bg: "#fef2f2",
  },

  HIGH: {
    color: "#ea580c",
    bg: "#fff7ed",
  },

  MEDIUM: {
    color: "#d97706",
    bg: "#fffbeb",
  },

  LOW: {
    color: "#64748b",
    bg: "#f1f5f9",
  },
};


/*
 * Severity badge.
 */
function SeverityBadge({
  severity,
}: {
  severity: string;
}) {
  const normalized =
    severity.toUpperCase() as Severity;

  const style =
    SEVERITY_STYLE[normalized] ?? {
      color: C.muted,
      bg: C.bg,
    };

  return (
    <span
      style={{
        fontFamily:
          "var(--font-mono)",
        fontSize: 10,
        fontWeight: 600,
        color: style.color,
        background: style.bg,
        border:
          `1px solid ${style.color}33`,
        borderRadius: 3,
        padding: "2px 6px",
        letterSpacing: "0.03em",
      }}
    >
      {severity || "UNKNOWN"}
    </span>
  );
}


/*
 * Format a Kubernetes Pod status.
 */
function getPodStatus(
  pod: Pod
): string {
  return (
    pod.phase ||
    "Unknown"
  );
}


/*
 * Get Pod restart count.
 */
function getRestartCount(
  pod: Pod
): number {
  return (pod.containerStatuses || [])
    .reduce(
      (total, container) =>
        total +
        (container.restartCount ?? 0),
      0
    );
}


/*
 * Determine whether a Pod is ready.
 */
function isPodReady(
  pod: Pod
): boolean {
  const readyCondition =
    pod.conditions?.find(
      (condition) =>
        condition.type === "Ready"
    );

  return (
    readyCondition?.status ===
    "True"
  );
}


/*
 * Format Kubernetes event time.
 */
function formatEventTime(
  event: KubernetesEvent
): string {
  const timestamp =
    event.lastTimestamp ||
    event.firstTimestamp;

  if (!timestamp) {
    return "—";
  }

  try {
    return new Date(
      timestamp
    ).toLocaleString();
  } catch {
    return timestamp;
  }
}


/*
 * Dashboard.
 */
export default function Dashboard() {
  /* =========================================
   * LIVE KUBERNETES STATE
   * ========================================= */

  const [
    clusterStatus,
    setClusterStatus,
  ] =
    useState<ClusterStatus | null>(
      null
    );

  const [pods, setPods] =
    useState<Pod[]>([]);

  const [
    deployments,
    setDeployments,
  ] =
    useState<Deployment[]>([]);

  const [
    services,
    setServices,
  ] =
    useState<Service[]>([]);

  const [
    events,
    setEvents,
  ] =
    useState<KubernetesEvent[]>([]);


  /* =========================================
   * SECURITY REPORT STATE
   * ========================================= */

  const [reports, setReports] =
    useState<Report[]>([]);


  /* =========================================
   * LOADING / ERROR STATE
   * ========================================= */

  const [loadState, setLoadState] =
    useState<LoadState>(
      "loading"
    );

  const [error, setError] =
    useState<string | null>(
      null
    );


  /* =========================================
   * LOAD DASHBOARD
   * ========================================= */

  async function loadDashboard() {
    setLoadState("loading");
    setError(null);

    try {
      const [
        statusResponse,
        podsResponse,
        deploymentsResponse,
        servicesResponse,
        eventsResponse,
        reportsResponse,
      ] =
        await Promise.all([
          getClusterStatus(),
          getPods(),
          getDeployments(),
          getServices(),
          getEvents(),
          getReports(),
        ]);


      /*
       * Kubernetes status is authoritative.
       */
      if (statusResponse.error) {
        throw new Error(
          statusResponse.error
        );
      }


      /*
       * Update live Kubernetes data.
       */
      setClusterStatus(
        statusResponse.data
      );

      setPods(
        podsResponse.data ?? []
      );

      setDeployments(
        deploymentsResponse.data ?? []
      );

      setServices(
        servicesResponse.data ?? []
      );

      setEvents(
        eventsResponse.data ?? []
      );


      /*
       * Reports are optional.
       *
       * If MongoDB currently contains no
       * reports, the dashboard simply shows
       * an empty security-analysis state.
       */
      if (!reportsResponse.error) {
        setReports(
          reportsResponse.data ?? []
        );
      } else {
        setReports([]);
      }


      setLoadState("success");

    } catch (err) {

      setLoadState("error");

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load live Kubernetes dashboard."
      );
    }
  }


  /*
   * Initial load.
   */
  useEffect(() => {
    loadDashboard();
  }, []);


  /* =========================================
   * LOADING STATE
   * ========================================= */

  if (
    loadState === "loading" &&
    !clusterStatus
  ) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxWidth: 1100,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: C.text,
            }}
          >
            Dashboard
          </h2>

          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: C.muted,
            }}
          >
            Kubernetes security posture
            and live cluster overview
          </p>
        </div>

        <EmptyState
          message="Loading live Kubernetes data…"
          sub="Connecting to the Kubernetes API"
        />
      </div>
    );
  }


  /* =========================================
   * ERROR STATE
   * ========================================= */

  if (
    loadState === "error" &&
    !clusterStatus
  ) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxWidth: 1100,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: C.text,
            }}
          >
            Dashboard
          </h2>

          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: C.muted,
            }}
          >
            Kubernetes security posture
            and live cluster overview
          </p>
        </div>

        <ErrorBanner
          title="Kubernetes Dashboard Unavailable"
          message={
            error ||
            "Unable to retrieve Kubernetes cluster data."
          }
          code="K8S_DASHBOARD_ERROR"
        />

        <button
          onClick={loadDashboard}
          style={{
            alignSelf: "flex-start",
            padding:
              "7px 14px",
            fontSize: 11,
            fontWeight: 600,
            color: "#fff",
            background: C.accent,
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }


  /* =========================================
   * SECURITY REPORT CALCULATIONS
   *
   * Only use actual MongoDB reports.
   * Never fabricate values.
   * ========================================= */

  const latestReport =
    reports.length > 0
      ? reports[0]
      : null;


  /*
   * These values remain empty when there
   * are no real analysis reports.
   */
  const totalFindings =
    reports.reduce(
      (total, report) =>
        total +
        (report.findingCount ?? 0),
      0
    );


  const criticalHighReports =
    reports.filter(
      (report) => {
        const severity =
          report.severity?.toUpperCase();

        return (
          severity === "CRITICAL" ||
          severity === "HIGH"
        );
      }
    );


  /* =========================================
   * LIVE KUBERNETES CALCULATIONS
   * ========================================= */

  const readyNodes =
    clusterStatus?.nodes?.filter(
      (node) =>
        node.status ===
          "Ready" ||
        node.status ===
          "True"
    ).length ?? 0;


  const runningPods =
    pods.filter(
      (pod) =>
        pod.phase ===
        "Running"
    ).length;


  const readyPods =
    pods.filter(
      (pod) =>
        isPodReady(pod)
    ).length;


  const availableDeployments =
    deployments.filter(
      (deployment) =>
        deployment.availableReplicas >
        0
    ).length;


  /* =========================================
   * RENDER
   * ========================================= */

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxWidth: 1100,
      }}
    >

      {/* =====================================
          TITLE
          ===================================== */}

      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: C.text,
            letterSpacing:
              "-0.02em",
          }}
        >
          Dashboard
        </h2>

        <p
          style={{
            margin: "2px 0 0",
            fontSize: 12,
            color: C.muted,
          }}
        >
          Kubernetes security posture
          and live cluster overview
        </p>
      </div>


      {/* =====================================
          LIVE CONNECTION STATUS
          ===================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding:
            "7px 10px",
          background:
            "#f0fdf4",
          border:
            "1px solid #bbf7d0",
          borderRadius: 6,
          fontSize: 11,
          color: "#166534",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background:
              "#16a34a",
          }}
        />

        <strong>
          Kubernetes
        </strong>

        <span>
          {clusterStatus?.status ||
            "Unknown"}
        </span>

        <span
          style={{
            marginLeft:
              "auto",
            fontFamily:
              "var(--font-mono)",
            fontSize: 10,
          }}
        >
          LIVE
        </span>

        <button
          onClick={loadDashboard}
          disabled={
            loadState ===
            "loading"
          }
          style={{
            marginLeft: 8,
            padding:
              "3px 8px",
            border:
              "1px solid #86efac",
            background:
              "#ffffff",
            color:
              "#166534",
            borderRadius: 4,
            cursor:
              "pointer",
            fontSize: 10,
          }}
        >
          Refresh
        </button>
      </div>


      {/* =====================================
          TOP METRICS
          ===================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, 1fr)",
          gap: 12,
        }}
      >

        {/* Overall Risk */}

        <MetricCard
          label="Overall Risk"
          value={
            latestReport
              ? "Available"
              : "—"
          }
          sub={
            latestReport
              ? "From analysis reports"
              : "No analysis"
          }
          color={
            latestReport
              ? C.high
              : C.muted
          }
        />


        {/* Findings */}

        <MetricCard
          label="Findings"
          value={
            reports.length > 0
              ? String(
                  totalFindings
                )
              : "—"
          }
          sub={
            reports.length > 0
              ? "Total findings"
              : "No analysis"
          }
          color={C.accent}
        />


        {/* Critical / High */}

        <MetricCard
          label="Critical / High"
          value={
            reports.length > 0
              ? String(
                  criticalHighReports.length
                )
              : "—"
          }
          sub={
            reports.length > 0
              ? "Reported analyses"
              : "No analysis"
          }
          color={
            criticalHighReports.length >
            0
              ? C.critical
              : C.muted
          }
        />


        {/* Cluster */}

        <MetricCard
          label="Cluster Status"
          value={
            clusterStatus?.status ||
            "Unknown"
          }
          sub={`${readyNodes} Ready Node${
            readyNodes === 1
              ? ""
              : "s"
          }`}
          color={
            clusterStatus?.status ===
            "Connected"
              ? C.low
              : C.high
          }
        />

      </div>


      {/* =====================================
          SECURITY POSTURE + LIVE CLUSTER
          ===================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 12,
        }}
      >

        {/* Security Posture */}

        <Panel
          title="Security Posture"
        >
          <div
            style={{
              padding:
                "10px 14px",
              display:
                "flex",
              flexDirection:
                "column",
              gap: 10,
            }}
          >

            <InfoRow
              label="Risk Score"
              value={
                latestReport
                  ? "See analysis"
                  : "—"
              }
              mono
            />

            <InfoRow
              label="Highest Severity"
              value={
                latestReport?.severity ||
                "—"
              }
              mono
              color={
                latestReport?.severity
                  ? C.high
                  : C.muted
              }
            />

            <InfoRow
              label="Findings"
              value={
                reports.length > 0
                  ? String(
                      totalFindings
                    )
                  : "—"
              }
              mono
            />

            <InfoRow
              label="Last Analysis"
              value={
                latestReport?.createdAt ||
                "—"
              }
              mono
              last
            />

          </div>
        </Panel>


        {/* Live Cluster */}

        <Panel
          title="Live Kubernetes Cluster"
        >
          <div
            style={{
              padding:
                "10px 14px",
              display:
                "flex",
              flexDirection:
                "column",
              gap: 10,
            }}
          >

            <InfoRow
              label="Kubernetes"
              value={
                clusterStatus?.status ||
                "Unknown"
              }
              mono
              color={
                clusterStatus?.status ===
                "Connected"
                  ? C.low
                  : C.high
              }
            />

            <InfoRow
              label="Ready Nodes"
              value={`${readyNodes} / ${
                clusterStatus?.nodeCount ??
                0
              }`}
              mono
            />

            <InfoRow
              label="Running Pods"
              value={`${runningPods} / ${
                pods.length
              }`}
              mono
            />

            <InfoRow
              label="Ready Pods"
              value={String(
                readyPods
              )}
              mono
            />

            <InfoRow
              label="Available Deployments"
              value={`${availableDeployments} / ${
                deployments.length
              }`}
              mono
            />

            <InfoRow
              label="Services"
              value={String(
                services.length
              )}
              mono
              last
            />

          </div>
        </Panel>

      </div>


      {/* =====================================
          CRITICAL FINDINGS
          ===================================== */}

      <Panel
        title="Critical Findings"
      >
        {reports.length === 0 ? (
          <EmptyState
            message="No analysis reports available."
            sub="Run YAML or security analysis to generate findings."
          />
        ) : (
          <div>
            {criticalHighReports.length ===
            0 ? (
              <EmptyState
                message="No Critical / High reports."
                sub="Current stored analysis reports contain no Critical or High severity results."
              />
            ) : (
              criticalHighReports.map(
                (
                  report,
                  index
                ) => (
                  <div
                    key={
                      report._id ||
                      index
                    }
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 12,
                      padding:
                        "9px 14px",
                      borderBottom:
                        index <
                        criticalHighReports.length -
                          1
                          ? `1px solid ${C.borderLight}`
                          : undefined,
                    }}
                  >

                    <span
                      style={{
                        fontFamily:
                          "var(--font-mono)",
                        fontSize:
                          11,
                        fontWeight:
                          600,
                        color:
                          C.accent,
                      }}
                    >
                      {report._id}
                    </span>

                    <span
                      style={{
                        flex: 1,
                        fontSize:
                          12,
                        color:
                          C.text,
                      }}
                    >
                      {report.title}
                    </span>

                    <SeverityBadge
                      severity={
                        report.severity
                      }
                    />

                    <span
                      style={{
                        fontFamily:
                          "var(--font-mono)",
                        fontSize:
                          10,
                        color:
                          C.muted,
                      }}
                    >
                      {report.findingCount ??
                        0}{" "}
                      findings
                    </span>

                  </div>
                )
              )
            )}
          </div>
        )}
      </Panel>


      {/* =====================================
          RECENT ANALYSES
          ===================================== */}

      <Panel
        title="Recent Analyses"
      >
        {reports.length === 0 ? (
          <EmptyState
            message="No analysis reports available."
            sub="Analysis results will appear here after a report is generated."
          />
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
                    "Analysis ID",
                    "Type",
                    "Resource",
                    "Severity",
                    "Findings",
                    "Created",
                  ].map(
                    (heading) => (
                      <th
                        key={
                          heading
                        }
                        style={{
                          padding:
                            "7px 12px",
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
                {reports
                  .slice(0, 10)
                  .map(
                    (
                      report,
                      index
                    ) => (
                      <tr
                        key={
                          report._id ||
                          index
                        }
                        style={{
                          borderBottom:
                            index <
                            Math.min(
                              reports.length,
                              10
                            ) -
                              1
                              ? `1px solid ${C.borderLight}`
                              : undefined,
                        }}
                      >

                        <td
                          style={{
                            padding:
                              "8px 12px",
                            fontFamily:
                              "var(--font-mono)",
                            fontSize:
                              10,
                            color:
                              C.accent,
                          }}
                        >
                          {
                            report._id
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "8px 12px",
                            fontSize:
                              11,
                            color:
                              C.text,
                          }}
                        >
                          {
                            report.title
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "8px 12px",
                            fontFamily:
                              "var(--font-mono)",
                            fontSize:
                              10,
                            color:
                              C.sub,
                          }}
                        >
                          {
                            report.namespace ||
                            "—"
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "8px 12px",
                          }}
                        >
                          <SeverityBadge
                            severity={
                              report.severity
                            }
                          />
                        </td>

                        <td
                          style={{
                            padding:
                              "8px 12px",
                            fontFamily:
                              "var(--font-mono)",
                            fontSize:
                              10,
                            color:
                              C.sub,
                          }}
                        >
                          {
                            report.findingCount ??
                            0
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "8px 12px",
                            fontFamily:
                              "var(--font-mono)",
                            fontSize:
                              10,
                            color:
                              C.muted,
                          }}
                        >
                          {
                            report.createdAt ||
                            "—"
                          }
                        </td>

                      </tr>
                    )
                  )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>


      {/* =====================================
          LIVE PODS
          ===================================== */}

      <Panel
        title="Live Kubernetes Pods"
      >
        {pods.length === 0 ? (
          <EmptyState
            message="No Pods returned."
            sub="The Kubernetes API returned no Pods."
          />
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
                    "Pod",
                    "Namespace",
                    "Status",
                    "Ready",
                    "Restarts",
                    "Node",
                  ].map(
                    (heading) => (
                      <th
                        key={
                          heading
                        }
                        style={{
                          padding:
                            "7px 12px",
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
                {pods.map(
                  (
                    pod,
                    index
                  ) => (
                    <tr
                      key={
                        pod.name ||
                        index
                      }
                      style={{
                        borderBottom:
                          index <
                          pods.length -
                            1
                            ? `1px solid ${C.borderLight}`
                            : undefined,
                      }}
                    >

                      <td
                        style={{
                          padding:
                            "8px 12px",
                          fontFamily:
                            "var(--font-mono)",
                          fontSize:
                            10,
                          color:
                            C.accent,
                        }}
                      >
                        {
                          pod.name ||
                          "—"
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "8px 12px",
                          fontFamily:
                            "var(--font-mono)",
                          fontSize:
                            10,
                          color:
                            C.sub,
                        }}
                      >
                        {
                          pod.namespace ||
                          "—"
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "8px 12px",
                        }}
                      >
                        <Chip
                          label={
                            getPodStatus(
                              pod
                            )
                          }
                          color={
                            pod.phase ===
                            "Running"
                              ? C.low
                              : C.high
                          }
                          bg={
                            pod.phase ===
                            "Running"
                              ? "#f0fdf4"
                              : "#fff7ed"
                          }
                          border={
                            pod.phase ===
                            "Running"
                              ? "#86efac"
                              : "#fdba74"
                          }
                        />
                      </td>

                      <td
                        style={{
                          padding:
                            "8px 12px",
                          fontFamily:
                            "var(--font-mono)",
                          fontSize:
                            10,
                          color:
                            isPodReady(
                              pod
                            )
                              ? C.low
                              : C.high,
                        }}
                      >
                        {isPodReady(
                          pod
                        )
                          ? "Ready"
                          : "Not Ready"}
                      </td>

                      <td
                        style={{
                          padding:
                            "8px 12px",
                          fontFamily:
                            "var(--font-mono)",
                          fontSize:
                            10,
                          color:
                            getRestartCount(
                              pod
                            ) >
                            0
                              ? C.high
                              : C.sub,
                        }}
                      >
                        {
                          getRestartCount(
                            pod
                          )
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "8px 12px",
                          fontFamily:
                            "var(--font-mono)",
                          fontSize:
                            10,
                          color:
                            C.sub,
                        }}
                      >
                        {
                          pod.nodeName ||
                          "—"
                        }
                      </td>

                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>


      {/* =====================================
          LIVE DEPLOYMENTS
          ===================================== */}

      <Panel
        title="Live Kubernetes Deployments"
      >
        {deployments.length ===
        0 ? (
          <EmptyState
            message="No Deployments returned."
            sub="The Kubernetes API returned no Deployments."
          />
        ) : (
          <div
            style={{
              display:
                "flex",
              flexDirection:
                "column",
            }}
          >
            {deployments.map(
              (
                deployment,
                index
              ) => (
                <div
                  key={
                    deployment.name ||
                    index
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 12,
                    padding:
                      "9px 14px",
                    borderBottom:
                      index <
                      deployments.length -
                        1
                        ? `1px solid ${C.borderLight}`
                        : undefined,
                  }}
                >

                  <span
                    style={{
                      flex: 1,
                      fontFamily:
                        "var(--font-mono)",
                      fontSize:
                        11,
                      color:
                        C.accent,
                    }}
                  >
                    {
                      deployment.name ||
                      "—"
                    }
                  </span>

                  <span
                    style={{
                      fontFamily:
                        "var(--font-mono)",
                      fontSize:
                        10,
                      color:
                        C.sub,
                    }}
                  >
                    {
                      deployment.namespace ||
                      "—"
                    }
                  </span>

                  <span
                    style={{
                      fontFamily:
                        "var(--font-mono)",
                      fontSize:
                        10,
                      color:
                        deployment.readyReplicas ===
                        deployment.replicas
                          ? C.low
                          : C.high,
                    }}
                  >
                    {
                      deployment.readyReplicas
                    }{" "}
                    /{" "}
                    {
                      deployment.replicas
                    }{" "}
                    Ready
                  </span>

                  <span
                    style={{
                      fontFamily:
                        "var(--font-mono)",
                      fontSize:
                        10,
                      color:
                        C.muted,
                    }}
                  >
                    Available{" "}
                    {
                      deployment.availableReplicas
                    }
                  </span>

                </div>
              )
            )}
          </div>
        )}
      </Panel>


      {/* =====================================
          LIVE SERVICES
          ===================================== */}

      <Panel
        title="Live Kubernetes Services"
      >
        {services.length ===
        0 ? (
          <EmptyState
            message="No Services returned."
            sub="The Kubernetes API returned no Services."
          />
        ) : (
          <div
            style={{
              display:
                "flex",
              flexDirection:
                "column",
            }}
          >
            {services.map(
              (
                service,
                index
              ) => (
                <div
                  key={
                    service.name ||
                    index
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 12,
                    padding:
                      "9px 14px",
                    borderBottom:
                      index <
                      services.length -
                        1
                        ? `1px solid ${C.borderLight}`
                        : undefined,
                  }}
                >

                  <span
                    style={{
                      flex: 1,
                      fontFamily:
                        "var(--font-mono)",
                      fontSize:
                        11,
                      color:
                        C.accent,
                    }}
                  >
                    {
                      service.name ||
                      "—"
                    }
                  </span>

                  <span
                    style={{
                      fontFamily:
                        "var(--font-mono)",
                      fontSize:
                        10,
                      color:
                        C.sub,
                    }}
                  >
                    {
                      service.namespace ||
                      "—"
                    }
                  </span>

                  <Chip
                    label={
                      service.type ||
                      "Unknown"
                    }
                    color={
                      C.sub
                    }
                    bg={C.bg}
                    border={
                      C.border
                    }
                  />

                  <span
                    style={{
                      fontFamily:
                        "var(--font-mono)",
                      fontSize:
                        10,
                      color:
                        C.muted,
                    }}
                  >
                    {
                      service.clusterIP ||
                      "—"
                    }
                  </span>

                </div>
              )
            )}
          </div>
        )}
      </Panel>


      {/* =====================================
          KUBERNETES EVENTS
          ===================================== */}

      <Panel
        title="Recent Kubernetes Events"
      >
        {events.length ===
        0 ? (
          <EmptyState
            message="No Kubernetes events returned."
            sub="The Kubernetes API returned no recent events."
          />
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
                    "Timestamp",
                  ].map(
                    (heading) => (
                      <th
                        key={
                          heading
                        }
                        style={{
                          padding:
                            "7px 12px",
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
                {events
                  .slice(0, 15)
                  .map(
                    (
                      event,
                      index
                    ) => (
                      <tr
                        key={
                          event.name ||
                          `${event.reason}-${index}`
                        }
                        style={{
                          borderBottom:
                            index <
                            Math.min(
                              events.length,
                              15
                            ) -
                              1
                              ? `1px solid ${C.borderLight}`
                              : undefined,
                        }}
                      >

                        <td
                          style={{
                            padding:
                              "8px 12px",
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
                              "8px 12px",
                            fontFamily:
                              "var(--font-mono)",
                            fontSize:
                              10,
                            color:
                              C.text,
                          }}
                        >
                          {
                            event.reason ||
                            "—"
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "8px 12px",
                            fontFamily:
                              "var(--font-mono)",
                            fontSize:
                              10,
                            color:
                              C.accent,
                          }}
                        >
                          {
                            event.involvedObject
                              ?.name ||
                            "—"
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "8px 12px",
                            fontSize:
                              11,
                            color:
                              C.text,
                            maxWidth:
                              450,
                          }}
                        >
                          {
                            event.message ||
                            "—"
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "8px 12px",
                            fontFamily:
                              "var(--font-mono)",
                            fontSize:
                              10,
                            color:
                              C.muted,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {formatEventTime(
                            event
                          )}
                        </td>

                      </tr>
                    )
                  )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

    </div>
  );
}


/* ==========================================
 * METRIC CARD
 * ========================================== */

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      style={{
        background:
          "#ffffff",
        border:
          `1px solid ${C.border}`,
        borderRadius: 8,
        padding:
          "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: C.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontFamily:
            "var(--font-mono)",
          fontSize: 20,
          fontWeight: 600,
          color,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 10,
          color: C.muted,
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );
}