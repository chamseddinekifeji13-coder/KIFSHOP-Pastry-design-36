"use client"

import { useState } from "react"
import { Send, Phone, Mail, MapPin, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const SUBJECTS = [
  { value: "demo", label: "Demande de demonstration" },
  { value: "pricing", label: "Informations tarifaires" },
  { value: "onpremise", label: "Installation On-Premise" },
  { value: "support", label: "Support technique" },
  { value: "other", label: "Autre" },
]

// Contact form v4 - single column layout - 2026-02-22
export function ContactSection() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true)
    await new Promise((r) => setTimeout(r, 1500))
    setSending(false)
    setSent(true)
  }

  return (
    <section id="contact" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-2xl px-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4A7C59]">
            Contact
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            Parlons de votre projet
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
            Une question, une demande de demo ou un devis ? Remplissez le formulaire ci-dessous.
          </p>
        </div>

        {/* Contact info - 3 items stacked */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-6 sm:justify-center">
          <a href="tel:+21625122212" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Phone className="h-4 w-4 text-[#4A7C59]" />
            <span>+216 25 12 22 12</span>
          </a>
          <a href="mailto:contact@kifshop.tn" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Mail className="h-4 w-4 text-[#4A7C59]" />
            <span>contact@kifshop.tn</span>
          </a>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-[#4A7C59]" />
            <span>Tunisie</span>
          </div>
        </div>

        {/* Form card */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4A7C59]/10">
                <CheckCircle2 className="h-7 w-7 text-[#4A7C59]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Message envoye !</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Notre equipe vous repondra dans les plus brefs delais.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => setSent(false)}
              >
                Envoyer un autre message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">
                  Nom complet <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact-name"
                  name="name"
                  placeholder="Votre nom et prenom"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-phone">
                  Telephone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  placeholder="+216 XX XXX XXX"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  placeholder="votre@email.com"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-subject">
                  Sujet <span className="text-destructive">*</span>
                </Label>
                <Select name="subject" required>
                  <SelectTrigger id="contact-subject" className="h-11">
                    <SelectValue placeholder="Choisir un sujet" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-shop">Nom de la patisserie</Label>
                <Input
                  id="contact-shop"
                  name="shop_name"
                  placeholder="Ex: Patisserie El Manara"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-message">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="contact-message"
                  name="message"
                  placeholder="Decrivez votre besoin ou posez votre question..."
                  required
                  rows={5}
                  className="resize-y"
                />
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="w-full h-12 bg-[#4A7C59] hover:bg-[#3d6a4b] text-white gap-2 text-base"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer le message
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                En soumettant ce formulaire, vous acceptez d{"'"}etre contacte par notre equipe.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
