"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { ModerationDashboard } from "@/components/admin/moderation-dashboard";
import { FeedbackDashboard } from "@/components/admin/feedback-dashboard";
import { NewsManager } from "@/components/admin/news-manager";
import { InspectDashboard } from "@/components/admin/inspect-dashboard";
import { BadgesDashboard } from "@/components/admin/badges-dashboard";
import { ReferralsDashboard } from "@/components/admin/referrals-dashboard";
import { AdminDamageClaims } from "@/components/admin/admin-damage-claims";
import { 
  BarChart3, 
  Shield, 
  Users as UsersIcon, 
  Home,
  Ban,
  Clock,
  AlertTriangle,
  Trash2,
  Eye,
  MoreVertical,
  MessageSquare,
  LayoutDashboard,
  MessageSquarePlus,
  Newspaper,
  Inspect,
  Trophy,
  Gift,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, Filter, X } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminDashboard({ user }: { user: any }) {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Admin action states
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'ban' | 'softban' | 'warn' | 'remove' | null;
    targetId: string | null;
    targetName: string;
    targetType: 'user' | 'property';
  }>({
    open: false,
    type: null,
    targetId: null,
    targetName: '',
    targetType: 'user',
  });
  const [actionReason, setActionReason] = useState('');
  const [actionDuration, setActionDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userBannedFilter, setUserBannedFilter] = useState<string>('all');
  const [userDateFilter, setUserDateFilter] = useState<string>('all');
  
  const [propertySearch, setPropertySearch] = useState('');
  const [propertyVerifiedFilter, setPropertyVerifiedFilter] = useState<string>('all');
  const [propertyPublishedFilter, setPropertyPublishedFilter] = useState<string>('all');
  const [propertyCountyFilter, setPropertyCountyFilter] = useState<string>('all');
  const [propertyRemovedFilter, setPropertyRemovedFilter] = useState<string>('active');

  // Inspect states
  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [inspectUserId, setInspectUserId] = useState<string | undefined>(undefined);
  const [inspectPropertyId, setInspectPropertyId] = useState<string | undefined>(undefined);
  const [inspectInitialTab, setInspectInitialTab] = useState<'users' | 'properties'>('users');
  
  // Message dialog states
  const [messageDialog, setMessageDialog] = useState<{
    open: boolean;
    userId: string | null;
    userName: string;
  }>({
    open: false,
    userId: null,
    userName: '',
  });
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const [
        { data: usersData },
        { data: propertiesData },
        { data: bookingsData },
      ] = await Promise.all([
        supabase.from("users").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("properties").select("*, users:host_id(name)").order("created_at", { ascending: false }).limit(10),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      setUsers(usersData || []);
      setProperties(propertiesData || []);
      setBookings(bookingsData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleVerifyProperty = async (propertyId: string) => {
    try {
      const response = await fetch("/api/admin/verify-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      toast({
        title: "Success",
        description: "Property verified successfully",
      });

      // Refresh properties
      const supabase = createClient();
      const { data: refreshedProperties } = await supabase
        .from("properties")
        .select("*, users:host_id(name)")
        .order("created_at", { ascending: false })
        .limit(10);

      setProperties(refreshedProperties || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const openActionDialog = (
    type: 'ban' | 'softban' | 'warn' | 'remove',
    targetId: string,
    targetName: string,
    targetType: 'user' | 'property'
  ) => {
    setActionDialog({
      open: true,
      type,
      targetId,
      targetName,
      targetType,
    });
    setActionReason('');
    setActionDuration('');
  };

  const closeActionDialog = () => {
    setActionDialog({
      open: false,
      type: null,
      targetId: null,
      targetName: '',
      targetType: 'user',
    });
    setActionReason('');
    setActionDuration('');
  };

  const handleAdminAction = async () => {
    if (!actionDialog.targetId || !actionDialog.type || !actionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a reason for this action",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let endpoint = '';
      const body: any = { reason: actionReason, userId: user.id };

      if (actionDialog.targetType === 'user') {
        switch (actionDialog.type) {
          case 'ban':
            endpoint = '/api/admin/actions/ban-user';
            body.userId = actionDialog.targetId;
            break;
          case 'softban':
            endpoint = '/api/admin/actions/softban-user';
            body.userId = actionDialog.targetId;
            body.duration = actionDuration || 'indefinite';
            break;
          case 'warn':
            // TODO: Implement warning endpoint
            toast({
              title: "Feature coming soon",
              description: "Warning feature will be implemented",
            });
            closeActionDialog();
            setIsSubmitting(false);
            return;
        }
      } else {
        // Property actions
        if (actionDialog.type === 'remove') {
          endpoint = '/api/admin/actions/remove-property';
          body.propertyId = actionDialog.targetId;
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to perform action');
      }

      toast({
        title: "Action completed",
        description: `${actionDialog.type} action has been applied successfully`,
      });

      closeActionDialog();
      
      // Refresh data
      const supabase = createClient();
      if (actionDialog.targetType === 'user') {
        const { data: usersData } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);
        setUsers(usersData || []);
      } else {
        const { data: propertiesData } = await supabase
          .from("properties")
          .select("*, users:host_id(name)")
          .order("created_at", { ascending: false })
          .limit(10);
        setProperties(propertiesData || []);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMessageDialog = (userId: string, userName: string) => {
    setMessageDialog({
      open: true,
      userId,
      userName,
    });
    setMessageSubject('');
    setMessageContent('');
  };

  const closeMessageDialog = () => {
    setMessageDialog({
      open: false,
      userId: null,
      userName: '',
    });
    setMessageSubject('');
    setMessageContent('');
  };

  const handleSendMessage = async () => {
    if (!messageDialog.userId || !messageContent.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a message",
      });
      return;
    }

    setIsSendingMessage(true);

    try {
      const response = await fetch('/api/admin/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: messageDialog.userId,
          subject: messageSubject.trim() || 'Message from Admin',
          message: messageContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      toast({
        title: "Message sent",
        description: `Your message has been sent to ${messageDialog.userName}`,
      });

      closeMessageDialog();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(u => {
    // Search filter
    if (userSearch) {
      const search = userSearch.toLowerCase();
      const matchesSearch = 
        u.name?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Role filter
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;

    // Banned filter
    if (userBannedFilter === 'banned' && !u.banned) return false;
    if (userBannedFilter === 'active' && u.banned) return false;

    // Date joined filter
    if (userDateFilter !== 'all') {
      const createdAt = new Date(u.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (userDateFilter === '7days' && daysDiff > 7) return false;
      if (userDateFilter === '30days' && daysDiff > 30) return false;
      if (userDateFilter === '90days' && daysDiff > 90) return false;
      if (userDateFilter === '1year' && daysDiff > 365) return false;
    }

    return true;
  });

  // Filter properties based on search and filters
  const filteredProperties = properties.filter(p => {
    // Search filter
    if (propertySearch) {
      const search = propertySearch.toLowerCase();
      const matchesSearch = 
        p.name?.toLowerCase().includes(search) ||
        p.city?.toLowerCase().includes(search) ||
        p.county?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Verified filter
    if (propertyVerifiedFilter === 'verified' && !p.admin_verified) return false;
    if (propertyVerifiedFilter === 'unverified' && p.admin_verified) return false;

    // Published filter
    if (propertyPublishedFilter === 'published' && !p.published) return false;
    if (propertyPublishedFilter === 'unpublished' && p.published) return false;

    // County filter
    if (propertyCountyFilter !== 'all' && p.county !== propertyCountyFilter) return false;

    // Removed filter (default to showing only active/non-removed properties)
    if (propertyRemovedFilter === 'active' && p.removed) return false;
    if (propertyRemovedFilter === 'removed' && !p.removed) return false;

    return true;
  });

  // Get unique counties for filter
  const uniqueCounties = Array.from(new Set(properties.map(p => p.county).filter(Boolean)));

  const handleInspectUser = (userId: string) => {
    setInspectUserId(userId);
    setInspectPropertyId(undefined);
    setInspectInitialTab('users');
    setActiveTab('inspect');
  };

  const handleInspectProperty = (propertyId: string) => {
    setInspectPropertyId(propertyId);
    setInspectUserId(undefined);
    setInspectInitialTab('properties');
    setActiveTab('inspect');
  };

  return (
    <>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="flex-wrap">
        <TabsTrigger value="analytics" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="moderation" className="gap-2">
          <Shield className="h-4 w-4" />
          Moderation
        </TabsTrigger>
        <TabsTrigger value="users" className="gap-2">
          <UsersIcon className="h-4 w-4" />
          Users
        </TabsTrigger>
        <TabsTrigger value="properties" className="gap-2">
          <Home className="h-4 w-4" />
          Properties
        </TabsTrigger>
        <TabsTrigger value="inspect" className="gap-2">
          <Inspect className="h-4 w-4" />
          Inspect
        </TabsTrigger>
        <TabsTrigger value="badges" className="gap-2">
          <Trophy className="h-4 w-4" />
          Badges
        </TabsTrigger>
        <TabsTrigger value="referrals" className="gap-2">
          <Gift className="h-4 w-4" />
          Referrals
        </TabsTrigger>
        <TabsTrigger value="claims" className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          Claims
        </TabsTrigger>
        <TabsTrigger value="feedback" className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Feedback
        </TabsTrigger>
        <TabsTrigger value="news" className="gap-2">
          <Newspaper className="h-4 w-4" />
          News
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="space-y-6">
        <AnalyticsDashboard />
      </TabsContent>

      <TabsContent value="moderation" className="space-y-6">
        <ModerationDashboard />
      </TabsContent>

      <TabsContent value="users" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10"
                />
                {userSearch && (
                  <button
                    onClick={() => setUserSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>

                <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="host">Host</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={userBannedFilter} onValueChange={setUserBannedFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={userDateFilter} onValueChange={setUserDateFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Date Joined" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 3 Months</SelectItem>
                    <SelectItem value="1year">Last Year</SelectItem>
                  </SelectContent>
                </Select>

                {(userSearch || userRoleFilter !== 'all' || userBannedFilter !== 'all' || userDateFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUserSearch('');
                      setUserRoleFilter('all');
                      setUserBannedFilter('all');
                      setUserDateFilter('all');
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>

            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found matching your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Link href={`/profile/${u.id}`} target="_blank" rel="noopener noreferrer">
                          <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity hover:ring-2 hover:ring-primary">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10">
                              {u.name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                      </TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell className="capitalize">{u.role}</TableCell>
                      <TableCell>
                        {u.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : u.soft_banned ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">Restricted</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          
                          {/* Admin Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/profile/${u.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openMessageDialog(u.id, u.name)}
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Message User
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/admin/view-dashboard/${u.id}`)}
                              >
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                View Dashboard
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleInspectUser(u.id)}
                              >
                                <Inspect className="mr-2 h-4 w-4" />
                                Inspect User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-yellow-600"
                                onClick={() => openActionDialog('warn', u.id, u.name, 'user')}
                              >
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Warn User
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-orange-600"
                                onClick={() => openActionDialog('softban', u.id, u.name, 'user')}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Softban User
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => openActionDialog('ban', u.id, u.name, 'user')}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Ban User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="properties" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, city, or county..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  className="pl-10"
                />
                {propertySearch && (
                  <button
                    onClick={() => setPropertySearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>

                <Select value={propertyVerifiedFilter} onValueChange={setPropertyVerifiedFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Verified" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={propertyPublishedFilter} onValueChange={setPropertyPublishedFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Published" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="unpublished">Unpublished</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={propertyCountyFilter} onValueChange={setPropertyCountyFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="County" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Counties</SelectItem>
                    {uniqueCounties.map((county) => (
                      <SelectItem key={county} value={county}>
                        {county}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={propertyRemovedFilter} onValueChange={setPropertyRemovedFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (incl. removed)</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="removed">Removed Only</SelectItem>
                  </SelectContent>
                </Select>

                {(propertySearch || propertyVerifiedFilter !== 'all' || propertyPublishedFilter !== 'all' || propertyCountyFilter !== 'all' || propertyRemovedFilter !== 'active') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPropertySearch('');
                      setPropertyVerifiedFilter('all');
                      setPropertyPublishedFilter('all');
                      setPropertyCountyFilter('all');
                      setPropertyRemovedFilter('active');
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {filteredProperties.length} of {properties.length} properties
              </div>
            </div>

            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>County</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No properties found matching your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProperties.map((property) => (
                    <TableRow key={property.id} className={property.removed ? "opacity-60 bg-red-50" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {property.name}
                          {property.removed && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                              REMOVED
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{property.users?.name}</TableCell>
                      <TableCell>{property.county}</TableCell>
                      <TableCell>
                        {property.admin_verified ? "✅" : "❌"}
                      </TableCell>
                      <TableCell>
                        {property.removed ? (
                          <span className="text-red-600 text-sm">Removed</span>
                        ) : property.published ? (
                          <span className="text-green-600 text-sm">Published</span>
                        ) : (
                          <span className="text-yellow-600 text-sm">Draft</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!property.admin_verified && !property.removed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyProperty(property.id)}
                            >
                              Verify
                            </Button>
                          )}
                          
                          {/* Admin Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/property/${property.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Property
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleInspectProperty(property.id)}
                              >
                                <Inspect className="mr-2 h-4 w-4" />
                                Inspect Property
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {property.removed ? (
                                <DropdownMenuItem
                                  className="text-muted-foreground"
                                  disabled
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Already Removed
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => openActionDialog('remove', property.id, property.name, 'property')}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Property
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="feedback" className="space-y-6">
        <FeedbackDashboard />
      </TabsContent>

      <TabsContent value="news" className="space-y-6">
        <NewsManager />
      </TabsContent>

      <TabsContent value="inspect" className="space-y-6">
        <InspectDashboard 
          initialUserId={inspectUserId}
          initialPropertyId={inspectPropertyId}
          initialTab={inspectInitialTab}
          key={`${inspectUserId}-${inspectPropertyId}`}
        />
      </TabsContent>

      <TabsContent value="badges" className="space-y-6">
        <BadgesDashboard />
      </TabsContent>

      <TabsContent value="referrals" className="space-y-6">
        <ReferralsDashboard />
      </TabsContent>

      <TabsContent value="claims" className="space-y-6">
        <AdminDamageClaims />
      </TabsContent>
    </Tabs>

    {/* Admin Action Confirmation Dialog */}
    <Dialog open={actionDialog.open} onOpenChange={(open) => !open && closeActionDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionDialog.type === 'ban' && '🚫 Ban User'}
            {actionDialog.type === 'softban' && '⏸️ Softban User'}
            {actionDialog.type === 'warn' && '⚠️ Warn User'}
            {actionDialog.type === 'remove' && '🗑️ Remove Property'}
          </DialogTitle>
          <DialogDescription>
            You are about to {actionDialog.type} <strong>{actionDialog.targetName}</strong>.
            This action will notify the user and may restrict their access to the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {actionDialog.type === 'softban' && (
            <div>
              <Label htmlFor="duration">Duration (optional)</Label>
              <input
                id="duration"
                type="text"
                className="w-full mt-1 p-2 border rounded"
                placeholder="e.g., 7 days, 1 month, etc."
                value={actionDuration}
                onChange={(e) => setActionDuration(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank for indefinite restriction
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Explain why you are taking this action..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={4}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This reason will be sent to the {actionDialog.targetType === 'user' ? 'user' : 'host'} via system message
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={closeActionDialog}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleAdminAction}
            disabled={isSubmitting || !actionReason.trim()}
          >
            {isSubmitting ? "Processing..." : `Confirm ${actionDialog.type}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Admin Message Dialog */}
    <Dialog open={messageDialog.open} onOpenChange={(open) => !open && closeMessageDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>💬 Send Message to {messageDialog.userName}</DialogTitle>
          <DialogDescription>
            Send a direct message to this user. This message will appear at the top of their inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="message-subject">Subject</Label>
            <Input
              id="message-subject"
              placeholder="Message from Cantra Admin"
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="message-content">
              Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message-content"
              placeholder="Write your message here..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={6}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={closeMessageDialog}
            disabled={isSendingMessage}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={isSendingMessage || !messageContent.trim()}
          >
            {isSendingMessage ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

