'use client'

import { useTenant } from '@/lib/tenant-context'
import { POS80ConfigDrawer } from '@/components/settings/pos80-config-drawer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function POS80SettingsPage() {
  const { tenant } = useTenant()

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center gap-2 pt-6 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Tenant non trouvé</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configuration POS80</h1>
        <p className="text-muted-foreground mt-2">Connectez votre caisse POS80 pour synchroniser les ventes en temps réel</p>
      </div>

      <div className="grid gap-6">
        <POS80ConfigDrawer tenantId={tenant.id} />
      </div>
    </div>
  )
}
