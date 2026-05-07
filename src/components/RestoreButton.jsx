import { useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { decryptGuardianEncryptedBuffer, downloadPlaintext, fetchEncryptedBackup, loadGuardianKey } from '../lib/restore'

export default function RestoreButton({ backup }) {
  const inputRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const isBusy = status === 'loading'
  const disabled = isBusy || !backup?.ipfs_url || backup.ipfs_url === '#'

  async function handleKeySelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setStatus('loading')
    setMessage('Fetching encrypted backup and decrypting locally…')
    try {
      const [keyBytes, encrypted] = await Promise.all([
        loadGuardianKey(file),
        fetchEncryptedBackup(backup.ipfs_url),
      ])
      const plaintext = await decryptGuardianEncryptedBuffer(encrypted, keyBytes)
      downloadPlaintext(plaintext, backup.file_name)
      setStatus('success')
      setMessage('Restored locally. Your key was never uploaded.')
    } catch (err) {
      setStatus('error')
      setMessage(err?.message || 'Restore failed. Check your key and backup CID.')
    }
  }

  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        aria-label="Select Guardian key file"
        onChange={handleKeySelected}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBusy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        Restore locally
      </button>
      {message && (
        <p className={`mt-2 text-xs ${status === 'error' ? 'text-rose-200' : status === 'success' ? 'text-emerald-200' : 'text-slate-300'}`}>
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        Select your local `.guardian-key`; decryption runs in this browser and downloads the restored file.
      </p>
    </div>
  )
}
