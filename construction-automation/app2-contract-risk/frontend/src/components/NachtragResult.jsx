import { useState } from 'react'

const ASSESS_BADGE = {
  accept: 'bg-green-950 text-green-400 border border-green-800',
  negotiate: 'bg-amber-950 text-amber-400 border border-amber-800',
  reject: 'bg-red-950 text-red-400 border border-red-800',
}

const REC_COLORS = {
  accept: { border: 'border-green-800', text: 'text-green-400', bg: 'bg-green-950' },
  negotiate: { border: 'border-amber-800', text: 'text-amber-400', bg: 'bg-amber-950' },
  reject: { border: 'border-red-800', text: 'text-red-400', bg: 'bg-red-950' },
}

const MATCH_LABEL = {
  oz_exact: null, // clean — don't show a label
  text_fuzzy: 'Text match',
  no_match: 'No LV match',
}

function eur(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function NachtragResult({ result, onExport, onReset }) {
  const [expanded, setExpanded] = useState(null)
  const [copied, setCopied] = useState(false)

  // Stage 1 MKA response has different structure
  if (result.stage === 'mka') {
    return <Stage1Result result={result} onReset={onReset} />
  }

  const rec = REC_COLORS[result.nachtrag_summary?.recommendation] ?? REC_COLORS.negotiate

  function copy() {
    navigator.clipboard.writeText(result.stellungnahme ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden fade-in">
      {/* Summary bar */}
      <div className="px-6 py-3 border-b border-[#30363d] flex items-center gap-4 flex-wrap">
        <span className={`px-3 py-1 rounded border text-xs font-semibold ${rec.bg} ${rec.text} ${rec.border}`}>
          {(result.nachtrag_summary?.recommendation ?? '—').toUpperCase()}
        </span>
        <Stat label="Claimed" value={eur(result.nachtrag_summary?.total_claimed)} color="text-white" />
        <Stat label="Accepted" value={eur(result.nachtrag_summary?.accepted_total)} color="text-green-400" />
        <Stat label="Contested" value={eur(result.nachtrag_summary?.contested_total)} color="text-red-400" />
        <div className="ml-auto flex gap-2">
          <button
            onClick={onExport}
            className="px-3 py-1.5 text-xs font-medium bg-[#21262d] border border-[#30363d] text-white rounded hover:bg-[#30363d] transition-colors"
          >
            Export Stellungnahme
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-white transition-colors"
          >
            New file
          </button>
        </div>
      </div>

      {/* Body: left = positions list, right = Stellungnahme */}
      <div className="flex-1 flex overflow-hidden">
        {/* Positions */}
        <div className="w-1/2 border-r border-[#30363d] overflow-y-auto p-4 space-y-2">
          <p className="text-[#484f58] text-[10px] uppercase tracking-wider mb-3">
            {result.positions?.length ?? 0} Positions
          </p>
          {(result.positions ?? []).map((pos, i) => (
            <PositionCard
              key={i}
              pos={pos}
              open={expanded === i}
              onToggle={() => setExpanded(expanded === i ? null : i)}
            />
          ))}
        </div>

        {/* Stellungnahme */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="font-display text-base text-white">Stellungnahme</span>
            <button
              onClick={copy}
              className="px-2.5 py-1 text-[10px] bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-white rounded transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex-1 overflow-y-auto">
            <pre className="text-[#8b949e] text-xs font-clause whitespace-pre-wrap leading-relaxed">
              {result.stellungnahme ?? 'No Stellungnahme generated.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <span className="text-[#8b949e] text-xs">
      {label}: <span className={`font-medium ${color}`}>{value}</span>
    </span>
  )
}

function PositionCard({ pos, open, onToggle }) {
  const matchLabel = MATCH_LABEL[pos.match_type]
  const simPct =
    pos.match_type === 'text_fuzzy' && pos.similarity != null
        ? ` (${Math.round(pos.similarity * 100)}%)`
      : ''

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#21262d] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-clause text-xs text-white">{pos.oz}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${ASSESS_BADGE[pos.assessment] ?? ASSESS_BADGE.negotiate}`}>
              {pos.assessment}
            </span>
            {matchLabel && (
              <span className="text-[#484f58] text-[10px]">{matchLabel}{simPct}</span>
            )}
          </div>
          <p className="text-[#8b949e] text-xs truncate">{pos.nachtrag_description}</p>
        </div>
        <span className="text-white text-xs font-medium shrink-0">{eur(pos.nachtrag_claimed_total)}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#30363d] pt-3">
          {pos.vob_paragraph && (
            <Row label="VOB/B reference">
              <span className="text-[#388bfd] font-clause">{pos.vob_paragraph}</span>
            </Row>
          )}
          {pos.vob_reasoning && <Row label="Legal basis">{pos.vob_reasoning}</Row>}
          {pos.price_assessment && <Row label="Price assessment">{pos.price_assessment}</Row>}
          {pos.reason && <Row label="Reason">{pos.reason}</Row>}
          {pos.negotiation_position && (
            <div className="bg-amber-950/30 border border-amber-800/30 rounded p-2">
              <p className="text-[#484f58] text-[10px] mb-1">Negotiation position</p>
              <p className="text-amber-300 text-xs leading-relaxed">{pos.negotiation_position}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <p className="text-[#484f58] text-[10px] mb-1">{label}</p>
      <p className="text-[#8b949e] text-xs leading-relaxed">{children}</p>
    </div>
  )
}

function Stage1Result({ result, onReset }) {
  const [copied, setCopied] = useState(false)
  const s = result.nachtrag_summary ?? {}

  const ASSESSMENT_COLOR = {
    justified: 'text-green-400 border-green-800 bg-green-950',
    partly_justified: 'text-amber-400 border-amber-800 bg-amber-950',
    not_justified: 'text-red-400 border-red-800 bg-red-950',
    insufficient_info: 'text-[#8b949e] border-[#30363d] bg-[#161b22]',
  }
  const cls = ASSESSMENT_COLOR[s.principal_assessment] ?? ASSESSMENT_COLOR.insufficient_info

  function copy() {
    navigator.clipboard.writeText(result.stellungnahme ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden fade-in">
      {/* Header bar */}
      <div className="px-6 py-3 border-b border-[#30363d] flex items-center gap-4 flex-wrap">
        <span className={`px-3 py-1 rounded border text-xs font-semibold ${cls}`}>
          Stage 1 — {(s.principal_assessment ?? 'insufficient_info').replace(/_/g, ' ').toUpperCase()}
        </span>
        <span className="text-[#8b949e] text-xs">{s.vob_paragraph}</span>
        <button onClick={onReset} className="ml-auto px-3 py-1.5 text-xs text-[#8b949e] hover:text-white transition-colors">
          New file
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: assessment details */}
        <div className="w-1/2 border-r border-[#30363d] overflow-y-auto p-6 space-y-4">
          <div>
            <p className="text-[#484f58] text-[10px] uppercase tracking-wider mb-2">Preliminary position</p>
            <span className={`inline-block px-3 py-1 rounded border text-xs font-medium ${cls}`}>
              {(s.preliminary_position ?? '—').replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-[#484f58] text-[10px] uppercase tracking-wider mb-2">AG-Anordnung dokumentiert</p>
            <span className={s.ag_order_documented ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
              {s.ag_order_documented ? '✓ Ja' : '✗ Nicht nachgewiesen'}
            </span>
          </div>
          {result.reason && (
            <div>
              <p className="text-[#484f58] text-[10px] uppercase tracking-wider mb-2">Begründung</p>
              <p className="text-[#8b949e] text-xs leading-relaxed">{result.reason}</p>
            </div>
          )}
          {result.missing_documentation?.length > 0 && (
            <div>
              <p className="text-[#484f58] text-[10px] uppercase tracking-wider mb-2">Fehlende Unterlagen</p>
              <ul className="space-y-1">
                {result.missing_documentation.map((item, i) => (
                  <li key={i} className="text-amber-400 text-xs flex gap-2">
                    <span className="shrink-0">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Stellungnahme */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="font-display text-base text-white">Stellungnahme (Entwurf)</span>
            <button onClick={copy}
              className="px-2.5 py-1 text-[10px] bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-white rounded transition-colors">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex-1 overflow-y-auto">
            <pre className="text-[#8b949e] text-xs font-clause whitespace-pre-wrap leading-relaxed">
              {result.stellungnahme ?? 'No Stellungnahme generated.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-[#484f58] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
