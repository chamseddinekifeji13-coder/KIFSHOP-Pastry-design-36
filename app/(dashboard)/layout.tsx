import dynamic from "next/dynamic"

const DashboardShell = dynamic(
  () => import("@/components/layout/dashboard-shell").then((m) => m.DashboardShell),
  { ssr: false }
)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
