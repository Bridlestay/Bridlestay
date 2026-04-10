"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserDropdownMenu } from "@/components/user-dropdown-menu";

export function Header() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
        
        setUser(userData);
      }
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUser();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
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

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
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
      } catch {
        // Non-critical
      }
    };

    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const showBecomeHost =
    !loading && (!user || (user.role !== "host" && user.role !== "admin"));

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-[1800px] mx-auto px-2 md:px-4 flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center -ml-5">
          <Image
            src="/logo-test.png"
            alt="padoq"
            width={200}
            height={70}
            className="object-contain"
            priority
          />
        </Link>

        <div className="flex items-center space-x-8">
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/search"
              className="text-base font-medium transition-colors hover:text-primary"
            >
              Search
            </Link>
            <Link
              href="/routes"
              className="text-base font-medium transition-colors hover:text-primary"
            >
              Routes
            </Link>
            {showBecomeHost && (
              <Link
                href="/host"
                className="text-base font-medium transition-colors hover:text-primary"
              >
                Become a Host
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-3">
          {loading ? (
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <>
              {/* Dashboard Button */}
              {user.role !== "admin" && (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                </Link>
              )}

              {/* Profile Picture - clickable to profile, with animated green outline on hover */}
              <Link
                href="/profile"
                className="relative group inline-block h-10 w-10"
              >
                <Avatar className="h-10 w-10 cursor-pointer">
                  <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <svg
                  className="absolute -inset-[2px] h-11 w-11 pointer-events-none"
                  viewBox="0 0 44 44"
                  fill="none"
                >
                  <path
                    d="M 22 42 A 20 20 0 0 1 22 2"
                    className="stroke-primary [stroke-width:2] [stroke-dasharray:63] [stroke-dashoffset:63] group-hover:[stroke-dashoffset:0] transition-[stroke-dashoffset] duration-500 ease-out"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 22 42 A 20 20 0 0 0 22 2"
                    className="stroke-primary [stroke-width:2] [stroke-dasharray:63] [stroke-dashoffset:63] group-hover:[stroke-dashoffset:0] transition-[stroke-dashoffset] duration-500 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
              </Link>

              {/* Hamburger Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative hover:bg-transparent hover:text-primary"
                  >
                    <Menu className="h-5 w-5" />
                    {(unreadCount > 0 || notifCount > 0) && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <UserDropdownMenu
                  user={user}
                  unreadCount={unreadCount}
                  notifCount={notifCount}
                  align="end"
                />
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/auth/sign-in">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button>Sign Up</Button>
              </Link>
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}

