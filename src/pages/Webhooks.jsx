import React, { useState } from 'react'
import WebhookForm from '../components/WebhookForm'
import WebhookList from '../components/WebhookList'
import { useAuth } from '../components/AuthProvider'

export default function Webhooks() {
  const { session } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Webhook Integrations</h1>
        <p className="text-gray-600 mt-2">
          Automate backups with external events (GitHub, Stripe, custom)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WebhookForm onSuccess={handleSuccess} accessToken={session?.access_token} />
        <WebhookList key={refreshKey} refresh={refreshKey} accessToken={session?.access_token} />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="font-bold mb-2">How It Works</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• GitHub: Trigger backup on push or release</li>
          <li>• Stripe: Log payment events and manage subscriptions</li>
          <li>• Custom: Send webhooks via API for manual automation</li>
        </ul>
      </div>
    </div>
  )
}
