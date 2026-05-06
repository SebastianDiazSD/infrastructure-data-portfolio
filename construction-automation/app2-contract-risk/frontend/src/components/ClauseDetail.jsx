const RISK_COLORS = {
  high: {
    bg: 'bg-red-950',
    text: 'text-red-300',
    border: 'border-red-800',
    badge: 'text-red-400',
  },
  medium: {
    bg: 'bg-amber-950',
    text: 'text-amber-300',
    border: 'border-amber-800',
    badge: 'text-amber-400',
  },
  low: {
    bg: 'bg-green-950',
    text: 'text-green-300',
    border: 'border-green-800',
    badge: 'text-green-400',
  },
}

export default function ClauseDetail({ clause }) {
  const c = RISK_COLORS[clause.risk_level] ?? RISK_COLORS.low

  return (
    <div className="p-6 space-y-5 fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <span className="font-clause text-white text-sm font-medium">{clause.number}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded border ${c.bg} ${c.badge} ${c.border}`}>
            {clause.risk_level} risk
          </span>
          {clause.risk_category && (
            <span className="text-[#8b949e] text-xs">{clause.risk_category}</span>
          )}
        </div>
        <h2 className="font-display text-lg text-white leading-snug">{clause.title}</h2>
      </div>

      {/* Full clause text */}
      {clause.text && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <p className="text-[10px] text-[#484f58] uppercase tracking-wider mb-2">Clause text</p>
          <pre className="text-[#8b949e] text-xs font-clause whitespace-pre-wrap leading-relaxed">
            {clause.text}
          </pre>
        </div>
      )}

      {/* Risk assessment card */}
      <div className={`${c.bg} border ${c.border} rounded-lg p-4 space-y-3`}>
        <p className={`text-[10px] font-medium uppercase tracking-wider ${c.badge}`}>Risk Assessment</p>

        <div>
          <p className="text-[#8b949e] text-[10px] mb-1">Why this is risky</p>
          <p className={`text-sm ${c.text} leading-relaxed`}>{clause.reason}</p>
        </div>

        {clause.suggestion && (
          <div className="pt-3 border-t border-white/10">
            <p className="text-[#8b949e] text-[10px] mb-1">Negotiation suggestion</p>
            <p className="text-gray-300 text-sm leading-relaxed">{clause.suggestion}</p>
          </div>
        )}
      </div>
    </div>
  )
}
