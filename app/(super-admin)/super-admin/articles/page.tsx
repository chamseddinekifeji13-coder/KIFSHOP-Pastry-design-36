import { AdminArticlesList } from "@/components/super-admin/admin-articles-list"

export default function ArticlesPage() {
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold">Articles</h1>
        <p className="text-muted-foreground text-sm">
          Gerez les articles de toutes les patisseries
        </p>
      </div>
      <AdminArticlesList />
    </div>
  )
}
