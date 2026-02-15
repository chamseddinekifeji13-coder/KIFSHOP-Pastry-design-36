import { SubscriptionsOverview } from "@/components/super-admin/subscriptions-overview"

export default function SubscriptionsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Abonnements</h1>
        <p className="text-sm text-muted-foreground">
          Vue globale des abonnements et paiements de toutes les patisseries
        </p>
      </div>
      <SubscriptionsOverview />
    </div>
  )
}
