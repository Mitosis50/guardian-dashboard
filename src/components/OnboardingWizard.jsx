import { useState, useEffect } from 'react'
import { Download, Key, CheckCircle2, X, ChevronRight } from 'lucide-react'

const steps = [
  {
    id: 1,
    title: 'Download the Agent Guardian Desktop App',
    description: 'Start by downloading and installing the Guardian desktop app on your machine.',
    icon: Download,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          The Guardian desktop app monitors your AI agents and creates encrypted backups automatically.
        </p>
        <a
          href="https://agentbotguardian.com/download"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-blue-700"
        >
          Download Agent Guardian
        </a>
        <p className="text-xs text-slate-400">
          Available for macOS and Windows. Requires Node.js runtime.
        </p>
      </div>
    ),
  },
  {
    id: 2,
    title: 'Create Your API Key',
    description: 'Generate and store your Guardian API key for encrypted backups.',
    icon: Key,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          Once installed, launch the app and generate your API key. This key encrypts your agent backups before they're stored.
        </p>
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2">
          <p className="text-xs font-medium text-amber-200">
            💡 <strong>Tip:</strong> Store your key in a password manager. You'll need it to restore agents later.
          </p>
        </div>
        <div className="rounded-lg bg-slate-900/50 px-3 py-2 font-mono text-xs text-slate-400">
          <p>1. Click "Generate Key" in the Guardian app</p>
          <p>2. Copy the key to your clipboard</p>
          <p>3. Paste it into your password manager</p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: 'Run Your First Backup',
    description: 'Create your first encrypted agent backup.',
    icon: CheckCircle2,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          With your API key created, trigger your first backup from the Guardian app. Backups are encrypted with AES-256-GCM and stored durably.
        </p>
        <div className="rounded-lg bg-slate-900/50 px-3 py-2 font-mono text-xs text-slate-400">
          <p>1. Open the Guardian app menubar</p>
          <p>2. Click "Backup Now" or wait for automatic backup</p>
          <p>3. Check this dashboard to see your backup appear</p>
        </div>
        <div className="rounded-lg border border-green-400/30 bg-green-400/5 px-3 py-2">
          <p className="text-xs font-medium text-green-200">
            ✅ Your first backup usually appears in 30–60 seconds.
          </p>
        </div>
      </div>
    ),
  },
]

export default function OnboardingWizard({ open = false, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState(false)

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  function handleComplete() {
    localStorage.setItem('onboarding_completed', 'true')
    setCompleted(true)
    onComplete?.()
    onClose?.()
  }

  function handleClose() {
    onClose?.()
  }

  if (!open) return null

  const step = steps[currentStep]
  const Icon = step.icon
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600/20 p-2">
              <Icon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                Step {currentStep + 1} of {steps.length}
              </div>
              <h2 className="text-xl font-bold text-white">{step.title}</h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 transition-colors hover:text-white"
            aria-label="Close wizard"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-8">
          {step.content}
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2 font-medium text-white transition-colors hover:bg-white/5"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            {isLastStep ? 'Complete' : 'Next'}
            {!isLastStep && <ChevronRight className="h-4 w-4" />}
          </button>
          {currentStep < steps.length - 1 && (
            <button
              onClick={handleClose}
              className="rounded-lg border border-white/10 px-4 py-2 font-medium text-slate-300 transition-colors hover:text-white hover:bg-white/5"
            >
              Skip
            </button>
          )}
        </div>

        {/* Onboarding hint */}
        {!completed && (
          <p className="mt-4 text-center text-xs text-slate-400">
            You can always revisit this from the dashboard menu.
          </p>
        )}
      </div>
    </div>
  )
}
