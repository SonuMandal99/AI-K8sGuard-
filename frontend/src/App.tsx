import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import SecurityAnalysis from "./pages/SecurityAnalysis";
import YamlAnalysis from "./pages/YamlAnalysis";
import FailureDiagnosis from "./pages/FailureDiagnosis";
import Reports from "./pages/Reports";

type Page =
  | "dashboard"
  | "security"
  | "yaml"
  | "diagnosis"
  | "reports";

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "security", label: "Security Analysis" },
  { id: "yaml", label: "YAML Analysis" },
  { id: "diagnosis", label: "Failure Diagnosis" },
  { id: "reports", label: "Reports" },
];

const PAGE_TITLES: Record<Page, string> = {
  dashboard: "Dashboard",
  security: "Security Analysis",
  yaml: "YAML Analysis",
  diagnosis: "Failure Diagnosis",
  reports: "Reports",
};

function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function Sidebar({
  page,
  onNav,
}: {
  page: Page;
  onNav: (p: Page) => void;
}) {
  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: "#ffffff",
        borderRight: "1px solid #d8dde3",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "16px 16px 14px",
          borderBottom: "1px solid #d8dde3",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              background: "#2563eb",
              color: "#fff",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 5px",
              borderRadius: 3,
              letterSpacing: "0.02em",
            }}
          >
            K8S
          </span>

          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: "#1a2332",
              letterSpacing: "-0.01em",
            }}
          >
            AI-K8sGuard
          </span>
        </div>

        <div
          style={{
            fontSize: 11,
            color: "#8a94a3",
            paddingLeft: 1,
          }}
        >
          Kubernetes Security &amp; Diagnosis
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "8px 0" }}>
        {NAV_ITEMS.map((item) => {
          const active = item.id === page;

          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? "#2563eb" : "#3d4a5c",
                background: active
                  ? "#eff3ff"
                  : "transparent",
                border: "none",
                cursor: "pointer",
                borderLeft: active
                  ? "2px solid #2563eb"
                  : "2px solid transparent",
                transition:
                  "background 0.1s, color 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (
                    e.currentTarget as HTMLButtonElement
                  ).style.background = "#f7f8fa";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (
                    e.currentTarget as HTMLButtonElement
                  ).style.background =
                    "transparent";
                }
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom status */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #d8dde3",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#8a94a3",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          Connections
        </div>

        {[
          {
            label: "Kubernetes",
            status: "Connected",
            color: "#16a34a",
          },
          {
            label: "Ollama",
            status: "Deferred",
            color: "#d97706",
          },
          {
            label: "MongoDB",
            status: "Connected",
            color: "#16a34a",
          },
        ].map((connection) => (
          <div
            key={connection.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "#5a6577",
              }}
            >
              {connection.label}
            </span>

            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                color: connection.color,
                fontFamily: "var(--font-mono)",
                fontWeight: 500,
              }}
            >
              <StatusDot color={connection.color} />
              {connection.status}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Header({ page }: { page: Page }) {
  return (
    <header
      style={{
        height: 48,
        background: "#ffffff",
        borderBottom: "1px solid #d8dde3",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        flexShrink: 0,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: "#1a2332",
          letterSpacing: "-0.01em",
        }}
      >
        {PAGE_TITLES[page]}
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {[
          {
            label: "Kubernetes",
            value: "Connected",
            color: "#16a34a",
          },
          {
            label: "Ollama",
            value: "Deferred",
            color: "#d97706",
          },
          {
            label: "Environment",
            value: "Local",
            color: "#2563eb",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <StatusDot color={item.color} />

            <span
              style={{
                fontSize: 11,
                color: "#5a6577",
              }}
            >
              {item.label}
            </span>

            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#1a2332",
                fontFamily: "var(--font-mono)",
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </header>
  );
}

export default function App() {
  const [page, setPage] =
    useState<Page>("dashboard");

  /*
   * Shared YAML state.
   *
   * YAML Analysis writes the current YAML here.
   * Security Analysis receives the same YAML.
   */
  const [analysisYaml, setAnalysisYaml] =
    useState<string>("");

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Sidebar
        page={page}
        onNav={setPage}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Header page={page} />

        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: 20,
          }}
        >
          {/* Dashboard */}
          {page === "dashboard" && (
            <Dashboard />
          )}

          {/* Security Analysis */}
          {page === "security" && (
            <SecurityAnalysis
              yaml={analysisYaml}
            />
          )}

          {/* YAML Analysis */}
          {page === "yaml" && (
            <YamlAnalysis
              onYamlChange={setAnalysisYaml}
              onOpenSecurity={() =>
                setPage("security")
              }
            />
          )}

          {/* Failure Diagnosis */}
          {page === "diagnosis" && (
            <FailureDiagnosis />
          )}

          {/* Reports */}
          {page === "reports" && (
            <Reports />
          )}
        </main>
      </div>
    </div>
  );
}