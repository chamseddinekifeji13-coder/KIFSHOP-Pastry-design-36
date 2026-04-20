import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { approId, userId } = body;

    if (!approId) {
      return NextResponse.json(
        { error: "approId is required" },
        { status: 400 }
      );
    }

    // Call the SQL function to generate purchase orders from bon d'approvisionnement
    const { data, error } = await supabase.rpc(
      "generate_purchase_orders_from_appro",
      {
        p_appro_id: approId,
        p_user_id: userId,
      }
    );

    if (error) {
      console.error("Error generating purchase orders:", error);
      return NextResponse.json(
        { error: "Failed to generate purchase orders" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderCount: data,
      message: `${data} purchase order(s) generated successfully`,
    });
  } catch (error) {
    console.error("Error in generate-orders API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
