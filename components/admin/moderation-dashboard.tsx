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
import { AlertCircle, Eye, CheckCircle, Trash2, MessageSquare } from "lucide-react";
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
  const [deletingReview, setDeletingReview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFlaggedMessages();
  }, []);

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
    
    if (filterReviewed === "pending") return !msg.reviewed;
    if (filterReviewed === "reviewed") return msg.reviewed;
    return true;
  });

  const pendingCount = flaggedMessages.filter(m => !m.reviewed).length;
  const reviewedCount = flaggedMessages.filter(m => m.reviewed).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label>Filter:</Label>
        <Select value={filterReviewed} onValueChange={(value: any) => setFilterReviewed(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending Only</SelectItem>
            <SelectItem value="reviewed">Reviewed Only</SelectItem>
            <SelectItem value="all">All Messages</SelectItem>
          </SelectContent>
        </Select>
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
                            href={`/messages?userId=${flag.messages.sender.id === flag.messages.sender_id ? flag.messages.recipient.id : flag.messages.sender.id}&adminView=true`}
                            target="_blank"
                          >
                            <Button variant="ghost" size="sm" title="View full conversation (read-only)">
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
    </div>
  );
}

