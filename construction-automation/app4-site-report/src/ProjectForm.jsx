import { useState } from "react";

const API_URL = "http://localhost:8000/api/generate-report";

const WEATHER_OPTIONS = [
  { value: "sonnig",   label: "☀️ Sonnig" },
  { value: "bewölkt",  label: "⛅ Bewölkt" },
  { value: "Regen",    label: "🌧️ Regen" },
  { value: "Schnee",   label: "❄️ Schnee" },
  { value: "Wind",     label: "💨 Wind" },
];

const LANGUAGE_OPTIONS = [
  { value: "de", label: "🇩🇪 Deutsch" },
  { value: "en", label: "🇬🇧 English" },
  { value: "es", label: "🇪🇸 Español" },
];

export default function ProjectForm() {
  const [formData, setFormData] = useState({
    project_id:      "",
    project_name:    "",
    date:            new Date().toISOString().split("T")[0],
    supervisor:      "",
    weather:         "sonnig",
    temp_celsius:    "",
    work_summary:    "",
    issues:          "",
    next_steps:      "",
    report_language: "de",
    workforce:       [{ company: "", trade: "", headcount: 1 }],
    equipment:       [{ description: "", quantity: 1 }],
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // ── Generic field update ───────────────────────────────────────
  const update = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // ── Workforce handlers ─────────────────────────────────────────
  const updateWorkforce = (index, field, value) => {
    const updated = [...formData.workforce];
    updated[index] = { ...updated[index], [field]: value };
    update("workforce", updated);
  };
  const addWorkforce    = () => update("workforce",
    [...formData.workforce, { company: "", trade: "", headcount: 1 }]);
  const removeWorkforce = (i) => update("workforce",
    formData.workforce.filter((_, idx) => idx !== i));

  // ── Equipment handlers ─────────────────────────────────────────
  const updateEquipment = (index, field, value) => {
    const updated = [...formData.equipment];
    updated[index] = { ...updated[index], [field]: value };
    update("equipment", updated);
  };
  const addEquipment    = () => update("equipment",
    [...formData.equipment, { description: "", quantity: 1 }]);
  const removeEquipment = (i) => update("equipment",
    formData.equipment.filter((_, idx) => idx !== i));

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Clean up empty workforce/equipment rows
    const payload = {
      ...formData,
      temp_celsius: formData.temp_celsius !== "" ? parseFloat(formData.temp_celsius) : null,
      issues:       formData.issues.trim()    || null,
      next_steps:   formData.next_steps.trim() || null,
      workforce:    formData.workforce.filter(w => w.company.trim()),
      equipment:    formData.equipment.filter(e => e.description.trim()),
    };

    try {
      const response = await fetch(API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Server error");
      }

      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Bautagesbericht_${formData.project_id}_${formData.date}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "#2E5FA3", borderBottom: "3px solid #2E5FA3", paddingBottom: 8 }}>
        Ground2Tech — Site Inspection Report
      </h1>

      <form onSubmit={handleSubmit}>

        {/* Project Info */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Project Information</h2>
          <div style={rowStyle}>
            <label style={labelStyle}>Project ID *</label>
            <input style={inputStyle} required value={formData.project_id}
              onChange={e => update("project_id", e.target.value)} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Project Name *</label>
            <input style={inputStyle} required value={formData.project_name}
              onChange={e => update("project_name", e.target.value)} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Date *</label>
            <input style={inputStyle} type="date" required value={formData.date}
              onChange={e => update("date", e.target.value)} />
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Bauüberwacher *</label>
            <input style={inputStyle} required value={formData.supervisor}
              onChange={e => update("supervisor", e.target.value)} />
          </div>
        </section>

        {/* Site Conditions */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Site Conditions</h2>
          <div style={rowStyle}>
            <label style={labelStyle}>Weather *</label>
            <select style={inputStyle} value={formData.weather}
              onChange={e => update("weather", e.target.value)}>
              {WEATHER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>Temperature (°C)</label>
            <input style={inputStyle} type="number" step="0.1"
              value={formData.temp_celsius}
              onChange={e => update("temp_celsius", e.target.value)} />
          </div>
        </section>

        {/* Work Summary */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Work Performed *</h2>
          <textarea style={{ ...inputStyle, height: 100, resize: "vertical" }}
            required value={formData.work_summary}
            onChange={e => update("work_summary", e.target.value)}
            placeholder="Describe work performed today..." />
        </section>

        {/* Workforce */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Workforce</h2>
          {formData.workforce.map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input style={{ ...inputStyle, flex: 2 }} placeholder="Company"
                value={w.company} onChange={e => updateWorkforce(i, "company", e.target.value)} />
              <input style={{ ...inputStyle, flex: 2 }} placeholder="Trade / Gewerk"
                value={w.trade} onChange={e => updateWorkforce(i, "trade", e.target.value)} />
              <input style={{ ...inputStyle, flex: 1, width: 60 }} type="number" min="0"
                placeholder="Count" value={w.headcount}
                onChange={e => updateWorkforce(i, "headcount", parseInt(e.target.value))} />
              {formData.workforce.length > 1 &&
                <button type="button" onClick={() => removeWorkforce(i)}
                  style={removeBtnStyle}>✕</button>}
            </div>
          ))}
          <button type="button" onClick={addWorkforce} style={addBtnStyle}>
            + Add Row
          </button>
        </section>

        {/* Equipment */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Equipment / Geräte</h2>
          {formData.equipment.map((eq, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input style={{ ...inputStyle, flex: 3 }} placeholder="Equipment description"
                value={eq.description}
                onChange={e => updateEquipment(i, "description", e.target.value)} />
              <input style={{ ...inputStyle, flex: 1, width: 60 }} type="number" min="1"
                placeholder="Qty" value={eq.quantity}
                onChange={e => updateEquipment(i, "quantity", parseInt(e.target.value))} />
              {formData.equipment.length > 1 &&
                <button type="button" onClick={() => removeEquipment(i)}
                  style={removeBtnStyle}>✕</button>}
            </div>
          ))}
          <button type="button" onClick={addEquipment} style={addBtnStyle}>
            + Add Row
          </button>
        </section>

        {/* Issues & Next Steps */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Issues / Störungen</h2>
          <textarea style={{ ...inputStyle, height: 70, resize: "vertical" }}
            value={formData.issues}
            onChange={e => update("issues", e.target.value)}
            placeholder="Any problems, delays or incidents? (leave blank if none)" />
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Next Day Plan</h2>
          <textarea style={{ ...inputStyle, height: 70, resize: "vertical" }}
            value={formData.next_steps}
            onChange={e => update("next_steps", e.target.value)}
            placeholder="Planned work for tomorrow..." />
        </section>

        {/* Language */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>Report Language</h2>
          <div style={{ display: "flex", gap: 12 }}>
            {LANGUAGE_OPTIONS.map(o => (
              <label key={o.value} style={{ cursor: "pointer", fontSize: 16 }}>
                <input type="radio" name="lang" value={o.value}
                  checked={formData.report_language === o.value}
                  onChange={() => update("report_language", o.value)}
                  style={{ marginRight: 6 }} />
                {o.label}
              </label>
            ))}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div style={{ background: "#FFE5E5", border: "1px solid #CC0000",
            padding: 12, borderRadius: 4, marginBottom: 16, color: "#CC0000" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading} style={{
          background: loading ? "#888" : "#2E5FA3",
          color: "white", border: "none", padding: "14px 32px",
          fontSize: 16, borderRadius: 6, cursor: loading ? "not-allowed" : "pointer",
          width: "100%", marginTop: 8,
        }}>
          {loading ? "⏳ Generating report..." : "📄 Generate Bautagesbericht"}
        </button>

      </form>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const sectionStyle = {
  background: "#F8F9FA", border: "1px solid #DEE2E6",
  borderRadius: 6, padding: 16, marginBottom: 16,
};
const headingStyle = {
  color: "#2E5FA3", fontSize: 15, fontWeight: "bold",
  marginTop: 0, marginBottom: 12,
};
const rowStyle   = { display: "flex", alignItems: "center", marginBottom: 10 };
const labelStyle = { width: 160, fontWeight: "bold", fontSize: 14, flexShrink: 0 };
const inputStyle = {
  flex: 1, padding: "6px 10px", border: "1px solid #CCC",
  borderRadius: 4, fontSize: 14,
};
const addBtnStyle = {
  background: "white", border: "1px solid #2E5FA3", color: "#2E5FA3",
  padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontSize: 13,
};
const removeBtnStyle = {
  background: "white", border: "1px solid #CC0000", color: "#CC0000",
  padding: "4px 8px", borderRadius: 4, cursor: "pointer",
};