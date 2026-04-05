import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  formatWorkflowDbError,
  getErrorMessage,
} from "@/lib/workflow/db-errors";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface StockAlert {
  id: string;
  tenant_id: string;
  item_name: string;
  item_type: string;
  item_unit: string;
  current_stock: number;
  min_stock: number;
  suggested_quantity: number;
  severity: "critical" | "warning" | "info";
  status: "pending" | "converted" | "ignored" | "resolved";
  preferred_supplier_name?: string;
  estimated_unit_price?: number;
  created_at: string;
}

export interface BonApprovisionnement {
  id: string;
  tenant_id: string;
  reference: string;
  status:
    | "draft"
    | "validated"
    | "sent_to_suppliers"
    | "partially_ordered"
    | "fully_ordered"
    | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  total_items: number;
  estimated_total: number;
  created_at: string;
  validated_at?: string;
}

export function useStockAlerts(tenantId: string | null) {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workflow/stock-alerts", {
        method: "GET",
        headers: {
          "x-tenant-id": tenantId,
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) {
        const errorBody = contentType.includes("application/json")
          ? await response.json().catch(() => null)
          : null;
        const message =
          errorBody?.error ||
          `Erreur HTTP ${response.status} lors du chargement des alertes`;
        throw new Error(message);
      }

      if (!contentType.includes("application/json")) {
        throw new Error("Réponse invalide du serveur pour les alertes");
      }

      const payload = (await response.json()) as { alerts?: StockAlert[] };
      setAlerts(Array.isArray(payload.alerts) ? payload.alerts : []);
    } catch (err) {
      setError(
        formatWorkflowDbError(
          getErrorMessage(err) || "Impossible de recuperer les alertes"
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAlerts();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`stock_alerts:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stock_alerts",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAlerts((prev) => [payload.new as StockAlert, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setAlerts((prev) =>
              prev.map((alert) =>
                alert.id === payload.new.id ? (payload.new as StockAlert) : alert
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAlerts((prev) =>
              prev.filter((alert) => alert.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAlerts, tenantId]);

  return { alerts, isLoading, error, refetch: fetchAlerts };
}

export function useBonApprovisionnement(tenantId: string | null) {
  const [orders, setOrders] = useState<BonApprovisionnement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use API endpoint instead of direct Supabase client to bypass RLS issues
      const response = await fetch("/api/workflow/procurement-orders", {
        method: "GET",
        headers: {
          "x-tenant-id": tenantId,
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) {
        const errorBody = contentType.includes("application/json")
          ? await response.json().catch(() => null)
          : null;
        const message =
          errorBody?.error ||
          `Erreur HTTP ${response.status} lors du chargement des bons`;
        throw new Error(message);
      }

      if (!contentType.includes("application/json")) {
        throw new Error("Réponse invalide du serveur pour les bons d'approvisionnement");
      }

      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        formatWorkflowDbError(
          getErrorMessage(err) ||
            "Impossible de recuperer les bons d'approvisionnement"
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`bon_appro:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bon_approvisionnement",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new as BonApprovisionnement, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === payload.new.id
                  ? (payload.new as BonApprovisionnement)
                  : order
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchOrders, tenantId]);

  return { orders, isLoading, error, refetch: fetchOrders };
}
