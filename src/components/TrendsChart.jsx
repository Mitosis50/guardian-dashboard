import React, { useEffect, useState } from 'react'
import { getUsageTrends } from '../lib/api'

export default function TrendsChart({ days = 30, accessToken }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const result = await getUsageTrends(days, accessToken)
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
  }, [days, accessToken])

  if (loading) return <div className="text-center py-4">Loading trends...</div>
  if (error) return <div className="text-red-500">Error: {error}</div>

  // Find max for scaling
  const maxBackups = Math.max(...data.map(d => d.backup_count || 0), 1)

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">Backup Trends (Last {days} days)</h2>
      <div className="space-y-3">
        {data.map((entry) => {
          const percentage = ((entry.backup_count || 0) / maxBackups) * 100
          
          return (
            <div key={entry.date}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-700">{entry.date}</span>
                <span className="text-sm font-medium">{entry.backup_count || 0} backups</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
