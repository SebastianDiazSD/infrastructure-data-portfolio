import { useState, useEffect } from "react";
import { Input, Button, Alert, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import ProjectForm from "./ProjectForm";
import ReportHistory from "./ReportHistory";

const { Text } = Typography;

const AUTH_LANG = {
  de: {
    welcome: "Baustelle dokumentieren,",
    welcomeSub: "in Sekunden.",
    begin: "Los geht's",
    loginBtn: "Anmelden", registerBtn: "Registrieren",
    loginTitle: "Anmelden", registerTitle: "Registrieren",
    newReport: "Neuer Bericht", history: "Verlauf",
    stepByStep: "Schritt für Schritt", quickEntry: "Schnelleingabe",
    quickEntrySub: "KI befüllt automatisch",
    stepByStepSub: "Geführter Assistent",
    newReportSub: "Bericht erstellen",
    historySub: "Berichte & Kalender",
    emailLabel: "E-Mail", passwordLabel: "Passwort",
    fullNameLabel: "Vollständiger Name", roleLabel: "Funktion",
    noAccount: "Noch kein Konto? ", hasAccount: "Bereits registriert? ",
    registerLink: "Registrieren", loginLink: "Anmelden",
    passwordPlaceholder: "Min. 8 Zeichen, Großbuchstabe, Zahl, Sonderzeichen",
    logoutBtn: "Abmelden", back: "Zurück",
    continueAnon: "Ohne Konto fortfahren",
    historyLoginRequired: "Verlauf benötigt ein Konto — bitte anmelden.",
    pwWeak: "Passwort braucht: min. 8 Zeichen, 1 Großbuchstabe, 1 Zahl, 1 Sonderzeichen (z.B. Test1234!).",
  },
  en: {
    welcome: "Site documentation,",
    welcomeSub: "in seconds.",
    begin: "Let's begin",
    loginBtn: "Sign In", registerBtn: "Register",
    loginTitle: "Sign In", registerTitle: "Create Account",
    newReport: "New Report", history: "History",
    stepByStep: "Step by Step", quickEntry: "Quick Entry",
    quickEntrySub: "AI fills it automatically",
    stepByStepSub: "Guided assistant",
    newReportSub: "Create a report",
    historySub: "Reports & calendar",
    emailLabel: "Email", passwordLabel: "Password",
    fullNameLabel: "Full Name", roleLabel: "Role",
    noAccount: "No account? ", hasAccount: "Already registered? ",
    registerLink: "Register", loginLink: "Sign In",
    passwordPlaceholder: "Min. 8 chars, uppercase, number, symbol",
    logoutBtn: "Log Out", back: "Back",
    continueAnon: "Continue without account",
    historyLoginRequired: "History requires an account — please sign in.",
    pwWeak: "Password needs: min. 8 characters, 1 uppercase, 1 number, 1 special character (e.g. Test1234!).",
  },
  es: {
    welcome: "Documentación de obra,",
    welcomeSub: "en segundos.",
    begin: "Comenzar",
    loginBtn: "Iniciar sesión", registerBtn: "Registrarse",
    loginTitle: "Iniciar sesión", registerTitle: "Registrarse",
    newReport: "Nuevo Informe", history: "Historial",
    stepByStep: "Paso a Paso", quickEntry: "Entrada Rápida",
    quickEntrySub: "La IA completa automáticamente",
    stepByStepSub: "Asistente guiado",
    newReportSub: "Crear un informe",
    historySub: "Informes y calendario",
    emailLabel: "Correo", passwordLabel: "Contraseña",
    fullNameLabel: "Nombre completo", roleLabel: "Función",
    noAccount: "¿Sin cuenta? ", hasAccount: "¿Ya registrado? ",
    registerLink: "Registrarse", loginLink: "Iniciar sesión",
    passwordPlaceholder: "Mín. 8 car., mayúscula, número, símbolo",
    logoutBtn: "Cerrar sesión", back: "Atrás",
    continueAnon: "Continuar sin cuenta",
    historyLoginRequired: "El historial requiere una cuenta — inicia sesión.",
    pwWeak: "Contraseña necesita: mín. 8 caracteres, 1 mayúscula, 1 número, 1 símbolo (ej. Test1234!).",
  },
};

const mono = "IBM Plex Mono, monospace";
const inputStyle = { background: "#1a1a1a", borderColor: "#333", color: "#e0e0e0" };
const labelStyle = {
  display: "block", color: "#a0a0a0", fontFamily: mono,
  fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
};

// ── Responsive action card ──────────────────────────────────────────────────
function ActionCard({ icon, label, sublabel, onClick, accent = false, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? (hovered ? "translateY(-4px)" : "translateY(0)") : "translateY(20px)",
        transition: "opacity 0.4s ease, transform 0.3s ease, box-shadow 0.2s ease",
        cursor: "pointer",
        background: accent ? "#1d6fa4" : "#161616",
        border: `1px solid ${hovered ? "#1d9fe8" : accent ? "#1d9fe8" : "#2a2a2a"}`,
        borderRadius: 20,
        padding: "clamp(24px, 4vw, 40px) clamp(20px, 3vw, 36px)",
        textAlign: "center",
        flex: "1 1 200px",
        minWidth: 160,
        maxWidth: 320,
        userSelect: "none",
        boxShadow: hovered
          ? `0 8px 32px ${accent ? "rgba(29,111,164,0.4)" : "rgba(29,111,164,0.2)"}`
          : "none",
      }}
    >
      {icon && (
        <div style={{
          fontSize: "clamp(28px, 5vw, 40px)",
          marginBottom: 12,
          lineHeight: 1,
        }}>
          {icon}
        </div>
      )}
      <div style={{
        color: accent ? "#fff" : "#e0e0e0",
        fontFamily: mono, fontWeight: 600,
        fontSize: "clamp(13px, 2vw, 16px)",
        letterSpacing: "0.04em",
        marginBottom: sublabel ? 6 : 0,
      }}>
        {label}
      </div>
      {sublabel && (
        <div style={{
          color: accent ? "rgba(255,255,255,0.75)" : "#666",
          fontSize: "clamp(10px, 1.5vw, 12px)",
          fontFamily: mono,
        }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

// ── Fade wrapper ────────────────────────────────────────────────────────────
function FadeScreen({ children, visible }) {
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transition: "opacity 0.35s ease",
      pointerEvents: visible ? "auto" : "none",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      {children}
    </div>
  );
}

export default function App() {
  const [token, setToken]           = useState(() => localStorage.getItem("g2t_token") || null);
  const [appLang, setAppLang]       = useState("de");
  const [screen, setScreen]         = useState("welcome");
  const [formMode, setFormMode]     = useState("A");
  const [loginMode, setLoginMode]   = useState("login");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [fullName, setFullName]     = useState("");
  const [role, setRole]             = useState("Bauüberwacher");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState(null);
  const [welcomeVisible, setWelcomeVisible] = useState(false);

  const AL = AUTH_LANG[appLang] || AUTH_LANG.de;

  useEffect(() => {
    const t = setTimeout(() => setWelcomeVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (token) setScreen("dashboard");
  }, []);

  // ── Auth handler with proper error parsing + client-side validation ─────
  const handleAuth = async () => {
    setAuthError(null);

    // Client-side password validation on register
    if (loginMode === "register") {
      if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^A-Za-z0-9]/.test(password)
      ) {
        setAuthError(AL.pwWeak);
        return;
      }
    }

    setAuthLoading(true);
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
        // Handle FastAPI validation error arrays properly
        const detail = d.detail;
        if (Array.isArray(detail)) {
          throw new Error(detail.map(e => e.msg || JSON.stringify(e)).join(", "));
        } else if (typeof detail === "string") {
          throw new Error(detail);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      }
      const data = await res.json();
      localStorage.setItem("g2t_token", data.access_token);
      setToken(data.access_token);
      setEmail(""); setPassword(""); setFullName("");
      setScreen("dashboard");
    } catch (e) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("g2t_token");
    setToken(null);
    setScreen("welcome");
    setWelcomeVisible(false);
    setTimeout(() => setWelcomeVisible(true), 100);
  };

  // ── Full screens (form / history) use the top bar layout ────────────────
  if (screen === "form") {
    return (
      <div style={{ minHeight: "100vh", background: "#111" }}>
        {renderTopBar()}
        <ProjectForm initialLang={appLang} initialMode={formMode} />
      </div>
    );
  }

  if (screen === "history") {
    return (
      <div style={{ minHeight: "100vh", background: "#111" }}>
        {renderTopBar()}
        <ReportHistory token={token} onNewReport={() => setScreen("dashboard")} lang={appLang} />
      </div>
    );
  }

  // ── Card flow screens (welcome / auth / dashboard / mode) ────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "#111",
      display: "flex",
      flexDirection: "column",
      fontFamily: "IBM Plex Sans, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        .g2t-nav-bar { padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; }
        .g2t-card-row { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 700px; }
        @media (max-width: 480px) {
          .g2t-card-row { flex-direction: column; align-items: stretch; gap: 14px; }
          .g2t-card-row > div { max-width: 100% !important; }
        }
      `}</style>

      {/* ── Nav bar ── */}
      <div className="g2t-nav-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 24, background: "#1d6fa4", borderRadius: 2 }} />
          <span style={{ color: "#1d6fa4", fontFamily: mono, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em" }}>
            GROUND2TECH
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={appLang}
            onChange={e => setAppLang(e.target.value)}
            style={{
              background: "#1a1a1a", border: "1px solid #333", color: "#a0a0a0",
              borderRadius: 6, padding: "4px 10px", fontSize: 12,
              fontFamily: mono, cursor: "pointer",
            }}
          >
            <option value="de">🇩🇪 DE</option>
            <option value="en">🇬🇧 EN</option>
            <option value="es">🇪🇸 ES</option>
          </select>
          {token && (
            <Button size="small" danger onClick={handleLogout}
              style={{ fontFamily: mono, fontSize: 11 }}>
              {AL.logoutBtn}
            </Button>
          )}
        </div>
      </div>

      {/* ── Center stage ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px 60px",
      }}>

        {/* ── WELCOME ── */}
        {screen === "welcome" && (
          <FadeScreen visible={welcomeVisible}>
            <div style={{ textAlign: "center", maxWidth: 520, width: "100%", padding: "0 16px" }}>
              <div style={{
                color: "#e0e0e0",
                fontSize: "clamp(24px, 5vw, 38px)",
                fontWeight: 300,
                fontFamily: "IBM Plex Sans, sans-serif",
                lineHeight: 1.2, marginBottom: 8,
                opacity: welcomeVisible ? 1 : 0,
                transform: welcomeVisible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.6s ease, transform 0.6s ease",
              }}>
                {AL.welcome}
              </div>
              <div style={{
                color: "#1d9fe8",
                fontSize: "clamp(24px, 5vw, 38px)",
                fontWeight: 600,
                fontFamily: mono,
                lineHeight: 1.2,
                marginBottom: 48,
                opacity: welcomeVisible ? 1 : 0,
                transform: welcomeVisible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
              }}>
                {AL.welcomeSub}
              </div>
              <div className="g2t-card-row" style={{ justifyContent: "center" }}>
                <ActionCard
                  label={AL.begin}
                  sublabel="→"
                  accent={true}
                  delay={400}
                  onClick={() => setScreen("auth")}
                />
              </div>
            </div>
          </FadeScreen>
        )}

        {/* ── AUTH ── */}
        {screen === "auth" && (
          <FadeScreen visible={true}>
            <div style={{ width: "100%", maxWidth: 420, padding: "0 4px" }}>
              {/* Login / Register toggle */}
              <div style={{ display: "flex", gap: 8, marginBottom: 24, justifyContent: "center" }}>
                {["login", "register"].map(m => (
                  <button
                    key={m}
                    onClick={() => { setLoginMode(m); setAuthError(null); }}
                    style={{
                      background: loginMode === m ? "#1d6fa4" : "#1a1a1a",
                      border: `1px solid ${loginMode === m ? "#1d9fe8" : "#333"}`,
                      color: loginMode === m ? "#fff" : "#a0a0a0",
                      borderRadius: 10, padding: "10px 28px",
                      fontFamily: mono, fontSize: 12, cursor: "pointer",
                      transition: "all 0.2s ease",
                      flex: 1,
                    }}
                  >
                    {m === "login" ? AL.loginBtn : AL.registerBtn}
                  </button>
                ))}
              </div>

              {/* Form card */}
              <div style={{
                background: "#161616",
                border: "1px solid #2a2a2a",
                borderRadius: 20,
                padding: "clamp(20px, 4vw, 32px)",
              }}>
                {loginMode === "register" && (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>{AL.fullNameLabel}</label>
                      <Input value={fullName} onChange={e => setFullName(e.target.value)}
                        placeholder="Sebastian Arce Diaz" style={inputStyle} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>{AL.roleLabel}</label>
                      <Input value={role} onChange={e => setRole(e.target.value)}
                        placeholder="Bauüberwacher" style={inputStyle} />
                    </div>
                  </>
                )}
                <div style={{ marginBottom: 14 }}>
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
                    style={{ marginBottom: 14, background: "#2a1010", border: "1px solid #5a1e1e" }} />
                )}
                <Button type="primary" block onClick={handleAuth} loading={authLoading}
                  style={{ fontFamily: mono, fontWeight: 600, height: 44, borderRadius: 10, fontSize: 13 }}>
                  {loginMode === "login" ? AL.loginTitle : AL.registerTitle}
                </Button>
              </div>

              {/* Links below card */}
              <div style={{ textAlign: "center", marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <Text onClick={() => setScreen("welcome")}
                  style={{ color: "#555", fontFamily: mono, fontSize: 11, cursor: "pointer" }}>
                  ← {AL.back}
                </Text>
                <Text onClick={() => setScreen("dashboard")}
                  style={{ color: "#3a3a3a", fontFamily: mono, fontSize: 11, cursor: "pointer" }}>
                  {AL.continueAnon}
                </Text>
              </div>
            </div>
          </FadeScreen>
        )}

        {/* ── DASHBOARD ── */}
        {screen === "dashboard" && (
          <FadeScreen visible={true}>
            <div className="g2t-card-row">
              <ActionCard
                icon="📋"
                label={AL.newReport}
                sublabel={AL.newReportSub}
                accent={true}
                delay={0}
                onClick={() => setScreen("mode")}
              />
              <ActionCard
                icon="🗓️"
                label={AL.history}
                sublabel={AL.historySub}
                delay={120}
                onClick={() => {
                  if (!token) {
                    // Redirect to auth with explanation message
                    setAuthError(AL.historyLoginRequired);
                    setLoginMode("login");
                    setScreen("auth");
                  } else {
                    setScreen("history");
                  }
                }}
              />
            </div>
          </FadeScreen>
        )}

        {/* ── MODE SELECTION ── */}
        {screen === "mode" && (
          <FadeScreen visible={true}>
            <div className="g2t-card-row">
              <ActionCard
                icon="🧭"
                label={AL.stepByStep}
                sublabel={AL.stepByStepSub}
                delay={0}
                onClick={() => { setFormMode("A"); setScreen("form"); }}
              />
              <ActionCard
                icon="⚡"
                label={AL.quickEntry}
                sublabel={AL.quickEntrySub}
                accent={true}
                delay={120}
                onClick={() => { setFormMode("B"); setScreen("form"); }}
              />
            </div>
            <div style={{ textAlign: "center", marginTop: 28 }}>
              <Text onClick={() => setScreen("dashboard")}
                style={{ color: "#555", fontFamily: mono, fontSize: 11, cursor: "pointer" }}>
                ← {AL.back}
              </Text>
            </div>
          </FadeScreen>
        )}
      </div>
    </div>
  );

  // ── Top bar used in form/history screens ─────────────────────────────────
  function renderTopBar() {
    return (
      <div style={{
        padding: "10px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#0d1117",
        borderBottom: "1px solid #222",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 22, background: "#1d6fa4", borderRadius: 2 }} />
          <span style={{ color: "#1d6fa4", fontFamily: mono, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em" }}>
            GROUND2TECH
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={appLang} onChange={e => setAppLang(e.target.value)}
            style={{ background: "#1a1a1a", border: "1px solid #333", color: "#a0a0a0", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontFamily: mono, cursor: "pointer" }}>
            <option value="de">🇩🇪 DE</option>
            <option value="en">🇬🇧 EN</option>
            <option value="es">🇪🇸 ES</option>
          </select>
          <Button size="small" onClick={() => setScreen("dashboard")}
            style={{ fontFamily: mono, fontSize: 11, background: "transparent", borderColor: "#333", color: "#a0a0a0" }}>
            ← {AL.back}
          </Button>
          {token && (
            <Button size="small" danger onClick={handleLogout}
              style={{ fontFamily: mono, fontSize: 11 }}>
              {AL.logoutBtn}
            </Button>
          )}
        </div>
      </div>
    );
  }
}
