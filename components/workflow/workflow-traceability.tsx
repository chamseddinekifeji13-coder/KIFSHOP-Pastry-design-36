import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingDown, TrendingUp, GitBranch } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";

interface WorkflowAuditLog {
  id: string;
  entity_type: "stock_alert" | "bon_approvisionnement" | "purchase_order";
  action: string;
  old_status?: string;
  new_status?: string;
  details?: Record<string, any>;
  related_alert_id?: string;
  related_appro_id?: string;
  related_order_id?: string;
  performed_by?: string;
  performed_at: string;
}

interface WorkflowTraceabilityProps {
  tenantId: string | null;
}

export function WorkflowTraceability({ tenantId }: WorkflowTraceabilityProps) {
  const [auditLog, setAuditLog] = useState<WorkflowAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!tenantId) return;

    setIsLoading(true);
    setError(null);

    const fetchAuditLog = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("workflow_audit_log")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("performed_at", { ascending: false })
          .limit(100);

        if (fetchError) throw fetchError;

        setAuditLog(data || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch audit log";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLog();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`audit_log:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workflow_audit_log",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          setAuditLog((prev) => [payload.new as WorkflowAuditLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [tenantId, supabase]);

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "stock_alert":
        return <Activity className="w-4 h-4 text-yellow-500" />;
      case "bon_approvisionnement":
        return <GitBranch className="w-4 h-4 text-blue-500" />;
      case "purchase_order":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "created":
        return "bg-green-100 text-green-800";
      case "converted":
        return "bg-blue-100 text-blue-800";
      case "validated":
        return "bg-purple-100 text-purple-800";
      case "ordered":
        return "bg-orange-100 text-orange-800";
      case "received":
        return "bg-emerald-100 text-emerald-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case "stock_alert":
        return "Stock Alert";
      case "bon_approvisionnement":
        return "Procurement Order";
      case "purchase_order":
        return "Purchase Order";
      default:
        return entityType;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-gray-500">
            Loading workflow history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-red-600">
            <p className="font-medium">Failed to load workflow history</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (auditLog.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-gray-500">
            No workflow history yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Traceability</CardTitle>
        <CardDescription>
          Complete audit log of all workflow transformations
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {auditLog.map((log, index) => (
            <div key={log.id} className="relative">
              {/* Timeline line */}
              {index !== auditLog.length - 1 && (
                <div className="absolute left-5 top-10 w-0.5 h-8 bg-gray-200"></div>
              )}

              {/* Timeline item */}
              <div className="flex items-start gap-3 pb-2">
                {/* Timeline dot */}
                <div className="flex-shrink-0 mt-1">{getEntityIcon(log.entity_type)}</div>

                {/* Content */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {getEntityLabel(log.entity_type)}
                    </span>
                    <Badge className={`text-xs ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </Badge>
                    {log.new_status && (
                      <span className="text-xs text-gray-600">
                        → {log.new_status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(log.performed_at), {
                      addSuffix: true,
                    })}
                  </p>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <pre className="whitespace-pre-wrap break-words">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Related entities */}
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {log.related_alert_id && (
                      <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
                        Alert: {log.related_alert_id.slice(0, 8)}...
                      </span>
                    )}
                    {log.related_appro_id && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        Procurement: {log.related_appro_id.slice(0, 8)}...
                      </span>
                    )}
                    {log.related_order_id && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                        Order: {log.related_order_id.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
