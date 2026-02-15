"use client"

import { useTenant } from "@/lib/tenant-context"
import { ShieldAlert, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SuspensionOverlay() {
  const { isSuspended, signOut, currentTenant } = useTenant()

  if (!isSuspended || currentTenant.id === "demo") return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-md border-destructive/30 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Compte suspendu</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Votre abonnement pour <span className="font-medium text-foreground">{currentTenant.name}</span> a ete suspendu
            par l{"'"}administrateur de la plateforme.
          </p>
          <p className="text-sm text-muted-foreground">
            Pour reactiver votre compte, veuillez contacter le support
            ou regulariser votre situation.
          </p>
          <div className="pt-2">
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Se deconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
