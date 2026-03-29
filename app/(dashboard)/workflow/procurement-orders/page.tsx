"use client";

import { useState } from "react";
import { useTenant } from "@/lib/tenant-context";
import { useBonApprovisionnement } from "@/hooks/use-workflow-data";
import { BonApproView } from "@/components/workflow/bon-appro-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

export default function ProcurementOrdersPage() {
  const { currentTenant: tenant } = useTenant();
  const { orders, isLoading, error } = useBonApprovisionnement(tenant?.id || null);
  const [generatedOrderCount, setGeneratedOrderCount] = useState(0);

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

  const draftOrders = orders.filter((o) => o.status === "draft");
  const validatedOrders = orders.filter((o) => o.status === "validated");
  const sentOrders = orders.filter((o) =>
    ["sent_to_suppliers", "partially_ordered", "fully_ordered"].includes(
      o.status
    )
  );
  const totalValue = orders.reduce((sum, order) => sum + order.estimated_total, 0);

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Procurement Orders</h1>
        <p className="text-gray-600">
          Manage procurement orders and generate supplier purchase orders
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {draftOrders.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-600">
              Validated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {validatedOrders.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">
              Sent to Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {sentOrders.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total value card */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg">Total Value of All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-orange-600">
            {totalValue.toFixed(2)} TND
          </div>
        </CardContent>
      </Card>

      {/* Main content */}
      <Tabs defaultValue="draft" className="space-y-4">
        <TabsList>
          <TabsTrigger value="draft">
            Draft ({draftOrders.length})
          </TabsTrigger>
          <TabsTrigger value="validated">
            Validated ({validatedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent to Suppliers ({sentOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draft" className="space-y-4">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-2 pt-6">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700">{error}</span>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Loading procurement orders...
              </CardContent>
            </Card>
          ) : draftOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No draft procurement orders
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {draftOrders.map((order) => (
                <BonApproView
                  key={order.id}
                  order={order}
                  onOrdersGenerated={(count) => setGeneratedOrderCount(count)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="validated" className="space-y-4">
          {validatedOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No validated procurement orders
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {validatedOrders.map((order) => (
                <BonApproView
                  key={order.id}
                  order={order}
                  onOrdersGenerated={(count) => setGeneratedOrderCount(count)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No procurement orders sent to suppliers yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sentOrders.map((order) => (
                <div key={order.id} className="space-y-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{order.reference}</CardTitle>
                          <CardDescription>
                            {order.total_items} items
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 uppercase">
                            Estimated Total
                          </p>
                          <p className="text-lg font-bold mt-1">
                            {order.estimated_total.toFixed(2)} TND
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase">
                            Priority
                          </p>
                          <p className="text-lg font-bold mt-1 capitalize">
                            {order.priority}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {generatedOrderCount > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="flex items-center gap-2 pt-6">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <span className="text-green-700 font-medium">
              {generatedOrderCount} purchase order(s) generated successfully
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
