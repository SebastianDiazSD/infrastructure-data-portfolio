import { useState, useRef } from "react";
import {
  Steps, Input, Select, DatePicker, Button, Table,
  Card, Alert, Badge, Space, Typography, Tag, Modal, Spin,
  InputNumber, Row, Col, Tooltip, Checkbox, Radio
} from "antd";
import {
  ArrowRightOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  EditOutlined, FileTextOutlined, TeamOutlined, ToolOutlined,
  CloudOutlined, ProjectOutlined, SendOutlined, PlusOutlined,
  DeleteOutlined, InfoCircleOutlined, WarningOutlined,
  CheckOutlined, CloseOutlined, ExclamationCircleOutlined,
  StopOutlined, AudioOutlined, ThunderboltOutlined, FormOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ACTIVITY_PRESETS = [
  { key: "gleiserneuerung", label: "Maschinelle Gleiserneuerung (Schienen + Schwellen)", workforce: [{ key: "1", role: "Bauleiter", count: 1 }, { key: "2", role: "Facharbeiter", count: 16 }], equipment: [{ key: "1", name: "Umbauzug", count: 1 }, { key: "2", name: "Arbeitszug", count: 1 }] },
  { key: "weichenumbau", label: "Konventioneller Weichenumbau", workforce: [{ key: "1", role: "Maschinist", count: 2 }, { key: "2", role: "Polier", count: 1 }, { key: "3", role: "Facharbeiter", count: 6 }], equipment: [{ key: "1", name: "Arbeitszug", count: 1 }, { key: "2", name: "Kippwagen", count: 7 }, { key: "3", name: "Zweiwegebagger", count: 2 }, { key: "4", name: "Raupe", count: 1 }, { key: "5", name: "Dampfwalze", count: 1 }] },
  { key: "bettungsreinigung", label: "Maschinelle Bettungsreinigung / -erneuerung", workforce: [{ key: "1", role: "Bauleiter", count: 1 }, { key: "2", role: "Facharbeiter", count: 24 }], equipment: [{ key: "1", name: "RPM-RS-900", count: 1 }, { key: "2", name: "MFS-100", count: 24 }] },
  { key: "tiefentwaesserung", label: "Tiefentwässerung", workforce: [{ key: "1", role: "Polier", count: 1 }, { key: "2", role: "Facharbeiter", count: 8 }], equipment: [{ key: "1", name: "Zweiwegebagger", count: 2 }, { key: "2", name: "Arbeitszug", count: 1 }, { key: "3", name: "Kippwagen", count: 5 }, { key: "4", name: "Raupe", count: 1 }, { key: "5", name: "Dampfwalze", count: 1 }] },
];

const EXTRA_STEPS = [
  { key: "abnahme", label: "Abnahmen", icon: "✅" },
  { key: "maengel", label: "Mängel", icon: "🔴" },
  { key: "stoerungen", label: "Störungen / Verzögerungen", icon: "⚠️" },
  { key: "besonderheiten", label: "Besondere Vorkommnisse", icon: "📋" },
  { key: "naechsteSchritte", label: "Nächste Schritte", icon: "📅" },
];

const INJURY_KEYWORDS = ["unfall","verletzt","verletzung","verletzungen","verletzter","notarzt","krankenhaus","ambulanz","bg-meldung","bg meldung","arbeitsunfall","personenschaden","erste hilfe","sanitäter","accident","injured","injury","hospital","ambulance","accidente","herido","lesión"];
const hasBgMeldung = (text) => { if (!text) return false; const lower = text.toLowerCase(); return INJURY_KEYWORDS.some((kw) => lower.includes(kw)); };

const NO_WORKS_REASONS = {
  de: [{ value: "kein_arbeitstag", label: "Kein geplanter Arbeitstag" }, { value: "havarie", label: "Havarie / Betriebsstörung" }, { value: "extremwetter", label: "Extremwetter / Unwetter" }, { value: "sicherheit", label: "Terrorlage / Sicherheitsereignis" }, { value: "technischer_ausfall", label: "Technischer Ausfall" }, { value: "sonstiges", label: "Sonstiges" }],
  en: [{ value: "kein_arbeitstag", label: "No working day planned" }, { value: "havarie", label: "Breakdown / operational incident" }, { value: "extremwetter", label: "Extreme weather / storm" }, { value: "sicherheit", label: "Security event" }, { value: "technischer_ausfall", label: "Technical failure" }, { value: "sonstiges", label: "Other" }],
  es: [{ value: "kein_arbeitstag", label: "Día no laborable" }, { value: "havarie", label: "Avería / incidente operativo" }, { value: "extremwetter", label: "Clima extremo / tormenta" }, { value: "sicherheit", label: "Evento de seguridad" }, { value: "technischer_ausfall", label: "Fallo técnico" }, { value: "sonstiges", label: "Otros" }],
};

const MODE_B_EXAMPLES = {
  de: `Projekt NBS-2026-001, Regensburg Generalsanierung, 23.03.2026.
Beginn 07:00, Ende 17:00. Bauüberwacher Sebastian Arce Diaz.
Wetter sonnig, 20 Grad.

Heute maschinelle Erneuerung von Schienen und Schwellen im Bereich km 63,0 bis km 65,0.
1 Bauleiter und 16 Facharbeiter. Umbauzug x1, Arbeitszug x1.

Abnahme: PSS 30 cm Stärke KG1, abgenommen von Sebastian Arce Diaz um 13:00, bestanden.
Anmerkung: Lastplattenversuch Sollwert 30 MN/m², Istwert 35 MN/m².

Mangel: 26 beschädigte Schwellen im Bereich km 63,2 bis 63,8.
Verantwortlich: Spitzke. Frist 30.04.2026. Schwere erheblich.

Störung: Materiallieferung 2 Stunden verspätet.

Nächster Tag: Stopfarbeiten km 65,0 bis 67,0.`,
  en: `Project NBS-2026-001, Regensburg General Renovation, 23/03/2026.
Start 07:00, end 17:00. Site supervisor Sebastian Arce Diaz.
Weather sunny, 20 degrees.

Today mechanised rail and sleeper replacement in section km 63.0 to km 65.0.
1 site manager and 16 workers. Track renewal train x1, works train x1.

Inspection: PSS 30cm KG1, approved by Sebastian Arce Diaz at 13:00, passed.
Note: plate load test target 30 MN/m², actual 35 MN/m².

Defect: 26 damaged sleepers in section km 63.2 to 63.8.
Responsible: Spitzke. Deadline 30/04/2026. Severity: major.

Delay: material delivery 2 hours late.

Next day: tamping works km 65.0 to 67.0.`,
  es: `Proyecto NBS-2026-001, Renovación General Regensburg, 23/03/2026.
Inicio 07:00, fin 17:00. Supervisor Sebastian Arce Diaz.
Clima soleado, 20 grados.

Hoy renovación mecanizada de rieles y traviesas en el tramo km 63,0 a km 65,0.
1 jefe de obra y 16 trabajadores. Tren de renovación x1, tren de obras x1.

Inspección: PSS 30 cm KG1, aprobado por Sebastian Arce Diaz a las 13:00, aprobado.
Nota: ensayo de carga objetivo 30 MN/m², real 35 MN/m².

Defecto: 26 traviesas dañadas, km 63,2 a 63,8. Responsable: Spitzke. Plazo 30/04/2026. Gravedad: grave.

Retraso: entrega de material con 2 horas de retraso.

Día siguiente: trabajos de bateo km 65,0 a 67,0.`,
};

const REQUIRED_FIELD_LABELS = {
  de: { project_id: "Projekt-ID", project_name: "Projektname", date: "Datum", supervisor: "Bauüberwacher", work_summary: "Tätigkeitsbeschreibung" },
  en: { project_id: "Project ID", project_name: "Project Name", date: "Date", supervisor: "Site Supervisor", work_summary: "Work Summary" },
  es: { project_id: "ID Proyecto", project_name: "Nombre del Proyecto", date: "Fecha", supervisor: "Supervisor de Obra", work_summary: "Resumen de Actividades" },
};

const LANG = {
  de: {
    modeA: "Schritt für Schritt", modeB: "Schnelleingabe",
    modeBSubtitle: "Text eingeben oder Sprachnotiz aufnehmen — KI befüllt den Bericht automatisch.",
    modeBInputLabel: "Bericht diktieren oder tippen",
    modeBInputPlaceholder: "Beschreiben Sie den Arbeitstag frei — Projekt, Tätigkeiten, Personal, Geräte, Vorkommnisse…",
    modeBShowExample: "Beispiel anzeigen", modeBExampleTitle: "Beispiel-Eingabe",
    modeBAnalyze: "Analysieren & Bericht vorbereiten", modeBAnalyzing: "KI analysiert Eingabe…",
    modeBRecoveryTitle: "Fast fertig — ein paar Angaben fehlen noch",
    modeBRecoverySubtitle: "Diese Felder konnten nicht automatisch erkannt werden. Bitte kurz ergänzen:",
    modeBRecoveryContinue: "Weiter zur Überprüfung",
    modeBRecordStart: "Aufnahme starten", modeBRecordStop: "Aufnahme stoppen", modeBRecordTranscribing: "Wird transkribiert…",
    stepTitles: ["Projektinfo","Wetterlage","Tätigkeiten","Personal","Geräte","Überprüfung"],
    extraStepTitles: { abnahme:"Abnahmen", maengel:"Mängel", stoerungen:"Störungen", besonderheiten:"Besonderheiten", naechsteSchritte:"Nächste Schritte" },
    next:"Weiter", back:"Zurück", generate:"Bericht generieren", edit:"Bearbeiten", addRow:"Zeile hinzufügen",
    projectId:"Projekt-ID", projectName:"Projektname", date:"Datum", startTime:"Beginn", endTime:"Ende", supervisor:"Bauüberwacher",
    language:"Berichtssprache", weather:"Wetter", temperature:"Temperatur (°C)", workSummary:"Tätigkeitsbeschreibung",
    preset:"Aktivitäts-Preset", presetHint:"Preset wählen → Personal & Geräte werden automatisch befüllt",
    role:"Funktion", count:"Anzahl", equipment:"Gerät / Maschine", totalPersonnel:"Gesamt Personal",
    reviewTitle:"Zusammenfassung — Bitte prüfen", generating:"Bericht wird generiert…",
    successMsg:"Bericht erfolgreich erstellt", errorMsg:"Fehler beim Generieren", required:"Pflichtfeld",
    noPreset:"Kein Preset — manuelle Eingabe",
    gateTitle:"Haben Sie noch etwas weiteres zu melden?", gateSubtitle:"Wählen Sie alle zutreffenden Punkte aus:",
    gateYes:"Ja, weiter", gateNo:"Nein, zur Überprüfung",
    abnahmeItem:"Abnahmeobjekt", abnahmeApprover:"Abgenommen von", abnahmeTime:"Uhrzeit", abnahmeResult:"Ergebnis",
    abnahmePass:"Bestanden", abnahmeFail:"Nicht bestanden", abnahmeConditional:"Bedingt bestanden", abnahmeNotes:"Anmerkungen",
    stoerungText:"Störungen und Verzögerungen", stoerungPlaceholder:"Beschreiben Sie aufgetretene Störungen, Verzögerungen oder Probleme…",
    besonderheitenText:"Besondere Vorkommnisse", besonderheitenPlaceholder:"Beschreiben Sie besondere Vorkommnisse auf der Baustelle…",
    bgMeldungAlert:"⚠️ BG-MELDUNG ERFORDERLICH — Arbeitsunfall erkannt. Bitte unverzüglich die Berufsgenossenschaft informieren.",
    naechsteSchritteText:"Geplante Arbeiten (Folgetag)", naechsteSchrittePlaceholder:"Welche Arbeiten sind für den nächsten Tag geplant?",
    noWorksToggle:"Wurden heute Arbeiten durchgeführt?", noWorksYes:"Ja", noWorksNo:"Nein",
    noWorksReason:"Grund für Arbeitsausfall", noWorksReasonOther:"Sonstiger Grund (Freitext)", noWorksReasonOtherPlaceholder:"Bitte kurz beschreiben…",
    noWorksBanner:"Kein Arbeitstag — Bericht wird entsprechend dokumentiert.",
    maengelTitle:"Festgestellte Mängel", maengelAdd:"Mangel hinzufügen",
    maengelBeschreibung:"Beschreibung", maengelOrt:"Ort / km-Punkt", maengelVerantwortlich:"Verantwortlich",
    maengelFrist:"Frist (Behebung)", maengelSchwere:"Schwere",
    maengelMinor:"Gering", maengelMajor:"Erheblich", maengelCritical:"Kritisch", maengelEmpty:"Noch keine Mängel erfasst.",
  },
  en: {
    modeA: "Step by Step", modeB: "Quick Input",
    modeBSubtitle: "Type or record your site report — AI fills the form automatically.",
    modeBInputLabel: "Dictate or type your report",
    modeBInputPlaceholder: "Describe the working day freely — project, works, workforce, equipment, incidents…",
    modeBShowExample: "Show example", modeBExampleTitle: "Example Input",
    modeBAnalyze: "Analyse & Prepare Report", modeBAnalyzing: "AI is analysing input…",
    modeBRecoveryTitle: "Almost there — a few details are missing",
    modeBRecoverySubtitle: "These fields could not be detected automatically. Please fill them in:",
    modeBRecoveryContinue: "Continue to Review",
    modeBRecordStart: "Start recording", modeBRecordStop: "Stop recording", modeBRecordTranscribing: "Transcribing…",
    stepTitles: ["Project Info","Weather","Activities","Workforce","Equipment","Review"],
    extraStepTitles: { abnahme:"Inspections", maengel:"Defects", stoerungen:"Delays", besonderheiten:"Incidents", naechsteSchritte:"Next Steps" },
    next:"Next", back:"Back", generate:"Generate Report", edit:"Edit", addRow:"Add row",
    projectId:"Project ID", projectName:"Project Name", date:"Date", startTime:"Start Time", endTime:"End Time", supervisor:"Site Supervisor",
    language:"Report Language", weather:"Weather", temperature:"Temperature (°C)", workSummary:"Work Summary",
    preset:"Activity Preset", presetHint:"Choose a preset → Workforce & Equipment auto-filled",
    role:"Role", count:"Count", equipment:"Equipment / Machine", totalPersonnel:"Total Personnel",
    reviewTitle:"Summary — Please Review", generating:"Generating report…",
    successMsg:"Report generated successfully", errorMsg:"Error generating report", required:"Required",
    noPreset:"No preset — manual entry",
    gateTitle:"Anything else to report?", gateSubtitle:"Select all that apply:",
    gateYes:"Yes, continue", gateNo:"No, go to review",
    abnahmeItem:"Inspection item", abnahmeApprover:"Approved by", abnahmeTime:"Time", abnahmeResult:"Result",
    abnahmePass:"Passed", abnahmeFail:"Failed", abnahmeConditional:"Conditional", abnahmeNotes:"Notes",
    stoerungText:"Issues and Delays", stoerungPlaceholder:"Describe any issues, delays or problems encountered…",
    besonderheitenText:"Special Incidents", besonderheitenPlaceholder:"Describe any special incidents on site…",
    bgMeldungAlert:"⚠️ INCIDENT REPORT REQUIRED — Workplace injury detected. Please notify the relevant authority immediately.",
    naechsteSchritteText:"Planned Work (Next Day)", naechsteSchrittePlaceholder:"What work is planned for the next day?",
    noWorksToggle:"Were any works carried out today?", noWorksYes:"Yes", noWorksNo:"No",
    noWorksReason:"Reason for no works", noWorksReasonOther:"Other reason (free text)", noWorksReasonOtherPlaceholder:"Please describe briefly…",
    noWorksBanner:"No working day — report will be documented accordingly.",
    maengelTitle:"Identified Defects", maengelAdd:"Add defect",
    maengelBeschreibung:"Description", maengelOrt:"Location / km", maengelVerantwortlich:"Responsible Party",
    maengelFrist:"Remediation Deadline", maengelSchwere:"Severity",
    maengelMinor:"Minor", maengelMajor:"Major", maengelCritical:"Critical", maengelEmpty:"No defects recorded yet.",
  },
  es: {
    modeA: "Paso a Paso", modeB: "Entrada Rápida",
    modeBSubtitle: "Escriba o grabe su informe — la IA completa el formulario automáticamente.",
    modeBInputLabel: "Dicte o escriba su informe",
    modeBInputPlaceholder: "Describa el día de trabajo libremente — proyecto, actividades, personal, equipos, incidentes…",
    modeBShowExample: "Ver ejemplo", modeBExampleTitle: "Ejemplo de entrada",
    modeBAnalyze: "Analizar y preparar informe", modeBAnalyzing: "La IA está analizando…",
    modeBRecoveryTitle: "Casi listo — faltan algunos datos",
    modeBRecoverySubtitle: "Estos campos no pudieron detectarse automáticamente. Por favor complételos:",
    modeBRecoveryContinue: "Continuar a revisión",
    modeBRecordStart: "Iniciar grabación", modeBRecordStop: "Detener grabación", modeBRecordTranscribing: "Transcribiendo…",
    stepTitles: ["Info Proyecto","Condiciones","Actividades","Personal","Equipos","Revisión"],
    extraStepTitles: { abnahme:"Inspecciones", maengel:"Defectos", stoerungen:"Retrasos", besonderheiten:"Incidentes", naechsteSchritte:"Próximos Pasos" },
    next:"Siguiente", back:"Atrás", generate:"Generar Informe", edit:"Editar", addRow:"Agregar fila",
    projectId:"ID Proyecto", projectName:"Nombre del Proyecto", date:"Fecha", startTime:"Inicio", endTime:"Fin", supervisor:"Supervisor de Obra",
    language:"Idioma del Informe", weather:"Clima", temperature:"Temperatura (°C)", workSummary:"Resumen de Actividades",
    preset:"Preset de Actividad", presetHint:"Elegir preset → Personal y Equipos se completan automáticamente",
    role:"Función", count:"Cantidad", equipment:"Equipo / Máquina", totalPersonnel:"Personal Total",
    reviewTitle:"Resumen — Por favor revise", generating:"Generando informe…",
    successMsg:"Informe generado exitosamente", errorMsg:"Error al generar el informe", required:"Obligatorio",
    noPreset:"Sin preset — entrada manual",
    gateTitle:"¿Tiene algo más que reportar?", gateSubtitle:"Seleccione todo lo que aplique:",
    gateYes:"Sí, continuar", gateNo:"No, ir a revisión",
    abnahmeItem:"Objeto de inspección", abnahmeApprover:"Aprobado por", abnahmeTime:"Hora", abnahmeResult:"Resultado",
    abnahmePass:"Aprobado", abnahmeFail:"No aprobado", abnahmeConditional:"Aprobado con condiciones", abnahmeNotes:"Notas",
    stoerungText:"Problemas y Retrasos", stoerungPlaceholder:"Describa los problemas, retrasos o inconvenientes ocurridos…",
    besonderheitenText:"Incidentes Especiales", besonderheitenPlaceholder:"Describa cualquier incidente especial en la obra…",
    bgMeldungAlert:"⚠️ REPORTE DE ACCIDENTE REQUERIDO — Lesión laboral detectada. Notifique a la autoridad competente de inmediato.",
    naechsteSchritteText:"Trabajos Planificados (Día Siguiente)", naechsteSchrittePlaceholder:"¿Qué trabajos están planificados para el día siguiente?",
    noWorksToggle:"¿Se realizaron trabajos hoy?", noWorksYes:"Sí", noWorksNo:"No",
    noWorksReason:"Motivo de la paralización", noWorksReasonOther:"Otro motivo (texto libre)", noWorksReasonOtherPlaceholder:"Describa brevemente…",
    noWorksBanner:"Día sin actividad — el informe será documentado en consecuencia.",
    maengelTitle:"Defectos Identificados", maengelAdd:"Agregar defecto",
    maengelBeschreibung:"Descripción", maengelOrt:"Ubicación / km", maengelVerantwortlich:"Responsable",
    maengelFrist:"Plazo de Corrección", maengelSchwere:"Gravedad",
    maengelMinor:"Leve", maengelMajor:"Grave", maengelCritical:"Crítico", maengelEmpty:"Ningún defecto registrado.",
  },
};

let rowKeyCounter = 100;
const newKey = () => String(++rowKeyCounter);

function EditableTable({ columns, rows, setRows, addLabel }) {
  const handleChange = (key, field, value) => setRows(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const addRow = () => { const t = {}; columns.forEach((c) => { if (c.dataIndex) t[c.dataIndex] = ""; }); setRows([...rows, { key: newKey(), ...t }]); };
  const removeRow = (key) => setRows(rows.filter((r) => r.key !== key));
  const editCols = columns.map((col) => ({ ...col, render: (_, record) => col.dataIndex === "count" ? <InputNumber min={1} value={record[col.dataIndex]} onChange={(v) => handleChange(record.key, col.dataIndex, v)} style={{ width: 70 }} /> : <Input value={record[col.dataIndex]} onChange={(e) => handleChange(record.key, col.dataIndex, e.target.value)} /> }));
  editCols.push({ title: "", key: "action", width: 60, render: (_, record) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeRow(record.key)} size="small" /> });
  return (<Space direction="vertical" style={{ width: "100%" }}><Table columns={editCols} dataSource={rows} pagination={false} size="small" bordered style={{ background: "#1a1a1a" }} /><Button type="dashed" icon={<PlusOutlined />} onClick={addRow} block>{addLabel}</Button></Space>);
}

function ReviewSection({ title, icon, stepKey, onEdit, children, t }) {
  return (<Card size="small" style={{ marginBottom: 12, background: "#1e1e1e", border: "1px solid #333" }} title={<Space>{icon}<Text style={{ color: "#e0e0e0", fontFamily: "IBM Plex Mono, monospace" }}>{title}</Text></Space>} extra={<Button type="link" icon={<EditOutlined />} onClick={() => onEdit(stepKey)} size="small">{t.edit}</Button>}>{children}</Card>);
}

function ReviewField({ label, value }) {
  return (<div style={{ marginBottom: 8 }}><Text style={{ color: "#555", fontFamily: "IBM Plex Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>{label}</Text><Text style={{ color: "#e0e0e0", fontSize: 13 }}>{value || "—"}</Text></div>);
}

const SCHWERE_COLORS = {
  minor: { bg: "#2a2a00", border: "#666600", text: "#facc15" },
  major: { bg: "#2a1500", border: "#804000", text: "#fb923c" },
  critical: { bg: "#2a0000", border: "#800000", text: "#f87171" },
};

export default function ProjectForm({ initialLang = "de" }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [reportLang, setReportLang] = useState(initialLang);
  const t = LANG[reportLang] || LANG.de;
  const [mode, setMode] = useState("A");

  // Mode B
  const [modeBText, setModeBText] = useState("");
  const [modeBParsing, setModeBParsing] = useState(false);
  const [modeBError, setModeBError] = useState(null);
  const [modeBExampleOpen, setModeBExampleOpen] = useState(false);
  const [modeBExampleExpanded, setModeBExampleExpanded] = useState(false);
  const [modeBMissingFields, setModeBMissingFields] = useState([]);
  const [modeBRecoveryValues, setModeBRecoveryValues] = useState({});
  const [modeBShowRecovery, setModeBShowRecovery] = useState(false);
  const [modeBRecording, setModeBRecording] = useState(false);
  const [modeBTranscribing, setModeBTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const parsedCacheRef = useRef(null);

  // Core
  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [reportDate, setReportDate] = useState(dayjs());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [weather, setWeather] = useState("");
  const [temperature, setTemperature] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [workforce, setWorkforce] = useState([{ key: "w1", role: "", count: 1 }]);
  const [equipment, setEquipment] = useState([{ key: "e1", name: "", count: 1 }]);

  // No-works
  const [noWorks, setNoWorks] = useState(false);
  const [noWorksReason, setNoWorksReason] = useState(null);
  const [noWorksReasonText, setNoWorksReasonText] = useState("");

  // Gate
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [selectedExtraSteps, setSelectedExtraSteps] = useState([]);
  const [activeExtraSteps, setActiveExtraSteps] = useState([]);

  // Extra fields
  const [abnahmeItem, setAbnahmeItem] = useState("");
  const [abnahmeApprover, setAbnahmeApprover] = useState("");
  const [abnahmeTime, setAbnahmeTime] = useState("");
  const [abnahmeResult, setAbnahmeResult] = useState("pass");
  const [abnahmeNotes, setAbnahmeNotes] = useState("");
  const [stoerungen, setStoerungen] = useState("");
  const [besonderheiten, setBesonderheiten] = useState("");
  const [naechsteSchritte, setNaechsteSchritte] = useState("");

  // Mängel
  const [maengel, setMaengel] = useState([]);
  const [mangelForm, setMangelForm] = useState({ beschreibung: "", ort: "", verantwortlich: "", frist: "", schwere: "minor" });

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [dateConfirm, setDateConfirm] = useState(null);

  const totalPersonnel = workforce.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
  const bgMeldung = hasBgMeldung(besonderheiten);

  const CORE_COUNT = 5;
  const EXTRA_ORDER = ["abnahme", "maengel", "stoerungen", "besonderheiten", "naechsteSchritte"];
  const visibleExtras = EXTRA_ORDER.filter((k) => activeExtraSteps.includes(k));
  const reviewIdx = CORE_COUNT + visibleExtras.length;
  const totalSteps = reviewIdx + 1;

  const getStepType = (idx) => {
    if (idx < CORE_COUNT) return { type: "core", coreIdx: idx };
    const ei = idx - CORE_COUNT;
    if (ei < visibleExtras.length) return { type: "extra", key: visibleExtras[ei] };
    return { type: "review" };
  };

  const applyPreset = (key) => {
    setSelectedPreset(key);
    if (!key) return;
    const p = ACTIVITY_PRESETS.find((p) => p.key === key);
    if (!p) return;
    setWorkforce(p.workforce.map((r) => ({ ...r, key: newKey() })));
    setEquipment(p.equipment.map((r) => ({ ...r, key: newKey() })));
  };

  const handleNoWorksToggle = (val) => { setNoWorks(val); if (!val) { setNoWorksReason(null); setNoWorksReasonText(""); } setValidationError(null); };

  const addMangel = () => { if (!mangelForm.beschreibung.trim()) return; setMaengel([...maengel, { key: newKey(), ...mangelForm }]); setMangelForm({ beschreibung: "", ort: "", verantwortlich: "", frist: "", schwere: "minor" }); };
  const removeMangel = (key) => setMaengel(maengel.filter((m) => m.key !== key));

  // ── Pre-fill from parsed ─────────────────────────────────────────────────────
  const prefillFromParsed = (parsed, recoveryValues = {}) => {
    const m = { ...parsed };
    Object.entries(recoveryValues).forEach(([k, v]) => { if (v) m[k] = v; });
    if (m.project_id)   setProjectId(m.project_id);
    if (m.project_name) setProjectName(m.project_name);
    if (m.date) {
  const lower = m.date.toLowerCase().trim();
  const todayKeywords = ['heute', 'today', 'hoy', 'jetzt', 'now', 'ahora'];
  const yesterdayKeywords = ['gestern', 'yesterday', 'ayer'];
  if (todayKeywords.includes(lower)) {
    setDateConfirm({ resolved: dayjs(), keyword: m.date });
  } else if (yesterdayKeywords.includes(lower)) {
    setDateConfirm({ resolved: dayjs().subtract(1, 'day'), keyword: m.date });
  } else {
    const parsed = dayjs(m.date);
    if (parsed.isValid()) setReportDate(parsed);
  }
}
    if (m.supervisor)   setSupervisor(m.supervisor);
    if (m.start_time)   setStartTime(m.start_time);
    if (m.end_time)     setEndTime(m.end_time);
    if (m.weather)      setWeather(m.weather);
    if (m.temp_celsius != null) setTemperature(String(m.temp_celsius));
    if (m.work_summary) setWorkSummary(m.work_summary);
    if (m.no_works != null) setNoWorks(m.no_works);
    if (m.no_works_reason) setNoWorksReason(m.no_works_reason);
    if (m.no_works_reason_text) setNoWorksReasonText(m.no_works_reason_text);
    if (Array.isArray(m.workforce) && m.workforce.length > 0)
      setWorkforce(m.workforce.map((r) => ({ key: newKey(), role: r.role || "", count: r.count || 1 })));
    if (Array.isArray(m.equipment) && m.equipment.length > 0)
      setEquipment(m.equipment.map((r) => ({ key: newKey(), name: r.name || "", count: r.count || 1 })));
    const extras = [];
    if (m.abnahme?.item) { extras.push("abnahme"); setAbnahmeItem(m.abnahme.item || ""); setAbnahmeApprover(m.abnahme.approver || ""); setAbnahmeTime(m.abnahme.time || ""); setAbnahmeResult(m.abnahme.result || "pass"); setAbnahmeNotes(m.abnahme.notes || ""); }
    if (Array.isArray(m.maengel) && m.maengel.length > 0) { extras.push("maengel"); setMaengel(m.maengel.map((mg) => ({ key: newKey(), beschreibung: mg.beschreibung || "", ort: mg.ort || "", verantwortlich: mg.verantwortlich || "", frist: mg.frist || "", schwere: mg.schwere || "minor" }))); }
    if (m.stoerungen)     { extras.push("stoerungen");     setStoerungen(m.stoerungen); }
    if (m.besonderheiten) { extras.push("besonderheiten"); setBesonderheiten(m.besonderheiten); }
    if (m.next_steps)     { extras.push("naechsteSchritte"); setNaechsteSchritte(m.next_steps); }
    setActiveExtraSteps(extras);
    setCurrentStep(CORE_COUNT + extras.filter((k) => EXTRA_ORDER.includes(k)).length);
  };

  // ── Voice ────────────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setModeBTranscribing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", blob, "recording.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const transcript = data.transcription || data.transcript || data.text || "";
          if (transcript) setModeBText((prev) => prev ? prev + "\n" + transcript : transcript);
          else setModeBError("Transkription leer — bitte erneut versuchen.");
        } catch (e) { setModeBError(`Transkription fehlgeschlagen: ${e.message}`); }
        finally { setModeBTranscribing(false); }
      };
      mr.start(); mediaRecorderRef.current = mr; setModeBRecording(true);
    } catch (e) { setModeBError("Mikrofon-Zugriff verweigert."); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setModeBRecording(false); } };

  // ── Parse ────────────────────────────────────────────────────────────────────
  const handleModeBAnalyze = async () => {
    if (!(modeBText || "").trim()) return;
    setModeBParsing(true); setModeBError(null); setModeBShowRecovery(false); setModeBMissingFields([]); setModeBRecoveryValues({});
    try {
      const res = await fetch("/api/parse-input", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw_text: modeBText, language: reportLang }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { parsed, missing_required } = await res.json();

// ── Date keyword interception ──────────────────────────────────────
const todayKeywords = ['heute', 'today', 'hoy', 'jetzt', 'now', 'ahora'];
const yesterdayKeywords = ['gestern', 'yesterday', 'ayer'];

let resolvedDateConfirm = null;
let cleanedMissing = [...missing_required];

if (parsed.date) {
  const lower = parsed.date.toLowerCase().trim();
  if (todayKeywords.includes(lower)) {
    resolvedDateConfirm = { resolved: dayjs(), keyword: parsed.date };
    // Remove 'date' from missing — we handle it via modal
    cleanedMissing = cleanedMissing.filter(f => f !== 'date');
    parsed.date = dayjs().format('YYYY-MM-DD'); // inject resolved value
  } else if (yesterdayKeywords.includes(lower)) {
    resolvedDateConfirm = { resolved: dayjs().subtract(1, 'day'), keyword: parsed.date };
    cleanedMissing = cleanedMissing.filter(f => f !== 'date');
    parsed.date = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  }
} else if (missing_required.includes('date')) {
  // Backend couldn't find date at all — check raw text for keywords
  const rawLower = (modeBText || '').toLowerCase();
  const foundToday = todayKeywords.find(kw => rawLower.includes(kw));
  const foundYesterday = yesterdayKeywords.find(kw => rawLower.includes(kw));
  if (foundToday) {
    resolvedDateConfirm = { resolved: dayjs(), keyword: foundToday };
    cleanedMissing = cleanedMissing.filter(f => f !== 'date');
    parsed.date = dayjs().format('YYYY-MM-DD');
  } else if (foundYesterday) {
    resolvedDateConfirm = { resolved: dayjs().subtract(1, 'day'), keyword: foundYesterday };
    cleanedMissing = cleanedMissing.filter(f => f !== 'date');
    parsed.date = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  }
}
// ─────────────────────────────────────────────────────────────────

if (cleanedMissing.length === 0) {
        prefillFromParsed(parsed);
        setMode("A");
        if (resolvedDateConfirm) setDateConfirm(resolvedDateConfirm);
      } else {
        parsedCacheRef.current = parsed;
        setModeBMissingFields(cleanedMissing);
        setModeBShowRecovery(true);
        if (resolvedDateConfirm) setDateConfirm(resolvedDateConfirm);
      }
    } catch (e) { setModeBError(`Parse-Fehler: ${e.message}`); }
    finally { setModeBParsing(false); }
  };

  const handleModeBRecoveryContinue = () => {
    if (!modeBMissingFields.every((f) => modeBRecoveryValues[f]?.trim())) return;
    prefillFromParsed(parsedCacheRef.current || {}, modeBRecoveryValues);
    setMode("A"); setModeBShowRecovery(false);
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateStep = (idx) => {
    const s = getStepType(idx);
    if (s.type === "core") {
      if (s.coreIdx === 0) { if (!projectId.trim()) return t.projectId + ": " + t.required; if (!projectName.trim()) return t.projectName + ": " + t.required; if (!reportDate) return t.date + ": " + t.required; if (!supervisor.trim()) return t.supervisor + ": " + t.required; }
      if (s.coreIdx === 2) { if (!noWorks && !workSummary.trim()) return t.workSummary + ": " + t.required; if (noWorks && !noWorksReason) return t.noWorksReason + ": " + t.required; }
      if (s.coreIdx === 3 && !noWorks && workforce.some((r) => !r.role.trim())) return t.role + ": " + t.required;
      if (s.coreIdx === 4 && !noWorks && equipment.some((r) => !r.name.trim())) return t.equipment + ": " + t.required;
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(currentStep); if (err) { setValidationError(err); return; } setValidationError(null);
    if (currentStep === 2 && noWorks && noWorksReason === "kein_arbeitstag") { setGateModalOpen(true); return; }
    if (currentStep === CORE_COUNT - 1) { setGateModalOpen(true); return; }
    if (noWorks && currentStep === 2) { setGateModalOpen(true); return; }
    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => { setValidationError(null); setCurrentStep((s) => s - 1); };

  const handleGateNo = () => { setActiveExtraSteps([]); setSelectedExtraSteps([]); setGateModalOpen(false); setCurrentStep(CORE_COUNT); };
  const handleGateYes = () => { if (selectedExtraSteps.length === 0) return; setActiveExtraSteps(selectedExtraSteps); setGateModalOpen(false); setCurrentStep(CORE_COUNT); };

  const goToStepByKey = (key) => {
    setValidationError(null);
    const coreMap = { projectinfo: 0, weather: 1, activities: 2, workforce: 3, equipment: 4 };
    if (coreMap[key] !== undefined) { setCurrentStep(coreMap[key]); return; }
    const ei = visibleExtras.indexOf(key); if (ei >= 0) { setCurrentStep(CORE_COUNT + ei); return; }
    setCurrentStep(reviewIdx);
  };

  const handleGenerate = async () => {
    setLoading(true); setError(null); setSuccess(false);
    const payload = {
      project_id: projectId, project_name: projectName, date: reportDate ? reportDate.format("YYYY-MM-DD") : "",
      start_time: startTime || "", end_time: endTime || "", supervisor, report_language: reportLang,
      weather: weather || null, temp_celsius: temperature ? Number(temperature) : null,
      no_works: noWorks, no_works_reason: noWorks ? (noWorksReason || null) : null,
      no_works_reason_text: (noWorks && noWorksReason === "sonstiges") ? (noWorksReasonText || null) : null,
      work_summary: noWorks ? "" : workSummary,
      workforce: noWorks ? [] : workforce.map((r) => ({ role: r.role, count: Number(r.count) || 1 })),
      equipment: noWorks ? [] : equipment.map((r) => ({ name: r.name, count: Number(r.count) || 1 })),
      abnahme: (activeExtraSteps.includes("abnahme") && abnahmeItem) ? { item: abnahmeItem, approver: abnahmeApprover || null, time: abnahmeTime || null, result: abnahmeResult, notes: abnahmeNotes || null } : null,
      maengel: (activeExtraSteps.includes("maengel") && maengel.length > 0) ? maengel.map(({ beschreibung, ort, verantwortlich, frist, schwere }) => ({ beschreibung, ort: ort || null, verantwortlich: verantwortlich || null, frist: frist || null, schwere })) : null,
      stoerungen: (activeExtraSteps.includes("stoerungen") && stoerungen) ? stoerungen : null,
      besonderheiten: (activeExtraSteps.includes("besonderheiten") && besonderheiten) ? besonderheiten : null,
      bg_meldung: activeExtraSteps.includes("besonderheiten") ? bgMeldung : false,
      next_steps: activeExtraSteps.includes("naechsteSchritte") ? (naechsteSchritte || null) : null,
    };
    try {
      const res = await fetch("/api/generate-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { let msg = `HTTP ${res.status}`; try { const d = await res.json(); msg = typeof d.detail === "string" ? d.detail : Array.isArray(d.detail) ? d.detail.map((e) => e.msg || JSON.stringify(e)).join(", ") : JSON.stringify(d); } catch (_) {} throw new Error(msg); }
      const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `Bautagesbericht_${projectId}_${reportDate?.format("YYYYMMDD") || "report"}.docx`; a.click(); URL.revokeObjectURL(url); setSuccess(true);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const labelStyle = { display: "block", color: "#a0a0a0", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 };
  const inputStyle = { background: "#1a1a1a", borderColor: "#333", color: "#e0e0e0" };

  // ── Mode B render ────────────────────────────────────────────────────────────
  const renderModeB = () => (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Text style={{ color: "#666", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>{t.modeBSubtitle}</Text>

      {/* Language selector row */}
      <Row gutter={16} align="middle">
        <Col span={10}><label style={labelStyle}>{t.language}</label><Select value={reportLang} onChange={setReportLang} style={{ width: "100%" }}><Option value="de">🇩🇪 Deutsch</Option><Option value="en">🇬🇧 English</Option><Option value="es">🇪🇸 Español</Option></Select></Col>
      </Row>

      {/* ── Inline example panel ── */}
      <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, overflow: "hidden" }}>
        {/* Header — always visible, click to expand/collapse */}
        <div
          onClick={() => setModeBExampleExpanded((v) => !v)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#1a1a1a", cursor: "pointer", userSelect: "none" }}
        >
          <Space>
            <InfoCircleOutlined style={{ color: "#1d6fa4", fontSize: 13 }} />
            <Text style={{ color: "#1d9fe8", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.modeBExampleTitle}</Text>
          </Space>
          <Text style={{ color: "#555", fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>{modeBExampleExpanded ? "▲ schließen" : "▼ anzeigen"}</Text>
        </div>
        {/* Body — collapsible */}
        {modeBExampleExpanded && (
          <div style={{ padding: "12px 14px", background: "#141414", borderTop: "1px solid #2a2a2a" }}>
            <pre style={{ color: "#888", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>
              {MODE_B_EXAMPLES[reportLang] || MODE_B_EXAMPLES.de}
            </pre>
            <Button
              type="dashed" size="small"
              style={{ marginTop: 10, borderColor: "#1d6fa4", color: "#1d9fe8", fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}
              onClick={() => { setModeBText(MODE_B_EXAMPLES[reportLang] || MODE_B_EXAMPLES.de); setModeBExampleExpanded(false); }}
            >
              {reportLang === "de" ? "↓ Beispiel übernehmen" : reportLang === "en" ? "↓ Use this example" : "↓ Usar este ejemplo"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Input area + record button ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={labelStyle}>{t.modeBInputLabel}</label>
          <Button icon={modeBRecording ? <StopOutlined /> : <AudioOutlined />} onClick={modeBRecording ? stopRecording : startRecording} disabled={modeBTranscribing}
            style={{ background: modeBRecording ? "#3a0a0a" : "#1a1a1a", borderColor: modeBRecording ? "#c00000" : "#1d6fa4", color: modeBRecording ? "#f87171" : "#1d9fe8", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, animation: modeBRecording ? "pulse 1.2s infinite" : "none" }}>
            {modeBTranscribing ? <><Spin size="small" style={{ marginRight: 6 }} />{t.modeBRecordTranscribing}</> : modeBRecording ? t.modeBRecordStop : t.modeBRecordStart}
          </Button>
        </div>
        <TextArea value={modeBText || ""} onChange={(e) => setModeBText(e.target.value)} rows={10} placeholder={t.modeBInputPlaceholder} style={{ ...inputStyle, resize: "vertical", fontFamily: "IBM Plex Sans, sans-serif", fontSize: 13, lineHeight: 1.6 }} />
      </div>
      {modeBError && <Alert type="error" message={modeBError} showIcon style={{ background: "#2a1010", border: "1px solid #5a1e1e" }} />}
      {modeBShowRecovery && (
        <div style={{ padding: "16px 20px", background: "#1a1a1a", border: "1px solid #1d6fa4", borderRadius: 8 }}>
          <Text style={{ color: "#1d9fe8", fontFamily: "IBM Plex Mono, monospace", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>{t.modeBRecoveryTitle}</Text>
          <Text style={{ color: "#666", fontSize: 12, display: "block", marginBottom: 16 }}>{t.modeBRecoverySubtitle}</Text>
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            {modeBMissingFields.map((field) => (
              <div key={field}>
                <label style={labelStyle}>{(REQUIRED_FIELD_LABELS[reportLang] || REQUIRED_FIELD_LABELS.de)[field] || field} *</label>
                {field === "work_summary"
                  ? <TextArea value={modeBRecoveryValues[field] || ""} onChange={(e) => setModeBRecoveryValues({ ...modeBRecoveryValues, [field]: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                  : <Input value={modeBRecoveryValues[field] || ""} onChange={(e) => setModeBRecoveryValues({ ...modeBRecoveryValues, [field]: e.target.value })} style={inputStyle} />}
              </div>
            ))}
          </Space>
          <Button type="primary" onClick={handleModeBRecoveryContinue} disabled={!modeBMissingFields.every((f) => modeBRecoveryValues[f]?.trim())} style={{ marginTop: 16, fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }} icon={<ArrowRightOutlined />}>{t.modeBRecoveryContinue}</Button>
        </div>
      )}
      {!modeBShowRecovery && (
        <Button type="primary" block size="large" icon={modeBParsing ? <Spin size="small" /> : <ThunderboltOutlined />} onClick={handleModeBAnalyze} disabled={!(modeBText || "").trim() || modeBParsing} style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, height: 48 }}>
          {modeBParsing ? t.modeBAnalyzing : t.modeBAnalyze}
        </Button>
      )}
    </Space>
  );

  // ── Core steps ───────────────────────────────────────────────────────────────
  const renderCore = (idx) => {
    switch (idx) {
      case 0: return (<Space direction="vertical" style={{ width: "100%" }} size={16}><Row gutter={16}><Col span={12}><label style={labelStyle}>{t.projectId} *</label><Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="NBS-2026-001" style={inputStyle} /></Col><Col span={12}><label style={labelStyle}>{t.projectName} *</label><Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Nuremberg–Regensburg Generalsanierung" style={inputStyle} /></Col></Row><Row gutter={16}><Col span={8}><label style={labelStyle}>{t.date} *</label><DatePicker value={reportDate} onChange={setReportDate} style={{ ...inputStyle, width: "100%" }} format="DD.MM.YYYY" /></Col><Col span={8}><label style={labelStyle}>{t.startTime}</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ background: "#1a1a1a", border: "1px solid #3a3a3a", borderRadius: 6, color: "#f0f0f0", padding: "4px 11px", fontSize: 14, width: "100%", colorScheme: "dark" }} /></Col><Col span={8}><label style={labelStyle}>{t.endTime}</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ background: "#1a1a1a", border: "1px solid #3a3a3a", borderRadius: 6, color: "#f0f0f0", padding: "4px 11px", fontSize: 14, width: "100%", colorScheme: "dark" }} /></Col></Row><Row gutter={16}><Col span={12}><label style={labelStyle}>{t.supervisor} *</label><Input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Sebastian Arce Diaz" style={inputStyle} /></Col><Col span={12}><label style={labelStyle}>{t.language}</label><Select value={reportLang} onChange={setReportLang} style={{ width: "100%" }}><Option value="de">🇩🇪 Deutsch</Option><Option value="en">🇬🇧 English</Option><Option value="es">🇪🇸 Español</Option></Select></Col></Row></Space>);
      case 1: return (<Space direction="vertical" style={{ width: "100%" }} size={16}><Row gutter={16}><Col span={14}><label style={labelStyle}>{t.weather}</label><Select value={weather} onChange={setWeather} style={{ width: "100%" }} allowClear placeholder={reportLang === "de" ? "Wetterlage wählen…" : reportLang === "en" ? "Select weather…" : "Seleccionar clima…"}>{reportLang === "de" && <><Option value="sonnig">☀️ Sonnig</Option><Option value="bewölkt">⛅ Bewölkt</Option><Option value="bedeckt">🌥️ Bedeckt</Option><Option value="leichter Regen">🌦️ Leichter Regen</Option><Option value="starker Regen">🌧️ Starker Regen</Option><Option value="Gewitter">⛈️ Gewitter</Option><Option value="Nebel">🌫️ Nebel</Option><Option value="Schnee">❄️ Schnee</Option></>}{reportLang === "en" && <><Option value="sunny">☀️ Sunny</Option><Option value="partly cloudy">⛅ Partly Cloudy</Option><Option value="overcast">🌥️ Overcast</Option><Option value="light rain">🌦️ Light Rain</Option><Option value="heavy rain">🌧️ Heavy Rain</Option><Option value="thunderstorm">⛈️ Thunderstorm</Option><Option value="fog">🌫️ Fog</Option><Option value="snow">❄️ Snow</Option></>}{reportLang === "es" && <><Option value="soleado">☀️ Soleado</Option><Option value="parcialmente nublado">⛅ Parcialmente Nublado</Option><Option value="nublado">🌥️ Nublado</Option><Option value="lluvia ligera">🌦️ Lluvia Ligera</Option><Option value="lluvia intensa">🌧️ Lluvia Intensa</Option><Option value="tormenta">⛈️ Tormenta</Option><Option value="niebla">🌫️ Niebla</Option><Option value="nieve">❄️ Nieve</Option></>}</Select></Col><Col span={10}><label style={labelStyle}>{t.temperature}</label><InputNumber value={temperature} onChange={setTemperature} style={{ width: "100%" }} placeholder="18" addonAfter="°C" /></Col></Row></Space>);
      case 2: return (
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          <div style={{ padding: "14px 16px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 10 }}>{t.noWorksToggle}</label>
            <Radio.Group value={noWorks ? "no" : "yes"} onChange={(e) => handleNoWorksToggle(e.target.value === "no")} buttonStyle="solid">
              <Radio.Button value="yes" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>{t.noWorksYes}</Radio.Button>
              <Radio.Button value="no" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>{t.noWorksNo}</Radio.Button>
            </Radio.Group>
          </div>
          {noWorks && (<Space direction="vertical" style={{ width: "100%" }} size={12}><Alert type="warning" icon={<StopOutlined />} message={t.noWorksBanner} showIcon style={{ background: "#2a1e00", border: "1px solid #7a4f00" }} /><div><label style={labelStyle}>{t.noWorksReason} *</label><Select value={noWorksReason} onChange={setNoWorksReason} style={{ width: "100%" }} placeholder="—">{(NO_WORKS_REASONS[reportLang] || NO_WORKS_REASONS.de).map((r) => <Option key={r.value} value={r.value}>{r.label}</Option>)}</Select></div>{noWorksReason === "sonstiges" && (<div><label style={labelStyle}>{t.noWorksReasonOther}</label><TextArea value={noWorksReasonText} onChange={(e) => setNoWorksReasonText(e.target.value)} rows={2} placeholder={t.noWorksReasonOtherPlaceholder} style={{ ...inputStyle, resize: "vertical" }} /></div>)}</Space>)}
          {!noWorks && (<><div><Space style={{ marginBottom: 8 }}><label style={labelStyle}>{t.preset}</label><Tooltip title={t.presetHint}><InfoCircleOutlined style={{ color: "#1d6fa4" }} /></Tooltip></Space><Select value={selectedPreset} onChange={applyPreset} style={{ width: "100%" }} allowClear placeholder={t.noPreset}>{ACTIVITY_PRESETS.map((p) => <Option key={p.key} value={p.key}>{p.label}</Option>)}</Select></div><div><label style={labelStyle}>{t.workSummary} *</label><TextArea value={workSummary} onChange={(e) => setWorkSummary(e.target.value)} rows={6} placeholder={reportLang === "de" ? "Heute wurde die maschinelle Erneuerung…" : reportLang === "en" ? "Today, mechanised rail and sleeper replacement…" : "Hoy se realizó la renovación mecanizada…"} style={{ ...inputStyle, resize: "vertical" }} /></div></>)}
        </Space>
      );
      case 3: return noWorks ? <Alert type="info" message={reportLang === "de" ? "Kein Arbeitstag — Personal nicht erfasst." : reportLang === "en" ? "No working day — workforce not recorded." : "Día sin actividad — personal no registrado."} showIcon style={{ background: "#111f2a", border: "1px solid #1d6fa4" }} /> : (<Space direction="vertical" style={{ width: "100%" }} size={12}><Space><Badge count={totalPersonnel} style={{ backgroundColor: "#1d6fa4" }} overflowCount={999} /><Text style={{ color: "#a0a0a0", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>{t.totalPersonnel}</Text></Space><EditableTable rows={workforce} setRows={setWorkforce} addLabel={t.addRow} columns={[{ title: t.role, dataIndex: "role", key: "role" }, { title: t.count, dataIndex: "count", key: "count", width: 90 }]} /></Space>);
      case 4: return noWorks ? <Alert type="info" message={reportLang === "de" ? "Kein Arbeitstag — Geräte nicht erfasst." : reportLang === "en" ? "No working day — equipment not recorded." : "Día sin actividad — equipos no registrados."} showIcon style={{ background: "#111f2a", border: "1px solid #1d6fa4" }} /> : <EditableTable rows={equipment} setRows={setEquipment} addLabel={t.addRow} columns={[{ title: t.equipment, dataIndex: "name", key: "name" }, { title: t.count, dataIndex: "count", key: "count", width: 90 }]} />;
      default: return null;
    }
  };

  const renderExtra = (key) => {
    switch (key) {
      case "abnahme": return (<Space direction="vertical" style={{ width: "100%" }} size={16}><Row gutter={16}><Col span={16}><label style={labelStyle}>{t.abnahmeItem}</label><Input value={abnahmeItem} onChange={(e) => setAbnahmeItem(e.target.value)} placeholder="z.B. Gleis km 63,0 – 65,0" style={inputStyle} /></Col><Col span={8}><label style={labelStyle}>{t.abnahmeTime}</label><input type="time" value={abnahmeTime} onChange={(e) => setAbnahmeTime(e.target.value)} style={{ background: "#1a1a1a", border: "1px solid #3a3a3a", borderRadius: 6, color: "#f0f0f0", padding: "4px 11px", fontSize: 14, width: "100%", colorScheme: "dark" }} /></Col></Row><Row gutter={16}><Col span={12}><label style={labelStyle}>{t.abnahmeApprover}</label><Input value={abnahmeApprover} onChange={(e) => setAbnahmeApprover(e.target.value)} placeholder="Name / Firma" style={inputStyle} /></Col><Col span={12}><label style={labelStyle}>{t.abnahmeResult}</label><Radio.Group value={abnahmeResult} onChange={(e) => setAbnahmeResult(e.target.value)}><Space direction="vertical"><Radio value="pass"><CheckOutlined style={{ color: "#4ade80", marginRight: 6 }} /><span style={{ color: "#4ade80" }}>{t.abnahmePass}</span></Radio><Radio value="conditional"><ExclamationCircleOutlined style={{ color: "#facc15", marginRight: 6 }} /><span style={{ color: "#facc15" }}>{t.abnahmeConditional}</span></Radio><Radio value="fail"><CloseOutlined style={{ color: "#f87171", marginRight: 6 }} /><span style={{ color: "#f87171" }}>{t.abnahmeFail}</span></Radio></Space></Radio.Group></Col></Row><div><label style={labelStyle}>{t.abnahmeNotes}</label><TextArea value={abnahmeNotes} onChange={(e) => setAbnahmeNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div></Space>);
      case "maengel": return (<Space direction="vertical" style={{ width: "100%" }} size={16}><div style={{ padding: "14px 16px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }}><Text style={{ color: "#a0a0a0", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 12 }}>{t.maengelAdd}</Text><Row gutter={[12, 12]}><Col span={24}><label style={labelStyle}>{t.maengelBeschreibung} *</label><TextArea value={mangelForm.beschreibung} onChange={(e) => setMangelForm({ ...mangelForm, beschreibung: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></Col><Col span={12}><label style={labelStyle}>{t.maengelOrt}</label><Input value={mangelForm.ort} onChange={(e) => setMangelForm({ ...mangelForm, ort: e.target.value })} placeholder="km 64,3" style={inputStyle} /></Col><Col span={12}><label style={labelStyle}>{t.maengelVerantwortlich}</label><Input value={mangelForm.verantwortlich} onChange={(e) => setMangelForm({ ...mangelForm, verantwortlich: e.target.value })} placeholder="Firma / Person" style={inputStyle} /></Col><Col span={12}><label style={labelStyle}>{t.maengelFrist}</label><Input value={mangelForm.frist} onChange={(e) => setMangelForm({ ...mangelForm, frist: e.target.value })} placeholder="z.B. 30.04.2026" style={inputStyle} /></Col><Col span={12}><label style={labelStyle}>{t.maengelSchwere}</label><Select value={mangelForm.schwere} onChange={(v) => setMangelForm({ ...mangelForm, schwere: v })} style={{ width: "100%" }}><Option value="minor"><span style={{ color: "#facc15" }}>● {t.maengelMinor}</span></Option><Option value="major"><span style={{ color: "#fb923c" }}>● {t.maengelMajor}</span></Option><Option value="critical"><span style={{ color: "#f87171" }}>● {t.maengelCritical}</span></Option></Select></Col></Row><Button type="dashed" icon={<PlusOutlined />} onClick={addMangel} disabled={!mangelForm.beschreibung.trim()} style={{ marginTop: 12, width: "100%", borderColor: "#1d6fa4", color: "#1d9fe8" }}>{t.maengelAdd}</Button></div>{maengel.length === 0 ? <Text style={{ color: "#555", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>{t.maengelEmpty}</Text> : <Space direction="vertical" style={{ width: "100%" }} size={8}>{maengel.map((m, i) => { const c = SCHWERE_COLORS[m.schwere] || SCHWERE_COLORS.minor; const sl = { minor: t.maengelMinor, major: t.maengelMajor, critical: t.maengelCritical }[m.schwere] || m.schwere; return (<div key={m.key} style={{ padding: "10px 14px", background: "#1e1e1e", border: `1px solid ${c.border}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><Space direction="vertical" size={2} style={{ flex: 1 }}><Space><Text style={{ color: "#555", fontFamily: "IBM Plex Mono, monospace", fontSize: 10 }}>#{i + 1}</Text><Tag style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontFamily: "IBM Plex Mono, monospace", fontSize: 10 }}>{sl}</Tag></Space><Text style={{ color: "#e0e0e0", fontSize: 13 }}>{m.beschreibung}</Text><Space split={<Text style={{ color: "#333" }}>·</Text>}>{m.ort && <Text style={{ color: "#888", fontSize: 11 }}>📍 {m.ort}</Text>}{m.verantwortlich && <Text style={{ color: "#888", fontSize: 11 }}>👤 {m.verantwortlich}</Text>}{m.frist && <Text style={{ color: "#888", fontSize: 11 }}>📅 {m.frist}</Text>}</Space></Space><Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeMangel(m.key)} size="small" style={{ marginLeft: 8 }} /></div>); })}</Space>}</Space>);
      case "stoerungen": return (<Space direction="vertical" style={{ width: "100%" }} size={8}><label style={labelStyle}>{t.stoerungText}</label><TextArea value={stoerungen} onChange={(e) => setStoerungen(e.target.value)} rows={8} placeholder={t.stoerungPlaceholder} style={{ ...inputStyle, resize: "vertical" }} /></Space>);
      case "besonderheiten": return (<Space direction="vertical" style={{ width: "100%" }} size={12}>{bgMeldung && <Alert type="error" icon={<WarningOutlined />} message={t.bgMeldungAlert} showIcon style={{ background: "#3a0a0a", border: "1px solid #7f1d1d" }} />}<label style={labelStyle}>{t.besonderheitenText}</label><TextArea value={besonderheiten} onChange={(e) => setBesonderheiten(e.target.value)} rows={8} placeholder={t.besonderheitenPlaceholder} style={{ ...inputStyle, resize: "vertical" }} /></Space>);
      case "naechsteSchritte": return (<Space direction="vertical" style={{ width: "100%" }} size={8}><label style={labelStyle}>{t.naechsteSchritteText}</label><TextArea value={naechsteSchritte} onChange={(e) => setNaechsteSchritte(e.target.value)} rows={8} placeholder={t.naechsteSchrittePlaceholder} style={{ ...inputStyle, resize: "vertical" }} /></Space>);
      default: return null;
    }
  };

  const renderReview = () => (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      <Text style={{ color: "#a0a0a0", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>{t.reviewTitle}</Text>
      {bgMeldung && <Alert type="error" icon={<WarningOutlined />} message={t.bgMeldungAlert} showIcon style={{ marginBottom: 8, background: "#3a0a0a", border: "1px solid #7f1d1d" }} />}
      {noWorks && <Alert type="warning" icon={<StopOutlined />} message={t.noWorksBanner} showIcon style={{ marginBottom: 8, background: "#2a1e00", border: "1px solid #7a4f00" }} />}
      <ReviewSection title={t.stepTitles[0]} icon={<ProjectOutlined style={{ color: "#1d6fa4" }} />} stepKey="projectinfo" onEdit={goToStepByKey} t={t}><Row gutter={16}><Col span={12}><ReviewField label={t.projectId} value={projectId} /></Col><Col span={12}><ReviewField label={t.projectName} value={projectName} /></Col><Col span={8}><ReviewField label={t.date} value={reportDate?.format("DD.MM.YYYY")} /></Col><Col span={8}><ReviewField label={t.startTime} value={startTime || "—"} /></Col><Col span={8}><ReviewField label={t.endTime} value={endTime || "—"} /></Col><Col span={12}><ReviewField label={t.supervisor} value={supervisor} /></Col><Col span={12}><ReviewField label={t.language} value={reportLang.toUpperCase()} /></Col></Row></ReviewSection>
      <ReviewSection title={t.stepTitles[1]} icon={<CloudOutlined style={{ color: "#1d6fa4" }} />} stepKey="weather" onEdit={goToStepByKey} t={t}><Row gutter={16}><Col span={12}><ReviewField label={t.weather} value={weather || "—"} /></Col><Col span={12}><ReviewField label={t.temperature} value={temperature ? `${temperature}°C` : "—"} /></Col></Row></ReviewSection>
      <ReviewSection title={t.stepTitles[2]} icon={<FileTextOutlined style={{ color: "#1d6fa4" }} />} stepKey="activities" onEdit={goToStepByKey} t={t}>{noWorks ? (<Space direction="vertical" size={4}><ReviewField label={t.noWorksReason} value={(NO_WORKS_REASONS[reportLang] || NO_WORKS_REASONS.de).find(r => r.value === noWorksReason)?.label || "—"} />{noWorksReason === "sonstiges" && noWorksReasonText && <ReviewField label={t.noWorksReasonOther} value={noWorksReasonText} />}</Space>) : (<Text style={{ color: "#c0c0c0", fontSize: 13 }}>{workSummary}</Text>)}</ReviewSection>
      {!noWorks && (<><ReviewSection title={t.stepTitles[3]} icon={<TeamOutlined style={{ color: "#1d6fa4" }} />} stepKey="workforce" onEdit={goToStepByKey} t={t}><Space wrap>{workforce.map((r) => <Tag key={r.key} style={{ fontFamily: "IBM Plex Mono, monospace" }}>{r.count}× {r.role}</Tag>)}<Badge count={totalPersonnel} style={{ backgroundColor: "#1d6fa4" }} overflowCount={999} /></Space></ReviewSection><ReviewSection title={t.stepTitles[4]} icon={<ToolOutlined style={{ color: "#1d6fa4" }} />} stepKey="equipment" onEdit={goToStepByKey} t={t}><Space wrap>{equipment.map((r) => <Tag key={r.key} style={{ fontFamily: "IBM Plex Mono, monospace" }}>{r.count}× {r.name}</Tag>)}</Space></ReviewSection></>)}
      {activeExtraSteps.includes("abnahme") && abnahmeItem && (<ReviewSection title={t.extraStepTitles.abnahme} icon={<CheckCircleOutlined style={{ color: "#4ade80" }} />} stepKey="abnahme" onEdit={goToStepByKey} t={t}><Row gutter={16}><Col span={12}><ReviewField label={t.abnahmeItem} value={abnahmeItem} /></Col><Col span={12}><ReviewField label={t.abnahmeApprover} value={abnahmeApprover} /></Col><Col span={8}><ReviewField label={t.abnahmeTime} value={abnahmeTime || "—"} /></Col><Col span={16}><ReviewField label={t.abnahmeResult} value={{ pass: t.abnahmePass, fail: t.abnahmeFail, conditional: t.abnahmeConditional }[abnahmeResult]} /></Col>{abnahmeNotes && <Col span={24}><ReviewField label={t.abnahmeNotes} value={abnahmeNotes} /></Col>}</Row></ReviewSection>)}
      {activeExtraSteps.includes("maengel") && maengel.length > 0 && (<ReviewSection title={t.extraStepTitles.maengel} icon={<ExclamationCircleOutlined style={{ color: "#f87171" }} />} stepKey="maengel" onEdit={goToStepByKey} t={t}><Space direction="vertical" style={{ width: "100%" }} size={6}>{maengel.map((m, i) => { const c = SCHWERE_COLORS[m.schwere] || SCHWERE_COLORS.minor; const sl = { minor: t.maengelMinor, major: t.maengelMajor, critical: t.maengelCritical }[m.schwere] || m.schwere; return (<div key={m.key} style={{ padding: "8px 12px", background: "#1a1a1a", border: `1px solid ${c.border}`, borderRadius: 6 }}><Space><Text style={{ color: "#555", fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}>#{i + 1}</Text><Tag style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 10 }}>{sl}</Tag><Text style={{ color: "#e0e0e0", fontSize: 12 }}>{m.beschreibung}</Text></Space>{(m.ort || m.verantwortlich || m.frist) && <div style={{ marginTop: 4 }}><Space split={<Text style={{ color: "#333" }}>·</Text>}>{m.ort && <Text style={{ color: "#888", fontSize: 11 }}>📍 {m.ort}</Text>}{m.verantwortlich && <Text style={{ color: "#888", fontSize: 11 }}>👤 {m.verantwortlich}</Text>}{m.frist && <Text style={{ color: "#888", fontSize: 11 }}>📅 {m.frist}</Text>}</Space></div>}</div>); })}</Space></ReviewSection>)}
      {activeExtraSteps.includes("stoerungen") && stoerungen && (<ReviewSection title={t.extraStepTitles.stoerungen} icon={<ExclamationCircleOutlined style={{ color: "#facc15" }} />} stepKey="stoerungen" onEdit={goToStepByKey} t={t}><Text style={{ color: "#c0c0c0", fontSize: 13 }}>{stoerungen}</Text></ReviewSection>)}
      {activeExtraSteps.includes("besonderheiten") && besonderheiten && (<ReviewSection title={t.extraStepTitles.besonderheiten} icon={<WarningOutlined style={{ color: bgMeldung ? "#f87171" : "#facc15" }} />} stepKey="besonderheiten" onEdit={goToStepByKey} t={t}><Text style={{ color: "#c0c0c0", fontSize: 13 }}>{besonderheiten}</Text></ReviewSection>)}
      {activeExtraSteps.includes("naechsteSchritte") && naechsteSchritte && (<ReviewSection title={t.extraStepTitles.naechsteSchritte} icon={<FileTextOutlined style={{ color: "#1d6fa4" }} />} stepKey="naechsteSchritte" onEdit={goToStepByKey} t={t}><Text style={{ color: "#c0c0c0", fontSize: 13 }}>{naechsteSchritte}</Text></ReviewSection>)}
    </Space>
  );

  const stepType = getStepType(currentStep);
  const isLastStep = currentStep === reviewIdx;
  const CORE_ICONS = [<ProjectOutlined />, <CloudOutlined />, <FileTextOutlined />, <TeamOutlined />, <ToolOutlined />];
  const EXTRA_ICONS = { abnahme: <CheckCircleOutlined />, maengel: <ExclamationCircleOutlined />, stoerungen: <ExclamationCircleOutlined />, besonderheiten: <WarningOutlined />, naechsteSchritte: <FileTextOutlined /> };
  const currentTitle = stepType.type === "core" ? t.stepTitles[stepType.coreIdx] : stepType.type === "extra" ? t.extraStepTitles[stepType.key] : t.reviewTitle;
  const currentIcon = stepType.type === "core" ? CORE_ICONS[stepType.coreIdx] : stepType.type === "extra" ? EXTRA_ICONS[stepType.key] : <CheckCircleOutlined />;
  const currentContent = stepType.type === "core" ? renderCore(stepType.coreIdx) : stepType.type === "extra" ? renderExtra(stepType.key) : renderReview();
  const stepItems = [...t.stepTitles.slice(0, 5).map((title, i) => ({ title, icon: CORE_ICONS[i] })), ...visibleExtras.map((key) => ({ title: t.extraStepTitles[key], icon: EXTRA_ICONS[key] })), { title: t.stepTitles[5], icon: <CheckCircleOutlined /> }];
  const besonderheitenLocked = noWorks && noWorksReason && noWorksReason !== "kein_arbeitstag";

  return (
    <div style={{ minHeight: "100vh", background: "#111", fontFamily: "IBM Plex Sans, sans-serif", padding: "24px 0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .ant-steps-item-title{font-family:'IBM Plex Mono',monospace!important;font-size:11px!important}
        .ant-input{color:#f0f0f0!important;background:#1a1a1a!important;border-color:#3a3a3a!important}
        .ant-input::placeholder{color:#555!important}
        .ant-input:focus,.ant-input:hover{border-color:#1d6fa4!important;box-shadow:0 0 0 2px rgba(29,111,164,0.2)!important}
        .ant-input-number{background:#1a1a1a!important;border-color:#3a3a3a!important}
        .ant-input-number-input{color:#f0f0f0!important;background:#1a1a1a!important}
        .ant-input-number:hover,.ant-input-number-focused{border-color:#1d6fa4!important}
        .ant-input-number-group-addon{background:#222!important;color:#a0a0a0!important;border-color:#3a3a3a!important}
        .ant-picker{background:#1a1a1a!important;border-color:#3a3a3a!important}
        .ant-picker-input input{color:#f0f0f0!important}
        .ant-picker-input input::placeholder{color:#555!important}
        .ant-picker:hover,.ant-picker-focused{border-color:#1d6fa4!important;box-shadow:0 0 0 2px rgba(29,111,164,0.2)!important}
        .ant-picker-suffix,.ant-picker-clear{color:#555!important}
        .ant-select-selector{background:#1a1a1a!important;border-color:#3a3a3a!important;color:#f0f0f0!important}
        .ant-select-selection-placeholder{color:#555!important}
        .ant-select:hover .ant-select-selector{border-color:#1d6fa4!important}
        .ant-select-focused .ant-select-selector{border-color:#1d6fa4!important;box-shadow:0 0 0 2px rgba(29,111,164,0.2)!important}
        .ant-select-selection-item{color:#f0f0f0!important}
        .ant-select-arrow{color:#555!important}
        .ant-select-dropdown{background:#1e1e1e!important;border:1px solid #333!important}
        .ant-select-item{color:#e0e0e0!important}
        .ant-select-item-option-active{background:#2a2a2a!important}
        .ant-select-item-option-selected{background:#1a3a54!important;color:#fff!important}
        .ant-picker-dropdown{background:#1e1e1e!important}
        .ant-picker-panel-container{background:#1e1e1e!important;border:1px solid #333!important}
        .ant-picker-header{color:#e0e0e0!important;border-bottom:1px solid #333!important}
        .ant-picker-header button{color:#a0a0a0!important}
        .ant-picker-content th{color:#555!important}
        .ant-picker-cell-in-view .ant-picker-cell-inner{color:#e0e0e0!important}
        .ant-picker-cell-selected .ant-picker-cell-inner{background:#1d6fa4!important}
        .ant-picker-footer{display:none!important}
        .ant-card{color:#e0e0e0}
        .ant-table{background:#1a1a1a!important;color:#e0e0e0!important}
        .ant-table-thead>tr>th{background:#222!important;color:#1d9fe8!important;font-family:'IBM Plex Mono',monospace!important;font-size:11px!important;text-transform:uppercase;border-color:#333!important}
        .ant-table-tbody>tr>td{background:#1a1a1a!important;border-color:#2a2a2a!important;color:#e0e0e0!important}
        .ant-table-tbody>tr:hover>td{background:#222!important}
        .ant-steps-item-process .ant-steps-item-icon{background:#1d6fa4!important;border-color:#1d6fa4!important}
        .ant-steps-item-finish .ant-steps-item-icon{border-color:#1d6fa4!important}
        .ant-steps-item-finish .ant-steps-item-icon .anticon{color:#1d6fa4!important}
        .ant-steps-item-finish>.ant-steps-item-container>.ant-steps-item-tail::after{background-color:#1d6fa4!important}
        .ant-btn-primary{background:#1d6fa4!important;border-color:#1d6fa4!important}
        .ant-btn-primary:hover{background:#1a5f8e!important;border-color:#1a5f8e!important}
        .ant-btn-dashed{background:transparent!important;border-color:#3a3a3a!important;color:#a0a0a0!important}
        .ant-btn-dashed:hover{border-color:#1d6fa4!important;color:#1d9fe8!important}
        .ant-modal-content{background:#161616!important;border:1px solid #2a2a2a!important}
        .ant-modal-header{background:#161616!important;border-bottom:1px solid #2a2a2a!important}
        .ant-modal-title{color:#e0e0e0!important;font-family:'IBM Plex Mono',monospace!important}
        .ant-modal-close{color:#555!important}
        .ant-checkbox-wrapper{color:#e0e0e0!important}
        .ant-checkbox-inner{background:#1a1a1a!important;border-color:#3a3a3a!important}
        .ant-checkbox-checked .ant-checkbox-inner{background:#1d6fa4!important;border-color:#1d6fa4!important}
        .ant-radio-inner{background:#1a1a1a!important;border-color:#3a3a3a!important}
        .ant-radio-checked .ant-radio-inner{border-color:#1d6fa4!important}
        .ant-radio-checked .ant-radio-inner::after{background:#1d6fa4!important}
        .ant-radio-button-wrapper{background:#1a1a1a!important;border-color:#3a3a3a!important;color:#a0a0a0!important;font-family:'IBM Plex Mono',monospace!important}
        .ant-radio-button-wrapper-checked{background:#1d6fa4!important;border-color:#1d6fa4!important;color:#fff!important}
        .ant-radio-button-wrapper:hover{color:#1d9fe8!important;border-color:#1d6fa4!important}
        input[type="time"]{display:block;background:#1a1a1a;border:1px solid #3a3a3a;border-radius:6px;color:#f0f0f0;padding:4px 11px;font-size:14px;width:100%;color-scheme:dark;height:32px}
        input[type="time"]:focus{outline:none;border-color:#1d6fa4;box-shadow:0 0 0 2px rgba(29,111,164,0.2)}
      `}</style>

      <div className="g2t-container">
        {/* Header */}
        <div style={{ marginBottom: 24, borderBottom: "1px solid #222", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 4, height: 32, background: "#1d6fa4", borderRadius: 2 }} />
              <div>
                <Title level={4} style={{ color: "#1d6fa4", margin: 0, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.05em" }}>GROUND2TECH</Title>
                <Text style={{ color: "#555", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", textTransform: "uppercase", letterSpacing: "0.12em" }}>Site Inspection Report Generator</Text>
              </div>
            </div>
            <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} buttonStyle="solid" size="small">
              <Radio.Button value="A" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}><FormOutlined style={{ marginRight: 5 }} />{t.modeA}</Radio.Button>
              <Radio.Button value="B" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}><ThunderboltOutlined style={{ marginRight: 5 }} />{t.modeB}</Radio.Button>
            </Radio.Group>
          </div>
        </div>

        {/* Mode B */}
        {mode === "B" && (
          <Card style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, marginBottom: 16 }} styles={{ body: { padding: "24px" } }}>
            <div style={{ marginBottom: 20 }}><Space><ThunderboltOutlined style={{ color: "#1d6fa4", fontSize: 18 }} /><Text style={{ color: "#e0e0e0", fontFamily: "IBM Plex Mono, monospace", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t.modeB}</Text></Space></div>
            {renderModeB()}
          </Card>
        )}

        {/* Mode A */}
        {mode === "A" && (
          <>
            <Steps current={currentStep} size="small" style={{ marginBottom: 32 }} items={stepItems} />
            <Card style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, marginBottom: 16 }} styles={{ body: { padding: "24px" } }}>
              <div style={{ marginBottom: 20 }}><Space><span style={{ color: "#1d6fa4", fontSize: 18 }}>{currentIcon}</span><Text style={{ color: "#e0e0e0", fontFamily: "IBM Plex Mono, monospace", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{String(currentStep + 1).padStart(2, "0")} — {currentTitle}</Text></Space></div>
              {currentContent}
            </Card>
            {validationError && <Alert type="error" message={validationError} showIcon style={{ marginBottom: 12, background: "#2a1010", border: "1px solid #5a1e1e" }} />}
            {success && <Alert type="success" message={t.successMsg} showIcon style={{ marginBottom: 12 }} />}
            {error && <Alert type="error" message={`${t.errorMsg}: ${error}`} showIcon style={{ marginBottom: 12 }} />}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button onClick={handleBack} disabled={currentStep === 0} icon={<ArrowLeftOutlined />} style={{ background: "transparent", borderColor: "#333", color: "#a0a0a0", fontFamily: "IBM Plex Mono, monospace" }}>{t.back}</Button>
              <Text style={{ color: "#333", fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>{currentStep + 1} / {totalSteps}</Text>
              {isLastStep ? <Button type="primary" icon={loading ? <Spin size="small" /> : <SendOutlined />} onClick={handleGenerate} disabled={loading} style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, height: 40, paddingInline: 24 }}>{loading ? t.generating : t.generate}</Button> : <Button type="primary" icon={<ArrowRightOutlined />} onClick={handleNext} style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, height: 40, paddingInline: 24 }}>{t.next}</Button>}
            </div>
          </>
        )}
      </div>

      {/* Gate Modal */}
      <Modal open={gateModalOpen} onCancel={() => setGateModalOpen(false)} footer={null} centered width={480} title={null}>
        <div style={{ padding: "8px 0 16px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20, justifyContent: "center" }}>{EXTRA_STEPS.map((s) => (<Tag key={s.key} style={{ background: "#1a2a3a", border: "1px solid #1d6fa4", color: "#7dd3fc", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, padding: "4px 10px", borderRadius: 20 }}>{s.icon} {s.label}</Tag>))}</div>
          <Text style={{ color: "#e0e0e0", fontFamily: "IBM Plex Mono, monospace", fontSize: 15, fontWeight: 600, display: "block", marginBottom: 6, textAlign: "center" }}>{t.gateTitle}</Text>
          <Text style={{ color: "#666", fontSize: 12, display: "block", marginBottom: 20, textAlign: "center" }}>{t.gateSubtitle}</Text>
          <Checkbox.Group value={selectedExtraSteps} onChange={(vals) => { if (besonderheitenLocked && !vals.includes("besonderheiten")) setSelectedExtraSteps([...vals, "besonderheiten"]); else setSelectedExtraSteps(vals); }} style={{ width: "100%" }}>
            <Space direction="vertical" style={{ width: "100%" }} size={10}>
              {EXTRA_STEPS.map((s) => { const isLocked = s.key === "besonderheiten" && besonderheitenLocked; return (<Checkbox key={s.key} value={s.key} disabled={isLocked} style={{ width: "100%", padding: "10px 14px", background: selectedExtraSteps.includes(s.key) ? "#1a2a3a" : "#1e1e1e", borderRadius: 8, border: `1px solid ${selectedExtraSteps.includes(s.key) ? "#1d6fa4" : isLocked ? "#5a2000" : "#2a2a2a"}`, margin: 0, transition: "all 0.15s" }}><Space><span style={{ fontSize: 16 }}>{s.icon}</span><Text style={{ color: "#e0e0e0", fontFamily: "IBM Plex Mono, monospace" }}>{s.label}</Text>{isLocked && <Tag style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, background: "#3a1000", border: "1px solid #7a4f00", color: "#fb923c" }}>PFLICHT</Tag>}</Space></Checkbox>); })}
            </Space>
          </Checkbox.Group>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <Button block onClick={handleGateNo} style={{ background: "transparent", borderColor: "#333", color: "#a0a0a0", fontFamily: "IBM Plex Mono, monospace" }}>{t.gateNo}</Button>
            <Button block type="primary" disabled={selectedExtraSteps.length === 0} onClick={handleGateYes} style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>{t.gateYes} →</Button>
          </div>
        </div>
      </Modal>
{/* Date Confirmation Modal */}
{dateConfirm && (
  <Modal
    open={true}
    onCancel={() => setDateConfirm(null)}
    footer={null}
    centered
    width={400}
    title={null}
  >
    <div style={{ padding: "8px 0 16px" }}>
      <Text style={{
        color: "#e0e0e0", fontFamily: "IBM Plex Mono, monospace",
        fontSize: 15, fontWeight: 600, display: "block",
        marginBottom: 6, textAlign: "center"
      }}>
        {reportLang === "de" ? "Datum bestätigen" :
         reportLang === "en" ? "Confirm date" : "Confirmar fecha"}
      </Text>
      <Text style={{
        color: "#666", fontSize: 13, display: "block",
        marginBottom: 20, textAlign: "center", lineHeight: 1.8
      }}>
        {reportLang === "de" ? "Erkannt" : reportLang === "en" ? "Detected" : "Detectado"}:{" "}
        <span style={{ color: "#1d9fe8", fontFamily: "IBM Plex Mono, monospace" }}>
          „{dateConfirm.keyword}"
        </span>
        <br />
        {reportLang === "de" ? "Aufgelöst zu" : reportLang === "en" ? "Resolved to" : "Resuelto a"}:{" "}
        <span style={{ color: "#e0e0e0", fontWeight: 600 }}>
          {dateConfirm.resolved.format("DD.MM.YYYY")}
        </span>
        <br /><br />
        {reportLang === "de"
          ? "Bericht für dieses Datum erstellen?"
          : reportLang === "en"
          ? "Create report for this date?"
          : "¿Crear informe para esta fecha?"}
      </Text>
      <div style={{ display: "flex", gap: 12 }}>
        <Button
          block
          type="primary"
          onClick={() => {
            setReportDate(dateConfirm.resolved);
            setDateConfirm(null);
          }}
          style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}
        >
          {dateConfirm.resolved.format("DD.MM.YYYY")}
        </Button>
        <Button
          block
          onClick={() => setDateConfirm(null)}
          style={{
            background: "transparent", borderColor: "#333",
            color: "#a0a0a0", fontFamily: "IBM Plex Mono, monospace"
          }}
        >
          {reportLang === "de" ? "Datum ändern" :
           reportLang === "en" ? "Change date" : "Cambiar fecha"}
        </Button>
      </div>
    </div>
  </Modal>
)}

    </div>
  );
}