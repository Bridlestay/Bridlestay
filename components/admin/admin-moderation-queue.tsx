"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, 
  Loader2, 
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  Flag,
  MessageSquare,
  User,
  Image as ImageIcon,
  FileText,
  Send,
  Ban
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface FlaggedItem {
  id: string;
  content_type: string;
  content_id: string;
  content_text?: string;
  content_url?: string;
  flag_source: string;
  flag_reasons: string[];
  risk_score: number;
  matched_patterns: any[];
  status: string;
  report_count: number;
  created_at: string;
  owner_id?: string;
  owner_name?: string;
  owner_trust_score?: number;
  owner_trust_level?: string;
  owner_warnings?: number;
}

const WARNING_TEMPLATES = [
  {
    type: 'community_guidelines',
    title: 'Community Guidelines Reminder',
    message: 'Your recent content was flagged for review. Please ensure all your contributions follow our community guidelines. Continued violations may result in restrictions on your account.',
  },
  {
    type: 'off_platform_payment',
    title: 'Payment Safety Reminder',
    message: 'We noticed content suggesting off-platform payments. For your protection and the protection of other users, all payments must go through Cantra. This ensures refund protection and support coverage.',
  },
  {
    type: 'inappropriate_content',
    title: 'Content Standards Reminder',
    message: 'Some of your recent content was flagged as potentially inappropriate. Please review our content guidelines and ensure your posts meet our community standards.',
  },
  {
    type: 'harassment',
    title: 'Respectful Communication Reminder',
    message: 'Your communication was flagged as potentially harassing. We expect all users to communicate respectfully. Further violations will result in account restrictions.',
  },
];

export function AdminModerationQueue() {
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("high");
  const [selectedItem, setSelectedItem] = useState<FlaggedItem | null>(null);
  const [actionDialog, setActionDialog] = useState<'approve' | 'hide' | 'warn' | 'restrict' | null>(null);
  const [warningType, setWarningType] = useState('community_guidelines');
  const [customMessage, setCustomMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Get flagged content with owner info
      const { data, error } = await supabase
        .from("flagged_content")
        .select(`
          *,
          owner:users!flagged_content_content_owner_id_fkey (
            id, name, trust_score, trust_level, warnings_received, avatar_url
          )
        `)
        .eq("status", "pending")
        .order("risk_score", { ascending: false })
        .order("report_count", { ascending: false });

      if (error) throw error;

      // Transform data
      const transformedItems: FlaggedItem[] = (data || []).map(item => ({
        ...item,
        owner_id: item.owner?.id,
        owner_name: item.owner?.name,
        owner_trust_score: item.owner?.trust_score,
        owner_trust_level: item.owner?.trust_level,
        owner_warnings: item.owner?.warnings_received,
      }));

      setItems(transformedItems);
    } catch (error) {
      console.error("Error loading queue:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load moderation queue",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'hide' | 'remove') => {
    if (!selectedItem) return;
    
    setSubmitting(true);
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from("flagged_content")
        .update({
          status: action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'removed',
          is_visible: action === 'approve',
          review_action: action,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedItem.id);

      if (error) throw error;

      // Update reports for this content
      await supabase
        .from("content_reports")
        .update({
          status: action === 'approve' ? 'dismissed' : 'action_taken',
          action_taken: action === 'approve' ? 'none' : 
                       action === 'hide' ? 'content_hidden' : 'content_removed',
          reviewed_at: new Date().toISOString(),
        })
        .eq("content_type", selectedItem.content_type)
        .eq("content_id", selectedItem.content_id)
        .eq("status", "pending");

      toast({
        title: "Action completed",
        description: `Content ${action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'removed'}`,
      });

      setSelectedItem(null);
      loadQueue();
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

  const handleSendWarning = async () => {
    if (!selectedItem || !selectedItem.owner_id) return;
    
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      const template = WARNING_TEMPLATES.find(t => t.type === warningType);
      const message = customMessage || template?.message || '';
      
      // Create warning
      const { error: warningError } = await supabase
        .from("user_warnings")
        .insert({
          user_id: selectedItem.owner_id,
          warning_type: warningType,
          warning_message: message,
          related_content_id: selectedItem.id,
          severity: 'mild',
          issued_by: user?.id,
        });

      if (warningError) throw warningError;

      // Update user warnings count
      await supabase.rpc("update_user_trust_score", { p_user_id: selectedItem.owner_id });

      // Update flagged content
      await supabase
        .from("flagged_content")
        .update({
          status: 'approved', // Allow but warned
          review_action: 'warning_sent',
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedItem.id);

      toast({
        title: "Warning sent",
        description: "The user has been warned and their trust score updated",
      });

      setSelectedItem(null);
      setActionDialog(null);
      setCustomMessage('');
      loadQueue();
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

  const getPriorityBadge = (riskScore: number, reportCount: number) => {
    if (riskScore >= 70) {
      return <Badge variant="destructive">High Priority</Badge>;
    }
    if (riskScore >= 40 || reportCount >= 3) {
      return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">Medium</Badge>;
    }
    return <Badge variant="outline">Low</Badge>;
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'review': return <FileText className="h-4 w-4" />;
      case 'photo': return <ImageIcon className="h-4 w-4" />;
      case 'profile': return <User className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const highPriority = items.filter(i => i.risk_score >= 70);
  const mediumPriority = items.filter(i => i.risk_score >= 40 && i.risk_score < 70);
  const lowPriority = items.filter(i => i.risk_score < 40);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderItemRow = (item: FlaggedItem) => (
    <div 
      key={item.id}
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => setSelectedItem(item)}
    >
      <div className="flex items-start gap-4 flex-1">
        <div className="flex-shrink-0">
          {getContentTypeIcon(item.content_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {getPriorityBadge(item.risk_score, item.report_count)}
            <Badge variant="secondary" className="capitalize">{item.content_type}</Badge>
            <Badge variant="outline">{item.flag_source.replace('_', ' ')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.content_text || item.content_url || 'No preview available'}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Flag className="h-3 w-3" />
              {item.report_count} reports
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Risk: {item.risk_score}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm">
        Review
      </Button>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Moderation Queue
          </CardTitle>
          <CardDescription>
            {items.length} items awaiting review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="high" className="relative">
                High Priority
                {highPriority.length > 0 && (
                  <Badge className="ml-2 h-5 px-1.5 bg-red-500">{highPriority.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="medium">
                Medium
                {mediumPriority.length > 0 && (
                  <span className="ml-1 text-muted-foreground">({mediumPriority.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="low">
                Low ({lowPriority.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="high" className="space-y-3">
              {highPriority.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No high priority items</p>
                </div>
              ) : (
                highPriority.map(renderItemRow)
              )}
            </TabsContent>

            <TabsContent value="medium" className="space-y-3">
              {mediumPriority.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No medium priority items
                </div>
              ) : (
                mediumPriority.map(renderItemRow)
              )}
            </TabsContent>

            <TabsContent value="low" className="space-y-3">
              {lowPriority.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No low priority items
                </div>
              ) : (
                lowPriority.map(renderItemRow)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getContentTypeIcon(selectedItem.content_type)}
                  Review {selectedItem.content_type}
                </DialogTitle>
                <DialogDescription>
                  Flagged {formatDistanceToNow(new Date(selectedItem.created_at), { addSuffix: true })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Content preview */}
                <div>
                  <h4 className="font-medium mb-2">Content</h4>
                  {selectedItem.content_text && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedItem.content_text}</p>
                    </div>
                  )}
                  {selectedItem.content_url && (
                    <img 
                      src={selectedItem.content_url} 
                      alt="Flagged content"
                      className="max-w-full h-auto rounded-lg"
                    />
                  )}
                </div>

                {/* Flag details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Flag Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Source:</span>
                        <span className="capitalize">{selectedItem.flag_source.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Risk Score:</span>
                        <span className={selectedItem.risk_score >= 70 ? 'text-red-600 font-medium' : ''}>
                          {selectedItem.risk_score}/100
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">User Reports:</span>
                        <span>{selectedItem.report_count}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Content Owner</h4>
                    {selectedItem.owner_id ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span>{selectedItem.owner_name || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trust Level:</span>
                          <span className="capitalize">{selectedItem.owner_trust_level}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prior Warnings:</span>
                          <span>{selectedItem.owner_warnings || 0}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Unknown user</p>
                    )}
                  </div>
                </div>

                {/* Matched patterns */}
                {selectedItem.matched_patterns && selectedItem.matched_patterns.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Detected Patterns</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.matched_patterns.map((pattern, i) => (
                        <Badge key={i} variant="outline" className="bg-red-50 text-red-800">
                          {pattern.category}: "{pattern.match}"
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flag reasons */}
                {selectedItem.flag_reasons && selectedItem.flag_reasons.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Flag Reasons</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.flag_reasons.map((reason, i) => (
                        <Badge key={i} variant="secondary" className="capitalize">
                          {reason.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  onClick={() => handleAction('approve')}
                  disabled={submitting}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleAction('hide')}
                  disabled={submitting}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setActionDialog('warn')}
                  disabled={submitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Warn User
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleAction('remove')}
                  disabled={submitting}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <Dialog open={actionDialog === 'warn'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Warning</DialogTitle>
            <DialogDescription>
              Send an educational warning to the user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Warning Type</Label>
              <Select value={warningType} onValueChange={setWarningType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WARNING_TEMPLATES.map(t => (
                    <SelectItem key={t.type} value={t.type}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                className="mt-1"
                rows={4}
                placeholder={WARNING_TEMPLATES.find(t => t.type === warningType)?.message}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to use the default template message
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleSendWarning} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Send Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

