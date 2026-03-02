import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { setActiveProfileCookie, clearActiveProfileCookie, type ActiveProfile } from "@/lib/active-profile"

// ── Rate-limiting store (in-memory, per serverless instance) ──
// Each entry tracks failed attempts, lockout timestamps and lockout count
// for a given tenantUserId.
interface RateLimitEntry {
  failures: number      // consecutive failures since last success / reset
  lockedUntil: number   // timestamp (ms) — 0 = not locked
  lockouts: number      // total number of lockouts
}

const MAX_ATTEMPTS = 3          // failures before a lockout
const LOCKOUT_MS = 2 * 60_000  // 2 minutes
const ALERT_AFTER_LOCKOUTS = 2  // show alert after this many lockouts

const rateLimitMap = new Map<string, RateLimitEntry>()

function getRateLimit(id: string): RateLimitEntry {
  if (!rateLimitMap.has(id)) {
    rateLimitMap.set(id, { failures: 0, lockedUntil: 0, lockouts: 0 })
  }
  return rateLimitMap.get(id)!
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantUserId, pin } = body as { tenantUserId?: string; pin?: string }

    if (!tenantUserId) {
      return NextResponse.json({ error: "tenantUserId requis" }, { status: 400 })
    }

    // ── Rate-limit check ──────────────────────────────────────
    const rl = getRateLimit(tenantUserId)
    const now = Date.now()

    if (rl.lockedUntil > now) {
      const remainingMs = rl.lockedUntil - now
      const remainingSec = Math.ceil(remainingMs / 1000)
      return NextResponse.json(
        {
          error: "Trop de tentatives. Reessayez plus tard.",
          locked: true,
          remainingSeconds: remainingSec,
          attemptsLeft: 0,
          alert: rl.lockouts >= ALERT_AFTER_LOCKOUTS,
        },
        { status: 429 },
      )
    }

    // 1. Verify the caller is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 })
    }

    // 2. Fetch the target employee profile
    const { data: targetUser } = await supabase
      .from("tenant_users")
      .select("id, tenant_id, user_id, role, display_name, pin")
      .eq("id", tenantUserId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 })
    }

    // 3. Verify the authenticated user has access to this tenant
    //    (either they are the target user themselves, or they belong to the same tenant)
    const { data: callerProfiles } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)

    const callerTenantIds = (callerProfiles || []).map(p => p.tenant_id)

    if (!callerTenantIds.includes(targetUser.tenant_id)) {
      return NextResponse.json({ error: "Acces non autorise a ce tenant" }, { status: 403 })
    }

    // 4. Verify PIN if the user has one
    if (targetUser.pin) {
      if (!pin) {
        return NextResponse.json({ error: "PIN requis" }, { status: 400 })
      }
      // Trim both PINs to avoid whitespace issues
      const storedPin = String(targetUser.pin).trim()
      const inputPin = String(pin).trim()
      if (inputPin !== storedPin) {
        // ── Record failure ────────────────────────────────────
        rl.failures += 1

        if (rl.failures >= MAX_ATTEMPTS) {
          rl.lockouts += 1
          rl.lockedUntil = now + LOCKOUT_MS
          rl.failures = 0 // reset for next round

          return NextResponse.json(
            {
              error: "Trop de tentatives. Compte bloque temporairement.",
              locked: true,
              remainingSeconds: Math.ceil(LOCKOUT_MS / 1000),
              attemptsLeft: 0,
              alert: rl.lockouts >= ALERT_AFTER_LOCKOUTS,
            },
            { status: 429 },
          )
        }

        return NextResponse.json(
          {
            error: "Code PIN incorrect",
            locked: false,
            attemptsLeft: MAX_ATTEMPTS - rl.failures,
            alert: false,
          },
          { status: 403 },
        )
      }
    }

    // ── Success — reset rate-limit for this user ──────────────
    rl.failures = 0
    rl.lockedUntil = 0
    // Note: we keep rl.lockouts so persistent abusers still get alerted

    // 5. Set the active profile cookie
    const profile: ActiveProfile = {
      tenantUserId: targetUser.id,
      tenantId: targetUser.tenant_id,
      userId: targetUser.user_id,
      role: targetUser.role,
      displayName: targetUser.display_name || "Utilisateur",
      authUserId: user.id,
      setAt: Date.now(),
    }

    await setActiveProfileCookie(profile)

    return NextResponse.json({
      success: true,
      profile: {
        id: targetUser.user_id,
        name: targetUser.display_name,
        role: targetUser.role,
        dbId: targetUser.id,
      },
    })
  } catch (error) {
    console.error("verify-pin error:", error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}

// Clear active profile (lock screen)
export async function DELETE() {
  try {
    await clearActiveProfileCookie()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}
