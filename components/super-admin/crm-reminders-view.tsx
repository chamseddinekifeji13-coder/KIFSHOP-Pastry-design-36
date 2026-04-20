"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Plus,
  Loader2,
  RefreshCw,
  MoreVertical,
  Trash2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { fetchReminders, createReminder, updateReminderStatus } from "@/lib/super-admin/crm-actions"
import { fetchPlatformProspects } from "@/lib/super-admin/prospect-actions"
import { PlatformProspect } from "@/lib/super-admin/prospect-types"
import {
  CrmReminder,
  ReminderType,
  ReminderPriority,
  REMINDER_TYPE_LABELS,
  REMINDER_PRIORITY_LABELS,
  REMINDER_PRIORITY_COLORS,
  REMINDER_STATUS_LABELS
} from "@/lib/super-admin/crm-types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const REMINDER_TYPE_ICONS: Record<ReminderType, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Users className="h-4 w-4" />,
  follow_up: <RefreshCw className="h-4 w-4" />,
  demo: <Calendar className="h-4 w-4" />,
  other: <Bell className="h-4 w-4" />
}

export function CrmRemindersView() {
  const [reminders, setReminders] = useState<CrmReminder[]>([])
  const [prospects, setProspects] = useState<PlatformProspect[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pending")
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // New reminder form
  const [prospectId, setProspectId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [reminderDate, setReminderDate] = useState("")
  const [reminderTime, setReminderTime] = useState("09:00")
  const [reminderType, setReminderType] = useState<ReminderType>("call")
  const [priority, setPriority] = useState<ReminderPriority>("medium")

  const loadData = async () => {
    setLoading(true)
    const [remindersData, prospectsData] = await Promise.all([
      fetchReminders(),
      fetchPlatformProspects()
    ])
    setReminders(remindersData)
    setProspects(prospectsData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const now = new Date()

  const pendingReminders = reminders.filter(r => r.status === "pending")
  const overdueReminders = pendingReminders.filter(r => new Date(r.reminderDate) < now)
  const upcomingReminders = pendingReminders.filter(r => new Date(r.reminderDate) >= now)
  const todayReminders = upcomingReminders.filter(r => {
    const date = new Date(r.reminderDate)
    return date.toDateString() === now.toDateString()
  })
  const completedReminders = reminders.filter(r => r.status === "completed")

  const handleComplete = async (id: string) => {
    const success = await updateReminderStatus(id, "completed")
    if (success) {
      toast.success("Rappel termine")
      loadData()
    } else {
      toast.error("Erreur")
    }
  }

  const handleCancel = async (id: string) => {
    const success = await updateReminderStatus(id, "cancelled")
    if (success) {
      toast.success("Rappel annule")
      loadData()
    } else {
      toast.error("Erreur")
    }
  }

  const handleSnooze = async (id: string, hours: number) => {
    const newDate = new Date()
    newDate.setHours(newDate.getHours() + hours)
    const success = await updateReminderStatus(id, "snoozed", newDate.toISOString())
    if (success) {
      toast.success(`Rappel reporte de ${hours}h`)
      loadData()
    } else {
      toast.error("Erreur")
    }
  }

  const resetForm = () => {
    setProspectId("")
    setTitle("")
    setDescription("")
    setReminderDate("")
    setReminderTime("09:00")
    setReminderType("call")
    setPriority("medium")
  }

  const handleSave = async () => {
    if (!prospectId || !title.trim() || !reminderDate) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    setSaving(true)
    
    const dateTime = new Date(`${reminderDate}T${reminderTime}:00`)
    
    const reminder = await createReminder({
      prospectId,
      title: title.trim(),
      description: description.trim() || undefined,
      reminderDate: dateTime.toISOString(),
      reminderType,
      priority
    })

    if (reminder) {
      toast.success("Rappel cree")
      resetForm()
      setShowNewDialog(false)
      loadData()
    } else {
      toast.error("Erreur lors de la creation")
    }

    setSaving(false)
  }

  const ReminderCard = ({ reminder }: { reminder: CrmReminder }) => {
    const isOverdue = reminder.status === "pending" && new Date(reminder.reminderDate) < now
    const isToday = new Date(reminder.reminderDate).toDateString() === now.toDateString()

    return (
      <Card className={cn(
        "transition-all",
        isOverdue && "border-red-200 bg-red-50/50",
        isToday && !isOverdue && "border-amber-200 bg-amber-50/50"
      )}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Icon */}
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
              REMINDER_PRIORITY_COLORS[reminder.priority]
            )}>
              {REMINDER_TYPE_ICONS[reminder.reminderType]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{reminder.title}</p>
                  {reminder.prospectName && (
                    <p className="text-sm text-muted-foreground">{reminder.prospectName}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    {REMINDER_TYPE_LABELS[reminder.reminderType]}
                  </Badge>
                  <Badge className={cn("text-xs", REMINDER_PRIORITY_COLORS[reminder.priority])}>
                    {REMINDER_PRIORITY_LABELS[reminder.priority]}
                  </Badge>
                </div>
              </div>

              {reminder.description && (
                <p className="text-sm text-muted-foreground mt-2">{reminder.description}</p>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className={cn(
                  "flex items-center gap-1.5 text-sm",
                  isOverdue ? "text-red-600" : isToday ? "text-amber-600" : "text-muted-foreground"
                )}>
                  {isOverdue ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  {new Date(reminder.reminderDate).toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                  {isOverdue && <span className="font-medium">(en retard)</span>}
                  {isToday && !isOverdue && <span className="font-medium">(aujourd'hui)</span>}
                </div>

                {reminder.status === "pending" && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleComplete(reminder.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Termine
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSnooze(reminder.id, 1)}>
                          <Clock className="h-4 w-4 mr-2" /> Reporter de 1h
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSnooze(reminder.id, 24)}>
                          <Calendar className="h-4 w-4 mr-2" /> Reporter a demain
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSnooze(reminder.id, 168)}>
                          <Calendar className="h-4 w-4 mr-2" /> Reporter d'une semaine
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleCancel(reminder.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Annuler
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {reminder.status === "completed" && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Termine
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rappels & Relances</h1>
          <p className="text-sm text-muted-foreground">Gerez vos taches de suivi commercial</p>
        </div>
        <Button 
          onClick={() => setShowNewDialog(true)}
          className="bg-[#4A7C59] hover:bg-[#3d6649] gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouveau rappel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={overdueReminders.length > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">En retard</p>
                <p className={cn("text-2xl font-bold", overdueReminders.length > 0 && "text-red-600")}>
                  {overdueReminders.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={todayReminders.length > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aujourd'hui</p>
                <p className={cn("text-2xl font-bold", todayReminders.length > 0 && "text-amber-600")}>
                  {todayReminders.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">A venir</p>
                <p className="text-2xl font-bold">{upcomingReminders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Termines</p>
                <p className="text-2xl font-bold">{completedReminders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1">
            <Bell className="h-4 w-4" />
            En attente
            {pendingReminders.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {pendingReminders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Termines
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingReminders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucun rappel en attente</p>
                <Button 
                  variant="link" 
                  onClick={() => setShowNewDialog(true)}
                  className="mt-2"
                >
                  Creer un rappel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overdue section */}
              {overdueReminders.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    En retard ({overdueReminders.length})
                  </h3>
                  {overdueReminders.map(reminder => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              )}

              {/* Today section */}
              {todayReminders.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Aujourd'hui ({todayReminders.length})
                  </h3>
                  {todayReminders.map(reminder => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              )}

              {/* Upcoming section */}
              {upcomingReminders.filter(r => !todayReminders.includes(r)).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    A venir
                  </h3>
                  {upcomingReminders
                    .filter(r => !todayReminders.includes(r))
                    .map(reminder => (
                      <ReminderCard key={reminder.id} reminder={reminder} />
                    ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedReminders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucun rappel termine</p>
              </CardContent>
            </Card>
          ) : (
            completedReminders.slice(0, 20).map(reminder => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* New Reminder Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau rappel</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Prospect */}
            <div className="space-y-2">
              <Label>Prospect *</Label>
              <Select value={prospectId} onValueChange={setProspectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un prospect" />
                </SelectTrigger>
                <SelectContent>
                  {prospects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Titre du rappel *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Appeler pour suivi devis"
              />
            </div>

            {/* Type and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={reminderType} onValueChange={(v) => setReminderType(v as ReminderType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REMINDER_TYPE_LABELS) as ReminderType[]).map(t => (
                      <SelectItem key={t} value={t}>
                        <div className="flex items-center gap-2">
                          {REMINDER_TYPE_ICONS[t]}
                          {REMINDER_TYPE_LABELS[t]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priorite</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as ReminderPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REMINDER_PRIORITY_LABELS) as ReminderPriority[]).map(p => (
                      <SelectItem key={p} value={p}>
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", REMINDER_PRIORITY_COLORS[p].split(" ")[0])} />
                          {REMINDER_PRIORITY_LABELS[p]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Heure</Label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details supplementaires..."
                rows={2}
              />
            </div>
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
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creation...</>
              ) : (
                "Creer le rappel"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
