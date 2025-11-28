"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Question {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
  answered_at: string | null;
  asker: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface PropertyQAProps {
  propertyId: string;
  hostId: string;
  currentUserId?: string;
}

export function PropertyQA({ propertyId, hostId, currentUserId }: PropertyQAProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const isHost = currentUserId === hostId;

  useEffect(() => {
    fetchQuestions();
  }, [propertyId]);

  const fetchQuestions = async () => {
    try {
      // Add timestamp to prevent caching
      const response = await fetch(`/api/questions/${propertyId}?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const data = await response.json();

      if (response.ok) {
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!currentUserId) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to ask a question",
      });
      return;
    }

    if (!newQuestion.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a question",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/questions/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          question: newQuestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to ask question");
      }

      toast({
        title: "Question posted!",
        description: "The host will be notified",
      });

      setNewQuestion("");
      fetchQuestions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerQuestion = async (questionId: string) => {
    if (!answerText.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an answer",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/questions/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          answer: answerText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to answer question");
      }

      toast({
        title: "Answer posted!",
        description: "The guest will be notified",
      });

      setAnswerText("");
      setAnsweringId(null);
      fetchQuestions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    setDeletingId(questionId);

    try {
      console.log("🗑️ Attempting to delete question:", questionId);
      console.log("Current questions before delete:", questions.map(q => q.id));
      
      const response = await fetch("/api/questions/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
        cache: 'no-store'
      });

      const data = await response.json();
      console.log("Delete API response:", { status: response.status, data });

      if (!response.ok) {
        console.error("Delete failed:", data.error);
        throw new Error(data.error || "Failed to delete question");
      }

      console.log("✅ Delete successful, data returned:", data);
      
      // Immediately remove from UI (optimistic update)
      setQuestions(prev => {
        const filtered = prev.filter(q => q.id !== questionId);
        console.log("Questions after filter:", filtered.map(q => q.id));
        return filtered;
      });

      toast({
        title: "Question deleted",
        description: "The question has been removed",
      });

      // Wait longer before refreshing to ensure DB replication
      setTimeout(() => {
        console.log("Refreshing questions from server...");
        fetchQuestions();
      }, 2000);
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      // Revert optimistic update on error
      fetchQuestions();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Public Questions & Answers
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          ⚠️ Questions and answers are <strong>visible to everyone</strong>. For private inquiries, use the &quot;Message Host&quot; button above.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ask a Question */}
        {!isHost && (
          <div className="space-y-3">
            <h3 className="font-semibold">Ask a public question</h3>
            <p className="text-sm text-muted-foreground">
              Your question and the host&apos;s answer will be visible to all visitors
            </p>
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask a question that might help other guests..."
              rows={3}
            />
            <Button
              onClick={handleAskQuestion}
              disabled={submitting || !newQuestion.trim()}
              className="gap-2"
              variant="outline"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Posting..." : "Post Public Question"}
            </Button>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading questions...</p>
          ) : questions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No questions yet. Be the first to ask!
            </p>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="border rounded-lg p-4 space-y-3">
                {/* Question */}
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={q.asker.avatar_url || undefined} />
                    <AvatarFallback>
                      {q.asker.name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold">{q.asker.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{q.question}</p>
                  </div>
                  {/* Delete button for host */}
                  {isHost && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={deletingId === q.id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this question?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the question
                            {q.answer && " and its answer"}. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                {/* Answer */}
                {q.answer ? (
                  <div className="ml-11 p-3 bg-muted rounded-lg">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-sm">Host</span>
                      <span className="text-xs text-muted-foreground">
                        {q.answered_at &&
                          formatDistanceToNow(new Date(q.answered_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{q.answer}</p>
                  </div>
                ) : isHost ? (
                  // Host can answer
                  answeringId === q.id ? (
                    <div className="ml-11 space-y-2">
                      <Textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Type your answer..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAnswerQuestion(q.id)}
                          disabled={submitting}
                        >
                          {submitting ? "Posting..." : "Post Answer"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAnsweringId(null);
                            setAnswerText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-11">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAnsweringId(q.id)}
                      >
                        Answer
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="ml-11 text-sm text-muted-foreground italic">
                    Waiting for host&apos;s answer...
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
