'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function VerifyDBPage() {
  const [status, setStatus] = useState('loading')
  const [checks, setChecks] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    verifyDatabase()
  }, [])

  const verifyDatabase = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !anonKey) {
        setError('Supabase configuration missing')
        setStatus('error')
        return
      }

      const supabase = createClient(supabaseUrl, anonKey)
      const results = []

      // Check 1: Tables existence
      const tablesToCheck = [
        'tenants',
        'clients',
        'suppliers',
        'raw_materials',
        'orders',
        'pos80_config',
        'pos80_sync_logs',
        'sales_reconciliation',
      ]

      for (const table of tablesToCheck) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('id')
            .limit(1)

          results.push({
            name: `Table: ${table}`,
            status: !error ? 'success' : 'missing',
            detail: error ? error.message : 'Table exists',
          })
        } catch (err) {
          results.push({
            name: `Table: ${table}`,
            status: 'error',
            detail: err.message,
          })
        }
      }

      // Check 2: RLS Status
      results.push({
        name: 'RLS Configuration',
        status: 'info',
        detail: 'RLS should be enabled on all tables. Run migration to verify.',
      })

      // Check 3: Columns
      const columnChecks = [
        { table: 'tenants', columns: ['id', 'name', 'slug', 'subscription_plan', 'is_active'] },
        { table: 'clients', columns: ['id', 'tenant_id', 'phone', 'status'] },
        { table: 'orders', columns: ['id', 'tenant_id', 'source'] },
      ]

      for (const check of columnChecks) {
        try {
          const { data, error } = await supabase
            .from(check.table)
            .select('*')
            .limit(1)

          if (!error) {
            const hasColumns = check.columns.every(col => col in (data?.[0] || {}))
            results.push({
              name: `Columns in ${check.table}`,
              status: hasColumns ? 'success' : 'warning',
              detail: hasColumns ? 'All required columns found' : 'Some columns may be missing',
            })
          } else {
            results.push({
              name: `Columns in ${check.table}`,
              status: 'error',
              detail: error.message,
            })
          }
        } catch (err) {
          results.push({
            name: `Columns in ${check.table}`,
            status: 'error',
            detail: err.message,
          })
        }
      }

      setChecks(results)
      const hasErrors = results.some(r => r.status === 'error' || r.status === 'missing')
      setStatus(hasErrors ? 'warning' : 'success')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          KIFSHOP Database Verification
        </h1>

        <div className="mb-6">
          <div
            className={`inline-block px-4 py-2 rounded-full font-semibold ${
              status === 'loading'
                ? 'bg-gray-200 text-gray-800'
                : status === 'success'
                ? 'bg-green-200 text-green-800'
                : status === 'warning'
                ? 'bg-yellow-200 text-yellow-800'
                : 'bg-red-200 text-red-800'
            }`}
          >
            {status === 'loading'
              ? 'Checking...'
              : status === 'success'
              ? 'Ready for Restoration'
              : status === 'warning'
              ? 'Issues Found'
              : 'Error'}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Verification Results
            </h2>
            <div className="space-y-2">
              {checks.map((check, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded flex items-start gap-3 ${
                    check.status === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : check.status === 'error'
                      ? 'bg-red-50 border border-red-200'
                      : check.status === 'warning'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <span
                    className={`text-xl font-bold ${
                      check.status === 'success'
                        ? 'text-green-600'
                        : check.status === 'error'
                        ? 'text-red-600'
                        : check.status === 'warning'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {check.status === 'success'
                      ? '✓'
                      : check.status === 'error'
                      ? '✗'
                      : check.status === 'warning'
                      ? '⚠'
                      : 'ℹ'}
                  </span>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        check.status === 'success'
                          ? 'text-green-800'
                          : check.status === 'error'
                          ? 'text-red-800'
                          : check.status === 'warning'
                          ? 'text-yellow-800'
                          : 'text-blue-800'
                      }`}
                    >
                      {check.name}
                    </p>
                    <p
                      className={`text-sm ${
                        check.status === 'success'
                          ? 'text-green-600'
                          : check.status === 'error'
                          ? 'text-red-600'
                          : check.status === 'warning'
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {check.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <a
            href="/admin/restore-db"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition"
          >
            Go to Restoration
          </a>
          <button
            onClick={verifyDatabase}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-4 rounded-lg transition"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
