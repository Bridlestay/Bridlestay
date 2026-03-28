"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  Search,
  ChevronLeft,
  MapPin,
  Map,
} from "lucide-react";
import { UserDropdownMenu } from "@/components/user-dropdown-menu";

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
        <UserDropdownMenu
          user={user}
          unreadCount={unreadCount}
          notifCount={notifCount}
          align="start"
          showRoutesLink
        />
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

