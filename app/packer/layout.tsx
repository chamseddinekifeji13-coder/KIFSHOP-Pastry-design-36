import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "KIFSHOP - Espace Emballeur",
  description: "Interface de gestion des emballages pour les emballeurs KIFSHOP",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#c6a55f",
}

export default function PackerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
