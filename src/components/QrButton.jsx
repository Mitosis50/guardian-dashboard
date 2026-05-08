import { useState } from 'react'
import { QrCode } from 'lucide-react'
import QrModal from './QrModal'

export default function QrButton({ url, label = 'QR Code' }) {
  const [open, setOpen] = useState(false)

  if (!url || url === '#') return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={label}
        className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
      >
        <QrCode size={12} />
        QR
      </button>

      <QrModal
        open={open}
        onClose={() => setOpen(false)}
        title="Scan to restore on mobile"
        url={url}
        subtitle="Point your phone camera at this code to open the backup URL."
      />
    </>
  )
}
