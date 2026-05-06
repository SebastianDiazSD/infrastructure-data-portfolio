import { useState, useRef, useEffect } from 'react'

const RISK_COLOR = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-green-400',
  none: 'text-[#8b949e]',
}

const CONFIDENCE_DOT = {
  high: 'bg-green-500',
  medium: 'bg-amber-500',
  low: 'bg-red-500',
}

const SUGGESTED = [
  'Welche Fristen gelten für Nachtragsangebote?',
  'Kann die Leistung an einen Dritten vergeben werden?',
  'Welche Nachweise sind gemäß NEuPP einzureichen?',
  'Wer ist berechtigt, Leistungsänderungen anzuordnen?',
  'Was passiert bei Hochwasserschäden auf der Baustelle?',
]

export default function ContractChat({ sessionId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(question) {
    const q = question ?? input.trim()
    if (!q || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setLoading(true)

    try {
      const res = await fetch('/ask-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, question: q }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', data }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'error', text: e.message }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full border-t border-[#30363d]">
      {/* Chat header */}
      <div className="shrink-0 px-4 py-2 border-b border-[#30363d] flex items-center gap-2">
        <span className="text-[#8b949e] text-xs font-medium uppercase tracking-wider">
          Contract Q&A
        </span>
        <span className="text-[#484f58] text-[10px]">Ask anything about this contract</span>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-[#484f58] text-xs">Suggested questions:</p>
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full text-left text-xs text-[#8b949e] hover:text-white bg-[#161b22] border border-[#30363d] rounded px-3 py-2 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === 'user') return <UserBubble key={i} text={msg.text} />
          if (msg.role === 'error') return <ErrorBubble key={i} text={msg.text} />
          return <AssistantBubble key={i} data={msg.data} />
        })}

        {loading && (
          <div className="flex items-center gap-2 text-[#484f58] text-xs">
            <div className="w-3 h-3 border border-[#388bfd] border-t-transparent rounded-full animate-spin" />
            Analysing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-[#30363d] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Frage zum Vertrag stellen…"
          maxLength={500}
          className="flex-1 bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-[#388bfd] transition-colors"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="px-3 py-2 bg-[#388bfd] hover:bg-[#58a6ff] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div className="bg-[#388bfd]/20 border border-[#388bfd]/30 rounded-lg px-3 py-2 max-w-[80%]">
        <p className="text-white text-xs">{text}</p>
      </div>
    </div>
  )
}

function AssistantBubble({ data }) {
  const riskCls = RISK_COLOR[data.risk_flag] ?? RISK_COLOR.none
  const dotCls = CONFIDENCE_DOT[data.confidence] ?? 'bg-[#484f58]'

  return (
    <div className="space-y-2">
      {/* Answer */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3">
        <p className="text-[#e6edf3] text-xs leading-relaxed">{data.answer}</p>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap gap-3 px-1">
        {data.legal_basis && (
          <span className="text-[#388bfd] text-[10px] font-clause">{data.legal_basis}</span>
        )}
        {data.risk_flag && data.risk_flag !== 'none' && (
          <span className={`text-[10px] font-medium ${riskCls}`}>
            {data.risk_flag} risk
          </span>
        )}
        <span className="flex items-center gap-1 text-[#484f58] text-[10px]">
          <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
          {data.confidence} confidence
        </span>
      </div>

      {/* Action required */}
      {data.action_required && data.action_required !== 'Keine sofortige Maßnahme erforderlich' && (
        <div className="bg-amber-950/30 border border-amber-800/30 rounded px-3 py-2">
          <p className="text-[#484f58] text-[10px] mb-0.5">Erforderliche Maßnahme</p>
          <p className="text-amber-300 text-xs">{data.action_required}</p>
        </div>
      )}

      {/* Clauses consulted */}
      {data.clauses_consulted?.length > 0 && (
        <p className="text-[#484f58] text-[10px] px-1">
          Geprüfte Klauseln: {data.clauses_consulted.join(' · ')}
        </p>
      )}
    </div>
  )
}

function ErrorBubble({ text }) {
  return (
    <div className="bg-red-950/30 border border-red-800/30 rounded px-3 py-2">
      <p className="text-red-400 text-xs">{text}</p>
    </div>
  )
}