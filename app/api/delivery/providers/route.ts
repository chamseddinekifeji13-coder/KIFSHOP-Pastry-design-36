import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenant_id")

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Try to fetch from delivery_provider_credentials table
    const { data, error } = await supabase
      .from("delivery_provider_credentials")
      .select("provider_code, provider_name, is_enabled, is_default")
      .eq("tenant_id", tenantId)

    if (error) {
      // Table doesn't exist yet, return default providers
      console.log("[API] delivery_provider_credentials table not available, returning defaults")
      return NextResponse.json({
        providers: [
          {
            code: "best_delivery",
            name: "Best Delivery",
            description: "Service de livraison local tunisien",
            is_enabled: true,
            is_default: true,
          },
          {
            code: "aramex",
            name: "Aramex",
            description: "Livraison internationale",
            is_enabled: false,
            is_default: false,
          },
          {
            code: "first_delivery",
            name: "First Delivery",
            description: "Service express local",
            is_enabled: false,
            is_default: false,
          },
        ],
      })
    }

    // Map database results to provider info
    const providers = [
      {
        code: "best_delivery",
        name: "Best Delivery",
        description: "Service de livraison local tunisien",
        is_enabled: data?.find((p) => p.provider_code === "best_delivery")?.is_enabled || false,
        is_default: data?.find((p) => p.provider_code === "best_delivery")?.is_default || false,
      },
      {
        code: "aramex",
        name: "Aramex",
        description: "Livraison internationale",
        is_enabled: data?.find((p) => p.provider_code === "aramex")?.is_enabled || false,
        is_default: data?.find((p) => p.provider_code === "aramex")?.is_default || false,
      },
      {
        code: "first_delivery",
        name: "First Delivery",
        description: "Service express local",
        is_enabled: data?.find((p) => p.provider_code === "first_delivery")?.is_enabled || false,
        is_default: data?.find((p) => p.provider_code === "first_delivery")?.is_default || false,
      },
    ]

    // If no provider is enabled, enable Best Delivery by default
    if (!providers.some((p) => p.is_enabled)) {
      providers[0].is_enabled = true
      providers[0].is_default = true
    }

    return NextResponse.json({ providers })
  } catch (error) {
    console.error("[API] Error fetching providers:", error)
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    )
  }
}
