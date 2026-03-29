import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing tenant ID" },
        { status: 400 }
      );
    }

    // Get workflow audit log
    const { data: auditLog, error: auditError } = await supabase
      .from("workflow_audit_log")
      .select(`
        id,
        entity_type,
        entity_id,
        action,
        old_status,
        new_status,
        details,
        related_alert_id,
        related_appro_id,
        related_order_id,
        performed_by,
        performed_at
      `)
      .eq("tenant_id", tenantId)
      .order("performed_at", { ascending: false })
      .limit(500);

    if (auditError) {
      console.error("Error fetching audit log:", auditError);
      return NextResponse.json(
        { error: "Failed to fetch audit log" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      auditLog,
    });
  } catch (error) {
    console.error("Error in audit-log API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
