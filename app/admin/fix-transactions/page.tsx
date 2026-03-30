'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function FixTransactionsPage() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleAutoFix = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/fix-transactions', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage('✅ Transactions table fixed! Refresh your browser and try the payment again.')
      } else {
        setStatus('error')
        setMessage(`❌ ${data.message}`)
      }
    } catch (error) {
      setStatus('error')
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGetInstructions = async () => {
    const response = await fetch('/api/admin/fix-transactions')
    const data = await response.json()
    console.log('Fix Instructions:', data)
    alert(JSON.stringify(data, null, 2))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Fix Transactions Schema</h1>

          <div className="space-y-4 mb-8">
            <p className="text-gray-700">
              <strong>Problem:</strong> The transactions table has a problematic foreign key constraint on the <code className="bg-gray-100 px-2 py-1 rounded">created_by</code> column.
            </p>
            <p className="text-gray-700">
              <strong>Solution:</strong> Remove the constraint and add the <code className="bg-gray-100 px-2 py-1 rounded">created_by_id</code> column.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Button
              onClick={handleAutoFix}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? 'Fixing...' : '🔧 Auto-Fix Now'}
            </Button>

            <Button
              onClick={handleGetInstructions}
              variant="outline"
            >
              📋 Get SQL Instructions
            </Button>
          </div>

          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              status === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-8 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Manual Fix (If Auto-Fix Doesn&apos;t Work)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Go to your Supabase project dashboard</li>
              <li>Click on "SQL Editor" in the left sidebar</li>
              <li>Create a new query and paste the SQL commands below</li>
              <li>Click "Run" to execute</li>
              <li>Refresh your browser and try the payment again</li>
            </ol>

            <pre className="mt-4 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`ALTER TABLE IF EXISTS public.transactions 
DROP CONSTRAINT IF EXISTS transactions_created_by_fkey;

ALTER TABLE IF EXISTS public.transactions 
ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE IF EXISTS public.transactions 
ADD COLUMN IF NOT EXISTS created_by_id TEXT;`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
