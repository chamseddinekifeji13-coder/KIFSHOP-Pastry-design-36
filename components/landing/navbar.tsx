"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChefHat, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const links = [
  { href: "#features", label: "Fonctionnalites" },
  { href: "#pricing", label: "Tarifs" },
  { href: "#download", label: "Deploiement" },
  { href: "#contact", label: "Contact" },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-primary/20 bg-background/95 shadow-lg shadow-black/5 backdrop-blur-xl"
          : "bg-background/80 backdrop-blur-md"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-background shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all duration-300">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-foreground">
            KIFSHOP <span className="font-normal text-primary">Pastry</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:-bottom-2 after:left-0 after:h-1 after:w-0 after:bg-gradient-to-r after:from-primary after:to-primary/60 after:rounded-full after:transition-all hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="outline" className="text-foreground hover:bg-accent/50 border-primary/20" asChild>
            <Link href="/auth/login">Connexion</Link>
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-background shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300" asChild>
            <Link href="/auth/sign-up">Essai gratuit</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="text-foreground md:hidden" aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden transition-all duration-300 md:hidden ${
          open ? "max-h-72 border-t border-border" : "max-h-0"
        }`}
      >
        <div className="bg-card px-6 py-6 space-y-4">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:text-primary"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Button variant="outline" className="justify-start text-foreground border-primary/20" asChild>
              <Link href="/auth/login">Connexion</Link>
            </Button>
            <Button className="justify-start bg-primary hover:bg-primary/90 text-background" asChild>
              <Link href="/auth/sign-up">Essai gratuit</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
