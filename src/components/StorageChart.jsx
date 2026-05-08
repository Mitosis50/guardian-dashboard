import React, { useEffect, useState } from 'react'
import { getStorageByTier } from '../lib/api'

export default function StorageChart({ accessToken }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const result = await getStorageByTier(accessToken)
        if (result.ok) {
          setData(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accessToken])

  if (loading) return <div className="text-center py-4">Loading storage data...</div>
  if (error) return <div className="text-red-500">Error: {error}</div>

  const COLORS = {
    free: '#6B7280',
    guardian: '#3B82F6',
    pro: '#8B5CF6',
    lifetime: '#F59E0B',
  }

  // Find max storage for scaling
  const maxStorage = Math.max(...data.map(d => d.total_storage_bytes), 1)

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">Storage Distribution by Tier</h2>
      <div className="space-y-4">
        {data.map((entry) => {
          const percentage = (entry.total_storage_bytes / maxStorage) * 100
          const gb = (entry.total_storage_bytes / (1024 * 1024 * 1024)).toFixed(2)
          
          return (
            <div key={entry.tier}>
              <div className="flex justify-between items-center mb-1">
                <span className="capitalize font-medium">{entry.tier}</span>
                <span className="text-sm text-gray-600">{gb} GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: COLORS[entry.tier] || '#999'
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{entry.user_count} users</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
