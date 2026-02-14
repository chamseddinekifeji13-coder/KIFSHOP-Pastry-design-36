import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SuperAdminSidebar } from "@/components/super-admin/super-admin-sidebar"

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <SuperAdminSidebar />
      <SidebarInset>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
