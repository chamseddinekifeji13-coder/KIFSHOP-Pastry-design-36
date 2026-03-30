"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, AlertTriangle, Info, Loader } from "lucide-react";
import { useStockAlertsWorkflow } from "@/hooks/use-stock-alerts-workflow";
import { StockAlert } from "@/hooks/use-workflow-data";

interface StockAlertsListProps {
  alerts: StockAlert[];
  onConvertSuccess?: (bonApproId: string) => void;
}

export function StockAlertsList({
  alerts,
  onConvertSuccess,
}: StockAlertsListProps) {
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [priority, setPriority] = useState("normal");
  const { convertAlertsToAppro, isLoading, error } =
    useStockAlertsWorkflow();

  const handleSelectAlert = (alertId: string) => {
    setSelectedAlerts((prev) =>
      prev.includes(alertId)
        ? prev.filter((id) => id !== alertId)
        : [...prev, alertId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAlerts.length === alerts.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(alerts.map((alert) => alert.id));
    }
  };

  const handleConvert = async () => {
    const bonApproId = await convertAlertsToAppro(selectedAlerts, priority);
    if (bonApproId) {
      setSelectedAlerts([]);
      onConvertSuccess?.(bonApproId);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const classes = {
      critical: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
      info: "bg-blue-100 text-blue-800",
    };
    return classes[severity as keyof typeof classes] || classes.info;
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">No stock alerts at the moment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Stock Alerts ({alerts.length})</CardTitle>
          <CardDescription>
            Convert stock alerts to procurement orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Selection toolbar */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedAlerts.length === alerts.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-gray-600">
                {selectedAlerts.length} of {alerts.length} selected
              </span>
            </div>

            {selectedAlerts.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleConvert}
                  disabled={isLoading}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    "Convert to Procurement Order"
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Alerts list */}
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition"
              >
                <Checkbox
                  checked={selectedAlerts.includes(alert.id)}
                  onCheckedChange={() => handleSelectAlert(alert.id)}
                />

                <div className="flex-shrink-0">
                  {getSeverityIcon(alert.severity)}
                </div>

                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{alert.item_name}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getSeverityBadge(
                        alert.severity
                      )}`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs text-gray-500">
                      {alert.item_type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Current: {alert.current_stock} {alert.item_unit} | Min:{" "}
                    {alert.min_stock} {alert.item_unit} | Suggest:{" "}
                    {alert.suggested_quantity} {alert.item_unit}
                  </div>
                  {alert.preferred_supplier_name && (
                    <div className="text-xs text-gray-500 mt-1">
                      Preferred supplier: {alert.preferred_supplier_name}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  {alert.estimated_unit_price && (
                    <div className="text-sm font-medium">
                      {alert.estimated_unit_price.toFixed(2)} TND
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
