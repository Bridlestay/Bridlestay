"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  Search,
  ChevronLeft,
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
  MapPin,
  Map,
} from "lucide-react";

interface RoutesPanelHeaderProps {
  onClose: () => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

export function RoutesPanelHeader({
  onClose,
  onSearch,
  searchPlaceholder = "Search for places and routes",
  showSearch = true,
}: RoutesPanelHeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <div className="flex items-center gap-2 p-3 border-b bg-white">
      {/* Hamburger Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <Menu className="h-5 w-5" />
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
                <Link href="/messages" className="cursor-pointer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Messages
                  {unreadCount > 0 && (
                    <Badge className="ml-auto bg-primary text-white text-xs">
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

      {/* Search Bar */}
      {showSearch && (
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch?.(e.target.value);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </form>
      )}

      {/* Profile Picture */}
      {user && (
        <Link href="/profile">
          <Avatar className="h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity shrink-0">
            <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
      )}

      {/* Minimize/Close Arrow */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={onClose}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
    </div>
  );
}

