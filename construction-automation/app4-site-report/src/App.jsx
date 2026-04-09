import { useState } from "react";
import { Modal, Input, Button, Space, Typography, Alert, Select } from "antd";
import { UserOutlined, LockOutlined, HistoryOutlined, PlusOutlined } from "@ant-design/icons";
import ProjectForm from "./ProjectForm";
import ReportHistory from "./ReportHistory";

const { Text, Title } = Typography;
const { Option } = Select;

const AUTH_LANG = {
  de: {
    loginTitle: "Anmelden", registerTitle: "Registrieren",
    emailLabel: "E-Mail", passwordLabel: "Passwort",
    fullNameLabel: "Vollständiger Name", roleLabel: "Funktion",
    noAccount: "Noch kein Konto? ", hasAccount: "Bereits registriert? ",
    registerLink: "Registrieren", loginLink: "Anmelden",
    passwordPlaceholder: "Mindestens 8 Zeichen",
    loginBtn: "Anmelden", registerBtn: "Registrieren",
    loginNavBtn: "Anmelden", logoutBtn: "Abmelden",
    historyBtn: "Verlauf", newReportBtn: "Neuer Bericht",
  },
  en: {
    loginTitle: "Sign In", registerTitle: "Create Account",
    emailLabel: "Email", passwordLabel: "Password",
    fullNameLabel: "Full Name", roleLabel: "Role",
    noAccount: "No account yet? ", hasAccount: "Already registered? ",
    registerLink: "Register", loginLink: "Sign In",
    passwordPlaceholder: "At least 8 characters",
    loginBtn: "Sign In", registerBtn: "Create Account",
    loginNavBtn: "Sign In", logoutBtn: "Log Out",
    historyBtn: "History", newReportBtn: "New Report",
  },
  es: {
    loginTitle: "Iniciar sesión", registerTitle: "Registrarse",
    emailLabel: "Correo electrónico", passwordLabel: "Contraseña",
    fullNameLabel: "Nombre completo", roleLabel: "Función",
    noAccount: "¿Sin cuenta? ", hasAccount: "¿Ya registrado? ",
    registerLink: "Registrarse", loginLink: "Iniciar sesión",
    passwordPlaceholder: "Mínimo 8 caracteres",
    loginBtn: "Iniciar sesión", registerBtn: "Crear cuenta",
    loginNavBtn: "Iniciar sesión", logoutBtn: "Cerrar sesión",
    historyBtn: "Historial", newReportBtn: "Nuevo Informe",
  },
};

const labelStyle = {
  display: "block", color: "#a0a0a0",
  fontFamily: "IBM Plex Mono, monospace", fontSize: 11,
  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
};
const inputStyle = { background: "#1a1a1a", borderColor: "#333", color: "#e0e0e0" };

export default function App() {
  const [token, setToken]         = useState(() => localStorage.getItem("g2t_token") || null);
  const [view, setView]           = useState("form");
  const [appLang, setAppLang]     = useState("de");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState("login");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [fullName, setFullName]   = useState("");
  const [role, setRole]           = useState("Bauüberwacher");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState(null);

  const AL = AUTH_LANG[appLang] || AUTH_LANG.de;
  const isLoggedIn = !!token;

  const handleAuth = async () => {
    setAuthLoading(true); setAuthError(null);
    const url = loginMode === "login" ? "/auth/login" : "/auth/register";
    const body = loginMode === "login"
      ? { email, password }
      : { email, password, full_name: fullName, role };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      localStorage.setItem("g2t_token", data.access_token);
      setToken(data.access_token);
      setLoginOpen(false);
      setEmail(""); setPassword(""); setFullName("");
    } catch (e) { setAuthError(e.message); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("g2t_token");
    setToken(null);
    setView("form");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#111" }}>

      {/* ── Nav bar ── */}
      <div style={{
        background: "#0d1117", borderBottom: "1px solid #222",
        padding: "8px 24px", display: "flex",
        justifyContent: "flex-end", alignItems: "center", gap: 10,
      }}>
        {/* Language selector */}
        <select
          value={appLang}
          onChange={e => setAppLang(e.target.value)}
          style={{
            background: "#1a1a1a", border: "1px solid #333", color: "#a0a0a0",
            borderRadius: 4, padding: "2px 8px", fontSize: 11,
            fontFamily: "IBM Plex Mono, monospace", cursor: "pointer",
          }}
        >
          <option value="de">🇩🇪 DE</option>
          <option value="en">🇬🇧 EN</option>
          <option value="es">🇪🇸 ES</option>
        </select>

        {isLoggedIn ? (
          <>
            <Button size="small"
              icon={<HistoryOutlined />}
              onClick={() => setView(v => v === "history" ? "form" : "history")}
              style={{
                fontFamily: "IBM Plex Mono, monospace", fontSize: 11,
                background: view === "history" ? "#1d6fa4" : "transparent",
                borderColor: view === "history" ? "#1d6fa4" : "#333",
                color: view === "history" ? "#fff" : "#a0a0a0",
              }}>
              {AL.historyBtn}
            </Button>
            <Button size="small" icon={<PlusOutlined />}
              onClick={() => setView("form")}
              style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11,
                background: "transparent", borderColor: "#333", color: "#a0a0a0" }}>
              {AL.newReportBtn}
            </Button>
            <Button size="small" danger onClick={handleLogout}
              style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>
              {AL.logoutBtn}
            </Button>
          </>
        ) : (
          <Button size="small" icon={<UserOutlined />}
            onClick={() => { setLoginOpen(true); setLoginMode("login"); setAuthError(null); }}
            style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11,
              background: "transparent", borderColor: "#1d6fa4", color: "#1d9fe8" }}>
            {AL.loginNavBtn}
          </Button>
        )}
      </div>

      {/* ── Main content ── */}
      {view === "history" && isLoggedIn
        ? <ReportHistory token={token} onNewReport={() => setView("form")} lang={appLang} />
        : <ProjectForm initialLang={appLang} />
      }

      {/* ── Login / Register modal ── */}
      <Modal open={loginOpen} onCancel={() => setLoginOpen(false)}
        footer={null} centered width={400} title={null}>
        <div style={{ padding: "8px 0 16px" }}>
          <Title level={5} style={{
            color: "#e0e0e0", fontFamily: "IBM Plex Mono, monospace",
            textAlign: "center", marginBottom: 20,
          }}>
            {loginMode === "login" ? AL.loginTitle : AL.registerTitle}
          </Title>

          {loginMode === "register" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{AL.fullNameLabel}</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Sebastian Arce Diaz" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{AL.roleLabel}</label>
                <Input value={role} onChange={e => setRole(e.target.value)}
                  placeholder="Bauüberwacher" style={inputStyle} />
              </div>
            </>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>{AL.emailLabel}</label>
            <Input value={email} onChange={e => setEmail(e.target.value)}
              prefix={<UserOutlined style={{ color: "#555" }} />}
              placeholder="name@example.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{AL.passwordLabel}</label>
            <Input.Password value={password} onChange={e => setPassword(e.target.value)}
              prefix={<LockOutlined style={{ color: "#555" }} />}
              placeholder={AL.passwordPlaceholder} style={inputStyle}
              onPressEnter={handleAuth} />
          </div>

          {authError && (
            <Alert type="error" message={authError} showIcon
              style={{ marginBottom: 12, background: "#2a1010", border: "1px solid #5a1e1e" }} />
          )}

          <Button type="primary" block onClick={handleAuth} loading={authLoading}
            style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, height: 40 }}>
            {loginMode === "login" ? AL.loginBtn : AL.registerBtn}
          </Button>

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Text style={{ color: "#555", fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }}>
              {loginMode === "login" ? AL.noAccount : AL.hasAccount}
              <span
                onClick={() => { setLoginMode(m => m === "login" ? "register" : "login"); setAuthError(null); }}
                style={{ color: "#1d9fe8", cursor: "pointer" }}
              >
                {loginMode === "login" ? AL.registerLink : AL.loginLink}
              </span>
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
}