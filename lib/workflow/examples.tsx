// Example integration showing how to use the workflow system in your app

import { useEffect, useState } from 'react';
import { useStockAlerts, useBonApprovisionnement } from '@/hooks/use-workflow-data';
import { useStockAlertsWorkflow } from '@/hooks/use-stock-alerts-workflow';
import { useTenant } from '@/lib/tenant-context';
import { StockAlertsList } from '@/components/workflow/stock-alerts-list';
import { BonApproView } from '@/components/workflow/bon-appro-view';
import { WorkflowTraceability } from '@/components/workflow/workflow-traceability';

// Example 1: Simple integration with status summary
export function WorkflowDashboard() {
  const { currentTenant: tenant } = useTenant();
  const { alerts } = useStockAlerts(tenant?.id || null);
  const { orders } = useBonApprovisionnement(tenant?.id || null);

  const pendingAlerts = alerts.filter(a => a.status === 'pending').length;
  const draftOrders = orders.filter(o => o.status === 'draft').length;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Workflow Status</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-gray-600">Pending Alerts</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingAlerts}</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-gray-600">Draft Orders</p>
          <p className="text-3xl font-bold text-blue-600">{draftOrders}</p>
        </div>
      </div>
    </div>
  );
}

// Example 2: Convert alerts with custom logic
export function QuickConvertAlerts() {
  const { currentTenant: tenant } = useTenant();
  const { alerts } = useStockAlerts(tenant?.id || null);
  const { convertAlertsToAppro, isLoading } = useStockAlertsWorkflow();

  const handleConvertCritical = async () => {
    const criticalAlertIds = alerts
      .filter(a => a.severity === 'critical' && a.status === 'pending')
      .map(a => a.id);

    if (criticalAlertIds.length === 0) return;

    const bonApproId = await convertAlertsToAppro(
      criticalAlertIds,
      'urgent'
    );

    if (bonApproId) {
      console.log('Created urgent procurement order:', bonApproId);
    }
  };

  return (
    <button
      onClick={handleConvertCritical}
      disabled={isLoading}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
    >
      {isLoading ? 'Converting...' : 'Convert All Critical Alerts'}
    </button>
  );
}

// Example 3: Workflow automation (auto-convert at certain times)
export function AutomatedWorkflow() {
  const { currentTenant } = useTenant();
  const { alerts, refetch } = useStockAlerts(currentTenant?.id || null);
  const { convertAlertsToAppro } = useStockAlertsWorkflow();

  useEffect(() => {
    // Run workflow check every 30 minutes
    const interval = setInterval(async () => {
      await refetch();

      const criticalAlerts = alerts.filter(
        a => a.severity === 'critical' && a.status === 'pending'
      );

      if (criticalAlerts.length > 0) {
        await convertAlertsToAppro(
          criticalAlerts.map(a => a.id),
          'urgent'
        );
        console.log(`Auto-converted ${criticalAlerts.length} critical alerts`);
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}

// Example 4: Batch processing with status tracking
export function BatchProcessWorkflow() {
  const { currentTenant: tenant } = useTenant();
  const { orders, refetch } = useBonApprovisionnement(tenant?.id || null);
  const { generatePurchaseOrders, isLoading } = useStockAlertsWorkflow();
  const [status, setStatus] = useState<string>('');

  const handleBatchProcess = async () => {
    const draftOrders = orders.filter(o => o.status === 'draft');
    let successCount = 0;
    let errorCount = 0;

    for (const order of draftOrders) {
      setStatus(`Processing ${order.reference}...`);
      const result = await generatePurchaseOrders(order.id);

      if (result !== null) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setStatus(`Completed: ${successCount} successful, ${errorCount} failed`);
    await refetch();
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleBatchProcess}
        disabled={isLoading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : 'Batch Generate Orders'}
      </button>
      {status && <p className="text-sm text-gray-600">{status}</p>}
    </div>
  );
}

// Example 5: Full workflow page with all components
export function FullWorkflowPage() {
  const { currentTenant: tenant } = useTenant();
  const { alerts } = useStockAlerts(tenant?.id || null);
  const { orders } = useBonApprovisionnement(tenant?.id || null);
  const [selectedApproId, setSelectedApproId] = useState<string | null>(null);

  const selectedOrder = selectedApproId
    ? orders.find(o => o.id === selectedApproId)
    : null;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Stock Alerts */}
      <div className="col-span-2">
        <StockAlertsList
          alerts={alerts}
          onConvertSuccess={(bonApproId) => {
            setSelectedApproId(bonApproId);
          }}
        />
      </div>

      {/* Right: Selected Order */}
      <div className="space-y-4">
        {selectedOrder && (
          <BonApproView order={selectedOrder} />
        )}
        <WorkflowTraceability tenantId={tenant?.id || null} />
      </div>
    </div>
  );
}

// Example 6: Alert notifications
export function WorkflowNotifications() {
  const { currentTenant: tenant } = useTenant();
  const { alerts } = useStockAlerts(tenant?.id || null);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  useEffect(() => {
    if (criticalAlerts.length > 0) {
      // Send browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Critical Stock Alerts', {
          body: `${criticalAlerts.length} items are at critical stock levels`,
          icon: '/alert-icon.svg',
        });
      }
    }
  }, [criticalAlerts]);

  return null;
}

// Example 7: Export workflow data
export async function exportWorkflowData(tenantId: string) {
  const response = await fetch('/api/workflow/audit-log', {
    headers: {
      'x-tenant-id': tenantId,
    },
  });

  const { auditLog } = await response.json();

  // Convert to CSV
  const csv = [
    ['Date', 'Entity Type', 'Action', 'Old Status', 'New Status', 'User'],
    ...auditLog.map(log => [
      new Date(log.performed_at).toISOString(),
      log.entity_type,
      log.action,
      log.old_status || '',
      log.new_status || '',
      log.performed_by || '',
    ]),
  ];

  // Download
  const csvContent = csv.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `workflow-audit-${new Date().toISOString()}.csv`;
  link.click();
}
