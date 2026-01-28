"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Eye, CheckCircle, Trash2, MessageSquare, Flag, Users, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getSeverityEmoji, getReasonLabel } from "@/lib/moderation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

interface FlaggedMessage {
  id: string;
  message_id: string;
  flag_reason: string;
  severity: string;
  matched_patterns: string[];
  reviewed: boolean;
  reviewed_at: string | null;
  action_taken: string | null;
  admin_notes: string | null;
  created_at: string;
  messages: {
    id: string;
    message: string;
    created_at: string;
    deleted: boolean;
    deleted_at: string | null;
    sender: {
      id: string;
      name: string;
      email: string;
    };
    recipient: {
      id: string;
      name: string;
      email: string;
    };
    properties: {
      id: string;
      name: string;
    } | null;
  };
}

export function ModerationDashboard() {
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<FlaggedMessage | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [actionTaken, setActionTaken] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [filterReviewed, setFilterReviewed] = useState<"all" | "pending" | "reviewed">("pending");
  const [filterSeverity, setFilterSeverity] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [deletingReview, setDeletingReview] = useState(false);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchFlaggedMessages();
    fetchPendingReportsCount();
  }, []);

  const fetchPendingReportsCount = async () => {
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { count } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingReportsCount(count || 0);
    } catch (error) {
      console.error("Error fetching reports count:", error);
    }
  };

  const fetchFlaggedMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/moderation/flagged");
      if (response.ok) {
        const data = await response.json();
        setFlaggedMessages(data.flaggedMessages || []);
      }
    } catch (error) {
      console.error("Error fetching flagged messages:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load flagged messages",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedFlag || !actionTaken) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an action",
      });
      return;
    }

    setReviewing(true);

    try {
      const response = await fetch("/api/admin/moderation/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flagId: selectedFlag.id,
          actionTaken,
          adminNotes,
        }),
      });

      if (!response.ok) throw new Error("Failed to review");

      toast({
        title: "Success",
        description: "Flagged message reviewed",
      });

      setSelectedFlag(null);
      setActionTaken("");
      setAdminNotes("");
      fetchFlaggedMessages();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setReviewing(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setDeletingReview(true);

    try {
      const response = await fetch("/api/admin/moderation/delete-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          reviewType: "message",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete review");
      }

      toast({
        title: "Success",
        description: "Review deleted successfully",
      });

      setSelectedFlag(null);
      fetchFlaggedMessages();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeletingReview(false);
    }
  };

  const filteredMessages = flaggedMessages.filter(msg => {
    // Don't show deleted reviews
    if ((msg as any).deleted) return false;
    
    // Status filter
    if (filterReviewed === "pending" && msg.reviewed) return false;
    if (filterReviewed === "reviewed" && !msg.reviewed) return false;
    
    // Severity filter
    if (filterSeverity !== "all" && msg.severity !== filterSeverity) return false;
    
    return true;
  });

  const pendingCount = flaggedMessages.filter(m => !m.reviewed).length;
  const reviewedCount = flaggedMessages.filter(m => m.reviewed).length;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Flagged Messages
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <Flag className="h-4 w-4" />
            User Reports
            {pendingReportsCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">{pendingReportsCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Flagged Messages Tab */}
        <TabsContent value="messages">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">Awaiting admin action</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reviewedCount}</div>
                <p className="text-xs text-muted-foreground">Completed reviews</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Flagged</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{flaggedMessages.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Select value={filterReviewed} onValueChange={(value: any) => setFilterReviewed(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="reviewed">Reviewed Only</SelectItem>
                  <SelectItem value="all">All Messages</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label>Severity:</Label>
              <Select value={filterSeverity} onValueChange={(value: any) => setFilterSeverity(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🔵 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <span className="text-sm text-muted-foreground">
              Showing {filteredMessages.length} of {flaggedMessages.length} messages
            </span>
          </div>

          {/* Flagged Messages Table */}
          <Card>
            <CardHeader>
              <CardTitle>Flagged Messages</CardTitle>
              <CardDescription>Messages flagged by auto-moderation system</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : filteredMessages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No {filterReviewed !== "all" && filterReviewed} messages
                  {filterSeverity !== "all" && ` with ${filterSeverity} severity`}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Message Preview</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.map((flag) => (
                      <TableRow key={flag.id}>
                        <TableCell>
                          <Badge
                            className={
                              flag.severity === "critical"
                                ? "bg-red-600"
                                : flag.severity === "high"
                                ? "bg-orange-600"
                                : flag.severity === "medium"
                                ? "bg-yellow-600"
                                : "bg-blue-600"
                            }
                          >
                            {getSeverityEmoji(flag.severity)} {flag.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {getReasonLabel(flag.flag_reason)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {flag.matched_patterns.join(", ")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {flag.messages.sender.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {flag.messages.sender.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {flag.messages.recipient.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {flag.messages.recipient.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {flag.messages.deleted ? (
                            <div>
                              <p className="text-sm truncate max-w-xs line-through text-muted-foreground">
                                {flag.messages.message}
                              </p>
                              <Badge variant="outline" className="mt-1 text-xs bg-red-50 text-red-700 border-red-200">
                                Deleted by user
                              </Badge>
                            </div>
                          ) : (
                            <p className="text-sm truncate max-w-xs">
                              {flag.messages.message}
                            </p>
                          )}
                          {flag.messages.properties && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Re: {flag.messages.properties.name}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(flag.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          {flag.reviewed ? (
                            <Badge variant="outline" className="bg-green-50">
                              Reviewed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {/* View full chat */}
                            {flag.messages.sender && flag.messages.recipient && (
                              <Link
                                href={`/messages?userId=${flag.messages.sender.id === (flag as any).messages?.sender_id ? flag.messages.recipient.id : flag.messages.sender.id}&adminView=true`}
                                target="_blank"
                              >
                                <Button variant="ghost" size="sm" title="View full conversation">
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedFlag(flag)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Review Flagged Message</DialogTitle>
                                  <DialogDescription>
                                    Decide what action to take for this flagged message
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {/* Message Details */}
                                  <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm font-semibold mb-2">Message:</p>
                                    {flag.messages.deleted ? (
                                      <div>
                                        <p className="text-sm line-through text-muted-foreground">
                                          {flag.messages.message}
                                        </p>
                                        <Badge variant="outline" className="mt-2 text-xs bg-red-50 text-red-700 border-red-200">
                                          Deleted by user {flag.messages.deleted_at && `• ${formatDistanceToNow(new Date(flag.messages.deleted_at), { addSuffix: true })}`}
                                        </Badge>
                                      </div>
                                    ) : (
                                      <p className="text-sm">{flag.messages.message}</p>
                                    )}
                                  </div>

                                  {/* Flag Details */}
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="font-semibold">From:</p>
                                      <p>{flag.messages.sender.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {flag.messages.sender.email}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-semibold">To:</p>
                                      <p>{flag.messages.recipient.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {flag.messages.recipient.email}
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="font-semibold text-sm mb-2">Matched Patterns:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {flag.matched_patterns.map((pattern) => (
                                        <Badge key={pattern} variant="outline">
                                          {pattern}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Action Selection */}
                                  {!flag.reviewed && (
                                    <>
                                      <div>
                                        <Label htmlFor="action">Action Taken *</Label>
                                        <Select
                                          value={actionTaken}
                                          onValueChange={setActionTaken}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select action" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">
                                              No Action - False Positive
                                            </SelectItem>
                                            <SelectItem value="warning_sent">
                                              Warning Sent to User
                                            </SelectItem>
                                            <SelectItem value="message_deleted">
                                              Message Deleted
                                            </SelectItem>
                                            <SelectItem value="user_suspended">
                                              User Suspended
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label htmlFor="notes">Admin Notes (Optional)</Label>
                                        <Textarea
                                          id="notes"
                                          value={adminNotes}
                                          onChange={(e) => setAdminNotes(e.target.value)}
                                          placeholder="Add any notes about this review..."
                                          rows={3}
                                        />
                                      </div>

                                      <Button
                                        onClick={handleReview}
                                        disabled={reviewing || !actionTaken}
                                        className="w-full"
                                      >
                                        {reviewing ? "Submitting..." : "Submit Review"}
                                      </Button>
                                    </>
                                  )}

                                  {/* Show Review Details if Already Reviewed */}
                                  {flag.reviewed && (
                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                      <p className="font-semibold text-sm mb-2">
                                        ✓ Already Reviewed
                                      </p>
                                      <p className="text-sm">
                                        <strong>Action:</strong> {flag.action_taken}
                                      </p>
                                      {flag.admin_notes && (
                                        <p className="text-sm mt-2">
                                          <strong>Notes:</strong> {flag.admin_notes}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-2">
                                        {flag.reviewed_at &&
                                          formatDistanceToNow(new Date(flag.reviewed_at), {
                                            addSuffix: true,
                                          })}
                                      </p>
                                    </div>
                                  )}

                                  {/* Delete Review Button */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full mt-4"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Review
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Moderation Review?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will hide the review from the moderation dashboard, but it will still be kept in the system logs for audit purposes. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteReview(flag.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          {deletingReview ? "Deleting..." : "Delete"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Reports Tab */}
        <TabsContent value="reports">
          <UserReportsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// User Reports Section - Matches Flagged Messages style
function UserReportsSection() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [contentData, setContentData] = useState<any | null>(null);
  const [conversationData, setConversationData] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [actionTaken, setActionTaken] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "resolved">("pending");
  const [filterReason, setFilterReason] = useState<string>("all");
  const [filterContentType, setFilterContentType] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Use API endpoint instead of direct Supabase client to bypass RLS issues
      const response = await fetch("/api/admin/reports");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch reports");
      }
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load user reports",
      });
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchContentAndConversation = async (report: any) => {
    if (!report.content_id || !report.content_type) return;
    
    setLoadingContent(true);
    setConversationData([]);
    
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      
      let data = null;
      let conversation: any[] = [];
      
      switch (report.content_type) {
        case 'message':
          // Get the specific message
          const { data: msgData } = await supabase
            .from("messages")
            .select(`
              *,
              sender:users!messages_sender_id_fkey (id, name, avatar_url, email),
              receiver:users!messages_receiver_id_fkey (id, name, avatar_url, email)
            `)
            .eq("id", report.content_id)
            .single();
          data = msgData;
          
          // Get full conversation between these two users
          if (msgData) {
            const { data: convData } = await supabase
              .from("messages")
              .select(`
                *,
                sender:users!messages_sender_id_fkey (id, name, avatar_url),
                receiver:users!messages_receiver_id_fkey (id, name, avatar_url)
              `)
              .or(`and(sender_id.eq.${msgData.sender_id},receiver_id.eq.${msgData.receiver_id}),and(sender_id.eq.${msgData.receiver_id},receiver_id.eq.${msgData.sender_id})`)
              .order("created_at", { ascending: true })
              .limit(50);
            conversation = convData || [];
          }
          break;
          
        case 'review':
          const { data: reviewData } = await supabase
            .from("reviews")
            .select(`
              *,
              guest:users!reviews_guest_id_fkey (id, name, avatar_url, email),
              property:properties (id, name)
            `)
            .eq("id", report.content_id)
            .single();
          data = reviewData;
          break;
          
        case 'property':
          const { data: propData } = await supabase
            .from("properties")
            .select(`
              *,
              host:users!properties_host_id_fkey (id, name, avatar_url, email)
            `)
            .eq("id", report.content_id)
            .single();
          data = propData;
          break;
          
        case 'route':
          const { data: routeData } = await supabase
            .from("routes")
            .select(`
              *,
              user:users!routes_user_id_fkey (id, name, avatar_url)
            `)
            .eq("id", report.content_id)
            .single();
          data = routeData;
          break;
          
        case 'comment':
          // Try to get comment from property_questions or other sources
          const { data: questionData } = await supabase
            .from("property_questions")
            .select(`
              *,
              user:users!property_questions_user_id_fkey (id, name, avatar_url),
              property:properties (id, name)
            `)
            .eq("id", report.content_id)
            .single();
          data = questionData;
          break;
          
        default:
          break;
      }
      
      setContentData(data);
      setConversationData(conversation);
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleReviewClick = async (report: any) => {
    setSelectedReport(report);
    setContentData(null);
    setConversationData([]);
    setActionTaken("");
    setAdminNotes("");
    await fetchContentAndConversation(report);
  };

  const handleReportAction = async () => {
    if (!selectedReport || !actionTaken) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an action",
      });
      return;
    }

    setReviewing(true);
    
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      
      const statusMap: Record<string, string> = {
        'none': 'dismissed',
        'warning_sent': 'action_taken',
        'content_removed': 'action_taken',
        'user_suspended': 'action_taken',
        'false_report': 'false_report'
      };
      
      const { error } = await supabase
        .from("content_reports")
        .update({
          status: statusMap[actionTaken] || 'action_taken',
          action_taken: actionTaken,
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedReport.id);

      if (error) throw error;

      // If false report, update reporter's trust score
      if (actionTaken === 'false_report' && selectedReport.reporter_id) {
        await supabase.rpc("update_user_trust_score", { p_user_id: selectedReport.reporter_id });
      }

      toast({
        title: "Report reviewed",
        description: "Action completed successfully",
      });

      setSelectedReport(null);
      fetchReports();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setReviewing(false);
    }
  };

  // Get unique reasons and content types for filters
  const uniqueReasons = Array.from(new Set(reports.map(r => r.report_reason).filter(Boolean)));
  const uniqueContentTypes = Array.from(new Set(reports.map(r => r.content_type).filter(Boolean)));
  
  // Filter reports
  const filteredReports = reports.filter(r => {
    if (filterStatus === "pending" && r.status !== 'pending') return false;
    if (filterStatus === "resolved" && r.status === 'pending') return false;
    if (filterReason !== "all" && r.report_reason !== filterReason) return false;
    if (filterContentType !== "all" && r.content_type !== filterContentType) return false;
    return true;
  });

  const pendingReports = reports.filter(r => r.status === 'pending');
  const resolvedReports = reports.filter(r => r.status !== 'pending');

  const renderContentPreview = () => {
    if (!selectedReport) return null;
    
    if (loadingContent) {
      return <p className="text-sm text-muted-foreground">Loading content...</p>;
    }
    
    // Show content_preview from the report if no full content loaded
    if (!contentData && selectedReport.content_preview) {
      return (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm whitespace-pre-wrap">{selectedReport.content_preview}</p>
        </div>
      );
    }
    
    if (!contentData) {
      return <p className="text-sm text-muted-foreground">Content not available or deleted</p>;
    }
    
    switch (selectedReport.content_type) {
      case 'message':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 font-medium mb-1">Reported Message:</p>
              <p className="text-sm whitespace-pre-wrap">{contentData.content || contentData.message}</p>
            </div>
            
            {conversationData.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Full Conversation ({conversationData.length} messages):</p>
                <div className="max-h-[300px] overflow-y-auto space-y-2 p-3 bg-muted/50 rounded-lg border">
                  {conversationData.map((msg, i) => (
                    <div 
                      key={msg.id} 
                      className={`p-2 rounded-lg text-sm ${
                        msg.id === selectedReport.content_id 
                          ? 'bg-amber-100 border border-amber-300' 
                          : 'bg-white border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs">{msg.sender?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                        {msg.id === selectedReport.content_id && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">Reported</Badge>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content || msg.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'review':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Review by:</span>
              <span className="font-medium">{contentData.guest?.name || 'Unknown'}</span>
              <span className="text-muted-foreground">for</span>
              <Link href={`/property/${contentData.property?.id}`} target="_blank" className="font-medium hover:underline">
                {contentData.property?.name || 'Unknown property'}
              </Link>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < (contentData.rating || 0) ? "text-amber-500" : "text-gray-300"}>★</span>
              ))}
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{contentData.comment}</p>
            </div>
          </div>
        );
        
      case 'property':
        return (
          <div className="space-y-3">
            <div className="text-sm">
              <Link href={`/property/${contentData.id}`} target="_blank" className="font-medium hover:underline">
                {contentData.name}
              </Link>
              <span className="text-muted-foreground"> in {contentData.city}, {contentData.county}</span>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap line-clamp-4">{contentData.description}</p>
            </div>
          </div>
        );
        
      case 'route':
        return (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-medium">{contentData.name}</span>
              <span className="text-muted-foreground"> by {contentData.user?.name || 'Unknown'}</span>
            </div>
            {contentData.description && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{contentData.description}</p>
              </div>
            )}
          </div>
        );
        
      case 'comment':
        return (
          <div className="space-y-3">
            {contentData.property && (
              <div className="text-sm">
                <span className="text-muted-foreground">Question on:</span>
                <Link href={`/property/${contentData.property.id}`} target="_blank" className="font-medium hover:underline ml-1">
                  {contentData.property.name}
                </Link>
              </div>
            )}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{contentData.question || contentData.content}</p>
            </div>
          </div>
        );
        
      default:
        return selectedReport.content_preview ? (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{selectedReport.content_preview}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No preview available</p>
        );
    }
  };

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Loading reports...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReports.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedReports.length}</div>
            <p className="text-xs text-muted-foreground">Completed reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label>Status:</Label>
          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Only</SelectItem>
              <SelectItem value="resolved">Resolved Only</SelectItem>
              <SelectItem value="all">All Reports</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Label>Reason:</Label>
          <Select value={filterReason} onValueChange={setFilterReason}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reasons</SelectItem>
              {uniqueReasons.map(reason => (
                <SelectItem key={reason} value={reason} className="capitalize">
                  {reason?.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Label>Type:</Label>
          <Select value={filterContentType} onValueChange={setFilterContentType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueContentTypes.map(type => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <span className="text-sm text-muted-foreground">
          Showing {filteredReports.length} of {reports.length} reports
        </span>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Reports</CardTitle>
          <CardDescription>Content reported by community members</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reports found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Content Owner</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {report.content_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={`capitalize ${
                          report.report_reason === 'harassment' || report.report_reason === 'hate_speech'
                            ? 'bg-red-100 text-red-800'
                            : report.report_reason === 'inappropriate_content' || report.report_reason === 'spam'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {report.report_reason?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Link href={`/profile/${report.reporter?.id}`} target="_blank" className="font-medium text-sm hover:underline">
                          {report.reporter?.name || 'Unknown'}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Trust: {report.reporter_trust_score || report.reporter?.trust_score || 50}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {report.content_owner ? (
                        <Link href={`/profile/${report.content_owner.id}`} target="_blank" className="font-medium text-sm hover:underline">
                          {report.content_owner.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {report.content_preview || report.report_description || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {report.status === 'pending' ? (
                        <Badge variant="outline" className="bg-yellow-50">
                          Pending
                        </Badge>
                      ) : report.status === 'false_report' ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          False Report
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50">
                          Resolved
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReviewClick(report)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Review User Report</DialogTitle>
                            <DialogDescription>
                              Reported {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-6 py-4">
                            {/* Reporter & Report Details */}
                            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Reported by</p>
                                <Link href={`/profile/${report.reporter?.id}`} target="_blank" className="font-medium hover:underline">
                                  {report.reporter?.name || 'Unknown'}
                                </Link>
                                <p className="text-xs text-muted-foreground">{report.reporter?.email}</p>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  Trust: {report.reporter_trust_score || report.reporter?.trust_score || 50}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Content Owner</p>
                                {report.content_owner ? (
                                  <>
                                    <Link href={`/profile/${report.content_owner.id}`} target="_blank" className="font-medium hover:underline">
                                      {report.content_owner.name}
                                    </Link>
                                    <p className="text-xs text-muted-foreground">{report.content_owner.email}</p>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">Unknown</span>
                                )}
                              </div>
                            </div>

                            {/* Report Details */}
                            <div className="flex flex-wrap gap-3">
                              <Badge variant="secondary" className="capitalize">
                                Type: {report.content_type}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={`capitalize ${
                                  report.report_reason === 'harassment' || report.report_reason === 'hate_speech'
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                Reason: {report.report_reason?.replace(/_/g, ' ')}
                              </Badge>
                            </div>

                            {/* Reporter's Description */}
                            {report.report_description && (
                              <div>
                                <p className="text-sm font-medium mb-2">Reporter's Description:</p>
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                  <p className="text-sm">{report.report_description}</p>
                                </div>
                              </div>
                            )}

                            {/* Reported Content */}
                            <div>
                              <p className="text-sm font-medium mb-2">Reported Content:</p>
                              {renderContentPreview()}
                            </div>

                            {/* Action Selection (only for pending reports) */}
                            {report.status === 'pending' && (
                              <>
                                <div>
                                  <Label>Action Taken *</Label>
                                  <Select value={actionTaken} onValueChange={setActionTaken}>
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">No Action - False Positive</SelectItem>
                                      <SelectItem value="warning_sent">Warning Sent to User</SelectItem>
                                      <SelectItem value="content_removed">Content Removed</SelectItem>
                                      <SelectItem value="user_suspended">User Suspended</SelectItem>
                                      <SelectItem value="false_report">Mark as False Report</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label>Admin Notes (Optional)</Label>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add any notes about this review..."
                                    rows={3}
                                    className="mt-1"
                                  />
                                </div>

                                <Button
                                  onClick={handleReportAction}
                                  disabled={reviewing || !actionTaken}
                                  className="w-full"
                                >
                                  {reviewing ? "Submitting..." : "Submit Review"}
                                </Button>
                              </>
                            )}

                            {/* Show Review Details if Already Reviewed */}
                            {report.status !== 'pending' && (
                              <div className={`p-4 rounded-lg border ${
                                report.status === 'false_report' 
                                  ? 'bg-red-50 border-red-200' 
                                  : 'bg-green-50 border-green-200'
                              }`}>
                                <p className="font-semibold text-sm mb-2">
                                  {report.status === 'false_report' ? '⚠️ Marked as False Report' : '✓ Already Reviewed'}
                                </p>
                                {report.action_taken && (
                                  <p className="text-sm">
                                    <strong>Action:</strong> {report.action_taken.replace(/_/g, ' ')}
                                  </p>
                                )}
                                {report.admin_notes && (
                                  <p className="text-sm mt-2">
                                    <strong>Notes:</strong> {report.admin_notes}
                                  </p>
                                )}
                                {report.reviewed_at && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Reviewed {formatDistanceToNow(new Date(report.reviewed_at), { addSuffix: true })}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
