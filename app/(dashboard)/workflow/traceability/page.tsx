"use client";

import { useTenant } from "@/lib/tenant-context";
import { WorkflowTraceability } from "@/components/workflow/workflow-traceability";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WorkflowTraceabilityPage() {
  const { currentTenant: tenant } = useTenant();

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Initializing tenant information</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Workflow Traceability</h1>
        <p className="text-gray-600">
          Complete audit trail of all stock alerts, procurement orders, and supplier purchase orders
        </p>
      </div>

      {/* Information cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Process Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="inline-block w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold text-center leading-5">
                  1
                </span>
                <span>Stock Alert Detected</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold text-center leading-5">
                  2
                </span>
                <span>Convert to Procurement</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold text-center leading-5">
                  3
                </span>
                <span>Generate Supplier Orders</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Real-time Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              All changes are tracked in real-time with complete audit logs including user actions, status changes, and related entity references.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Full Traceability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Link between stock alerts, procurement orders, and supplier purchase orders is maintained for complete visibility.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Audit log */}
      <WorkflowTraceability tenantId={tenant?.id || null} />
    </div>
  );
}
