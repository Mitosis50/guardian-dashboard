const styles = {
  queued: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  uploading: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  complete: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  failed: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
}

export default function StatusBadge({ status }) {
  const label = status === 'success' ? 'complete' : status
  return <span className={`rounded-full border px-3 py-1 text-xs font-medium ${styles[status] ?? styles.queued}`}>{label}</span>
}
