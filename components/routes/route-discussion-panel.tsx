"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  MessageCircle,
  Send,
  MoreHorizontal,
  Flag,
  Trash2,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ReportCommentDialog } from "./route-hazard-dialogs";

interface RouteDiscussionPanelProps {
  routeId: string;
  comments: any[];
  onCommentsChange: (comments: any[]) => void;
  onBack: () => void;
  userId?: string;
  isAdmin?: boolean;
}

export function RouteDiscussionPanel({
  routeId,
  comments,
  onCommentsChange,
  onBack,
  userId,
  isAdmin,
}: RouteDiscussionPanelProps) {
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(
    null
  );
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment }),
      });
      if (res.ok) {
        toast.success("Comment posted!");
        setNewComment("");
        const commentsRes = await fetch(`/api/routes/${routeId}/comments`);
        if (commentsRes.ok) {
          const data = await commentsRes.json();
          onCommentsChange(data.comments || []);
        }
        // Scroll to top where newest comment appears
        setTimeout(() => {
          scrollContainerRef.current?.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }, 100);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to post comment");
      }
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
    try {
      const res = await fetch(
        `/api/routes/${routeId}/comments/${commentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Comment deleted");
        const commentsRes = await fetch(`/api/routes/${routeId}/comments`);
        if (commentsRes.ok) {
          const data = await commentsRes.json();
          onCommentsChange(data.comments || []);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete comment");
      }
    } catch {
      toast.error("Failed to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0"
        >
          <ChevronDown className="h-5 w-5 rotate-90" />
        </Button>
        <h2 className="font-semibold text-lg">Discussion</h2>
        <Badge variant="outline" className="ml-auto">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </Badge>
      </div>

      {/* Comments list */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4"
      >
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment: any) => {
              const canDelete =
                comment.user_id === userId || isAdmin;

              return (
                <div
                  key={comment.id}
                  id={`comment-${comment.id}`}
                  className="group flex items-start gap-3 rounded-lg transition-colors duration-1000"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={comment.user?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {comment.user?.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {comment.user?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {comment.body}
                    </p>
                  </div>

                  {/* Per-comment action menu */}
                  {userId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setReportingCommentId(comment.id)}
                        >
                          <Flag className="mr-2 h-4 w-4" />
                          Report
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-600 focus:text-red-600"
                            disabled={deletingCommentId === comment.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingCommentId === comment.id
                              ? "Deleting..."
                              : "Delete"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        )}
      </div>

      {/* Sticky input */}
      <div className="border-t bg-white p-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1"
            disabled={submittingComment || !userId}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || submittingComment || !userId}
            className="h-9 w-9 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Report dialog */}
      <ReportCommentDialog
        open={reportingCommentId !== null}
        onOpenChange={(open) => {
          if (!open) setReportingCommentId(null);
        }}
        routeId={routeId}
        commentId={reportingCommentId}
        userId={userId}
      />
    </div>
  );
}
