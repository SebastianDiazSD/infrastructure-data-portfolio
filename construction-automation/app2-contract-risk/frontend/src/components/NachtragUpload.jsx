import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

// ── Primitive: single-file drop zone ─────────────────────────────────────────
function FileSlot({ label, hint, required, file, onFile, accept }) {
  const onDrop = useCallback((accepted) => { if (accepted[0]) onFile(accepted[0]) }, [onFile])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: accept ?? { 'application/pdf': ['.pdf'] }, maxFiles: 1, multiple: false,
  })
  let cls = 'border-[#30363d] hover:border-[#484f58] bg-[#161b22]'
  if (isDragActive) cls = 'border-[#388bfd] bg-[#388bfd]/5'

  return (
    <div>
      <p className="text-[#8b949e] text-xs mb-1.5 font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {!required && <span className="text-[#484f58] ml-1">(optional)</span>}
      </p>
      <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all text-center ${cls}`}>
        <input {...getInputProps()} />
        {file ? (
          <p className="text-green-400 text-xs truncate">✓ {file.name}</p>
        ) : (
          <p className="text-[#484f58] text-xs">{isDragActive ? 'Drop here' : (hint ?? 'Drop PDF')}</p>
        )}
      </div>
    </div>
  )
}

// ── Warning modal: no LV / Baubeschreibung ────────────────────────────────────
function LvWarningModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-amber-800 rounded-xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-amber-400 text-lg">⚠</span>
          <div>
            <p className="text-amber-400 text-sm font-semibold mb-1">Eingeschränkte Prüfung</p>
            <p className="text-[#8b949e] text-xs leading-relaxed">
              Ohne Original-LV oder Baubeschreibung kann nicht geprüft werden, ob die beanspruchten
              Leistungen bereits vertraglich geschuldet sind.
              Die Prüfung beschränkt sich auf VOB/B-Grundsätze.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-[#8b949e] hover:text-white transition-colors">
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-amber-800 hover:bg-amber-700 text-white text-xs font-medium rounded transition-colors"
          >
            Trotzdem fortfahren
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Path selector card ────────────────────────────────────────────────────────
function PathCard({ id, active, onClick, title, description, badge }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        active
          ? 'border-[#388bfd] bg-[#388bfd]/10'
          : 'border-[#30363d] bg-[#161b22] hover:border-[#484f58]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${active ? 'bg-[#388bfd]' : 'bg-[#484f58]'}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-white text-sm font-medium">{title}</span>
            {badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#388bfd]/20 text-[#388bfd] border border-[#388bfd]/30">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[#8b949e] text-xs leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  )
}

// ── Path C: Chatbox ───────────────────────────────────────────────────────────
function NachtragChatBox({ sessionId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const SUGGESTED = [
    'Ist diese Leistung im Originalvertrag enthalten?',
    'Ist die Zusatzleistung nach VOB/B §2 grundsätzlich berechtigt?',
    'Was würde passieren, wenn diese Leistung nicht ausgeführt wird?',
    'Welche Unterlagen müssen wir vom AN noch einfordern?',
  ]

  async function send(q) {
    const question = q ?? input.trim()
    if (!question || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: question }])
    setLoading(true)
    try {
      const res = await fetch('/ask-nachtrag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, question }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`)
      setMessages((m) => [...m, { role: 'assistant', data }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'error', text: e.message }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-96 border border-[#30363d] rounded-lg overflow-hidden">
      <div className="shrink-0 px-4 py-2 border-b border-[#30363d] bg-[#161b22]">
        <span className="text-[#8b949e] text-xs font-medium">Nachtrag Q&A</span>
        <span className="text-[#484f58] text-[10px] ml-2">VOB/B-Analyse und Vertragscheck</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-[#484f58] text-xs">Vorgeschlagene Fragen:</p>
            {SUGGESTED.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="block w-full text-left text-xs text-[#8b949e] hover:text-white bg-[#161b22] border border-[#30363d] rounded px-3 py-2 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => {
          if (msg.role === 'user') return (
            <div key={i} className="flex justify-end">
              <div className="bg-[#388bfd]/20 border border-[#388bfd]/30 rounded-lg px-3 py-2 max-w-[80%]">
                <p className="text-white text-xs">{msg.text}</p>
              </div>
            </div>
          )
          if (msg.role === 'error') return (
            <div key={i} className="bg-red-950/30 border border-red-800/30 rounded px-3 py-2">
              <p className="text-red-400 text-xs">{msg.text}</p>
            </div>
          )
          const d = msg.data
          return (
            <div key={i} className="space-y-2">
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3">
                <p className="text-[#e6edf3] text-xs leading-relaxed">{d.answer}</p>
              </div>
              <div className="flex flex-wrap gap-2 px-1">
                {d.legal_basis && <span className="text-[#388bfd] text-[10px]">{d.legal_basis}</span>}
                {d.confidence && (
                  <span className="text-[#484f58] text-[10px]">{d.confidence} confidence — {d.confidence_note}</span>
                )}
              </div>
              {d.action_required && d.action_required !== 'Keine sofortige Maßnahme erforderlich' && (
                <div className="bg-amber-950/30 border border-amber-800/30 rounded px-3 py-2">
                  <p className="text-amber-300 text-xs">{d.action_required}</p>
                </div>
              )}
              {d.missing_context && (
                <p className="text-[#484f58] text-[10px] px-1">Fehlende Unterlagen: {d.missing_context}</p>
              )}
            </div>
          )
        })}
        {loading && (
          <div className="flex items-center gap-2 text-[#484f58] text-xs">
            <div className="w-3 h-3 border border-[#388bfd] border-t-transparent rounded-full animate-spin" />
            Analysiere…
          </div>
        )}
      </div>
      <div className="shrink-0 p-3 border-t border-[#30363d] flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Frage zum Nachtrag stellen…" maxLength={500}
          className="flex-1 bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-[#388bfd]"
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          className="px-3 py-2 bg-[#388bfd] hover:bg-[#58a6ff] disabled:opacity-40 text-white text-xs font-medium rounded">
          Senden
        </button>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function NachtragUpload({ onSubmit }) {
  const [path, setPath] = useState(null)           // 'pathA' | 'pathB' | 'pathC'
  const [files, setFiles] = useState({})           // collected file objects
  const [showWarning, setShowWarning] = useState(false)
  const [chatSessionId, setChatSessionId] = useState(null)
  const [initLoading, setInitLoading] = useState(false)

  function setFile(key, file) {
    setFiles((f) => ({ ...f, [key]: file }))
  }

  const hasLvContext = files.original_lv || files.baubeschreibung

  function handleSubmitPathAB() {
    if (!hasLvContext) {
      setShowWarning(true)
    } else {
      doSubmit()
    }
  }

  function doSubmit() {
    const stage = path === 'pathA' ? 'stage1' : 'stage2'
    onSubmit({ ...files, stage_override: stage })
  }

  async function initChatSession() {
    setInitLoading(true)
    const fd = new FormData()
    if (files.nachtrag_doc)      fd.append('nachtrag_doc',     files.nachtrag_doc)
    if (files.original_lv)       fd.append('original_lv',      files.original_lv)
    if (files.baubeschreibung)   fd.append('baubeschreibung',   files.baubeschreibung)
    if (files.pasted_text)       fd.append('pasted_text',       files.pasted_text)
    try {
      const res = await fetch('/init-nachtrag-session', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`)
      setChatSessionId(data.session_id)
    } catch (e) {
      alert(`Session init failed: ${e.message}`)
    } finally {
      setInitLoading(false)
    }
  }

  // ── Path selection screen ──────────────────────────────────────────────────
  if (!path) {
    return (
      <div className="space-y-3">
        <p className="text-[#8b949e] text-sm mb-4">
          What do you have available for this NT review?
        </p>
        <PathCard id="pathA" active={false} onClick={setPath}
          title="Anzeige / Preliminary notice"
          description="The contractor sent a formal notice (Anzeige einer Vertragsabweichung) or a short preliminary claim. You want to check if the claim is principally justified before the full NT package arrives."
          badge="Stage 1"
        />
        <PathCard id="pathB" active={false} onClick={setPath}
          title="Complete NT package"
          description="The full NT package is available: NT-LV with all positions, Begründung, and Kalkulation. You want a per-position assessment and a Stellungnahme draft."
          badge="Stage 2"
        />
        <PathCard id="pathC" active={false} onClick={setPath}
          title="Informal communication"
          description="The contractor sent an email, WhatsApp message, or informal letter. Upload the document or paste the text and ask specific questions about scope, justification, or scheduling impact."
          badge="AI Chat"
        />
      </div>
    )
  }

  // ── Path A: Anzeige / Stage 1 ──────────────────────────────────────────────
  if (path === 'pathA') {
    const ready = files.nachtrag != null
    return (
      <div className="space-y-4">
        {showWarning && (
          <LvWarningModal onConfirm={() => { setShowWarning(false); doSubmit() }} onCancel={() => setShowWarning(false)} />
        )}
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setPath(null)} className="text-[#484f58] hover:text-white text-xs transition-colors">← Back</button>
          <span className="text-[#388bfd] text-xs font-medium px-2 py-0.5 rounded border border-[#388bfd]/30 bg-[#388bfd]/10">Stage 1 — Anzeige</span>
        </div>
        <FileSlot label="Anzeige / Preliminary notice" required file={files.nachtrag} onFile={(f) => setFile('nachtrag', f)} />
        <FileSlot label="Original LV" hint="For scope check — PDF or GAEB"
          accept={{ 'application/pdf': ['.pdf'], 'application/xml': ['.xml', '.x83', '.x84'] }}
          file={files.original_lv} onFile={(f) => setFile('original_lv', f)} />
        <FileSlot label="Baubeschreibung" file={files.baubeschreibung} onFile={(f) => setFile('baubeschreibung', f)} />
        <FileSlot label="Additional Anlagen (optional)" hint="Other supporting PDFs"
          file={files.extra_doc} onFile={(f) => setFile('extra_doc', f)} />
        {ready && (
          <button onClick={handleSubmitPathAB}
            className="w-full py-3 bg-[#388bfd] hover:bg-[#58a6ff] text-white text-sm font-semibold rounded-lg transition-colors">
            Anzeige prüfen
          </button>
        )}
      </div>
    )
  }

  // ── Path B: Full NT package / Stage 2 ─────────────────────────────────────
  if (path === 'pathB') {
    const ready = files.nachtrag != null
    return (
      <div className="space-y-4">
        {showWarning && (
          <LvWarningModal onConfirm={() => { setShowWarning(false); doSubmit() }} onCancel={() => setShowWarning(false)} />
        )}
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setPath(null)} className="text-[#484f58] hover:text-white text-xs transition-colors">← Back</button>
          <span className="text-[#388bfd] text-xs font-medium px-2 py-0.5 rounded border border-[#388bfd]/30 bg-[#388bfd]/10">Stage 2 — Full NT</span>
        </div>
        <FileSlot label="NT-LV (Nachtragsleistungsverzeichnis)" required file={files.nachtrag} onFile={(f) => setFile('nachtrag', f)} />
        <FileSlot label="Original LV" hint="PDF or GAEB .x83/.x84"
          accept={{ 'application/pdf': ['.pdf'], 'application/xml': ['.xml', '.x83', '.x84'] }}
          file={files.original_lv} onFile={(f) => setFile('original_lv', f)} />
        <FileSlot label="Baubeschreibung" file={files.baubeschreibung} onFile={(f) => setFile('baubeschreibung', f)} />
        <FileSlot label="Begründung / Nachtragsangebot" file={files.begründung} onFile={(f) => setFile('begründung', f)} />
        <FileSlot label="Kalkulation" file={files.kalkulation} onFile={(f) => setFile('kalkulation', f)} />
        {ready && (
          <button onClick={handleSubmitPathAB}
            className="w-full py-3 bg-[#388bfd] hover:bg-[#58a6ff] text-white text-sm font-semibold rounded-lg transition-colors">
            NT analysieren
          </button>
        )}
      </div>
    )
  }

  // ── Path C: Informal / Chatbox ─────────────────────────────────────────────
  if (path === 'pathC') {
    const canInit = files.nachtrag_doc || (files.pasted_text && files.pasted_text.trim())
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => { setPath(null); setChatSessionId(null) }} className="text-[#484f58] hover:text-white text-xs transition-colors">← Back</button>
          <span className="text-[#388bfd] text-xs font-medium px-2 py-0.5 rounded border border-[#388bfd]/30 bg-[#388bfd]/10">AI Chat — Informal</span>
        </div>

        {!chatSessionId ? (
          <>
            <FileSlot label="Informal document (email, letter, etc.)" hint="Upload as PDF"
              file={files.nachtrag_doc} onFile={(f) => setFile('nachtrag_doc', f)} />
            <div>
              <p className="text-[#8b949e] text-xs mb-1.5 font-medium">Or paste the text directly <span className="text-[#484f58]">(optional)</span></p>
              <textarea
                rows={4}
                placeholder="Paste email text or description of the claim here…"
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-[#388bfd] resize-none"
                onChange={(e) => setFile('pasted_text', e.target.value)}
              />
            </div>
            <FileSlot label="Original LV" hint="Needed to check if activity is in scope"
              accept={{ 'application/pdf': ['.pdf'], 'application/xml': ['.xml', '.x83', '.x84'] }}
              file={files.original_lv} onFile={(f) => setFile('original_lv', f)} />
            <FileSlot label="Baubeschreibung" file={files.baubeschreibung} onFile={(f) => setFile('baubeschreibung', f)} />
            {!hasLvContext && canInit && (
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg px-3 py-2">
                <p className="text-amber-400 text-xs">Without Original LV or Baubeschreibung, answers are limited to VOB/B principles only.</p>
              </div>
            )}
            {canInit && (
              <button onClick={initChatSession} disabled={initLoading}
                className="w-full py-3 bg-[#388bfd] hover:bg-[#58a6ff] disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
                {initLoading ? 'Initializing…' : 'Start Q&A session'}
              </button>
            )}
          </>
        ) : (
          <NachtragChatBox sessionId={chatSessionId} />
        )}
      </div>
    )
  }

  return null
}