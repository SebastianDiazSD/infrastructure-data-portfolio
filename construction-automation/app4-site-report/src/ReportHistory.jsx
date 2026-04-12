import { useState, useEffect } from "react";
import { Button, Spin, Select, Tooltip } from "antd";
import {
  DownloadOutlined, EditOutlined, LockOutlined,
  PlusOutlined, ArrowLeftOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Option } = Select;
const mono = "IBM Plex Mono, monospace";

const MONTH_NAMES = {
  de: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  es: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
};

const MONTH_SHORT = {
  de: ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"],
  en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  es: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
};

const DAY_HEADERS = {
  de: ["Mo","Di","Mi","Do","Fr","Sa","So"],
  en: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
  es: ["Lu","Ma","Mi","Ju","Vi","Sá","Do"],
};

const HIST_LANG = {
  de: {
    title: "Bericht-Verlauf", newReport: "Neuer Bericht",
    noReports: "Kein Bericht an diesem Tag.",
    download: "Download", edit: "Bearbeiten", locked: "Gesperrt",
    editableDays: "Bearbeitbar noch", back: "Zurück",
    lockNote: "Gesperrt — 7-Tage-Frist abgelaufen.",
    createdAt: "Erstellt", reports: "Berichte",
    subtitle: "Bericht-Verlauf",
    downloadTooltip: "Bericht herunterladen",
    lockedTooltip: "Gesperrt nach 7 Tagen",
    editTooltip: "Bericht bearbeiten",
    legendHigh: "≥ 20 Berichte",
    legendMid: "1–19 Berichte",
    legendNone: "0 Berichte",
    legendCurrent: "Aktueller Monat",
    legendToday: "Heute",
    legendFiled: "Bericht vorhanden",
    legendMissing: "Kein Bericht",
  },
  en: {
    title: "Report History", newReport: "New Report",
    noReports: "No report for this day.",
    download: "Download", edit: "Edit", locked: "Locked",
    editableDays: "Editable for", back: "Back",
    lockNote: "Locked — 7-day window expired.",
    createdAt: "Created", reports: "reports",
    subtitle: "Report History",
    downloadTooltip: "Download report",
    lockedTooltip: "Locked after 7 days",
    editTooltip: "Edit report",
    legendHigh: "≥ 20 reports",
    legendMid: "1–19 reports",
    legendNone: "0 reports",
    legendCurrent: "Current month",
    legendToday: "Today",
    legendFiled: "Report filed",
    legendMissing: "No report",
  },
  es: {
    title: "Historial", newReport: "Nuevo Informe",
    noReports: "Sin informe para este día.",
    download: "Descargar", edit: "Editar", locked: "Bloqueado",
    editableDays: "Editable por", back: "Atrás",
    lockNote: "Bloqueado — ventana de 7 días expirada.",
    createdAt: "Creado", reports: "informes",
    subtitle: "Historial de Informes",
    downloadTooltip: "Descargar informe",
    lockedTooltip: "Bloqueado después de 7 días",
    editTooltip: "Editar informe",
    legendHigh: "≥ 20 informes",
    legendMid: "1–19 informes",
    legendNone: "0 informes",
    legendCurrent: "Mes actual",
    legendToday: "Hoy",
    legendFiled: "Informe enviado",
    legendMissing: "Sin informe",
  },
};

function getDayColor(dayReports, dateStr) {
  const today = dayjs().format("YYYY-MM-DD");
  const isFuture = dateStr > today;
  if (isFuture) return { bg: "transparent", border: "#111", text: "#222", dot: null };
  if (!dayReports || dayReports.length === 0)
    return { bg: "#161616", border: "#252525", text: "#3a3a3a", dot: null };
  const allLocked = dayReports.every(r => r.locked);
  if (allLocked) return { bg: "#1a1200", border: "#3a2a00", text: "#fb923c", dot: "🔒" };
  return { bg: "#0a2215", border: "#1e5c30", text: "#4ade80", dot: "✅" };
}

export default function ReportHistory({ token, onNewReport, lang = "de" }) {
  const [reports, setReports]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [selectedYear, setSelectedYear]   = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay]     = useState(null);
  const [fadeIn, setFadeIn]               = useState(true);

  const today = dayjs();
  const HL     = HIST_LANG[lang]    || HIST_LANG.en;
  const MONTHS = MONTH_NAMES[lang]  || MONTH_NAMES.en;
  const MSHORT = MONTH_SHORT[lang]  || MONTH_SHORT.en;
  const DAYS   = DAY_HEADERS[lang]  || DAY_HEADERS.en;

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/reports", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Build date → reports lookup
  const reportsByDate = {};
  reports.forEach(r => {
    const d = r.report_data?.date;
    if (d) {
      if (!reportsByDate[d]) reportsByDate[d] = [];
      reportsByDate[d].push(r);
    }
  });

  // Count reports per month for selected year
  const reportsPerMonth = Array.from({ length: 12 }, (_, i) => {
    const prefix = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
    return Object.keys(reportsByDate).filter(d => d.startsWith(prefix)).length;
  });

  const years = [...new Set([
    today.year(),
    today.year() - 1,
    ...reports.map(r => r.report_data?.date?.slice(0, 4)).filter(Boolean).map(Number),
  ])].sort((a, b) => b - a);

  const transition = fn => {
    setFadeIn(false);
    setTimeout(() => { fn(); setFadeIn(true); }, 280);
  };

  const handleMonthClick  = i  => transition(() => { setSelectedMonth(i); setSelectedDay(null); });
  const handleBackToMonths = () => transition(() => { setSelectedMonth(null); setSelectedDay(null); });
  const handleDayClick    = d  => { if (reportsByDate[d]) setSelectedDay(selectedDay === d ? null : d); };

  const handleDownload = async report => {
    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(report.report_data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Bautagesbericht_${report.report_data?.project_id || "G2T"}_${report.report_data?.date}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert(`${HL.download} failed: ${e.message}`); }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
      <Spin size="large" />
    </div>
  );

  // ── Report detail card ──────────────────────────────────────────────────
  const renderReportCard = report => {
    const d         = report.report_data || {};
    const createdAt = dayjs(report.created_at);
    const daysLeft  = 7 - today.diff(createdAt, "day");
    return (
      <div key={report.id} style={{
        background: "#161616",
        border: `1px solid ${report.locked ? "#3a2a00" : "#2a2a2a"}`,
        borderRadius: 14, padding: "16px 20px", marginBottom: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ color: "#1d9fe8", fontFamily: mono, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              {d.project_id} — {d.project_name}
            </div>
            {d.supervisor && (
              <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>
                👤 {d.supervisor}
              </div>
            )}
            <div style={{ color: "#555", fontFamily: mono, fontSize: 10 }}>
              {HL.createdAt}: {createdAt.format("DD.MM.YYYY HH:mm")} ·{" "}
              {report.locked
                ? <span style={{ color: "#fb923c" }}>🔒 {HL.locked}</span>
                : <span style={{ color: "#4ade80" }}>✏️ {HL.editableDays} {daysLeft}d</span>
              }
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Tooltip title={HL.downloadTooltip}>
              <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(report)}
                style={{ background: "transparent", borderColor: "#1d6fa4", color: "#1d9fe8", fontFamily: mono, fontSize: 11 }}>
                {HL.download}
              </Button>
            </Tooltip>
            <Tooltip title={report.locked ? HL.lockedTooltip : HL.editTooltip}>
              <Button size="small"
                icon={report.locked ? <LockOutlined /> : <EditOutlined />}
                disabled={report.locked}
                style={{ background: "transparent", borderColor: report.locked ? "#3a3a3a" : "#333", color: report.locked ? "#444" : "#a0a0a0", fontFamily: mono, fontSize: 11 }}>
                {report.locked ? HL.locked : HL.edit}
              </Button>
            </Tooltip>
          </div>
        </div>
        {report.locked && (
          <div style={{ marginTop: 10, padding: "6px 10px", background: "#1a1200", border: "1px solid #3a2a00", borderRadius: 6 }}>
            <span style={{ color: "#7a5f00", fontFamily: mono, fontSize: 10 }}>{HL.lockNote}</span>
          </div>
        )}
      </div>
    );
  };

  // ── Month grid — 4 columns × 3 rows ────────────────────────────────────
  const renderMonthGrid = () => (
    <>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "clamp(8px, 1.5vw, 16px)",
      }}>
        {MONTHS.map((monthName, i) => {
          const count      = reportsPerMonth[i];
          const monthDate  = dayjs(`${selectedYear}-${String(i + 1).padStart(2, "0")}-01`);
          const isFuture   = monthDate.isAfter(today, "month");
          const isCurrent  = monthDate.isSame(today, "month");

          let bg = "#161616", border = "#252525", nameColor = "#555", numColor = "#333";
          if (!isFuture) {
            if (count >= 20)      { bg = "#0a2215"; border = "#1e5c30"; nameColor = "#e0e0e0"; numColor = "#4ade80"; }
            else if (count >= 10) { bg = "#0a2215"; border = "#1a4a28"; nameColor = "#c0c0c0"; numColor = "#86efac"; }
            else if (count >= 1)  { bg = "#1a1a0a"; border = "#3a3a10"; nameColor = "#a0a0a0"; numColor = "#facc15"; }
            else                  { bg = "#161616"; border = "#252525"; nameColor = "#444";    numColor = "#333";    }
          }
          if (isCurrent) border = "#1d9fe8";

          return (
            <div
              key={i}
              onClick={() => !isFuture && handleMonthClick(i)}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: "clamp(10px, 1.5vw, 16px)",
                padding: "clamp(14px, 2.5vw, 24px) clamp(10px, 1.5vw, 16px)",
                textAlign: "center",
                cursor: isFuture ? "default" : "pointer",
                opacity: isFuture ? 0.2 : 1,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => {
                if (!isFuture) {
                  e.currentTarget.style.borderColor = "#1d6fa4";
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(29,111,164,0.2)";
                }
              }}
              onMouseLeave={e => {
                if (!isFuture) {
                  e.currentTarget.style.borderColor = border;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              {/* Month name — full on desktop, short on small screens via CSS */}
              <div style={{
                color: nameColor,
                fontFamily: mono,
                fontWeight: 600,
                fontSize: "clamp(10px, 1.8vw, 14px)",
                marginBottom: "clamp(6px, 1vw, 12px)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {/* Show short name on very small screens */}
                <span className="month-full">{monthName}</span>
              </div>
              <div style={{
                color: numColor,
                fontFamily: mono,
                fontSize: "clamp(22px, 4vw, 38px)",
                fontWeight: 700,
                lineHeight: 1,
              }}>
                {isFuture ? "—" : count}
              </div>
              <div style={{
                color: "#3a3a3a",
                fontFamily: mono,
                fontSize: "clamp(8px, 1vw, 10px)",
                marginTop: 6,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}>
                {isFuture ? "" : HL.reports}
              </div>
              {isCurrent && (
                <div style={{ width: 5, height: 5, background: "#1d9fe8", borderRadius: "50%", margin: "8px auto 0" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 20,
        display: "flex",
        gap: "clamp(10px, 2vw, 20px)",
        flexWrap: "wrap",
        alignItems: "center",
      }}>
        {[
          { swatch: "#1e5c30", textColor: "#4ade80", label: HL.legendHigh },
          { swatch: "#3a3a10", textColor: "#facc15", label: HL.legendMid },
          { swatch: "#252525", textColor: "#555",    label: HL.legendNone },
          { swatch: "transparent", textColor: "#1d9fe8", label: HL.legendCurrent, borderColor: "#1d9fe8" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 3,
              background: item.swatch,
              border: item.borderColor ? `1px solid ${item.borderColor}` : "none",
              flexShrink: 0,
            }} />
            <span style={{ color: item.textColor, fontFamily: mono, fontSize: "clamp(9px, 1.2vw, 11px)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  // ── Day grid — 7 columns (Mon–Sun) ──────────────────────────────────────
  const renderDayGrid = () => {
    const firstDay    = dayjs(`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`);
    const daysInMonth = firstDay.daysInMonth();
    // Monday-first offset: dayjs 0=Sun,1=Mon..6=Sat → (dow+6)%7 gives 0=Mon..6=Sun
    const startOffset = (firstDay.day() + 6) % 7;

    return (
      <>
        {/* Month header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToMonths}
            style={{ background: "transparent", borderColor: "#333", color: "#a0a0a0", fontFamily: mono, fontSize: 11 }}
          >
            {HL.back}
          </Button>
          <span style={{ color: "#e0e0e0", fontFamily: mono, fontSize: "clamp(14px, 3vw, 20px)", fontWeight: 600 }}>
            {MONTHS[selectedMonth]} {selectedYear}
          </span>
          <span style={{ color: "#555", fontFamily: mono, fontSize: 11 }}>
            {reportsPerMonth[selectedMonth]} {HL.reports}
          </span>
        </div>

        {/* Day-of-week header row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "clamp(4px, 0.8vw, 8px)",
          marginBottom: "clamp(4px, 0.8vw, 8px)",
        }}>
          {DAYS.map(h => (
            <div key={h} style={{
              textAlign: "center",
              color: "#444",
              fontFamily: mono,
              fontSize: "clamp(9px, 1.2vw, 11px)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "4px 0",
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "clamp(4px, 0.8vw, 8px)",
        }}>
          {/* Empty offset cells */}
          {Array.from({ length: startOffset }, (_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: "clamp(48px, 7vw, 72px)" }} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dayNum    = i + 1;
            const dateStr   = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const dayReps   = reportsByDate[dateStr] || [];
            const colors    = getDayColor(dayReps, dateStr);
            const isToday   = dateStr === today.format("YYYY-MM-DD");
            const hasReport = dayReps.length > 0;
            const isSelected = selectedDay === dateStr;
            const isPast    = dateStr <= today.format("YYYY-MM-DD");

            return (
              <Tooltip
                key={dateStr}
                title={hasReport
                  ? `${dayReps[0].report_data?.project_id || ""} · ${dayReps[0].report_data?.supervisor || ""}`
                  : isPast ? HL.noReports : ""}
              >
                <div
                  onClick={() => hasReport && handleDayClick(dateStr)}
                  style={{
                    background: isSelected ? "#1a3a54" : colors.bg,
                    border: `${isSelected || isToday ? "2px" : "1px"} solid ${
                      isToday ? "#1d9fe8" : isSelected ? "#1d6fa4" : colors.border
                    }`,
                    borderRadius: "clamp(6px, 1vw, 10px)",
                    minHeight: "clamp(48px, 7vw, 72px)",
                    padding: "clamp(4px, 1vw, 8px) 4px clamp(4px, 0.8vw, 6px)",
                    textAlign: "center",
                    cursor: hasReport ? "pointer" : "default",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onMouseEnter={e => { if (hasReport) { e.currentTarget.style.borderColor = "#1d6fa4"; e.currentTarget.style.boxShadow = "0 0 0 1px #1d6fa4"; } }}
                  onMouseLeave={e => { if (hasReport) { e.currentTarget.style.borderColor = isToday ? "#1d9fe8" : isSelected ? "#1d6fa4" : colors.border; e.currentTarget.style.boxShadow = "none"; } }}
                >
                  <div style={{
                    color: isPast ? (hasReport ? colors.text : "#444") : "#222",
                    fontFamily: mono,
                    fontSize: "clamp(10px, 1.6vw, 14px)",
                    fontWeight: 600,
                    lineHeight: 1,
                  }}>
                    {String(dayNum).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: "clamp(10px, 1.5vw, 16px)", lineHeight: 1, marginTop: 2 }}>
                    {colors.dot || ""}
                  </div>
                  {isToday && (
                    <div style={{ width: 4, height: 4, background: "#1d9fe8", borderRadius: "50%", marginTop: 2, flexShrink: 0 }} />
                  )}
                </div>
              </Tooltip>
            );
          })}
        </div>

        {/* Day legend */}
        <div style={{ marginTop: 16, display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[
            { dot: "✅", color: "#4ade80", label: HL.legendFiled },
            { dot: "🔒", color: "#fb923c", label: HL.locked },
            { swatch: "#252525", color: "#444",    label: HL.legendMissing },
            { todayDot: true,    color: "#1d9fe8", label: HL.legendToday },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {item.dot && <span style={{ fontSize: 11 }}>{item.dot}</span>}
              {item.swatch && <div style={{ width: 10, height: 10, borderRadius: 2, background: item.swatch, flexShrink: 0 }} />}
              {item.todayDot && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1d9fe8", flexShrink: 0 }} />}
              <span style={{ color: item.color, fontFamily: mono, fontSize: "clamp(9px, 1.2vw, 11px)" }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Selected day report panel */}
        {selectedDay && reportsByDate[selectedDay] && (
          <div style={{
            marginTop: 20,
            opacity: 1,
            animation: "fadeSlideIn 0.25s ease",
          }}>
            {reportsByDate[selectedDay].map(renderReportCard)}
          </div>
        )}
      </>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#111", minHeight: "100vh", padding: "20px 0 40px" }}>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 500px) {
          .history-grid-months { grid-template-columns: repeat(3, 1fr) !important; }
          .month-full { display: none; }
          .month-short { display: inline !important; }
        }
        .month-short { display: none; }
      `}</style>

      <div className="g2t-container">

        {/* ── Header ── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          borderBottom: "1px solid #1e1e1e",
          paddingBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 4, height: 32, background: "#1d6fa4", borderRadius: 2 }} />
            <div>
              <div style={{ color: "#1d6fa4", fontFamily: mono, fontSize: 15, fontWeight: 600, letterSpacing: "0.05em" }}>
                GROUND2TECH
              </div>
              <div style={{ color: "#555", fontSize: 10, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {HL.subtitle}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Select
              value={selectedYear}
              onChange={val => transition(() => { setSelectedYear(val); setSelectedMonth(null); setSelectedDay(null); })}
              style={{ width: 90 }}
              size="small"
            >
              {years.map(y => <Option key={y} value={y}>{y}</Option>)}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={onNewReport}
              style={{ fontFamily: mono, fontWeight: 600, fontSize: 12 }}>
              {HL.newReport}
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "#2a1010", border: "1px solid #5a1e1e", borderRadius: 10, color: "#f87171", fontFamily: mono, fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* ── Animated content ── */}
        <div style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.28s ease, transform 0.28s ease",
        }}>
          {selectedMonth === null ? renderMonthGrid() : renderDayGrid()}
        </div>
      </div>
    </div>
  );
}
