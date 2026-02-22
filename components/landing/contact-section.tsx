"use client"

import { useState } from "react"
import { Send, Phone, Mail, MapPin, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ContactSection() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true)

    // Simulate sending (replace with real API endpoint later)
    await new Promise((r) => setTimeout(r, 1500))

    setSending(false)
    setSent(true)
  }

  return (
    <section id="contact" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4A7C59]">
            Contact
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            Nous contacter
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
            Une question sur KIFSHOP Pastry ? Besoin d{"'"}un devis On-Premise ou
            d{"'"}une demonstration ? Remplissez le formulaire et notre equipe
            vous repondra dans les 24h.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-5">
          {/* Contact info */}
          <div className="space-y-8 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-base font-semibold text-foreground">
                Informations
              </h3>
              <ul className="mt-5 space-y-5">
                <li className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4A7C59]/10 text-[#4A7C59]">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Telephone</p>
                    <a
                      href="tel:+21625122212"
                      className="text-sm text-muted-foreground transition-colors hover:text-[#4A7C59]"
                    >
                      +216 25 12 22 12
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4A7C59]/10 text-[#4A7C59]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Email</p>
                    <a
                      href="mailto:contact@kifshop.tn"
                      className="text-sm text-muted-foreground transition-colors hover:text-[#4A7C59]"
                    >
                      contact@kifshop.tn
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4A7C59]/10 text-[#4A7C59]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Adresse</p>
                    <p className="text-sm text-muted-foreground">Tunisie</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#4A7C59]/20 bg-[#4A7C59]/5 p-6">
              <p className="text-sm font-medium text-[#4A7C59]">
                Horaires de disponibilite
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Lundi - Samedi : 8h00 - 18h00
              </p>
              <p className="text-sm text-muted-foreground">
                Reponse garantie sous 24h
              </p>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4A7C59]/10">
                    <CheckCircle2 className="h-7 w-7 text-[#4A7C59]" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    Message envoye !
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Merci pour votre message. Notre equipe vous contactera dans
                    les plus brefs delais.
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
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Nom complet *</Label>
                      <Input
                        id="contact-name"
                        name="name"
                        placeholder="Votre nom"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">Telephone *</Label>
                      <Input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        placeholder="+216 XX XXX XXX"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      name="email"
                      type="email"
                      placeholder="votre@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-subject">Sujet *</Label>
                    <Select name="subject" required>
                      <SelectTrigger id="contact-subject">
                        <SelectValue placeholder="Choisir un sujet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="demo">Demande de demonstration</SelectItem>
                        <SelectItem value="on-premise">Devis On-Premise</SelectItem>
                        <SelectItem value="cloud">Informations Cloud</SelectItem>
                        <SelectItem value="support">Support technique</SelectItem>
                        <SelectItem value="partnership">Partenariat</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-pastry">Nom de la patisserie</Label>
                    <Input
                      id="contact-pastry"
                      name="pastry_name"
                      placeholder="Ex: Patisserie El Masmoudi"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Message *</Label>
                    <Textarea
                      id="contact-message"
                      name="message"
                      placeholder="Decrivez votre besoin ou posez votre question..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#4A7C59] hover:bg-[#3d6a4b] text-white h-11 gap-2"
                    disabled={sending}
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
        </div>
      </div>
    </section>
  )
}
