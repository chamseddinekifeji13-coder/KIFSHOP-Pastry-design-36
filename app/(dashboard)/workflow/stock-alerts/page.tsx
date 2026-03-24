"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/hooks/use-tenant";
import { useStockAlerts } from "@/hooks/use-workflow-data";
import { StockAlertsList } from "@/components/workflow/stock-alerts-list";
import { BonApproView } from "@/components/workflow/bon-appro-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";

export default function StockAlertsPage() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { alerts, isLoading, error } = useStockAlerts(tenant?.id || null);
  const [convertedApproId, setConvertedApproId] = useState<string | null>(null);

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

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");
  const infoAlerts = alerts.filter((a) => a.severity === "info");

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Stock Alerts Management</h1>
        <p className="text-gray-600">
          Monitor and convert stock alerts to procurement orders
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {criticalAlerts.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Warning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {warningAlerts.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600">
              Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {infoAlerts.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          <TabsTrigger value="converted">
            Converted {convertedApproId && "✓"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
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
                Loading stock alerts...
              </CardContent>
            </Card>
          ) : (
            <StockAlertsList
              alerts={alerts}
              onConvertSuccess={(bonApproId) => {
                setConvertedApproId(bonApproId);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="converted">
          {convertedApproId ? (
            <div className="space-y-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="flex items-center gap-2 pt-6">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-green-700 font-medium">
                    Procurement order created: {convertedApproId.slice(0, 8)}...
                  </span>
                </CardContent>
              </Card>

              <div className="text-center py-8 text-gray-600">
                <p>Navigate to the Procurement Orders page to manage</p>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No procurement orders created yet. Convert stock alerts first.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
