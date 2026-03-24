import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertIds, priority = "normal", userId, tenantId } = body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: "alertIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Call the SQL function to convert alerts to bon d'approvisionnement
    const { data, error } = await supabase.rpc(
      "convert_alerts_to_appro",
      {
        p_alert_ids: alertIds,
        p_user_id: userId,
        p_priority: priority,
      }
    );

    if (error) {
      console.error("Error converting alerts:", error);
      return NextResponse.json(
        { error: "Failed to convert alerts to procurement order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bonApproId: data,
      message: "Stock alerts converted to procurement order successfully",
    });
  } catch (error) {
    console.error("Error in convert-alerts API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
