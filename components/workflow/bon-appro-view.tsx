import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader, Send, CheckCircle, AlertCircle } from "lucide-react";
import { useStockAlertsWorkflow } from "@/hooks/use-stock-alerts-workflow";
import { BonApprovisionnement } from "@/hooks/use-workflow-data";

interface BonApproViewProps {
  order: BonApprovisionnement;
  onOrdersGenerated?: (count: number) => void;
}

export function BonApproView({ order, onOrdersGenerated }: BonApproViewProps) {
  const { generatePurchaseOrders, isLoading, error } =
    useStockAlertsWorkflow();
  const [success, setSuccess] = useState(false);

  const handleGenerateOrders = async () => {
    setSuccess(false);
    const orderCount = await generatePurchaseOrders(order.id);
    if (orderCount !== null) {
      setSuccess(true);
      onOrdersGenerated?.(orderCount);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const getStatusColor = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "draft":
        return "secondary";
      case "validated":
        return "default";
      case "sent_to_suppliers":
      case "partially_ordered":
      case "fully_ordered":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Brouillon";
      case "validated":
        return "Validé";
      case "sent_to_suppliers":
        return "Envoyé";
      case "partially_ordered":
        return "Partiellement commandé";
      case "fully_ordered":
        return "Commande complète";
      case "cancelled":
        return "Annulé";
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600";
      case "high":
        return "text-orange-600";
      case "normal":
        return "text-blue-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {order.reference}
              <Badge variant={getStatusColor(order.status)}>
                {getStatusLabel(order.status)}
              </Badge>
            </CardTitle>
            <CardDescription>Bon d'approvisionnement</CardDescription>
          </div>
          <div className={`text-lg font-semibold ${getPriorityColor(order.priority)}`}>
            {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" />
            Commandes fournisseurs générées avec succès !
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Résumé du bon */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 uppercase tracking-wide">
              Articles
            </div>
            <div className="text-2xl font-bold mt-1">{order.total_items}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 uppercase tracking-wide">
              Total estimé
            </div>
            <div className="text-2xl font-bold mt-1">
              {order.estimated_total.toFixed(2)} TND
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-4">
          {order.status === "draft" && (
            <Button
              onClick={handleGenerateOrders}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Générer commandes fournisseurs
                </>
              )}
            </Button>
          )}

          {order.status === "validated" && (
            <Button
              onClick={handleGenerateOrders}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer aux fournisseurs
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
