import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { SuperAdminSidebar } from "@/components/super-admin/super-admin-sidebar"
import { Separator } from "@/components/ui/separator"
import { Shield } from "lucide-react"

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <SuperAdminSidebar />
      <SidebarInset>
        {/* Mobile header with sidebar trigger */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-card px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background font-bold text-xs">
              K
            </div>
            <span className="font-semibold text-sm">KIFSHOP</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-foreground/20 px-1.5 py-0.5 text-[10px] text-foreground/60">
              <Shield className="h-2.5 w-2.5" />
              Super Admin
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
