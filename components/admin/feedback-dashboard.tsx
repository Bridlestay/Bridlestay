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
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquarePlus, 
  Eye, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Trash2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Feedback {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  };
}

export function FeedbackDashboard() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responding, setResponding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "reviewed" | "resolved">("pending");
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/feedback");
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback || []);
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedFeedback || !newStatus) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a status",
      });
      return;
    }

    setResponding(true);

    try {
      const response = await fetch("/api/admin/feedback/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackId: selectedFeedback.id,
          adminResponse: adminResponse.trim() || null,
          status: newStatus,
        }),
      });

      if (!response.ok) throw new Error("Failed to respond");

      toast({
        title: "Success",
        description: "Feedback updated successfully",
      });

      setSelectedFeedback(null);
      setAdminResponse("");
      setNewStatus("");
      fetchFeedback();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setResponding(false);
    }
  };

  const handleDelete = async (feedbackId: string) => {
    setDeleting(feedbackId);

    try {
      const response = await fetch("/api/admin/feedback/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId }),
      });

      if (!response.ok) throw new Error("Failed to delete feedback");

      toast({
        title: "Feedback Deleted",
        description: "The feedback has been removed from the dashboard",
      });

      fetchFeedback();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeleting(null);
    }
  };

  const filteredFeedback = feedback.filter(fb => {
    if (filterStatus === "pending") return fb.status === "pending";
    if (filterStatus === "reviewed") return fb.status === "reviewed";
    if (filterStatus === "resolved") return fb.status === "resolved";
    return true;
  });

  const pendingCount = feedback.filter(f => f.status === "pending").length;
  const reviewedCount = feedback.filter(f => f.status === "reviewed").length;
  const resolvedCount = feedback.filter(f => f.status === "resolved").length;

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case "bug": return "🐛";
      case "feature": return "💡";
      case "improvement": return "✨";
      default: return "💬";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "bug": return "Bug Report";
      case "feature": return "Feature Request";
      case "improvement": return "Improvement";
      default: return "Other";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewedCount}</div>
            <p className="text-xs text-muted-foreground">Under consideration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedCount}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label>Filter:</Label>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending Only</SelectItem>
            <SelectItem value="reviewed">Reviewed Only</SelectItem>
            <SelectItem value="resolved">Resolved Only</SelectItem>
            <SelectItem value="all">All Feedback</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Feedback</CardTitle>
          <CardDescription>Manage and respond to user submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : filteredFeedback.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No {filterStatus !== "all" && filterStatus} feedback
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedback.map((fb) => (
                  <TableRow key={fb.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoryEmoji(fb.category)} {getCategoryLabel(fb.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{fb.subject}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-md">
                        {fb.message}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Link 
                          href={`/profile/${fb.users.id}`}
                          target="_blank"
                          className="flex-shrink-0"
                        >
                          <Avatar className="h-10 w-10 border-2 border-muted hover:border-primary transition-colors">
                            <AvatarImage 
                              src={fb.users.avatar_url || undefined} 
                              alt={fb.users.name}
                            />
                            <AvatarFallback>
                              {fb.users.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div>
                          <Link 
                            href={`/profile/${fb.users.id}`}
                            className="font-medium hover:underline"
                            target="_blank"
                          >
                            {fb.users.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {fb.users.email}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {fb.users.role}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          fb.status === "resolved" ? "default" :
                          fb.status === "reviewed" ? "secondary" :
                          "outline"
                        }
                      >
                        {fb.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                        {fb.status === "reviewed" && <Eye className="mr-1 h-3 w-3" />}
                        {fb.status === "resolved" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {fb.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog 
                          open={selectedFeedback?.id === fb.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setSelectedFeedback(null);
                              setAdminResponse("");
                              setNewStatus("");
                            }
                          }}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedFeedback(fb);
                              setNewStatus(fb.status);
                              setAdminResponse(fb.admin_response || "");
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Feedback Details</DialogTitle>
                            <DialogDescription>
                              Review and respond to user feedback
                            </DialogDescription>
                          </DialogHeader>

                          {selectedFeedback?.id === fb.id && (
                            <div className="space-y-4">
                              <div>
                                <Label className="text-xs text-muted-foreground">Category</Label>
                                <div className="mt-1">
                                  <Badge variant="outline">
                                    {getCategoryEmoji(selectedFeedback.category)} {getCategoryLabel(selectedFeedback.category)}
                                  </Badge>
                                </div>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">From</Label>
                                <div className="mt-2 flex items-center gap-3">
                                  <Link 
                                    href={`/profile/${selectedFeedback.users.id}`}
                                    target="_blank"
                                    className="flex-shrink-0"
                                  >
                                    <Avatar className="h-12 w-12 border-2 border-muted hover:border-primary transition-colors">
                                      <AvatarImage 
                                        src={selectedFeedback.users.avatar_url || undefined} 
                                        alt={selectedFeedback.users.name}
                                      />
                                      <AvatarFallback>
                                        {selectedFeedback.users.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </Link>
                                  <div>
                                    <Link 
                                      href={`/profile/${selectedFeedback.users.id}`}
                                      className="font-medium hover:underline"
                                      target="_blank"
                                    >
                                      {selectedFeedback.users.name}
                                    </Link>
                                    <div className="text-sm text-muted-foreground">
                                      {selectedFeedback.users.email}
                                    </div>
                                    <div className="text-xs text-muted-foreground capitalize">
                                      {selectedFeedback.users.role}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Subject</Label>
                                <div className="mt-1 font-medium">{selectedFeedback.subject}</div>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Message</Label>
                                <div className="mt-1 p-3 bg-muted rounded-md">
                                  <p className="whitespace-pre-wrap">{selectedFeedback.message}</p>
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="status">Status</Label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="reviewed">Reviewed</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="response">Admin Response (Optional)</Label>
                                <Textarea
                                  id="response"
                                  placeholder="Add notes or response..."
                                  value={adminResponse}
                                  onChange={(e) => setAdminResponse(e.target.value)}
                                  rows={4}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          )}

                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedFeedback(null);
                                setAdminResponse("");
                                setNewStatus("");
                              }}
                              disabled={responding}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleRespond}
                              disabled={responding || !newStatus}
                            >
                              {responding ? "Updating..." : "Update Feedback"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deleting === fb.id}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {deleting === fb.id ? "Deleting..." : "Delete"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Feedback?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the feedback from the dashboard, but it will still be kept in the system logs for audit purposes. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(fb.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleting === fb.id ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

