import { UsersListView } from "@/components/super-admin/users-list"

export default function UsersPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground">
          Tous les utilisateurs inscrits sur KIFSHOP
        </p>
      </div>
      <UsersListView />
    </div>
  )
}
