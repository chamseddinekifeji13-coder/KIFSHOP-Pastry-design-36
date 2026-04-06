import { CourierCollectionsView } from "@/components/treasury/courier-collections-view"

export const metadata = {
  title: "Gestion des encaissements livreurs - KIFSHOP",
  description: "Approuvez et validez les montants reçus par les livreurs",
}

export default function CourierCollectionsPage() {
  return (
    <main className="container mx-auto py-6">
      <CourierCollectionsView />
    </main>
  )
}
