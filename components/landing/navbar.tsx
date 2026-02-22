"use client"

import { useState } from "react"
import Link from "next/link"
import { ChefHat, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const links = [
  { href: "#features", label: "Fonctionnalites" },
  { href: "#download", label: "Deploiement" },
  { href: "#contact", label: "Contact" },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1a2e23]/95 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4A7C59] text-white">
            <ChefHat className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold text-white">KIFSHOP <span className="font-normal text-[#7dba94]">Pastry</span></span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-white/70 transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" asChild>
            <Link href="/auth/login">Connexion</Link>
          </Button>
          <Button className="bg-[#4A7C59] hover:bg-[#3d6a4b] text-white" asChild>
            <Link href="/auth/sign-up">Essai gratuit</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="text-white md:hidden" aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/10 bg-[#1a2e23] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
              <Button variant="ghost" className="justify-start text-white/80 hover:text-white hover:bg-white/10" asChild>
                <Link href="/auth/login">Connexion</Link>
              </Button>
              <Button className="bg-[#4A7C59] hover:bg-[#3d6a4b] text-white" asChild>
                <Link href="/auth/sign-up">Essai gratuit</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
