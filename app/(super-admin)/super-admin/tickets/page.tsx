import { TicketsList } from "@/components/super-admin/tickets-list"

export default function TicketsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tickets de support</h1>
        <p className="text-sm text-muted-foreground">
          Gerez les demandes de support des patisseries
        </p>
      </div>
      <TicketsList />
    </div>
  )
}
