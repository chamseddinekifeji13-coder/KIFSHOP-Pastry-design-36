'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { UnifiedOrderDialog } from '@/components/orders/unified-order-dialog'

export function QuickOrderButton() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleOrderCreated = () => {
    // Dialog will close automatically after success
    // You can add additional logic here if needed
  }

  return (
    <>
      <Button
        size="lg"
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        <Plus className="h-5 w-5" />
        Nouvelle Commande
      </Button>

      <UnifiedOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onOrderCreated={handleOrderCreated}
      />
    </>
  )
}
