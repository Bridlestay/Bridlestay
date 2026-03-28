"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  Settings,
  LayoutDashboard,
  Heart,
  MessageCircle,
  MessageSquarePlus,
  HelpCircle,
  AlertTriangle,
  Route,
  Bell,
} from "lucide-react";

interface UserDropdownMenuProps {
  user: any;
  unreadCount?: number;
  notifCount?: number;
  align?: "start" | "end";
  showRoutesLink?: boolean;
}

export function UserDropdownMenu({
  user,
  unreadCount = 0,
  notifCount = 0,
  align = "end",
  showRoutesLink = false,
}: UserDropdownMenuProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (!user) {
    return (
      <DropdownMenuContent align={align} className="w-60 rounded-xl p-2 shadow-xl border border-gray-200">
        <div className="space-y-1 p-1">
          <DropdownMenuItem asChild>
            <Link
              href="/auth/sign-in"
              className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium"
            >
              Sign In
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/auth/sign-up"
              className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium"
            >
              Sign Up
            </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    );
  }

  return (
    <DropdownMenuContent
      align={align}
      className="w-60 rounded-xl p-0 shadow-xl border border-gray-200 overflow-hidden"
    >
      {/* Section 1: Notifications & Messages */}
      <div className="py-1.5">
        <DropdownMenuItem asChild>
          <Link
            href="/notifications"
            className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            <Bell className="h-[18px] w-[18px] text-gray-600 shrink-0" strokeWidth={1.5} />
            <span>Notifications</span>
            {notifCount > 0 && (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {notifCount}
                </span>
                <span className="h-2 w-2 rounded-full bg-green-500" />
              </span>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/messages"
            className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            <MessageCircle className="h-[18px] w-[18px] text-gray-600 shrink-0" strokeWidth={1.5} />
            <span>Messages</span>
            {unreadCount > 0 && (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {unreadCount}
                </span>
                <span className="h-2 w-2 rounded-full bg-green-500" />
              </span>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/favorites"
            className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            <Heart className="h-[18px] w-[18px] text-gray-600 shrink-0" strokeWidth={1.5} />
            <span>My Favorites</span>
          </Link>
        </DropdownMenuItem>
      </div>

      <DropdownMenuSeparator className="my-0" />

      {/* Section 2: Routes, Listings, Admin */}
      <div className="py-1.5">
        {showRoutesLink && (
          <DropdownMenuItem asChild>
            <Link
              href="/routes"
              className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <Route className="h-[18px] w-[18px] text-gray-600 shrink-0" strokeWidth={1.5} />
              <span>Routes</span>
            </Link>
          </DropdownMenuItem>
        )}
        {(user.role === "host" || user.role === "admin") && (
          <DropdownMenuItem asChild>
            <Link
              href="/host/listings"
              className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <LayoutDashboard className="h-[18px] w-[18px] text-gray-600 shrink-0" strokeWidth={1.5} />
              <span>My Listings</span>
            </Link>
          </DropdownMenuItem>
        )}
        {user.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link
              href="/admin/dashboard"
              className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-primary"
            >
              <Settings className="h-[18px] w-[18px] text-primary shrink-0" strokeWidth={1.5} />
              <span>Admin Dashboard</span>
            </Link>
          </DropdownMenuItem>
        )}
      </div>

      <DropdownMenuSeparator className="my-0" />

      {/* Section 3: Account */}
      <div className="py-1.5">
        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            <User className="h-[18px] w-[18px] text-gray-600 shrink-0" strokeWidth={1.5} />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/account"
            className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            <Settings className="h-[18px] w-[18px] text-gray-600 shrink-0" strokeWidth={1.5} />
            <span>Account Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/help"
            className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            <HelpCircle className="h-[18px] w-[18px] text-gray-600 shrink-0" strokeWidth={1.5} />
            <span>Help</span>
          </Link>
        </DropdownMenuItem>
      </div>

      <DropdownMenuSeparator className="my-0" />

      {/* Section 4: Feedback, Claims */}
      <div className="py-1.5">
        <DropdownMenuItem asChild>
          <Link
            href="/feedback"
            className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            <MessageSquarePlus className="h-[18px] w-[18px] text-gray-600 shrink-0" strokeWidth={1.5} />
            <span>Send Feedback</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/claims"
            className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            <AlertTriangle className="h-[18px] w-[18px] text-gray-600 shrink-0" strokeWidth={1.5} />
            <span>Claims</span>
          </Link>
        </DropdownMenuItem>
      </div>

      <DropdownMenuSeparator className="my-0" />

      {/* Log out */}
      <div className="py-1.5">
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm"
        >
          <LogOut className="h-[18px] w-[18px] text-gray-600 shrink-0" strokeWidth={1.5} />
          <span>Log Out</span>
        </DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  );
}
