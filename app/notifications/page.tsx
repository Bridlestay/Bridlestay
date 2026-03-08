"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  MessageCircle,
  MapPin,
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
};

const NOTIFICATION_COLORS: Record<string, string> = {
  message: "text-blue-600 bg-blue-50",
  message_reply: "text-blue-600 bg-blue-50",
  route_comment: "text-blue-600 bg-blue-50",
  route_liked: "text-red-500 bg-red-50",
  route_completed: "text-green-600 bg-green-50",
  route_review: "text-amber-500 bg-amber-50",
  suggestion_received: "text-violet-600 bg-violet-50",
  suggestion_photo: "text-violet-600 bg-violet-50",
  suggestion_approved: "text-green-600 bg-green-50",
  suggestion_rejected: "text-red-500 bg-red-50",
  hazard_reported: "text-orange-600 bg-orange-50",
  booking_request: "text-green-600 bg-green-50",
  booking_accepted: "text-green-600 bg-green-50",
  booking_declined: "text-red-500 bg-red-50",
  booking_cancelled: "text-slate-600 bg-slate-50",
  payment_received: "text-green-600 bg-green-50",
  refund_processed: "text-blue-600 bg-blue-50",
  listing_review: "text-amber-500 bg-amber-50",
  listing_approved: "text-green-600 bg-green-50",
  report_filed: "text-red-500 bg-red-50",
  host_application: "text-blue-600 bg-blue-50",
  damage_claim: "text-orange-600 bg-orange-50",
};

export default function NotificationsPage() {
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
    // Mark as read
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
    // Navigate
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
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
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            filter === "unread"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          Unread
        </button>
      </div>

      <Separator className="mb-2" />

      {/* Notification feed */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Bell className="h-7 w-7 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">
            {filter === "unread"
              ? "All caught up!"
              : "No notifications yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
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
              NOTIFICATION_COLORS[n.type] || "text-slate-600 bg-slate-50";

            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "w-full flex items-start gap-3 p-3.5 text-left transition-colors hover:bg-slate-50 rounded-lg",
                  !n.read && "bg-green-50/40"
                )}
              >
                {/* Actor avatar or type icon */}
                {n.actor ? (
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage
                      src={n.actor.avatar_url || undefined}
                    />
                    <AvatarFallback className="text-xs bg-slate-200">
                      {n.actor.name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                      colorClass
                    )}
                  >
                    <IconComponent className="h-4.5 w-4.5" />
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
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {n.body}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {/* Type icon badge (when showing actor avatar) */}
                    {n.actor && (
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full flex items-center justify-center",
                          colorClass
                        )}
                      >
                        <IconComponent className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Unread indicator */}
                {!n.read && (
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
