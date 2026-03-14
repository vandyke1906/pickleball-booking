"use client"

import React, { useState, useEffect, useRef } from "react"
import { Bell, Info, CheckCircle, AlertTriangle, AlertCircle, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { useIsMobile } from "@/lib/hooks/use-mobile"
import Link from "next/link"
import { useNotificationContext } from "@/lib/context/notification.context"

export function Notifications() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const { notifications, loading, markAsRead, clearAll } = useNotificationContext()
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(notifications.length)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Auto-scroll when a new notification arrives
  useEffect(() => {
    if (notifications.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" })
    }
    prevCountRef.current = notifications.length
  }, [notifications.length])

  const getIcon = (type: string) => {
    const cls = "w-4 h-4 mt-0.5 shrink-0"
    switch (type) {
      case "success":
        return <CheckCircle className={`${cls} text-green-500`} />
      case "warning":
        return <AlertTriangle className={`${cls} text-yellow-500`} />
      case "error":
        return <AlertCircle className={`${cls} text-red-500`} />
      default:
        return <Info className={`${cls} text-blue-500`} />
    }
  }

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (mins < 1) return "Just now"
    if (hours < 1) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const NotificationList = () => (
    <ScrollArea ref={scrollRef} className="h-[60vh] sm:h-72 p-2">
      {loading ? (
        <div className="flex justify-center items-center h-[60vh] sm:h-72">
          <Spinner className="w-6 h-6" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
          <Bell className="w-6 h-6 mb-1" />
          <p className="text-xs">No notifications</p>
        </div>
      ) : (
        <div className="space-y-1">
          {[...notifications].map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex gap-2 p-1.5 hrounded-md transition-colors cursor-pointer border border-transparent hover:bg-primary/10 rounded-md",
                !n.isRead && "bg-muted/20",
              )}
              onClick={() => {
                if (n.link) router.push(n.link)
                markAsRead(n.id).then(() => {
                  if (isMobile) setMobileOpen(false)
                  else setTimeout(() => setDesktopOpen(false), 100)
                })
              }}
            >
              {getIcon(n.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <p
                    className={cn(
                      "text-sm leading-tight break-words",
                      !n.isRead && "font-semibold text-primary",
                    )}
                  >
                    {n.title}
                  </p>
                  {!n.isRead && (
                    <Check
                      className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0"
                      strokeWidth={3}
                    />
                  )}
                </div>
                <p
                  className={cn(
                    "text-xs text-muted-foreground line-clamp-2 break-words",
                    !n.isRead && "text-primary",
                  )}
                >
                  {n.message}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  )

  const Footer = () =>
    notifications.length > 0 && (
      <>
        <Separator />
        <div className="p-2 flex gap-2">
          <Button asChild variant="ghost" size="sm" className="flex-1 text-xs">
            <Link href="/notifications">View all</Link>
          </Button>
          <Button
            className="flex items-center text-red-500 hover:text-red-600 text-xs"
            variant="ghost"
            size="sm"
            onClick={clearAll}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Mark All As Read
          </Button>
        </div>
      </>
    )

  const badgeClass = cn(
    "absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[10px] bg-red-600 text-white",
    unreadCount > 0 && "animate-badge-pulse",
  )

  return (
    <>
      {/* 🔔 Mobile */}
      <Button
        variant="outline"
        size="sm"
        className="relative sm:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className={badgeClass}>{unreadCount > 9 ? "9+" : unreadCount}</Badge>
        )}
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm p-0">
          <SheetHeader className="p-3 border-b">
            <SheetTitle className="text-sm font-semibold">Notifications</SheetTitle>
          </SheetHeader>
          <NotificationList />
          <Footer />
        </SheetContent>
      </Sheet>

      {/* 💻 Desktop */}
      <Popover open={desktopOpen} onOpenChange={setDesktopOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative hidden sm:flex">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge className={badgeClass}>{unreadCount > 9 ? "9+" : unreadCount}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[90vw] max-w-sm p-0 sm:w-72" align="end" sideOffset={8}>
          <NotificationList />
          <Footer />
        </PopoverContent>
      </Popover>
    </>
  )
}
