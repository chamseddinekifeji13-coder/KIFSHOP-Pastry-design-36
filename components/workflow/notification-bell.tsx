'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, AlertCircle, CheckCircle, Package, Trash2 } from 'lucide-react'
import { markNotificationAsRead, archiveNotification } from '@/lib/workflow/notifications'

interface Notification {
  id: string
  type: 'stock_alert' | 'bon_created' | 'bon_validated' | 'bon_sent' | 'po_ready' | 'delivery_expected'
  title: string
  message: string
  status: 'unread' | 'read' | 'archived'
  actionUrl?: string
  createdAt: string
}

interface NotificationBellProps {
  userId: string
  tenantId: string
}

export function NotificationBell({ userId, tenantId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)

  const { data: notificationsData, mutate } = useSWR(
    open ? `/api/notifications?userId=${userId}&tenantId=${tenantId}` : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json()
    },
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )

  const notifications: Notification[] = notificationsData?.notifications || []
  const unreadCount = notifications.filter(n => n.status === 'unread').length

  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await markNotificationAsRead(notificationId)
    mutate()
  }

  const handleArchive = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await archiveNotification(notificationId)
    mutate()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'stock_alert':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'bon_created':
        return <Package className="h-4 w-4 text-blue-500" />
      case 'bon_validated':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'bon_sent':
        return <Package className="h-4 w-4 text-purple-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="px-4 py-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600">
              {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Aucune notification
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                  notification.status === 'unread' ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.createdAt).toLocaleDateString('fr-TN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  {notification.actionUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        window.location.href = notification.actionUrl || '/'
                      }}
                    >
                      Voir
                    </Button>
                  )}
                  {notification.status === 'unread' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={(e) => handleMarkAsRead(notification.id, e)}
                    >
                      Marquer comme lu
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-red-600 hover:text-red-700"
                    onClick={(e) => handleArchive(notification.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
