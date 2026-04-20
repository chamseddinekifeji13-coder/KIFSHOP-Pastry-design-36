import { OrdersList } from '@/components/cash-register/orders-list'
import { QuickOrderButton } from '@/components/cash-register/quick-order-button'
import { StockView } from '@/components/cash-register/stock-view'

export const metadata = {
  title: 'Caisse - KIFSHOP Pastry',
  description: 'Interface de caisse pour gérer les commandes et le stock',
}

export default function CashRegisterPage() {
  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Caisse</h1>
          <p className="text-muted-foreground mt-2">Gérez vos commandes et stocks en temps réel</p>
        </div>
        <QuickOrderButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <OrdersList />
          <StockView />
        </div>
      </div>
    </div>
  )
}
