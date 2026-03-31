import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/active-profile"
import type { UserRole } from "@/lib/tenant-context"

// ─── Types ───────────────────────────────────────────────────
export interface SessionData {
  authUserId: string
  tenantId: string
  activeRole: UserRole
  activeProfileId: string
  displayName: string
}

export interface ApiError {
  error: string
  details?: string
  code?: string
  hint?: string
}

// ─── Error Response Helpers ──────────────────────────────────
export function errorResponse(
  message: string,
  status: number,
  details?: string,
  code?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message, details, code },
    { status }
  )
}

export function unauthorizedResponse(details?: string): NextResponse<ApiError> {
  return NextResponse.json(
    { error: "Non authentifie", details: details || "Veuillez vous connecter" },
    { status: 401 }
  )
}

export function forbiddenResponse(details?: string): NextResponse<ApiError> {
  return NextResponse.json(
    { error: "Acces refuse", details },
    { status: 403 }
  )
}

export function badRequestResponse(details: string): NextResponse<ApiError> {
  return NextResponse.json(
    { error: "Requete invalide", details },
    { status: 400 }
  )
}

export function serverErrorResponse(error: unknown): NextResponse<ApiError> {
  const message = error instanceof Error ? error.message : String(error)
  console.error("[API Error]", error)
  return NextResponse.json(
    { 
      error: "Erreur serveur", 
      details: message,
      // Only include stack in development
      ...(process.env.NODE_ENV === "development" && error instanceof Error && { stack: error.stack })
    },
    { status: 500 }
  )
}

// ─── Session Wrapper ─────────────────────────────────────────
// Wraps getServerSession to return a tuple [session, errorResponse]
// This avoids try-catch boilerplate in every route handler
export async function withSession(): Promise<
  [SessionData, null] | [null, NextResponse<ApiError>]
> {
  try {
    const session = await getServerSession()
    console.debug('[v0] withSession - Successfully retrieved session:', {
      tenantId: session.tenantId,
      authUserId: session.authUserId,
      role: session.activeRole
    })
    return [session, null]
  } catch (error) {
    const message = error instanceof Error ? error.message : "Non authentifie"
    console.error('[v0] withSession - Error:', message)
    
    // Determine appropriate status code based on error message
    if (message.includes("Non authentifie")) {
      return [null, unauthorizedResponse(message)]
    }
    if (message.includes("Aucun tenant")) {
      return [null, unauthorizedResponse("Aucun tenant associe a votre compte")]
    }
    if (message.includes("Acces refuse") || message.includes("non autorise")) {
      return [null, forbiddenResponse(message)]
    }
    
    // Default to unauthorized for auth-related errors
    return [null, unauthorizedResponse(message)]
  }
}

// ─── Role-Based Session Wrapper ──────────────────────────────
// Returns session only if user has one of the allowed roles
export async function withRole(...allowedRoles: UserRole[]): Promise<
  [SessionData, null] | [null, NextResponse<ApiError>]
> {
  const [session, error] = await withSession()
  
  if (error) return [null, error]
  if (!session) return [null, unauthorizedResponse()]
  
  if (!allowedRoles.includes(session.activeRole)) {
    return [null, forbiddenResponse(
      `Role "${session.activeRole}" non autorise. Roles requis: ${allowedRoles.join(", ")}`
    )]
  }
  
  return [session, null]
}

// ─── JSON Body Parser ────────────────────────────────────────
// Safely parses JSON body with error handling
export async function parseJsonBody<T>(request: Request): Promise<
  [T, null] | [null, NextResponse<ApiError>]
> {
  try {
    const body = await request.json() as T
    return [body, null]
  } catch (e) {
    return [null, badRequestResponse("Format JSON invalide: " + String(e))]
  }
}

// ─── Combined Helper ─────────────────────────────────────────
// Gets session and parses body in one call
export async function withSessionAndBody<T>(request: Request): Promise<
  [{ session: SessionData; body: T }, null] | [null, NextResponse<ApiError>]
> {
  const [session, sessionError] = await withSession()
  if (sessionError) return [null, sessionError]
  if (!session) return [null, unauthorizedResponse()]
  
  const [body, bodyError] = await parseJsonBody<T>(request)
  if (bodyError) return [null, bodyError]
  if (!body) return [null, badRequestResponse("Corps de requete vide")]
  
  return [{ session, body }, null]
}
