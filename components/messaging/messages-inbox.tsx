"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Send, MessageCircle, Trash2, ShieldAlert, Search, Filter, Check, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReservationCard } from "@/components/messaging/reservation-card";
import { useSearchParams } from "next/navigation";
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

interface Conversation {
  userId: string;
  userName: string;
  userAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  propertyId: string | null;
  propertyName: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  read: boolean;
  deleted: boolean;
  deleted_at: string | null;
  sender: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  recipient: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  properties: {
    id: string;
    name: string;
  } | null;
}

export function MessagesInbox() {
  const searchParams = useSearchParams();
  const adminView = searchParams?.get('adminView') === 'true';
  const initialUserId = searchParams?.get('userId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");

  useEffect(() => {
    fetchCurrentUser();
    fetchConversations();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const data = await response.json();
        console.log("Current user ID:", data.user?.id);
        setCurrentUserId(data.user?.id || null);
      } else {
        console.error("Failed to fetch user:", response.status);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
    }
  }, [selectedUserId]);

  // Auto-scroll to bottom when messages change (but only if user is at bottom already or just loaded)
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      // Delay scroll to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  }, [messages.length]); // Only trigger on new messages, not on every message update

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/messages/conversations");
      const data = await response.json();

      if (response.ok) {
        setConversations(data.conversations || []);
        if (data.conversations.length > 0 && !selectedUserId) {
          setSelectedUserId(data.conversations[0].userId);
        }
      } else {
        console.error("Failed to fetch conversations:", data);
        toast({
          variant: "destructive",
          title: "Error loading messages",
          description: data.error || "Failed to load conversations",
        });
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to messaging service",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const response = await fetch(`/api/messages/${userId}`);
      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages || []);
        // Refresh conversations to update unread/New status after messages are marked as read
        await fetchConversations();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUserId || !newMessage.trim()) return;

    setSending(true);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: selectedUserId,
          propertyId: selectedConversation?.propertyId || null,
          message: newMessage,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setNewMessage("");
        await fetchMessages(selectedUserId);
        await fetchConversations();
        
        // Show warning if message was flagged (but still sent)
        if (data.flagged) {
          toast({
            title: "Message sent",
            description: "Your message has been flagged for review by our moderation team.",
            variant: "default",
          });
        }
      } else {
        // Show the specific error message (e.g., blocked message)
        throw new Error(data.error || "Failed to send message");
      }
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

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      const response = await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: messageToDelete }),
      });

      if (response.ok) {
        // Refresh messages
        if (selectedUserId) {
          await fetchMessages(selectedUserId);
        }
        toast({
          title: "Message deleted",
          description: "Your message has been deleted.",
        });
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete message");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  };

  const selectedConversation = conversations.find((c) => c.userId === selectedUserId);

  // Filter conversations based on search and tab
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (conv.propertyName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = filterTab === "all" || (filterTab === "unread" && conv.unread);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-96">
          <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-xl font-semibold mb-2">No messages yet</p>
          <p className="text-muted-foreground text-center">
            When you contact a host or receive messages,
            <br />
            they&apos;ll appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine if we should show the reservation card
  const showReservationCard = selectedConversation?.propertyId && selectedUserId;

  return (
    <div className={`flex flex-col lg:grid gap-4 h-auto lg:h-[600px] ${
      showReservationCard ? 'lg:grid-cols-7' : 'lg:grid-cols-3'
    }`}>
      {/* Conversations List */}
      <Card className={`${showReservationCard ? 'lg:col-span-2' : 'lg:col-span-1'} flex flex-col h-[400px] lg:h-[600px] overflow-hidden`}>
        <div className="p-4 border-b space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Filter Tabs */}
          <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as "all" | "unread")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No conversations found" : "No unread messages"}
              </div>
            ) : (
              filteredConversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => setSelectedUserId(conv.userId)}
                className={`w-full p-3 rounded-lg mb-2 text-left transition-colors ${
                  selectedUserId === conv.userId
                    ? "bg-primary/10 border-2 border-primary"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src={conv.userAvatar || undefined} />
                    <AvatarFallback>
                      {conv.userName?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold truncate">{conv.userName}</p>
                      {conv.unread && (
                        <Badge className="bg-primary text-white">New</Badge>
                      )}
                    </div>
                    {conv.propertyName && (
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        {conv.propertyName}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(conv.lastMessageTime), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </button>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Messages Thread */}
      <Card className={`${showReservationCard ? 'lg:col-span-3' : 'lg:col-span-2'} flex flex-col h-[400px] lg:h-[600px]`}>
        {selectedConversation && (
          <>
            {/* Header */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <a
                  href={`/profile/${selectedConversation.userId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <Avatar className="cursor-pointer hover:opacity-80 transition-opacity hover:ring-2 hover:ring-primary">
                    <AvatarImage
                      src={selectedConversation.userAvatar || undefined}
                    />
                    <AvatarFallback>
                      {selectedConversation.userName?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                </a>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{selectedConversation.userName}</p>
                    {adminView && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                        <ShieldAlert className="h-3 w-3 mr-1" />
                        Admin View
                      </Badge>
                    )}
                  </div>
                  {selectedConversation.propertyName && (
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.propertyName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                {messages.map((msg) => {
                  // Check if current user sent this message
                  const isCurrentUser = msg.sender_id === currentUserId;
                  console.log("Message:", msg.id, "Sender:", msg.sender_id, "Current:", currentUserId, "IsCurrentUser:", isCurrentUser);
                  // Always show the sender's avatar (whoever sent this specific message)
                  const displayUser = msg.sender;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${!isCurrentUser ? "flex-row-reverse" : ""}`}
                  >
                    <a
                      href={`/profile/${displayUser.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity hover:ring-2 hover:ring-primary">
                        <AvatarImage src={displayUser.avatar_url || undefined} />
                        <AvatarFallback>
                          {displayUser.name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </a>
                      <div className={`flex-1 ${!isCurrentUser ? "text-right" : ""}`}>
                        <div className="group relative inline-block max-w-[70%]">
                          <div
                            className={`p-3 rounded-lg ${
                              !isCurrentUser
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {msg.deleted ? (
                              <p className="text-sm italic text-muted-foreground">
                                Message deleted
                              </p>
                            ) : (
                              <p className="text-sm">{msg.message}</p>
                            )}
                          </div>
                          {/* Delete button - only show for current user's messages that aren't deleted and not in admin view */}
                          {isCurrentUser && !msg.deleted && !adminView && (
                            <button
                              onClick={() => {
                                setMessageToDelete(msg.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                              title="Delete message"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          {formatDistanceToNow(new Date(msg.created_at), {
                            addSuffix: true,
                          })}
                          {msg.deleted && msg.deleted_at && (
                            <span className="ml-1">• Deleted {formatDistanceToNow(new Date(msg.deleted_at), { addSuffix: true })}</span>
                          )}
                          {/* Read status for sent messages */}
                          {isCurrentUser && !msg.deleted && (
                            msg.read ? (
                              <CheckCheck className="h-3 w-3 text-blue-500" title="Read" />
                            ) : (
                              <Check className="h-3 w-3" title="Sent" />
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t space-y-3 flex-shrink-0">
              {/* Admin View Banner */}
              {adminView && (
                <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-3 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold text-orange-900">🔒 Admin View - Read Only</p>
                    <p className="text-orange-700 text-xs">
                      You are viewing this conversation as an administrator. You cannot send messages in this mode.
                    </p>
                  </div>
                </div>
              )}

              {/* Moderation Notice */}
              {!adminView && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-900">
                  🛡️ <strong>Platform Safety:</strong> Messages are monitored for inappropriate content and off-platform payment attempts. See our <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline font-medium">Terms of Service</a>.
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!adminView && newMessage.trim() && selectedUserId) {
                    handleSendMessage();
                  }
                }}
                className="flex gap-2"
              >
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={adminView ? "Message input disabled in admin view" : "Type your message..."}
                  rows={2}
                  disabled={adminView}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!adminView && newMessage.trim() && selectedUserId) {
                        handleSendMessage();
                      }
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={adminView || sending || !newMessage.trim()}
                  className="px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </Card>

      {/* Reservation Details Card */}
      {showReservationCard && (
        <div className="lg:col-span-2 h-[400px] lg:h-[600px] overflow-hidden">
          <ReservationCard 
            propertyId={selectedConversation.propertyId!} 
            otherUserId={selectedUserId!}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be deleted for you and the recipient. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMessageToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMessage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

