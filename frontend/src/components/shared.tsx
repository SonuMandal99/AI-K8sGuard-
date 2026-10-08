import React from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
export const C = {
  border: "#d8dde3",
  borderLight: "#f0f2f5",
  bg: "#f7f8fa",
  surface: "#ffffff",
  text: "#1a2332",
  sub: "#5a6577",
  muted: "#8a94a3",
  accent: "#2563eb",
  accentBg: "#eff3ff",
  critical: "#dc2626", criticalBg: "#fef2f2", criticalBorder: "#fca5a5",
  high: "#ea580c",    highBg: "#fff7ed",    highBorder: "#fdba74",
  medium: "#d97706",  mediumBg: "#fffbeb",  mediumBorder: "#fcd34d",
  low: "#16a34a",     lowBg: "#f0fdf4",     lowBorder: "#86efac",
  amber: "#d97706",   amberBg: "#fffbeb",   amberBorder: "#fde68a",
};

export const SEV_MAP: Record<string, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: C.critical, bg: C.criticalBg, border: C.criticalBorder },
  HIGH:     { color: C.high,     bg: C.highBg,     border: C.highBorder },
  MEDIUM:   { color: C.medium,   bg: C.mediumBg,   border: C.mediumBorder },
  LOW:      { color: C.low,      bg: C.lowBg,      border: C.lowBorder },
  NONE:     { color: C.sub,      bg: C.bg,         border: C.border },
};

// ─── Primitives ───────────────────────────────────────────────────────────────
export function SeverityBadge({ severity }: { severity: string }) {
  const s = SEV_MAP[severity] ?? SEV_MAP.NONE;
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 3, padding: "1px 5px", letterSpacing: "0.03em", whiteSpace: "nowrap",
    }}>{severity}</span>
  );
}

export function Chip({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
      color, background: bg, border: `1px solid ${border}`,
      borderRadius: 3, padding: "1px 6px", letterSpacing: "0.05em", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

export function Panel({
  title, badge, badgeColor, badgeBg, children, style,
}: {
  title: string; badge?: string; badgeColor?: string; badgeBg?: string;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", ...style }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px 9px", borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, letterSpacing: "-0.01em" }}>{title}</span>
        {badge && (
          <Chip label={badge} color={badgeColor ?? C.sub} bg={badgeBg ?? C.bg}
            border={`${badgeColor ?? C.sub}33`} />
        )}
      </div>
      {children}
    </div>
  );
}

export function InfoRow({
  label, value, mono, color, last,
}: {
  label: string; value: React.ReactNode; mono?: boolean; color?: string; last?: boolean;
}) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "160px 1fr", gap: 8,
      padding: "7px 14px", borderBottom: last ? undefined : `1px solid ${C.borderLight}`,
      alignItems: "start",
    }}>
      <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
      <span style={{
        fontSize: 11, fontFamily: mono ? "var(--font-mono)" : undefined,
        fontWeight: mono ? 500 : 400, color: color ?? C.text,
      }}>{value}</span>
    </div>
  );
}

export function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
      <Chip label={label} color="#2563eb" bg="#eff3ff" border="#bfdbfe" />
      {sub && <span style={{ fontSize: 11, color: C.muted }}>{sub}</span>}
    </div>
  );
}

// ─── Loading / Error states ───────────────────────────────────────────────────
export function Spinner() {
  return (
    <>
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        border: "2px solid #d8dde3", borderTopColor: "#2563eb",
        animation: "_spin 0.75s linear infinite",
        flexShrink: 0,
      }} />
    </>
  );
}

export function LoadingState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "36px 20px", display: "flex", flexDirection: "column",
      alignItems: "center", gap: 10, textAlign: "center",
    }}>
      <Spinner />
      <div style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>{message}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>}
    </div>
  );
}

export function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "36px 20px", display: "flex", flexDirection: "column",
      alignItems: "center", gap: 8, textAlign: "center",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", background: C.bg, border: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontSize: 13, color: C.muted,
      }}>▶</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>{message}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>}
    </div>
  );
}

export function ErrorBanner({
  title, message, code,
}: { title: string; message: string; code?: string }) {
  return (
    <div style={{
      background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8,
      padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Chip label="ERROR" color={C.critical} bg={C.criticalBg} border={C.criticalBorder} />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.critical }}>{title}</span>
        {code && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: C.critical }}>
            [{code}]
          </span>
        )}
      </div>
      <span style={{ fontSize: 11, color: "#7f1d1d", paddingLeft: 1 }}>{message}</span>
    </div>
  );
}

// ─── LLM section wrapper ──────────────────────────────────────────────────────
export function LLMModelBar({ model = "Qwen2.5 3B", via = "Ollama" }: { model?: string; via?: string }) {
  return (
    <div style={{
      padding: "8px 14px", background: C.amberBg, borderBottom: `1px solid ${C.amberBorder}`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "#92400e" }}>MODEL</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: C.text }}>{model}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: C.muted }}>via</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: C.text }}>{via}</span>
      <span style={{ marginLeft: "auto", fontSize: 10, color: C.muted }}>Running locally — no data leaves your machine</span>
    </div>
  );
}

export function LLMDisclaimer() {
  return (
    <div style={{ padding: "7px 14px", background: C.amberBg, borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 10, color: "#92400e" }}>
        LLM INTERPRETATION — Deterministic findings above are authoritative. This is contextual commentary only.
      </span>
    </div>
  );
}

export function ConfidenceBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.75 ? C.low : value >= 0.5 ? C.medium : C.high;
  return (
    <div style={{ padding: "11px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
        LLM Confidence
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color, minWidth: 34 }}>{pct}%</span>
        <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 10, color: C.muted, lineHeight: 1.5 }}>
        Reflects model certainty about this interpretation. Does not affect deterministic findings.
      </p>
    </div>
  );
}

export function LLMSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "11px 14px", borderBottom: `1px solid ${C.borderLight}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: "var(--font-mono)", fontSize: 10.5,
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 3, padding: "0 4px", color: C.text,
    }}>{children}</code>
  );
}

export function EvidencePanel({
  title, badge, badgeColor, badgeBg, children, defaultOpen = false,
}: {
  title: string; badge?: string; badgeColor?: string; badgeBg?: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", background: open ? C.bg : C.surface,
          border: "none", cursor: "pointer",
          borderBottom: open ? `1px solid ${C.border}` : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: C.muted }}>{open ? "▼" : "▶"}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{title}</span>
          {badge && <Chip label={badge} color={badgeColor ?? C.sub} bg={badgeBg ?? C.bg} border={`${badgeColor ?? C.sub}33`} />}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: C.muted, letterSpacing: "0.04em" }}>
          {open ? "COLLAPSE" : "EXPAND"}
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export function PreBlock({ children }: { children: string }) {
  return (
    <pre style={{
      margin: 0, fontFamily: "var(--font-mono)", fontSize: 11,
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5,
      padding: "9px 12px", color: C.text, overflowX: "auto", lineHeight: 1.6,
    }}>{children}</pre>
  );
}

export function DashRule() {
  return <span style={{ fontFamily: "var(--font-mono)", color: C.muted }}>—</span>;
}
