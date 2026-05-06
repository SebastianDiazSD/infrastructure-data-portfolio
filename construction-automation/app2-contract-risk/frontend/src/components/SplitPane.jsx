import ClauseList from './ClauseList.jsx'
import ClauseDetail from './ClauseDetail.jsx'

const RISK_ORDER = { high: 0, medium: 1, low: 2 }

export default function SplitPane({ clauses, selectedIdx, onSelect }) {
  // Sort once: high → medium → low. Stable sort preserves original order within a tier.
  const sorted = [...clauses].sort(
    (a, b) => (RISK_ORDER[a.risk_level] ?? 3) - (RISK_ORDER[b.risk_level] ?? 3)
  )

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel — 40% */}
      <div className="w-2/5 border-r border-[#30363d] overflow-y-auto shrink-0">
        <ClauseList clauses={sorted} selectedIdx={selectedIdx} onSelect={onSelect} />
      </div>

      {/* Right panel — 60% */}
      <div className="flex-1 overflow-y-auto">
        {sorted[selectedIdx] ? (
          <ClauseDetail clause={sorted[selectedIdx]} />
        ) : (
          <div className="flex items-center justify-center h-full text-[#484f58] text-sm">
            Select a clause
          </div>
        )}
      </div>
    </div>
  )
}
