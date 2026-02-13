"use client"

import { Bell, MessageCircle, Phone, Globe, Instagram, Store, CheckCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOrders, type OrderNotification } from "@/lib/order-context"
import { ScrollArea } from "@/components/ui/scroll-area"

const sourceIcons: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  phone: Phone,
  web: Globe,
  instagram: Instagram,
  comptoir: Store,
}

const sourceLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  phone: "Telephone",
  web: "Site Web",
  instagram: "Instagram",
  comptoir: "Comptoir",
}

const sourceColors: Record<string, string> = {
  whatsapp: "text-green-600",
  messenger: "text-blue-600",
  phone: "text-orange-600",
  web: "text-primary",
  instagram: "text-pink-600",
  comptoir: "text-muted-foreground",
}

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: OrderNotification
  onDismiss: (id: string) => void
}) {
  const Icon = sourceIcons[notification.source] || Store
  const sourceColor = sourceColors[notification.source] || "text-muted-foreground"

  const timeAgo = getTimeAgo(notification.timestamp)

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        notification.read
          ? "bg-background opacity-60"
          : "bg-primary/5 border-primary/20"
      }`}
    >
      <div className={`mt-0.5 ${sourceColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium leading-tight">
              {notification.customerName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              via {sourceLabels[notification.source]} - {notification.total.toLocaleString("fr-TN")} TND
            </p>
          </div>
          {!notification.read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                onDismiss(notification.id)
              }}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Ignorer</span>
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </div>
  )
}

function getTimeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffSeconds = Math.floor((now - then) / 1000)

  if (diffSeconds < 60) return "A l'instant"
  if (diffSeconds < 3600) return `Il y a ${Math.floor(diffSeconds / 60)} min`
  if (diffSeconds < 86400) return `Il y a ${Math.floor(diffSeconds / 3600)}h`
  return `Il y a ${Math.floor(diffSeconds / 86400)}j`
}

export function OrderNotifications() {
  const { notifications, unreadCount, dismissNotification, markAllNotificationsRead } = useOrders()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications ({unreadCount} non lues)</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2">
          <DropdownMenuLabel>Nouvelles commandes</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllNotificationsRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Tout lire
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucune notification
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Les nouvelles commandes apparaitront ici
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="space-y-2 p-2">
              {notifications.slice(0, 10).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onDismiss={dismissNotification}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 text-center">
              <Badge variant="secondary" className="text-[10px]">
                {notifications.length} notification{notifications.length > 1 ? "s" : ""} au total
              </Badge>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
