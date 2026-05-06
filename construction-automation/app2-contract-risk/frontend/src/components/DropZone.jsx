import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

export default function DropZone({ label, accept, onFile, hint }) {
  const onDrop = useCallback(
    (accepted) => {
      if (accepted.length > 0) onFile(accepted[0])
    },
    [onFile]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject, acceptedFiles } =
    useDropzone({ onDrop, accept, maxFiles: 1, multiple: false })

  const hasFile = acceptedFiles.length > 0

  let borderCls = 'border-[#30363d] hover:border-[#484f58] bg-[#161b22]'
  if (isDragReject) borderCls = 'border-red-700 bg-red-950/10'
  else if (isDragActive) borderCls = 'border-[#388bfd] bg-[#388bfd]/5'

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all text-center ${borderCls}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            hasFile ? 'bg-green-950' : 'bg-[#21262d]'
          }`}
        >
          {hasFile ? (
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[#8b949e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          )}
        </div>

        {hasFile ? (
          <p className="text-green-400 text-sm font-medium truncate max-w-[180px]">{acceptedFiles[0].name}</p>
        ) : (
          <>
            <p className="text-[#8b949e] text-sm">{isDragActive ? 'Drop it' : label}</p>
            {hint && <p className="text-[#484f58] text-xs">{hint}</p>}
          </>
        )}
      </div>
    </div>
  )
}
