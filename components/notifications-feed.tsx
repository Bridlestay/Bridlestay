"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Bell,
  MessageCircle,
  Heart,
  Star,
  AlertTriangle,
  ImagePlus,
  Pencil,
  Check,
  X,
  CreditCard,
  Home,
  Flag,
  UserPlus,
  CheckCircle2,
  Loader2,
  Info,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
  comment_deleted?: boolean;
  actor: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

const NOTIFICATION_ICONS: Record<string, any> = {
  message: MessageCircle,
  message_reply: MessageCircle,
  route_comment: MessageCircle,
  route_liked: Heart,
  route_completed: CheckCircle2,
  route_review: Star,
  suggestion_received: Pencil,
  suggestion_photo: ImagePlus,
  suggestion_approved: Check,
  suggestion_rejected: X,
  hazard_reported: AlertTriangle,
  booking_request: Home,
  booking_accepted: Check,
  booking_declined: X,
  booking_cancelled: X,
  payment_received: CreditCard,
  refund_processed: CreditCard,
  listing_review: Star,
  listing_approved: Check,
  report_filed: Flag,
  host_application: UserPlus,
  damage_claim: AlertTriangle,
  route_variant: Shuffle,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  message: "text-blue-600 bg-blue-50",
  message_reply: "text-blue-600 bg-blue-50",
  route_comment: "text-blue-600 bg-blue-50",
  route_liked: "text-red-500 bg-red-50",
  route_completed: "text-primary bg-green-50",
  route_review: "text-amber-500 bg-amber-50",
  suggestion_received: "text-violet-600 bg-violet-50",
  suggestion_photo: "text-violet-600 bg-violet-50",
  suggestion_approved: "text-primary bg-green-50",
  suggestion_rejected: "text-red-500 bg-red-50",
  hazard_reported: "text-orange-600 bg-orange-50",
  booking_request: "text-primary bg-green-50",
  booking_accepted: "text-primary bg-green-50",
  booking_declined: "text-red-500 bg-red-50",
  booking_cancelled: "text-slate-600 bg-slate-50",
  payment_received: "text-primary bg-green-50",
  refund_processed: "text-blue-600 bg-blue-50",
  listing_review: "text-amber-500 bg-amber-50",
  listing_approved: "text-primary bg-green-50",
  route_variant: "text-primary bg-green-50",
  report_filed: "text-red-500 bg-red-50",
  host_application: "text-blue-600 bg-blue-50",
  damage_claim: "text-orange-600 bg-orange-50",
};

export function NotificationsFeed() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const params = filter === "unread" ? "?unread=true" : "";
      const res = await fetch(`/api/notifications${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchNotifications();

    // Poll for new notifications every 15 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      // Non-critical
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.read) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notification.id }),
      }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
    }
    if (notification.link) {
      // Rewrite old /routes/{uuid} links to /routes?route={uuid}
      const oldRouteLink = notification.link.match(
        /^\/routes\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
      );
      if (oldRouteLink) {
        router.push(`/routes?route=${oldRouteLink[1]}`);
      } else {
        router.push(notification.link);
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-serif text-4xl font-bold mb-2">Notifications</h1>
        <p className="text-muted-foreground">
          Stay up to date with your routes, bookings, and messages
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              filter === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              filter === "unread"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Unread
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-primary border-green-200 hover:bg-green-50 hover:text-green-700"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Check className="h-3.5 w-3.5 mr-1.5" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification feed */}
      <div className="bg-white rounded-xl border shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">
              {filter === "unread"
                ? "All caught up!"
                : "No notifications yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {filter === "unread"
                ? "You have no unread notifications."
                : "When something happens on your routes, bookings, or messages, you'll see it here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const IconComponent =
                NOTIFICATION_ICONS[n.type] || Bell;
              const colorClass =
                NOTIFICATION_COLORS[n.type] ||
                "text-slate-600 bg-slate-50";

              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full flex items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/80",
                    !n.read && "bg-green-50/30"
                  )}
                >
                  {/* Avatar or icon */}
                  {n.actor ? (
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarImage
                          src={n.actor.avatar_url || undefined}
                        />
                        <AvatarFallback className="text-sm bg-slate-200 font-medium">
                          {n.actor.name?.charAt(0).toUpperCase() ||
                            "?"}
                        </AvatarFallback>
                      </Avatar>
                      {/* Type badge on avatar */}
                      <div
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center border-2 border-white",
                          colorClass
                        )}
                      >
                        <IconComponent className="h-2.5 w-2.5" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0",
                        colorClass
                      )}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        !n.read
                          ? "text-slate-900 font-medium"
                          : "text-slate-600"
                      )}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className={cn(
                          "text-xs line-clamp-2",
                          n.comment_deleted
                            ? "text-muted-foreground/50 line-through"
                            : "text-muted-foreground"
                        )}>
                          {n.body}
                        </p>
                        {n.comment_deleted && (
                          <span className="text-[11px] text-red-400 font-medium whitespace-nowrap">
                            Removed
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Auto-cleanup info */}
      {notifications.length > 0 && (
        <div className="flex items-center gap-2 mt-4 px-1 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Read notifications are automatically removed after 30 days.</span>
        </div>
      )}
    </>
  );
}
