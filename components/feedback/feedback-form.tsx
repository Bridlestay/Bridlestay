"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquarePlus, Loader2 } from "lucide-react";

interface FeedbackFormProps {
  user: any;
}

export function FeedbackForm({ user }: FeedbackFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    category: "other",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });

      // Reset form
      setFormData({
        subject: "",
        message: "",
        category: "other",
      });

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5" />
          Your Feedback
        </CardTitle>
        <CardDescription>
          We value your input and use it to make BridleStay better for everyone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">🐛 Bug Report</SelectItem>
                <SelectItem value="feature">💡 Feature Request</SelectItem>
                <SelectItem value="improvement">✨ Improvement Suggestion</SelectItem>
                <SelectItem value="other">💬 Other Feedback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject <span className="text-red-500">*</span></Label>
            <Input
              id="subject"
              placeholder="Brief summary of your feedback"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              maxLength={200}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {formData.subject.length}/200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
            <Textarea
              id="message"
              placeholder="Please provide details about your feedback..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={8}
              maxLength={2000}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {formData.message.length}/2000 characters
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

