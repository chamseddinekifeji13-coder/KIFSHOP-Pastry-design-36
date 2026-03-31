"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function PackerPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if packer session exists
    const session = localStorage.getItem("packer_session")
    
    if (session) {
      router.push("/packer/dashboard")
    } else {
      router.push("/packer/login")
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirection...</p>
      </div>
    </div>
  )
}
