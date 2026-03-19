"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
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

export function RoutesMapHeader() {
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        setUser(userData);
      }
    };

    getUser();
  }, []);

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("/api/messages/unread-count");
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
  }, [user]);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;
    const fetchNotifCount = async () => {
      try {
        const response = await fetch("/api/notifications/unread-count");
        if (response.ok) {
          const data = await response.json();
          setNotifCount(data.count || 0);
        }
      } catch { /* Non-critical */ }
    };
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  };


  return (
    <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
      {/* Hamburger Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="h-10 w-10 bg-white shadow-lg border relative">
            <Menu className="h-5 w-5" />
            {(unreadCount > 0 || notifCount > 0) && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {/* Logo at top */}
          <div className="px-3 py-2 border-b">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="padoq"
                width={100}
                height={32}
                className="object-contain"
              />
            </Link>
          </div>

          {user ? (
            <>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Hi, {user.name}!
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Routes Section */}
              <DropdownMenuItem asChild>
                <Link href="/routes" className="cursor-pointer">
                  <Route className="mr-2 h-4 w-4" />
                  Routes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/notifications" className="cursor-pointer">
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                  {notifCount > 0 && (
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{notifCount}</span>
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/messages" className="cursor-pointer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Messages
                  {unreadCount > 0 && (
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{unreadCount}</span>
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/favorites" className="cursor-pointer">
                  <Heart className="mr-2 h-4 w-4" />
                  My Favorites
                </Link>
              </DropdownMenuItem>
              {(user.role === "host" || user.role === "admin") && (
                <DropdownMenuItem asChild>
                  <Link href="/host/listings" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    My Listings
                  </Link>
                </DropdownMenuItem>
              )}
              {user.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/dashboard" className="cursor-pointer text-primary font-semibold">
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/help" className="cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/feedback" className="cursor-pointer">
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Send Feedback
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/claims" className="cursor-pointer">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Claims
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <div className="p-3 space-y-2">
                <Link href="/auth/sign-in">
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>


      {/* Profile Picture */}
      {user && (
        <Link href="/profile">
          <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity bg-white shadow-lg border">
            <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
      )}
    </div>
  );
}

