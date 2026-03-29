import React from 'react'
import { useTenant } from '@/lib/tenant-context'
import { useTransactions } from '@/hooks/use-tenant-data'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * DEBUG COMPONENT - Shows current state of tenant and data loading
 * Remove this component after debugging is complete
 */
export function DataSyncDiagnostic() {
  const { currentTenant, currentUser, isLoading: tenantLoading, authUser } = useTenant()
  const { data: transactions, isLoading: transLoading, error: transError } = useTransactions()

  return (
    <Card className="p-4 bg-blue-50 border-blue-200 my-4">
      <div className="text-sm space-y-2">
        <h3 className="font-bold text-blue-900">DEBUG: Data Sync Diagnostic</h3>
        
        <div>
          <Badge variant="outline">Auth User</Badge>
          <p className="text-xs">{authUser ? `${authUser.email}` : 'Not authenticated'}</p>
        </div>

        <div>
          <Badge variant="outline">Tenant</Badge>
          <p className="text-xs">ID: {currentTenant.id}</p>
          <p className="text-xs">Name: {currentTenant.name}</p>
          <p className="text-xs">Loading: {tenantLoading ? '✗ Yes' : '✓ No'}</p>
        </div>

        <div>
          <Badge variant="outline">Transactions</Badge>
          <p className="text-xs">Count: {transactions?.length || 0}</p>
          <p className="text-xs">Loading: {transLoading ? '✗ Yes' : '✓ No'}</p>
          {transError && <p className="text-xs text-red-600">Error: {String(transError)}</p>}
        </div>

        <div>
          <Badge variant="outline">Current User</Badge>
          <p className="text-xs">{currentUser.name} ({currentUser.role})</p>
        </div>

        {transactions && transactions.length > 0 && (
          <div>
            <Badge variant="outline">Sample Transaction</Badge>
            <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(transactions[0], null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  )
}
