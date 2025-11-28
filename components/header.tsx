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
import { User, LogOut, Settings, LayoutDashboard, Heart, MessageCircle, MessageSquarePlus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
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

    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="relative w-12 h-12 flex-shrink-0 flex items-center">
            <Image
              src="/logo.png.png"
              alt="BridleStay Logo"
              width={48}
              height={48}
              className="object-contain translate-y-0.5"
              priority
              unoptimized
            />
          </div>
          <span className="font-serif text-2xl font-bold text-primary">
            BridleStay
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/search"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Search
          </Link>
          <Link
            href="/routes"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Routes
          </Link>
          <Link
            href="/host"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Become a Host
          </Link>
          <Link
            href="/help"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Help
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">
                      {user.role} Account
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role !== "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/messages" className="cursor-pointer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Messages
                    {unreadCount > 0 && (
                      <Badge className="ml-auto bg-primary text-white">
                        {unreadCount}
                      </Badge>
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
                  <Link href="/feedback" className="cursor-pointer">
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    Send Feedback
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
              </DropdownMenuContent>
            </DropdownMenu>
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
    </header>
  );
}

