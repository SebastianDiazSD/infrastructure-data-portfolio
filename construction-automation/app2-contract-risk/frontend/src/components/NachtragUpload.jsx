import { useState } from 'react'
import DropZone from './DropZone.jsx'

export default function NachtragUpload({ onSubmit }) {
  const [nachtrag, setNachtrag] = useState(null)
  const [lv, setLv] = useState(null)

  const ready = nachtrag !== null && lv !== null

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[#8b949e] text-xs mb-2 font-medium">Nachtrag (PDF)</p>
          <DropZone
            label="Drop Nachtrag PDF"
            accept={{ 'application/pdf': ['.pdf'] }}
            onFile={setNachtrag}
          />
        </div>
        <div>
          <p className="text-[#8b949e] text-xs mb-2 font-medium">Original LV</p>
          <DropZone
            label="Drop LV file"
            accept={{
              'application/pdf': ['.pdf'],
              'application/xml': ['.xml', '.x83', '.x84'],
              'text/xml': ['.xml'],
            }}
            onFile={setLv}
            hint="PDF · GAEB .x83 · .x84 · .xml"
          />
        </div>
      </div>

      {/* File confirmation */}
      {(nachtrag || lv) && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 space-y-1">
          <FileRow label="Nachtrag" file={nachtrag} />
          <FileRow label="LV" file={lv} />
        </div>
      )}

      {ready && (
        <button
          onClick={() => onSubmit(nachtrag, lv)}
          className="w-full py-3 bg-[#388bfd] hover:bg-[#58a6ff] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Analyse Nachtrag
        </button>
      )}
    </div>
  )
}

function FileRow({ label, file }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {file ? (
        <span className="text-green-400">✓</span>
      ) : (
        <span className="text-[#484f58]">○</span>
      )}
      <span className="text-[#8b949e] w-16 shrink-0">{label}</span>
      <span className="font-clause text-[#e6edf3] truncate">
        {file ? file.name : <span className="text-[#484f58]">not uploaded</span>}
      </span>
    </div>
  )
}
