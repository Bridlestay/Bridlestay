"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface RouteDiscussionPanelProps {
  routeId: string;
  comments: any[];
  onCommentsChange: (comments: any[]) => void;
  onBack: () => void;
}

export function RouteDiscussionPanel({
  routeId,
  comments,
  onCommentsChange,
  onBack,
}: RouteDiscussionPanelProps) {
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
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

      {/* Discussion Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Add Comment Form */}
          <div className="space-y-2">
            <Textarea
              placeholder="Share your thoughts about this route..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              onClick={async () => {
                if (!newComment.trim() || submittingComment) return;
                setSubmittingComment(true);
                try {
                  const res = await fetch(`/api/routes/${routeId}/comments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: newComment }),
                  });
                  if (res.ok) {
                    toast.success("Comment posted!");
                    setNewComment("");
                    // Refresh comments
                    const commentsRes = await fetch(`/api/routes/${routeId}/comments`);
                    if (commentsRes.ok) {
                      const data = await commentsRes.json();
                      onCommentsChange(data.comments || []);
                    }
                  }
                } catch {
                  toast.error("Failed to post comment");
                } finally {
                  setSubmittingComment(false);
                }
              }}
              disabled={!newComment.trim() || submittingComment}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </div>

          <Separator />

          {/* Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment: any) => (
                <div key={comment.id} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={comment.user?.avatar_url} />
                      <AvatarFallback>
                        {comment.user?.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{comment.user?.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
