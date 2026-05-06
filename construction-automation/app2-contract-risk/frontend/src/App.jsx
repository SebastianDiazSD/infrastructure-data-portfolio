import { useState } from 'react'
import DropZone from './components/DropZone.jsx'
import SplitPane from './components/SplitPane.jsx'
import NachtragUpload from './components/NachtragUpload.jsx'
import NachtragResult from './components/NachtragResult.jsx'

// overall_risk_level from backend: 'HIGH' | 'MEDIUM' | 'LOW'
function riskChip(level) {
  if (level === 'HIGH') return { label: 'High Risk', cls: 'bg-red-950 text-red-400 border-red-800' }
  if (level === 'MEDIUM') return { label: 'Medium Risk', cls: 'bg-amber-950 text-amber-400 border-amber-800' }
  return { label: 'Low Risk', cls: 'bg-green-950 text-green-400 border-green-800' }
}

// POST JSON → download DOCX blob
async function downloadDocx(endpoint, payload, filename) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const IDLE = { status: 'idle', result: null, error: null }

export default function App() {
  const [mode, setMode] = useState('modeA')

  // Mode A: pre-signing contract risk
  const [modeA, setModeA] = useState({ ...IDLE, selectedIdx: 0 })

  // Mode B: Nachtrag review
  const [modeB, setModeB] = useState({ ...IDLE })

  // ── Mode A ──────────────────────────────────────────────
  async function analyzeContract(file) {
    setModeA({ status: 'loading', result: null, error: null, selectedIdx: 0 })
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/analyze-contract', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setModeA({ status: 'done', result: data, error: null, selectedIdx: 0 })
    } catch (e) {
      setModeA({ status: 'error', result: null, error: e.message, selectedIdx: 0 })
    }
  }

  async function exportReport() {
    try {
      await downloadDocx('/export-report', modeA.result, 'risk_report.docx')
    } catch (e) {
      alert(`Export failed: ${e.message}`)
    }
  }

  // ── Mode B ──────────────────────────────────────────────
  async function analyzeNachtrag(nachtragFile, lvFile) {
    setModeB({ status: 'loading', result: null, error: null })
    const fd = new FormData()
    fd.append('nachtrag', nachtragFile)
    fd.append('original_lv', lvFile)
    try {
      const res = await fetch('/analyze-nachtrag', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setModeB({ status: 'done', result: data, error: null })
    } catch (e) {
      setModeB({ status: 'error', result: null, error: e.message })
    }
  }

  async function exportStellung() {
    try {
      await downloadDocx('/export-stellungnahme', modeB.result, 'stellungnahme.docx')
    } catch (e) {
      alert(`Export failed: ${e.message}`)
    }
  }

  // ── Render ───────────────────────────────────────────────
  const chip = modeA.result ? riskChip(modeA.result.summary?.overall_risk_level) : null

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col" style={{ height: '100dvh' }}>
      {/* ── Header ── */}
      <header className="shrink-0 border-b border-[#30363d] px-6 py-3 flex items-center gap-6">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-base font-semibold text-white tracking-tight">G2Tech</span>
          <span className="text-[#8b949e] text-xs">Contract Risk</span>
        </div>
        <nav className="flex gap-1">
          {[
            { id: 'modeA', label: 'Mode A — Pre-Signing Risk' },
            { id: 'modeB', label: 'Mode B — Nachtrag Review' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === tab.id
                  ? 'bg-[#21262d] text-white border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Mode A ── */}
      {mode === 'modeA' && (
        <ModeAView
          state={modeA}
          chip={chip}
          onFile={analyzeContract}
          onSelect={(i) => setModeA((s) => ({ ...s, selectedIdx: i }))}
          onExport={exportReport}
          onReset={() => setModeA({ ...IDLE, selectedIdx: 0 })}
        />
      )}

      {/* ── Mode B ── */}
      {mode === 'modeB' && (
        <ModeBView
          state={modeB}
          onSubmit={analyzeNachtrag}
          onExport={exportStellung}
          onReset={() => setModeB({ ...IDLE })}
        />
      )}
    </div>
  )
}

// ── Mode A sub-view ────────────────────────────────────────
function ModeAView({ state, chip, onFile, onSelect, onExport, onReset }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {state.status === 'idle' && (
        <Centered>
          <h1 className="font-display text-2xl text-white mb-2">Contract Risk Analysis</h1>
          <p className="text-[#8b949e] text-sm mb-6">
            Upload a VOB/B contract PDF to identify high-risk clauses and get negotiation guidance.
          </p>
          <DropZone
            label="Drop contract PDF here"
            accept={{ 'application/pdf': ['.pdf'] }}
            onFile={onFile}
          />
        </Centered>
      )}

      {state.status === 'loading' && <Spinner text="Analysing contract clauses…" />}

      {state.status === 'error' && (
        <ErrorPanel message={state.error} onRetry={onReset} />
      )}

      {state.status === 'done' && state.result && (
        <>
          {/* Risk bar */}
          <div className="shrink-0 px-6 py-2.5 border-b border-[#30363d] flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 rounded border text-xs font-medium ${chip.cls}`}>
              {chip.label} · {state.result.summary?.overall_risk_score}/100
            </span>
            <span className="text-[#8b949e] text-xs">
              {state.result.summary?.high_risk_count ?? 0} high ·{' '}
              {state.result.summary?.medium_risk_count ?? 0} medium ·{' '}
              {state.result.summary?.low_risk_count ?? 0} low
            </span>
            <span className="text-[#8b949e] text-xs flex-1 truncate hidden md:block">
              {state.result.summary?.summary_text}
            </span>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={onExport}
                className="px-3 py-1.5 text-xs font-medium bg-[#21262d] border border-[#30363d] text-white rounded hover:bg-[#30363d] transition-colors"
              >
                Export DOCX
              </button>
              <button
                onClick={onReset}
                className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-white transition-colors"
              >
                New file
              </button>
            </div>
          </div>

          <SplitPane
            clauses={state.result.clauses ?? []}
            selectedIdx={state.selectedIdx}
            onSelect={onSelect}
          />
        </>
      )}
    </div>
  )
}

// ── Mode B sub-view ────────────────────────────────────────
function ModeBView({ state, onSubmit, onExport, onReset }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {state.status === 'idle' && (
        <Centered>
          <h1 className="font-display text-2xl text-white mb-2">Nachtrag Review</h1>
          <p className="text-[#8b949e] text-sm mb-6">
            Upload the contractor's supplement claim and the original LV (GAEB or PDF) to generate a
            Stellungnahme.
          </p>
          <NachtragUpload onSubmit={onSubmit} />
        </Centered>
      )}

      {state.status === 'loading' && <Spinner text="Analysing Nachtrag positions…" />}

      {state.status === 'error' && (
        <ErrorPanel message={state.error} onRetry={onReset} />
      )}

      {state.status === 'done' && state.result && (
        <NachtragResult
          result={state.result}
          onExport={onExport}
          onReset={onReset}
        />
      )}
    </div>
  )
}

// ── Shared primitives ─────────────────────────────────────
function Centered({ children }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  )
}

function Spinner({ text }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-[#388bfd] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#8b949e] text-sm">{text}</p>
    </div>
  )
}

function ErrorPanel({ message, onRetry }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <div className="bg-red-950 border border-red-800 rounded-lg p-4 max-w-md w-full">
        <p className="text-red-400 text-sm font-medium mb-1">Analysis failed</p>
        <p className="text-red-300 text-xs">{message}</p>
      </div>
      <button onClick={onRetry} className="text-[#388bfd] text-sm hover:underline">
        Try again
      </button>
    </div>
  )
}
