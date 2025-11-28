"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";

interface MessageButtonProps {
  recipientId: string;
  recipientName: string;
  propertyId?: string;
  propertyName?: string;
}

export function MessageButton({
  recipientId,
  recipientName,
  propertyId,
  propertyName,
}: MessageButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a message",
      });
      return;
    }

    setSending(true);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId,
          propertyId,
          subject: propertyName ? `Question about ${propertyName}` : null,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      toast({
        title: "Message sent!",
        description: `Your message has been sent to ${recipientName}`,
      });

      setMessage("");
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2 w-full">
          <MessageCircle className="h-4 w-4" />
          Message Host (Private)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message {recipientName}</DialogTitle>
          <DialogDescription>
            {propertyName && `Ask a question about ${propertyName}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="message">Your Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={5}
              className="mt-2"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="w-full"
          >
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

