import { useRef, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, Loader2, ShieldCheck, AlertCircle, UploadCloud, FileText, CheckCircle2, XCircle, Clock, Lock } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import LicenseModal from '../components/LicenseModal'
import { decryptGuardianEncryptedBuffer, downloadPlaintext, fetchEncryptedBackup, fetchArweaveBackup, loadGuardianKey } from '../lib/restore'
import { useAuth } from '../components/AuthProvider'
import { getTier } from '../lib/api'
import { canUseArweave } from '../lib/tiers'

function cidGatewayUrl(cid) {
  if (!cid) return ''
  if (cid.startsWith('http')) return cid
  return `https://gateway.pinata.cloud/ipfs/${cid}`
}

const STATUS_ICON = {
  idle: <Clock size={14} className="text-slate-500" />,
  loading: <Loader2 size={14} className="animate-spin text-sky-300" />,
  success: <CheckCircle2 size={14} className="text-emerald-300" />,
  error: <XCircle size={14} className="text-rose-300" />,
}

export default function Restore() {
  const location = useLocation()
  const { isConfigured, user, session } = useAuth()
  const keyInputRef = useRef(null)

  const bulkBackups = location.state?.backups
  const isBulk = Array.isArray(bulkBackups) && bulkBackups.length > 0

  const [cid, setCid] = useState('')
  const [arweaveTxId, setArweaveTxId] = useState('')
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [keyFileName, setKeyFileName] = useState('')
  const [keyFile, setKeyFile] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [tier, setTier] = useState('free')
  const [licenseModalOpen, setLicenseModalOpen] = useState(false)

  // Bulk queue state
  const [queue, setQueue] = useState(() => {
    if (!isBulk) return []
    return bulkBackups.map((b, i) => ({
      id: b.id || `${i}`,
      fileName: b.file_name || 'Agent config',
      cid: b.cid || '',
      arweaveTxId: b.arweave_tx_id || '',
      ipfsUrl: b.ipfs_url || '',
      arweaveUrl: b.arweave_url || '',
      status: 'idle',
      message: '',
    }))
  })

  const isBusy = status === 'loading' || queue.some((q) => q.status === 'loading')
  const hasSource = Boolean(cid.trim() || arweaveTxId.trim())
  const canSubmit = Boolean(hasSource && keyFile && !isBusy)
  const canBulkSubmit = Boolean(isBulk && keyFile && !isBusy)
  const paidArweave = canUseArweave(tier)

  useEffect(() => {
    if (isBulk) {
      setQueue(
        bulkBackups.map((b, i) => ({
          id: b.id || `${i}`,
          fileName: b.file_name || 'Agent config',
          cid: b.cid || '',
          arweaveTxId: b.arweave_tx_id || '',
          ipfsUrl: b.ipfs_url || '',
          arweaveUrl: b.arweave_url || '',
          status: 'idle',
          message: '',
        }))
      )
    }
  }, [isBulk, bulkBackups])

  useEffect(() => {
    async function loadTier() {
      if (!isConfigured || !user?.email || !session?.access_token) return
      try {
        const userTier = await getTier(user.email, session.access_token)
        setTier(userTier || 'free')
      } catch {
        // silent fail
      }
    }
    loadTier()
  }, [isConfigured, user?.email, session?.access_token])

  function resetStatus() {
    if (status === 'error' || status === 'success') {
      setStatus('idle')
      setMessage('')
    }
  }

  function handleKeyFileSelected(file) {
    if (!file) return
    setKeyFile(file)
    setKeyFileName(file.name)
    resetStatus()
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragOver(false)
    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) handleKeyFileSelected(droppedFile)
  }

  function handleDragOver(event) {
    event.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(event) {
    event.preventDefault()
    setIsDragOver(false)
  }

  async function processSingle() {
    setStatus('loading')
    setMessage('Fetching encrypted backup and decrypting locally\u2026')

    try {
      let encrypted
      if (cid.trim()) {
        const ipfsUrl = cidGatewayUrl(cid.trim())
        encrypted = await fetchEncryptedBackup(ipfsUrl)
      } else if (arweaveTxId.trim()) {
        encrypted = await fetchArweaveBackup(arweaveTxId.trim())
      } else {
        throw new Error('Please provide a CID or Arweave transaction ID.')
      }

      const keyBytes = await loadGuardianKey(keyFile)
      const plaintext = await decryptGuardianEncryptedBuffer(encrypted, keyBytes)
      const downloadName = fileName.trim() || 'guardian-recovered'
      downloadPlaintext(plaintext, downloadName)
      setStatus('success')
      setMessage('Decrypted successfully. Your key never left this browser.')
    } catch (err) {
      setStatus('error')
      setMessage(err?.message || 'Restore failed. Check the CID/TX ID and your key file.')
    }
  }

  async function processBulk() {
    if (!keyFile || queue.length === 0) return

    const keyBytes = await loadGuardianKey(keyFile)

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      setQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: 'loading', message: 'Fetching and decrypting\u2026' } : q))
      )

      try {
        let encrypted
        if (item.arweaveTxId) {
          encrypted = await fetchArweaveBackup(item.arweaveTxId)
        } else if (item.cid) {
          const ipfsUrl = cidGatewayUrl(item.cid)
          encrypted = await fetchEncryptedBackup(ipfsUrl)
        } else {
          throw new Error('No CID or Arweave TX ID available.')
        }

        const plaintext = await decryptGuardianEncryptedBuffer(encrypted, keyBytes)
        downloadPlaintext(plaintext, item.fileName)

        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: 'success', message: 'Restored' } : q))
        )
      } catch (err) {
        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: 'error', message: err?.message || 'Failed' } : q))
        )
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (isBulk) {
      if (canBulkSubmit) processBulk()
    } else {
      if (canSubmit) processSingle()
    }
  }

  function handleRetryFailed() {
    setQueue((prev) =>
      prev.map((q) => (q.status === 'error' ? { ...q, status: 'idle', message: '' } : q))
    )
  }

  function handleClearFinished() {
    setQueue((prev) => prev.filter((q) => q.status !== 'success'))
  }

  const succeededCount = queue.filter((q) => q.status === 'success').length
  const failedCount = queue.filter((q) => q.status === 'error').length
  const allDone = isBulk && queue.length > 0 && queue.every((q) => q.status === 'success' || q.status === 'error')

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
            {isBulk ? 'Bulk recovery' : 'Self-serve recovery'}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            {isBulk ? `Restore ${queue.length} backups` : 'Download & Decrypt'}
          </h1>
          <p className="mt-2 text-slate-400">
            {isBulk
              ? 'Fetch and decrypt multiple backups with a single key. Each file downloads individually.'
              : 'Fetch your encrypted backup from IPFS or Arweave and decrypt it locally with your Guardian key. Your key never leaves this browser.'}
          </p>
        </div>

        {!isConfigured && (
          <div className="mb-6 rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">
            <strong>Demo mode:</strong> Supabase is not configured. You can still restore any public CID/TX, but authentication is disabled.
          </div>
        )}

        {/* Bulk queue preview */}
        {isBulk && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">Restore queue</h3>
            <div className="space-y-2">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${
                    item.status === 'success'
                      ? 'border-emerald-400/20 bg-emerald-400/5'
                      : item.status === 'error'
                        ? 'border-rose-400/20 bg-rose-400/5'
                        : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {STATUS_ICON[item.status] || STATUS_ICON.idle}
                    <FileText size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate text-slate-200" title={item.fileName}>{item.fileName}</span>
                  </div>
                  <span className={`ml-3 shrink-0 text-xs ${
                    item.status === 'success'
                      ? 'text-emerald-300'
                      : item.status === 'error'
                        ? 'text-rose-300'
                        : 'text-slate-500'
                  }`}>
                    {item.message || 'Waiting'}
                  </span>
                </div>
              ))}
            </div>

            {allDone && (
              <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                failedCount > 0
                  ? 'border-amber-400/30 bg-amber-400/10 text-amber-100'
                  : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
              }`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    {failedCount > 0 ? <AlertCircle size={16} /> : <ShieldCheck size={16} />}
                    <span className="font-medium">
                      {succeededCount} of {queue.length} restored successfully
                      {failedCount > 0 && ` \u2022 ${failedCount} failed`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {succeededCount > 0 && (
                      <button
                        onClick={handleClearFinished}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                      >
                        Clear finished
                      </button>
                    )}
                    {failedCount > 0 && (
                      <button
                        onClick={handleRetryFailed}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-100 transition-colors hover:bg-sky-400/20"
                      >
                        <Loader2 size={12} />
                        Retry failed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8"
        >
          {/* Single-mode inputs */}
          {!isBulk && (
            <>
              {/* CID */}
              <div className="mb-5">
                <label htmlFor="cid" className="mb-2 block text-sm font-medium text-slate-300">
                  IPFS CID or URL
                </label>
                <input
                  id="cid"
                  type="text"
                  value={cid}
                  onChange={(e) => { setCid(e.target.value); setArweaveTxId(''); resetStatus() }}
                  placeholder="Qm\u2026  or  https://gateway.pinata.cloud/ipfs/Qm\u2026"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
                />
                <p className="mt-2 text-xs text-slate-500">
                  The IPFS content identifier from your backup ledger, email, or Agent Guardian desktop app.
                </p>
              </div>

              {/* Divider */}
              <div className="mb-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs uppercase tracking-wide text-slate-500">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* Arweave TX */}
              <div className="mb-5">
                <label htmlFor="arweave" className="mb-2 block text-sm font-medium text-slate-300">
                  Arweave Transaction ID
                  {!paidArweave && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.5 text-xs font-medium text-amber-300">
                      <Lock size={10} /> Pro
                    </span>
                  )}
                </label>
                <input
                  id="arweave"
                  type="text"
                  value={arweaveTxId}
                  disabled={!paidArweave}
                  onChange={(e) => { setArweaveTxId(e.target.value); setCid(''); resetStatus() }}
                  placeholder={paidArweave ? 'HpJZ\u2026' : 'Upgrade to restore from Arweave'}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <p className="mt-2 text-xs text-slate-500">
                  {paidArweave ? (
                    <>
                      The Arweave transaction ID from your backup ledger or desktop app. Fetched via <code className="rounded bg-white/5 px-1 py-0.5 text-slate-400">arweave.net</code>.
                    </>
                  ) : (
                    <>
                      Arweave restore is available on Guardian, Pro, and Lifetime plans.{" "}
                      <button
                        type="button"
                        onClick={() => setLicenseModalOpen(true)}
                        className="text-sky-300 underline hover:text-sky-200"
                      >
                        Upgrade now
                      </button>
                    </>
                  )}
                </p>
              </div>

              {/* File name */}
              <div className="mb-5">
                <label htmlFor="fileName" className="mb-2 block text-sm font-medium text-slate-300">
                  Original file name <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  id="fileName"
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g., memory.md"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
                />
              </div>
            </>
          )}

          {/* Key file — drag-and-drop zone */}
          <div className={isBulk ? 'mb-8' : 'mb-8'}>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Guardian key file <span className="text-rose-300">*</span>
              {isBulk && <span className="ml-1 text-xs font-normal text-slate-500">(used for all {queue.length} backups)</span>}
            </label>
            <input
              ref={keyInputRef}
              type="file"
              id="guardian-key"
              className="hidden"
              accept="*"
              aria-label="Select Guardian key file"
              onChange={(e) => handleKeyFileSelected(e.target.files?.[0])}
            />

            <div
              onClick={() => keyInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors
                ${isDragOver
                  ? 'border-sky-400/60 bg-sky-400/10'
                  : keyFileName
                    ? 'border-emerald-400/40 bg-emerald-400/5'
                    : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
                }
              `}
            >
              <div className="flex flex-col items-center gap-2">
                {isDragOver ? (
                  <UploadCloud size={28} className="text-sky-300" />
                ) : keyFileName ? (
                  <ShieldCheck size={28} className="text-emerald-300" />
                ) : (
                  <UploadCloud size={28} className="text-slate-400" />
                )}
                <p className="text-sm font-medium text-slate-200">
                  {isDragOver
                    ? 'Drop your key file here'
                    : keyFileName
                      ? `Selected: ${keyFileName}`
                      : 'Drag & drop your ~/.guardian-key here'}
                </p>
                <p className="text-xs text-slate-500">
                  {keyFileName
                    ? 'Click or drop to change file'
                    : 'Or click to browse \u2014 64-character hex key or 32 raw bytes'}
                </p>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Your key is read into memory for decryption only. It is never uploaded to any server.
            </p>
          </div>

          <button
            type="submit"
            disabled={isBulk ? !canBulkSubmit : !canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isBusy
              ? isBulk
                ? 'Restoring queue\u2026'
                : 'Decrypting locally\u2026'
              : isBulk
                ? `Restore ${queue.length} selected`
                : 'Download & Decrypt'}
          </button>

          {/* Single-mode message */}
          {!isBulk && message && (
            <div
              className={`mt-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                status === 'error'
                  ? 'border-rose-400/30 bg-rose-400/10 text-rose-100'
                  : status === 'success'
                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                    : 'border-sky-400/30 bg-sky-400/10 text-sky-100'
              }`}
            >
              {status === 'error' ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : null}
              {status === 'success' ? <ShieldCheck size={16} className="mt-0.5 shrink-0" /> : null}
              {status === 'loading' ? <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" /> : null}
              <span>{message}</span>
            </div>
          )}
        </form>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
          <h3 className="mb-2 font-semibold text-slate-200">How it works</h3>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>The encrypted file is fetched from the public IPFS or Arweave gateway using your identifier.</li>
            <li>Your Guardian key is read from the file you provide \u2014 it stays in browser memory only.</li>
            <li>Web Crypto AES-256-GCM decrypts the file locally inside your browser.</li>
            <li>The decrypted file is saved to your Downloads folder. Nothing is sent to any server.</li>
          </ol>
        </div>
      </main>

      <LicenseModal
        open={licenseModalOpen}
        onClose={() => setLicenseModalOpen(false)}
        onActivated={(newTier) => setTier(newTier)}
      />
    </div>
  )
}
