import React, { useEffect, useState } from 'react'
import { getAnalyticsMetrics } from '../lib/api'
import StorageChart from '../components/StorageChart'
import TrendsChart from '../components/TrendsChart'
import { useAuth } from '../components/AuthProvider'

export default function Analytics() {
  const { user, session } = useAuth()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [daysFilter, setDaysFilter] = useState(30)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true)
        const result = await getAnalyticsMetrics(user?.email, session?.access_token)
        if (result.ok) {
          setMetrics(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (user?.email) {
      fetchMetrics()
    }
  }, [user, session])

  if (loading) return <div className="text-center py-8">Loading analytics...</div>

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Usage Analytics</h1>
        <p className="text-gray-600 mt-2">Monitor your backup activity and storage usage</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Total Backups</h3>
            <p className="text-3xl font-bold mt-2">{metrics.total_backups}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Total Storage</h3>
            <p className="text-3xl font-bold mt-2">
              {(metrics.total_storage_bytes / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Current Tier</h3>
            <p className="text-3xl font-bold mt-2 capitalize">
              {metrics.tier_status?.current || 'Free'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendsChart days={daysFilter} accessToken={session?.access_token} />
        <StorageChart accessToken={session?.access_token} />
      </div>

      <div className="flex justify-center gap-2">
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            onClick={() => setDaysFilter(days)}
            className={`px-4 py-2 rounded transition-colors ${
              daysFilter === days
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {days} days
          </button>
        ))}
      </div>
    </div>
  )
}
