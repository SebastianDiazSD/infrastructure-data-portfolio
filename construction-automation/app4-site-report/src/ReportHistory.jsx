import { useState, useEffect } from "react";
import { Button, Card, Space, Typography, Tag, Spin, Alert, Tooltip } from "antd";
import {
  DownloadOutlined, EditOutlined, LockOutlined,
  PlusOutlined, CalendarOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const mono = "IBM Plex Mono, monospace";

const HIST_LANG = {
  de: { title: "Bericht-Verlauf", newReport: "Neuer Bericht",
        last35: "Letzte 35 Tage", filed: "Bericht eingereicht",
        noReport: "Kein Bericht", noReports: "Noch keine Berichte vorhanden.",
        download: "Download", edit: "Bearbeiten", locked: "Gesperrt",
        editableDays: "Bearbeitbar noch", lockNote: "Berichte können bis zu 7 Tage nach Erstellung bearbeitet werden. Danach sind sie schreibgeschützt. (Bautagesbericht = rechtliches Dokument)",
        createdAt: "Erstellt", downloadTooltip: "Bericht herunterladen (immer verfügbar)",
        editTooltip: "Bericht bearbeiten", lockedTooltip: "Bericht ist gesperrt — Bearbeitung nach 7 Tagen nicht mehr möglich",
        subtitle: "Bericht-Verlauf" },
  en: { title: "Report History", newReport: "New Report",
        last35: "Last 35 days", filed: "Report filed",
        noReport: "No report", noReports: "No reports yet. Create your first report.",
        download: "Download", edit: "Edit", locked: "Locked",
        editableDays: "Editable for", lockNote: "Reports can be edited within 7 days of creation. After that they are read-only. (Bautagesbericht = legal document)",
        createdAt: "Created", downloadTooltip: "Download report (always available)",
        editTooltip: "Edit report", lockedTooltip: "Report is locked — editing not permitted after 7 days",
        subtitle: "Report History" },
  es: { title: "Historial", newReport: "Nuevo Informe",
        last35: "Últimos 35 días", filed: "Informe enviado",
        noReport: "Sin informe", noReports: "Sin informes todavía. Cree su primer informe.",
        download: "Descargar", edit: "Editar", locked: "Bloqueado",
        editableDays: "Editable por", lockNote: "Los informes se pueden editar hasta 7 días después de su creación. Después son de solo lectura. (Bautagesbericht = documento legal)",
        createdAt: "Creado", downloadTooltip: "Descargar informe (siempre disponible)",
        editTooltip: "Editar informe", lockedTooltip: "Informe bloqueado — edición no permitida después de 7 días",
        subtitle: "Historial de Informes" },
};

export default function ReportHistory({ token, onNewReport, lang = "de" }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const HL = HIST_LANG[lang] || HIST_LANG.de;

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/reports", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const today = dayjs();
  const calendarDays = Array.from({ length: 35 }, (_, i) =>
    today.subtract(34 - i, "day")
  );
  const filedDates = new Set(
    reports.map(r => r.report_data?.date).filter(Boolean)
  );

  const handleDownload = async (report) => {
    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(report.report_data)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bautagesbericht_${report.report_data?.project_id || "G2T"}_${report.report_data?.date || "report"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert(`${HL.download} failed: ${e.message}`); }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
      <Spin size="large" />
    </div>
  );

  return (
    <div style={{ background: "#111", minHeight: "100vh", padding: "24px 0" }}>
      <div className="g2t-container">

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 24,
          borderBottom: "1px solid #222", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 4, height: 32, background: "#1d6fa4", borderRadius: 2 }} />
            <div>
              <Title level={4} style={{ color: "#1d6fa4", margin: 0,
                fontFamily: mono, letterSpacing: "0.05em" }}>GROUND2TECH</Title>
              <Text style={{ color: "#555", fontSize: 11, fontFamily: mono,
                textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {HL.subtitle}
              </Text>
            </div>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={onNewReport}
            style={{ fontFamily: mono, fontWeight: 600 }}>
            {HL.newReport}
          </Button>
        </div>

        {error && (
          <Alert type="error" message={error} showIcon
            style={{ marginBottom: 16, background: "#2a1010", border: "1px solid #5a1e1e" }} />
        )}

        {/* Calendar strip */}
        <Card style={{ background: "#161616", border: "1px solid #2a2a2a",
          borderRadius: 8, marginBottom: 20 }}
          styles={{ body: { padding: "16px 20px" } }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <CalendarOutlined style={{ color: "#1d6fa4" }} />
            <Text style={{ color: "#a0a0a0", fontFamily: mono, fontSize: 11,
              textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {HL.last35}
            </Text>
            <Text style={{ color: "#333", fontFamily: mono, fontSize: 10, marginLeft: "auto" }}>
              🟢 {HL.filed} &nbsp; ⬜ {HL.noReport}
            </Text>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {calendarDays.map(day => {
              const dateStr = day.format("YYYY-MM-DD");
              const hasFiled = filedDates.has(dateStr);
              const isToday = day.isSame(today, "day");
              return (
                <Tooltip key={dateStr}
                  title={`${day.format("DD.MM.YYYY")} ${hasFiled ? "✓ " + HL.filed : "— " + HL.noReport}`}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 4,
                    background: hasFiled ? "#1e8449" : "#1a1a1a",
                    border: isToday ? "2px solid #1d9fe8"
                      : hasFiled ? "1px solid #27ae60" : "1px solid #2a2a2a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "default"
                  }}>
                    <Text style={{ fontSize: 9, fontFamily: mono,
                      color: hasFiled ? "#a8f0c0" : "#444", lineHeight: 1 }}>
                      {day.format("DD")}
                    </Text>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </Card>

        {/* Report list */}
        {reports.length === 0 ? (
          <Card style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8 }}
            styles={{ body: { padding: 32, textAlign: "center" } }}>
            <Text style={{ color: "#555", fontFamily: mono, fontSize: 13 }}>
              {HL.noReports}
            </Text>
          </Card>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            {reports.map(report => {
              const d = report.report_data || {};
              const createdAt = dayjs(report.created_at);
              const daysLeft = 7 - today.diff(createdAt, "day");

              return (
                <Card key={report.id}
                  style={{ background: "#161616",
                    border: `1px solid ${report.locked ? "#3a2a00" : "#2a2a2a"}`,
                    borderRadius: 8 }}
                  styles={{ body: { padding: "14px 20px" } }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <Space wrap>
                        <Text style={{ color: "#1d9fe8", fontFamily: mono,
                          fontSize: 13, fontWeight: 600 }}>
                          {d.date ? dayjs(d.date).format("DD.MM.YYYY") : "—"}
                        </Text>
                        <Text style={{ color: "#555", fontFamily: mono, fontSize: 11 }}>
                          {d.project_id}
                        </Text>
                        {report.locked ? (
                          <Tag style={{ fontFamily: mono, fontSize: 10,
                            background: "#2a1a00", border: "1px solid #7a4f00", color: "#fb923c" }}>
                            🔒 {HL.locked}
                          </Tag>
                        ) : (
                          <Tag style={{ fontFamily: mono, fontSize: 10,
                            background: "#0a2a1a", border: "1px solid #1e5c30", color: "#4ade80" }}>
                            ✏️ {HL.editableDays} {daysLeft}d
                          </Tag>
                        )}
                      </Space>
                      <div style={{ marginTop: 6 }}>
                        <Text style={{ color: "#888", fontSize: 12 }}>{d.project_name}</Text>
                        {d.supervisor && (
                          <Text style={{ color: "#555", fontSize: 11,
                            fontFamily: mono, marginLeft: 12 }}>
                            👤 {d.supervisor}
                          </Text>
                        )}
                      </div>
                      <Text style={{ color: "#333", fontSize: 10, fontFamily: mono,
                        display: "block", marginTop: 4 }}>
                        {HL.createdAt}: {createdAt.format("DD.MM.YYYY HH:mm")}
                      </Text>
                    </div>

                    <Space>
                      <Tooltip title={HL.downloadTooltip}>
                        <Button size="small" icon={<DownloadOutlined />}
                          onClick={() => handleDownload(report)}
                          style={{ fontFamily: mono, fontSize: 11,
                            background: "transparent", borderColor: "#1d6fa4", color: "#1d9fe8" }}>
                          {HL.download}
                        </Button>
                      </Tooltip>
                      <Tooltip title={report.locked ? HL.lockedTooltip : HL.editTooltip}>
                        <Button size="small"
                          icon={report.locked ? <LockOutlined /> : <EditOutlined />}
                          disabled={report.locked}
                          style={{ fontFamily: mono, fontSize: 11,
                            background: "transparent",
                            borderColor: report.locked ? "#3a3a3a" : "#333",
                            color: report.locked ? "#444" : "#a0a0a0",
                            cursor: report.locked ? "not-allowed" : "pointer" }}>
                          {report.locked ? HL.locked : HL.edit}
                        </Button>
                      </Tooltip>
                    </Space>
                  </div>

                  {report.locked && (
                    <div style={{ marginTop: 10, padding: "6px 10px",
                      background: "#1a1200", border: "1px solid #3a2a00", borderRadius: 4 }}>
                      <Text style={{ color: "#7a5f00", fontFamily: mono, fontSize: 10 }}>
                        {HL.lockNote}
                      </Text>
                    </div>
                  )}
                </Card>
              );
            })}
          </Space>
        )}
      </div>
    </div>
  );
}