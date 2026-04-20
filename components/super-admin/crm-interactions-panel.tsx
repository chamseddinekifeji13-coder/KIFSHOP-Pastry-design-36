"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Phone,
  Mail,
  Users,
  Monitor,
  MessageCircle,
  FileText,
  MoreHorizontal,
  Plus,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Calendar
} from "lucide-react"
import { fetchInteractions, createInteraction, createReminder } from "@/lib/super-admin/crm-actions"
import {
  CrmInteraction,
  InteractionType,
  INTERACTION_TYPE_LABELS,
  ReminderType
} from "@/lib/super-admin/crm-types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const INTERACTION_ICONS: Record<InteractionType, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Users className="h-4 w-4" />,
  demo: <Monitor className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />
}

const INTERACTION_COLORS: Record<InteractionType, string> = {
  call: "bg-blue-100 text-blue-700",
  email: "bg-purple-100 text-purple-700",
  meeting: "bg-emerald-100 text-emerald-700",
  demo: "bg-amber-100 text-amber-700",
  whatsapp: "bg-green-100 text-green-700",
  note: "bg-slate-100 text-slate-700",
  other: "bg-gray-100 text-gray-700"
}

interface CrmInteractionsPanelProps {
  prospectId: string
  prospectName?: string
}

export function CrmInteractionsPanel({ prospectId, prospectName }: CrmInteractionsPanelProps) {
  const [interactions, setInteractions] = useState<CrmInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // New interaction form
  const [type, setType] = useState<InteractionType>("call")
  const [direction, setDirection] = useState<"inbound" | "outbound">("outbound")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [duration, setDuration] = useState("")
  const [outcome, setOutcome] = useState("")
  const [nextAction, setNextAction] = useState("")
  const [nextActionDate, setNextActionDate] = useState("")
  const [createReminderChecked, setCreateReminderChecked] = useState(false)

  const loadInteractions = async () => {
    setLoading(true)
    const data = await fetchInteractions(prospectId)
    setInteractions(data)
    setLoading(false)
  }

  useEffect(() => {
    loadInteractions()
  }, [prospectId])

  const resetForm = () => {
    setType("call")
    setDirection("outbound")
    setSubject("")
    setContent("")
    setDuration("")
    setOutcome("")
    setNextAction("")
    setNextActionDate("")
    setCreateReminderChecked(false)
  }

  const handleSave = async () => {
    if (!subject.trim() && !content.trim()) {
      toast.error("Veuillez renseigner un sujet ou un contenu")
      return
    }

    setSaving(true)

    try {
      const interaction = await createInteraction({
        prospectId,
        type,
        direction: type !== "note" ? direction : undefined,
        subject: subject.trim() || undefined,
        content: content.trim() || undefined,
        durationMinutes: duration ? parseInt(duration) : undefined,
        outcome: outcome.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        nextActionDate: nextActionDate || undefined
      })

      if (!interaction) {
        toast.error("Erreur lors de l'enregistrement")
        return
      }

      // Keep reminder creation non-blocking for interaction success UX.
      if (createReminderChecked && nextAction && nextActionDate) {
        try {
          await createReminder({
            prospectId,
            title: nextAction,
            description: `Suite a: ${subject || type}`,
            reminderDate: new Date(nextActionDate).toISOString(),
            reminderType: type === "call" ? "call" : type === "email" ? "email" : type === "meeting" ? "meeting" : "follow_up" as ReminderType,
            interactionId: interaction.id
          })
          toast.success("Interaction et rappel enregistres")
        } catch {
          toast.success("Interaction enregistree")
          toast.warning("Rappel non cree, veuillez reessayer")
        }
      } else {
        toast.success("Interaction enregistree")
      }

      // Update local history immediately for instant UI feedback.
      setInteractions((prev) => [interaction, ...prev])
      resetForm()
      setShowNewDialog(false)
      await loadInteractions()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Historique des interactions
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowNewDialog(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : interactions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune interaction enregistree</p>
            <Button size="sm" variant="link" onClick={() => setShowNewDialog(true)} className="mt-2">
              Ajouter la premiere interaction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => (
            <Card key={interaction.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                    INTERACTION_COLORS[interaction.type]
                  )}>
                    {INTERACTION_ICONS[interaction.type]}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {INTERACTION_TYPE_LABELS[interaction.type]}
                        </Badge>
                        {interaction.direction && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {interaction.direction === "outbound" ? (
                              <><ArrowUpRight className="h-3 w-3" /> Sortant</>
                            ) : (
                              <><ArrowDownLeft className="h-3 w-3" /> Entrant</>
                            )}
                          </span>
                        )}
                        {interaction.durationMinutes && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {interaction.durationMinutes} min
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(interaction.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    
                    {interaction.subject && (
                      <p className="text-sm font-medium mt-1">{interaction.subject}</p>
                    )}
                    
                    {interaction.content && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                        {interaction.content}
                      </p>
                    )}
                    
                    {interaction.outcome && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                        <span className="text-muted-foreground">Resultat:</span> {interaction.outcome}
                      </div>
                    )}
                    
                    {interaction.nextAction && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-amber-700">{interaction.nextAction}</span>
                        {interaction.nextActionDate && (
                          <span className="text-muted-foreground">
                            - {new Date(interaction.nextActionDate).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Interaction Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle interaction</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Type and Direction */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type d'interaction</Label>
                <Select value={type} onValueChange={(v) => setType(v as InteractionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(INTERACTION_TYPE_LABELS) as InteractionType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        <div className="flex items-center gap-2">
                          {INTERACTION_ICONS[t]}
                          {INTERACTION_TYPE_LABELS[t]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {type !== "note" && (
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as "inbound" | "outbound")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4" /> Sortant
                        </div>
                      </SelectItem>
                      <SelectItem value="inbound">
                        <div className="flex items-center gap-2">
                          <ArrowDownLeft className="h-4 w-4" /> Entrant
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label>Sujet</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Presentation de KIFSHOP"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label>Contenu / Notes</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Details de l'echange..."
                rows={3}
              />
            </div>

            {/* Duration (for calls/meetings) */}
            {(type === "call" || type === "meeting" || type === "demo") && (
              <div className="space-y-2">
                <Label>Duree (minutes)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Ex: 30"
                />
              </div>
            )}

            {/* Outcome */}
            <div className="space-y-2">
              <Label>Resultat / Issue</Label>
              <Input
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Ex: Interesse, rappeler la semaine prochaine"
              />
            </div>

            {/* Next Action */}
            <div className="space-y-2">
              <Label>Prochaine action</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="Ex: Envoyer le devis"
                />
                <Input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                />
              </div>
            </div>

            {/* Create Reminder */}
            {nextAction && nextActionDate && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createReminderChecked}
                  onChange={(e) => setCreateReminderChecked(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Creer un rappel pour cette action</span>
              </label>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-[#4A7C59] hover:bg-[#3d6649]"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
