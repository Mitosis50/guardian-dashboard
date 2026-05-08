import React, { useState } from 'react'
import { createWebhookSubscription } from '../lib/api'

const SOURCES = [
  { value: 'github', label: 'GitHub (Push, Release)' },
  { value: 'stripe', label: 'Stripe (Payments)' },
  { value: 'custom', label: 'Custom (Manual Events)' },
]

const TRIGGER_ACTIONS = [
  { value: 'backup_now', label: 'Trigger Backup Now' },
  { value: 'schedule_backup', label: 'Schedule Backup' },
  { value: 'cleanup_old', label: 'Clean Up Old Backups' },
]

export default function WebhookForm({ onSuccess, accessToken }) {
  const [formData, setFormData] = useState({
    source: 'github',
    event_types: ['push'],
    trigger_action: 'backup_now',
    config: {},
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await createWebhookSubscription(
        formData.source,
        formData.event_types,
        formData.trigger_action,
        formData.config,
        accessToken
      )
      setFormData({
        source: 'github',
        event_types: ['push'],
        trigger_action: 'backup_now',
        config: {},
      })
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleEventToggle(eventType) {
    setFormData(prev => ({
      ...prev,
      event_types: prev.event_types.includes(eventType)
        ? prev.event_types.filter(e => e !== eventType)
        : [...prev.event_types, eventType],
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">Create Webhook Subscription</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Event Source</label>
        <select
          value={formData.source}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, source: e.target.value }))
          }
          className="w-full border rounded px-3 py-2"
        >
          {SOURCES.map(s => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Event Types</label>
        <div className="space-y-2">
          {['push', 'release', 'payment', 'custom'].map(type => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.event_types.includes(type)}
                onChange={() => handleEventToggle(type)}
                className="mr-2"
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Trigger Action</label>
        <select
          value={formData.trigger_action}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, trigger_action: e.target.value }))
          }
          className="w-full border rounded px-3 py-2"
        >
          {TRIGGER_ACTIONS.map(a => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading || formData.event_types.length === 0}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Subscription'}
      </button>
    </form>
  )
}
