import React, { useEffect, useState } from 'react'
import { getWebhookSubscriptions, deleteWebhookSubscription } from '../lib/api'

export default function WebhookList({ refresh, accessToken }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        setLoading(true)
        const result = await getWebhookSubscriptions(accessToken)
        if (result.ok) {
          setSubscriptions(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSubscriptions()
  }, [refresh, accessToken])

  async function handleDelete(id) {
    if (!window.confirm('Delete this subscription?')) return

    try {
      await deleteWebhookSubscription(id, accessToken)
      setSubscriptions(subs => subs.filter(s => s.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="text-center py-4">Loading subscriptions...</div>

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">Your Webhooks</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {subscriptions.length === 0 ? (
        <p className="text-gray-500">No webhooks configured yet.</p>
      ) : (
        <div className="space-y-4">
          {subscriptions.map(sub => (
            <div
              key={sub.id}
              className="border rounded p-4 flex justify-between items-start"
            >
              <div className="flex-1">
                <h3 className="font-medium capitalize">{sub.source}</h3>
                <p className="text-sm text-gray-600">
                  Events: {sub.event_types.join(', ')}
                </p>
                <p className="text-sm text-gray-600">
                  Action: {sub.trigger_action}
                </p>
              </div>
              <button
                onClick={() => handleDelete(sub.id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 ml-2"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
