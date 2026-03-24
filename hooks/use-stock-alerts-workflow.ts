import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

export function useStockAlertsWorkflow() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convertAlertsToAppro = useCallback(
    async (alertIds: string[], priority: string = "normal") => {
      if (!user || !tenant) {
        setError("User and tenant information is required");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/workflow/convert-alerts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            alertIds,
            priority,
            userId: user.id,
            tenantId: tenant.id,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to convert alerts");
        }

        const data = await response.json();
        return data.bonApproId;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user, tenant]
  );

  const generatePurchaseOrders = useCallback(
    async (approId: string) => {
      if (!user) {
        setError("User information is required");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/workflow/generate-orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approId,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to generate purchase orders");
        }

        const data = await response.json();
        return data.orderCount;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  return {
    convertAlertsToAppro,
    generatePurchaseOrders,
    isLoading,
    error,
  };
}
