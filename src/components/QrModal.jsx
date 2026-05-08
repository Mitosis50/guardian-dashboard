import { useEffect, useRef } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function QrModal({ open, onClose, title, url, subtitle }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="mx-4 w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border border-white/10 bg-white p-3">
            <QRCodeSVG value={url} size={200} level="M" includeMargin={false} />
          </div>

          {subtitle && <p className="text-center text-sm text-slate-400">{subtitle}</p>}

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-500/30"
          >
            Open link <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
