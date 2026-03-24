'use client'

import { useState } from 'react'

export default function RestoreDBPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const handleRestore = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const apiKey = prompt('Enter MIGRATION_API_KEY to proceed:')
      if (!apiKey) {
        setError('API key is required')
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/restore-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to restore database')
      } else {
        setResults(data.results)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          KIFSHOP Database Restoration
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Restoration Scripts
          </h2>
          <p className="text-gray-600 mb-6">
            This tool will execute all 7 migration scripts to restore the KIFSHOP database to its correct schema.
          </p>

          <button
            onClick={handleRestore}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
          >
            {loading ? 'Restoring...' : 'Start Restoration'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">Error:</p>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
        )}

        {results && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Migration Results
            </h3>
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded flex items-start gap-3 ${
                    result.status === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <span
                    className={`text-xl ${
                      result.status === 'success'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {result.status === 'success' ? '✓' : '✗'}
                  </span>
                  <div>
                    <p
                      className={`font-medium ${
                        result.status === 'success'
                          ? 'text-green-800'
                          : 'text-red-800'
                      }`}
                    >
                      {result.name}
                    </p>
                    {result.error && (
                      <p className="text-red-600 text-sm mt-1">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
