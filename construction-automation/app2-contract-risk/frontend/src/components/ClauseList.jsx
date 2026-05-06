const RISK_BADGE = {
  high: 'bg-red-950 text-red-400 border border-red-800',
  medium: 'bg-amber-950 text-amber-400 border border-amber-800',
  low: 'bg-green-950 text-green-400 border border-green-800',
}

export default function ClauseList({ clauses, selectedIdx, onSelect }) {
  return (
    <div className="divide-y divide-[#21262d]">
      {clauses.map((clause, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`w-full text-left px-4 py-3 transition-colors ${
            i === selectedIdx ? 'bg-[#21262d]' : 'hover:bg-[#161b22]'
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-[#c9d1d9] text-xs font-mono shrink-0">{clause.number || '—'}</p>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    RISK_BADGE[clause.risk_level] ?? RISK_BADGE.low
                  }`}
                >
                  {clause.risk_level}
                </span>
              </div>
              <p className="text-[#8b949e] text-xs truncate">{clause.title || clause.number || 'Unnamed clause'}</p>
              {clause.risk_category && (
                <p className="text-[#484f58] text-[10px] mt-0.5 truncate">{clause.risk_category}</p>
              )}
            </div>
            {i === selectedIdx && (
              <div className="w-1.5 h-1.5 rounded-full bg-[#388bfd] mt-1.5 shrink-0" />
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
