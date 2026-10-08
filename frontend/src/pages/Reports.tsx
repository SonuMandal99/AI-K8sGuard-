import { useEffect, useState } from "react";
import {
  Panel,
  InfoRow,
  SeverityBadge,
  Chip,
  EvidencePanel,
  LoadingState,
  ErrorBanner,
  LLMSection,
  ConfidenceBar,
  LLMModelBar,
  LLMDisclaimer,
  C,
} from "../components/shared";

import {
  getReports,
  getReportDetail,
  type Report as ApiReport,
  type ReportFinding,
} from "../services/reports.api";

type ViewMode = "loading" | "done" | "error";

function formatAnalysisType(type: ApiReport["analysisType"]) {
  switch (type) {
    case "security":
      return "Security Analysis";
    case "failure":
      return "Failure Diagnosis";
    case "yaml":
      return "YAML Analysis";
    default:
      return type;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatDateShort(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return `Today ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return `Yesterday ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return date.toLocaleDateString();
}

function normalizeSeverity(
  severity: string | null | undefined
) {
  return severity || "NONE";
}

function getFindingId(
  finding: ReportFinding,
  index: number
) {
  return typeof finding.id === "string" && finding.id
    ? finding.id
    : `F-${String(index + 1).padStart(3, "0")}`;
}

function getFindingLabel(
  finding: ReportFinding
) {
  if (
    typeof finding.label === "string" &&
    finding.label
  ) {
    return finding.label;
  }

  if (
    typeof finding.description === "string" &&
    finding.description
  ) {
    return finding.description;
  }

  return "Security finding";
}

function getFindingSeverity(
  finding: ReportFinding
) {
  return finding.severity || "NONE";
}

function getFindingRisk(
  finding: ReportFinding
) {
  if (typeof finding.risk === "number") {
    return `Risk ${finding.risk}`;
  }

  if (typeof finding.risk === "string") {
    return finding.risk;
  }

  return "—";
}

function formatPerformanceValue(
  value: number | null | undefined,
  suffix = ""
) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value}${suffix}`;
}

function stringifyValue(
  value: unknown
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return String(value);
  }
}

function getEvidenceRows(
  evidence: unknown
) {
  if (!evidence) {
    return [];
  }

  if (Array.isArray(evidence)) {
    return evidence.map(
      (item, index) => ({
        label: `Evidence ${index + 1}`,
        value: stringifyValue(item),
        mono: true,
      })
    );
  }

  if (
    typeof evidence === "object"
  ) {
    return Object.entries(
      evidence as Record<string, unknown>
    ).map(([key, value]) => ({
      label: key,
      value: stringifyValue(value),
      mono:
        typeof value !== "string" ||
        value.includes("\n"),
    }));
  }

  return [
    {
      label: "Evidence",
      value: stringifyValue(evidence),
      mono: true,
    },
  ];
}

function getStringArray(
  value: unknown
): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (
          item &&
          typeof item === "object"
        ) {
          return stringifyValue(item);
        }

        return String(item);
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [stringifyValue(value)];
}

function StatusBadge({
  status,
}: {
  status: "Completed" | "Failed";
}) {
  const s =
    status === "Completed"
      ? {
          color: C.low,
          bg: "#f0fdf4",
          border: "#86efac",
        }
      : {
          color: C.critical,
          bg: "#fef2f2",
          border: "#fca5a5",
        };

  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 3,
        padding: "1px 5px",
        letterSpacing: "0.04em",
      }}
    >
      {status.toUpperCase()}
    </span>
  );
}

export default function Reports() {
  const [reports, setReports] =
    useState<ApiReport[]>([]);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [selectedReport, setSelectedReport] =
    useState<ApiReport | null>(null);

  const [listMode, setListMode] =
    useState<ViewMode>("loading");

  const [detailMode, setDetailMode] =
    useState<ViewMode>("done");

  const [listError, setListError] =
    useState<string | null>(null);

  const [detailError, setDetailError] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  /*
   * Load reports from MongoDB.
   */
  async function loadReports(
    showLoading = true
  ) {
    if (showLoading) {
      setListMode("loading");
    } else {
      setRefreshing(true);
    }

    setListError(null);

    const result = await getReports();

    if (result.error) {
      setListMode("error");
      setListError(result.error);
      setRefreshing(false);
      return;
    }

    const nextReports =
      result.data || [];

    setReports(nextReports);

    setListMode("done");
    setRefreshing(false);

    /*
     * If selected report no longer exists,
     * clear the detail panel.
     */
    if (
      selectedId &&
      !nextReports.some(
        (item) =>
          item._id === selectedId
      )
    ) {
      setSelectedId(null);
      setSelectedReport(null);
      setDetailMode("done");
    }
  }

  /*
   * Initial MongoDB report load.
   */
  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      setListMode("loading");
      setListError(null);

      const result =
        await getReports();

      if (cancelled) {
        return;
      }

      if (result.error) {
        setListMode("error");
        setListError(
          result.error
        );
        return;
      }

      setReports(
        result.data || []
      );

      setListMode("done");
    }

    initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Load selected report detail.
   */
  async function handleSelect(
    report: ApiReport
  ) {
    if (
      report._id === selectedId &&
      selectedReport
    ) {
      return;
    }

    setSelectedId(
      report._id
    );

    setSelectedReport(null);
    setDetailMode("loading");
    setDetailError(null);

    const result =
      await getReportDetail(
        report._id
      );

    if (result.error) {
      setDetailMode("error");
      setDetailError(
        result.error
      );
      return;
    }

    setSelectedReport(
      result.data || null
    );

    setDetailMode("done");
  }

  const report =
    selectedReport;

  const findings =
    report?.findings || [];

  const evidenceRows =
    report
      ? getEvidenceRows(
          report.evidence
        )
      : [];

  const causeItems =
    report
      ? getStringArray(
          report.cause
        )
      : [];

  const recommendationItems =
    report
      ? getStringArray(
          report.recommendation
        )
      : [];

  /*
   * Confidence is optional.
   */
  const confidence =
    report &&
    report.llmResponse &&
    typeof report.llmResponse ===
      "object" &&
    "confidence" in
      report.llmResponse
      ? Number(
          (
            report.llmResponse as Record<
              string,
              unknown
            >
          ).confidence
        )
      : null;

  const confidenceValue =
    confidence !== null &&
    Number.isFinite(confidence)
      ? confidence > 1
        ? confidence / 100
        : confidence
      : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxWidth: 1200,
      }}
    >
      {/* TITLE */}

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
          Reports
        </h2>

        <p
          style={{
            margin: "2px 0 0",
            fontSize: 12,
            color: C.muted,
          }}
        >
          Stored security analyses
          and failure diagnoses
        </p>
      </div>

      {/* TWO COLUMN LAYOUT */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 480px",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* REPORT LIST */}

        <div
          style={{
            background:
              C.surface,
            border:
              `1px solid ${C.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              padding:
                "10px 14px 9px",
              borderBottom:
                `1px solid ${C.border}`,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.text,
              }}
            >
              Stored Reports
            </span>

            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 8,
              }}
            >
              <Chip
                label={`${reports.length} RECORDS`}
                color={C.sub}
                bg={C.bg}
                border={C.border}
              />

              <button
                type="button"
                onClick={() =>
                  loadReports(false)
                }
                disabled={
                  refreshing ||
                  listMode ===
                    "loading"
                }
                style={{
                  border:
                    `1px solid ${C.border}`,
                  background:
                    C.surface,
                  color:
                    C.accent,
                  borderRadius: 4,
                  padding:
                    "4px 8px",
                  fontFamily:
                    "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  cursor:
                    refreshing ||
                    listMode ===
                      "loading"
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    refreshing ||
                    listMode ===
                      "loading"
                      ? 0.6
                      : 1,
                }}
              >
                {refreshing
                  ? "REFRESHING…"
                  : "REFRESH"}
              </button>
            </div>
          </div>

          {/* LOADING */}

          {listMode ===
            "loading" && (
            <div
              style={{
                padding: 14,
              }}
            >
              <LoadingState
                message="Loading reports…"
                sub="Retrieving stored reports from MongoDB"
              />
            </div>
          )}

          {/* ERROR */}

          {listMode ===
            "error" && (
            <div
              style={{
                padding: 14,
              }}
            >
              <ErrorBanner
                title="Reports Unavailable"
                message={
                  listError ||
                  "The reports could not be retrieved from MongoDB."
                }
                code="REPORTS_FETCH_FAILED"
              />

              <button
                type="button"
                onClick={() =>
                  loadReports()
                }
                style={{
                  marginTop: 10,
                  padding:
                    "6px 10px",
                  border:
                    `1px solid ${C.border}`,
                  background:
                    C.surface,
                  color:
                    C.accent,
                  borderRadius: 4,
                  cursor:
                    "pointer",
                  fontFamily:
                    "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                RETRY
              </button>
            </div>
          )}

          {/* EMPTY */}

          {listMode ===
            "done" &&
            reports.length ===
              0 && (
              <div
                style={{
                  padding:
                    "40px 20px",
                  textAlign:
                    "center",
                  color:
                    C.muted,
                  fontSize: 11,
                }}
              >
                <div>
                  No reports have
                  been stored yet.
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 10,
                    color:
                      C.muted,
                    lineHeight:
                      1.5,
                  }}
                >
                  Run a security
                  analysis or
                  failure diagnosis
                  that creates a
                  report, then
                  refresh this page.
                </div>
              </div>
            )}

          {/* TABLE */}

          {listMode ===
            "done" &&
            reports.length >
              0 && (
              <div
                style={{
                  overflowX:
                    "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
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
                        "Analysis Type",
                        "Severity",
                        "Risk",
                        "Created",
                        "Status",
                      ].map(
                        (heading) => (
                          <th
                            key={
                              heading
                            }
                            style={{
                              padding:
                                "7px 14px",
                              textAlign:
                                "left",
                              fontSize:
                                10,
                              fontWeight:
                                600,
                              color:
                                C.muted,
                              letterSpacing:
                                "0.05em",
                              textTransform:
                                "uppercase",
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
                    {reports.map(
                      (r, index) => {
                        const isActive =
                          r._id ===
                          selectedId;

                        const severity =
                          normalizeSeverity(
                            r.severity
                          );

                        return (
                          <tr
                            key={
                              r._id
                            }
                            onClick={() =>
                              handleSelect(
                                r
                              )
                            }
                            style={{
                              borderBottom:
                                index <
                                reports.length -
                                  1
                                  ? `1px solid ${C.borderLight}`
                                  : undefined,
                              background:
                                isActive
                                  ? C.accentBg
                                  : undefined,
                              cursor:
                                "pointer",
                            }}
                            onMouseEnter={(
                              event
                            ) => {
                              if (
                                !isActive
                              ) {
                                event.currentTarget.style.background =
                                  C.bg;
                              }
                            }}
                            onMouseLeave={(
                              event
                            ) => {
                              if (
                                !isActive
                              ) {
                                event.currentTarget.style.background =
                                  "";
                              }
                            }}
                          >
                            <td
                              style={{
                                padding:
                                  "8px 14px",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily:
                                    "var(--font-mono)",
                                  fontSize:
                                    11,
                                  fontWeight:
                                    700,
                                  color:
                                    C.accent,
                                }}
                              >
                                {
                                  r.analysisId
                                }
                              </span>
                            </td>

                            <td
                              style={{
                                padding:
                                  "8px 14px",
                                fontSize:
                                  12,
                                color:
                                  C.text,
                              }}
                            >
                              {formatAnalysisType(
                                r.analysisType
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "8px 14px",
                              }}
                            >
                              {severity ===
                              "NONE" ? (
                                <Chip
                                  label="NONE"
                                  color={
                                    C.sub
                                  }
                                  bg={
                                    C.bg
                                  }
                                  border={
                                    C.border
                                  }
                                />
                              ) : (
                                <SeverityBadge
                                  severity={
                                    severity
                                  }
                                />
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "8px 14px",
                                fontFamily:
                                  "var(--font-mono)",
                                fontSize:
                                  11,
                                fontWeight:
                                  600,
                                color:
                                  C.text,
                              }}
                            >
                              {
                                r.risk
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  "8px 14px",
                                fontFamily:
                                  "var(--font-mono)",
                                fontSize:
                                  11,
                                color:
                                  C.muted,
                              }}
                            >
                              {formatDateShort(
                                r.createdAt
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "8px 14px",
                              }}
                            >
                              <StatusBadge
                                status="Completed"
                              />
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        {/* REPORT DETAIL */}

        <div
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            gap: 12,
          }}
        >
          {/* NO SELECTION */}

          {!selectedId && (
            <div
              style={{
                background:
                  C.surface,
                border:
                  `1px solid ${C.border}`,
                borderRadius: 8,
                padding:
                  "40px 20px",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius:
                    "50%",
                  background:
                    C.bg,
                  border:
                    `1px solid ${C.border}`,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  margin:
                    "0 auto 8px",
                  color:
                    C.muted,
                }}
              >
                ↖
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color:
                    C.sub,
                }}
              >
                No report selected
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 11,
                  color:
                    C.muted,
                }}
              >
                Click a row to view
                report details
              </div>
            </div>
          )}

          {/* DETAIL LOADING */}

          {selectedId &&
            detailMode ===
              "loading" && (
              <LoadingState
                message="Loading report…"
                sub="Retrieving report details from MongoDB"
              />
            )}

          {/* DETAIL ERROR */}

          {selectedId &&
            detailMode ===
              "error" && (
              <ErrorBanner
                title="Report Unavailable"
                message={
                  detailError ||
                  "The requested report could not be retrieved."
                }
                code="REPORT_NOT_FOUND"
              />
            )}

          {/* DETAIL */}

          {selectedId &&
            detailMode ===
              "done" &&
            report && (
              <>
                <Panel
                  title={`Report: ${report.analysisId}`}
                  badge={formatAnalysisType(
                    report.analysisType
                  ).toUpperCase()}
                  badgeColor={
                    C.accent
                  }
                  badgeBg={
                    C.accentBg
                  }
                >
                  <InfoRow
                    label="Analysis ID"
                    value={
                      report.analysisId
                    }
                    mono
                  />

                  <InfoRow
                    label="Analysis Type"
                    value={formatAnalysisType(
                      report.analysisType
                    )}
                  />

                  <InfoRow
                    label="Created"
                    value={formatDate(
                      report.createdAt
                    )}
                    mono
                  />

                  <InfoRow
                    label="Updated"
                    value={formatDate(
                      report.updatedAt
                    )}
                    mono
                  />

                  <InfoRow
                    label="Risk Score"
                    value={String(
                      report.risk ??
                        0
                    )}
                    mono
                    color={
                      report.risk ===
                      0
                        ? C.low
                        : C.critical
                    }
                  />

                  <InfoRow
                    label="Severity"
                    value={
                      normalizeSeverity(
                        report.severity
                      ) ===
                      "NONE" ? (
                        <Chip
                          label="NONE"
                          color={
                            C.sub
                          }
                          bg={
                            C.bg
                          }
                          border={
                            C.border
                          }
                        />
                      ) : (
                        <SeverityBadge
                          severity={normalizeSeverity(
                            report.severity
                          )}
                        />
                      )
                    }
                    last
                  />
                </Panel>

                {/* FINDINGS */}

                <Panel
                  title="Findings"
                  badge="DETERMINISTIC ENGINE"
                  badgeColor={
                    C.low
                  }
                  badgeBg="#f0fdf4"
                >
                  {findings.length ===
                  0 ? (
                    <div
                      style={{
                        padding:
                          "14px 16px",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 8,
                      }}
                    >
                      <Chip
                        label="NO FINDINGS"
                        color={
                          C.low
                        }
                        bg="#f0fdf4"
                        border="#86efac"
                      />

                      <span
                        style={{
                          fontSize:
                            12,
                          color:
                            C.low,
                        }}
                      >
                        No violations
                        were stored
                        for this
                        analysis.
                      </span>
                    </div>
                  ) : (
                    findings.map(
                      (finding, index) => {
                        const id =
                          getFindingId(
                            finding,
                            index
                          );

                        return (
                          <div
                            key={`${id}-${index}`}
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 10,
                              padding:
                                "8px 14px",
                              borderBottom:
                                index <
                                findings.length -
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
                                  700,
                                color:
                                  C.accent,
                                minWidth:
                                  60,
                              }}
                            >
                              {id}
                            </span>

                            <span
                              style={{
                                flex:
                                  1,
                                fontSize:
                                  11,
                                color:
                                  C.text,
                              }}
                            >
                              {getFindingLabel(
                                finding
                              )}
                            </span>

                            <SeverityBadge
                              severity={getFindingSeverity(
                                finding
                              )}
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
                              {getFindingRisk(
                                finding
                              )}
                            </span>
                          </div>
                        );
                      }
                    )
                  )}
                </Panel>

                {/* EVIDENCE */}

                <EvidencePanel
                  title="Evidence"
                  badge="OBSERVED"
                  badgeColor={
                    C.accent
                  }
                  badgeBg={
                    C.accentBg
                  }
                  defaultOpen
                >
                  {evidenceRows.length ===
                  0 ? (
                    <InfoRow
                      label="Evidence"
                      value="No evidence stored"
                      last
                    />
                  ) : (
                    evidenceRows.map(
                      (item, index) => (
                        <InfoRow
                          key={`${item.label}-${index}`}
                          label={
                            item.label
                          }
                          value={
                            item.value
                          }
                          mono={
                            item.mono
                          }
                          last={
                            index ===
                            evidenceRows.length -
                              1
                          }
                        />
                      )
                    )
                  )}
                </EvidencePanel>

                {/* LLM */}

                <Panel
                  title="LLM Interpretation"
                  badge="SUPPLEMENTARY"
                  badgeColor={
                    C.amber
                  }
                  badgeBg={
                    C.amberBg
                  }
                >
                  <LLMModelBar />
                  <LLMDisclaimer />

                  {report.explanation && (
                    <LLMSection label="Explanation">
                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            11.5,
                          color:
                            C.text,
                          lineHeight:
                            1.65,
                        }}
                      >
                        {
                          report.explanation
                        }
                      </p>
                    </LLMSection>
                  )}

                  {causeItems.length >
                    0 && (
                    <LLMSection label="Cause">
                      <ul
                        style={{
                          margin:
                            0,
                          padding:
                            "0 0 0 15px",
                        }}
                      >
                        {causeItems.map(
                          (
                            cause,
                            index
                          ) => (
                            <li
                              key={`${cause}-${index}`}
                              style={{
                                fontSize:
                                  11.5,
                                color:
                                  C.text,
                                lineHeight:
                                  1.5,
                                marginBottom:
                                  3,
                              }}
                            >
                              {cause}
                            </li>
                          )
                        )}
                      </ul>
                    </LLMSection>
                  )}

                  {recommendationItems.length >
                    0 && (
                    <LLMSection label="Recommendation">
                      <ol
                        style={{
                          margin:
                            0,
                          padding:
                            "0 0 0 15px",
                        }}
                      >
                        {recommendationItems.map(
                          (
                            recommendation,
                            index
                          ) => (
                            <li
                              key={`${recommendation}-${index}`}
                              style={{
                                fontSize:
                                  11.5,
                                color:
                                  C.text,
                                lineHeight:
                                  1.5,
                                marginBottom:
                                  3,
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

                  {confidenceValue !==
                    null && (
                    <ConfidenceBar
                      value={
                        confidenceValue
                      }
                      label={
                        confidenceValue >=
                        0.85
                          ? "High"
                          : confidenceValue >=
                            0.7
                          ? "Moderate"
                          : "Low"
                      }
                    />
                  )}

                  {!report.explanation &&
                    causeItems.length ===
                      0 &&
                    recommendationItems.length ===
                      0 && (
                      <div
                        style={{
                          padding:
                            "12px 0",
                          fontSize:
                            11,
                          color:
                            C.muted,
                        }}
                      >
                        No LLM interpretation
                        was stored
                        for this report.
                      </div>
                    )}
                </Panel>

                {/* DIAGNOSIS */}

                {report.diagnosis !==
                  null &&
                  report.diagnosis !==
                    undefined && (
                    <EvidencePanel
                      title="Diagnosis Data"
                      badge="DIAGNOSIS"
                      badgeColor={
                        C.accent
                      }
                      badgeBg={
                        C.accentBg
                      }
                      defaultOpen={
                        false
                      }
                    >
                      <InfoRow
                        label="Diagnosis"
                        value={stringifyValue(
                          report.diagnosis
                        )}
                        mono
                        last
                      />
                    </EvidencePanel>
                  )}

                {/* PERFORMANCE */}

                <Panel
                  title="Performance"
                  badge="ANALYSIS RUN"
                  badgeColor={
                    C.sub
                  }
                  badgeBg={
                    C.bg
                  }
                >
                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(3, 1fr)",
                    }}
                  >
                    {[
                      {
                        label:
                          "Latency",
                        value:
                          formatPerformanceValue(
                            report
                              .performance
                              ?.latency,
                            " ms"
                          ),
                      },
                      {
                        label:
                          "CPU Usage",
                        value:
                          formatPerformanceValue(
                            report
                              .performance
                              ?.cpuUsage,
                            "%"
                          ),
                      },
                      {
                        label:
                          "Memory",
                        value:
                          formatPerformanceValue(
                            report
                              .performance
                              ?.memoryUsage,
                            " MB"
                          ),
                      },
                    ].map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={
                            item.label
                          }
                          style={{
                            padding:
                              "12px 14px",
                            borderRight:
                              index <
                              2
                                ? `1px solid ${C.border}`
                                : undefined,
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                10,
                              color:
                                C.muted,
                              marginBottom:
                                4,
                            }}
                          >
                            {
                              item.label
                            }
                          </div>

                          <div
                            style={{
                              fontFamily:
                                "var(--font-mono)",
                              fontSize:
                                16,
                              fontWeight:
                                700,
                              color:
                                item.value ===
                                "—"
                                  ? C.muted
                                  : C.text,
                            }}
                          >
                            {
                              item.value
                            }
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </Panel>
              </>
            )}
        </div>
      </div>
    </div>
  );
}