"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Gift, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Users, 
  TrendingUp,
  Copy,
  Loader2,
  Eye,
  EyeOff,
  Percent,
  Calendar,
  Hash
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";

interface ReferralCode {
  id: string;
  code: string;
  owner_user_id: string | null;
  code_type: string;
  benefit_type: string;
  benefit_value: number;
  benefit_duration_months: number | null;
  benefit_uses_limit: number | null;
  referrer_benefit_type: string | null;
  referrer_benefit_value: number | null;
  max_uses: number | null;
  uses_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
  owner?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface Redemption {
  id: string;
  user_id: string;
  code_id: string;
  status: string;
  total_savings_pennies: number;
  bookings_with_benefit: number;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
  referral_code?: {
    code: string;
  };
}

const CODE_TYPES = [
  { value: "user_referral", label: "User Referral" },
  { value: "promo", label: "Promo Code" },
  { value: "influencer", label: "Influencer" },
  { value: "partner", label: "Partner" },
];

const BENEFIT_TYPES = [
  { value: "guest_fee_discount", label: "Guest Fee Discount (%)" },
  { value: "host_fee_waiver", label: "Host Fee Waiver (%)" },
  { value: "fixed_credit", label: "Fixed Credit (pennies)" },
];

export function ReferralsDashboard() {
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const { toast } = useToast();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<ReferralCode | null>(null);
  const [codeRedemptions, setCodeRedemptions] = useState<Redemption[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    code_type: "promo",
    benefit_type: "guest_fee_discount",
    benefit_value: 10,
    benefit_duration_months: 0,
    benefit_uses_limit: 0,
    referrer_benefit_type: "none",
    referrer_benefit_value: 0,
    max_uses: 0,
    valid_until: "",
    is_active: true,
    description: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Fetch all referral codes
      const { data: codesData } = await supabase
        .from("referral_codes")
        .select(`
          *,
          owner:users!referral_codes_owner_user_id_fkey(id, name, email, avatar_url)
        `)
        .order("created_at", { ascending: false });

      // Fetch recent redemptions
      const { data: redemptionsData } = await supabase
        .from("referral_redemptions")
        .select(`
          *,
          user:users!referral_redemptions_user_id_fkey(id, name, email, avatar_url),
          referral_code:referral_codes!referral_redemptions_code_id_fkey(code)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      setCodes(codesData || []);
      setRedemptions(redemptionsData || []);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleCreateCode = async () => {
    setSubmitting(true);
    const supabase = createClient();

    try {
      const insertData: any = {
        code: formData.code.toUpperCase(),
        code_type: formData.code_type,
        benefit_type: formData.benefit_type,
        benefit_value: formData.benefit_value,
        is_active: formData.is_active,
        description: formData.description || null,
      };

      if (formData.benefit_duration_months > 0) {
        insertData.benefit_duration_months = formData.benefit_duration_months;
      }
      if (formData.benefit_uses_limit > 0) {
        insertData.benefit_uses_limit = formData.benefit_uses_limit;
      }
      if (formData.max_uses > 0) {
        insertData.max_uses = formData.max_uses;
      }
      if (formData.valid_until) {
        insertData.valid_until = formData.valid_until;
      }
      if (formData.referrer_benefit_type !== "none") {
        insertData.referrer_benefit_type = formData.referrer_benefit_type;
        insertData.referrer_benefit_value = formData.referrer_benefit_value;
      }

      const { error } = await supabase.from("referral_codes").insert(insertData);

      if (error) throw error;

      toast({ title: "Referral code created successfully!" });
      setCreateDialogOpen(false);
      resetForm();
      fetchData();
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

  const handleUpdateCode = async () => {
    if (!selectedCode) return;
    setSubmitting(true);
    const supabase = createClient();

    try {
      const updateData: any = {
        code: formData.code.toUpperCase(),
        code_type: formData.code_type,
        benefit_type: formData.benefit_type,
        benefit_value: formData.benefit_value,
        is_active: formData.is_active,
        description: formData.description || null,
        benefit_duration_months: formData.benefit_duration_months > 0 ? formData.benefit_duration_months : null,
        benefit_uses_limit: formData.benefit_uses_limit > 0 ? formData.benefit_uses_limit : null,
        max_uses: formData.max_uses > 0 ? formData.max_uses : null,
        valid_until: formData.valid_until || null,
      };

      const { error } = await supabase
        .from("referral_codes")
        .update(updateData)
        .eq("id", selectedCode.id);

      if (error) throw error;

      toast({ title: "Referral code updated successfully!" });
      setEditDialogOpen(false);
      setSelectedCode(null);
      resetForm();
      fetchData();
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

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm("Are you sure you want to delete this code?")) return;
    
    const supabase = createClient();
    const { error } = await supabase.from("referral_codes").delete().eq("id", codeId);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Code deleted" });
      fetchData();
    }
  };

  const handleToggleActive = async (code: ReferralCode) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("referral_codes")
      .update({ is_active: !code.is_active })
      .eq("id", code.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      fetchData();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied to clipboard" });
  };

  const viewCodeUsers = async (code: ReferralCode) => {
    setSelectedCode(code);
    setUsersDialogOpen(true);
    setLoadingRedemptions(true);
    
    const supabase = createClient();
    const { data } = await supabase
      .from("referral_redemptions")
      .select(`
        *,
        user:users!referral_redemptions_user_id_fkey(id, name, email, avatar_url)
      `)
      .eq("code_id", code.id)
      .order("created_at", { ascending: false });
    
    setCodeRedemptions(data || []);
    setLoadingRedemptions(false);
  };

  const openEditDialog = (code: ReferralCode) => {
    setSelectedCode(code);
    setFormData({
      code: code.code,
      code_type: code.code_type,
      benefit_type: code.benefit_type,
      benefit_value: code.benefit_value,
      benefit_duration_months: code.benefit_duration_months || 0,
      benefit_uses_limit: code.benefit_uses_limit || 0,
      referrer_benefit_type: code.referrer_benefit_type || "none",
      referrer_benefit_value: code.referrer_benefit_value || 0,
      max_uses: code.max_uses || 0,
      valid_until: code.valid_until ? code.valid_until.split("T")[0] : "",
      is_active: code.is_active,
      description: code.description || "",
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      code_type: "promo",
      benefit_type: "guest_fee_discount",
      benefit_value: 10,
      benefit_duration_months: 0,
      benefit_uses_limit: 0,
      referrer_benefit_type: "none",
      referrer_benefit_value: 0,
      max_uses: 0,
      valid_until: "",
      is_active: true,
      description: "",
    });
  };

  const getBenefitLabel = (type: string, value: number) => {
    if (type === "guest_fee_discount") return `${value}% off guest fees`;
    if (type === "host_fee_waiver") return `${value}% off host fees`;
    if (type === "fixed_credit") return `£${(value / 100).toFixed(2)} credit`;
    return type;
  };

  const filteredCodes = codes.filter((code) => {
    const matchesSearch = code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || code.code_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Stats
  const totalCodes = codes.length;
  const activeCodes = codes.filter(c => c.is_active).length;
  const totalRedemptions = redemptions.length;
  const totalSavings = redemptions.reduce((sum, r) => sum + r.total_savings_pennies, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCodes}</p>
                <p className="text-sm text-muted-foreground">Total Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCodes}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRedemptions}</p>
                <p className="text-sm text-muted-foreground">Redemptions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">£{(totalSavings / 100).toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Total Savings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-center">
            <Button onClick={() => setCreateDialogOpen(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Code
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all-codes">
        <TabsList>
          <TabsTrigger value="all-codes">All Codes</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
        </TabsList>

        {/* All Codes Tab */}
        <TabsContent value="all-codes" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CODE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Codes Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Benefit</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-lg">{code.code}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyCode(code.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {code.description && (
                        <p className="text-xs text-muted-foreground mt-1">{code.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.owner ? (
                        <Link 
                          href={`/profile/${code.owner.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary">
                            <AvatarImage src={code.owner.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-xs">
                              {code.owner.name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{code.owner.name}</p>
                            <p className="text-xs text-muted-foreground">{code.owner.email}</p>
                          </div>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">System/Admin</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {code.code_type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {getBenefitLabel(code.benefit_type, code.benefit_value)}
                        {code.benefit_duration_months && (
                          <span className="text-muted-foreground"> for {code.benefit_duration_months}mo</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium hover:underline"
                        onClick={() => viewCodeUsers(code)}
                        title="View users who used this code"
                      >
                        {code.uses_count}
                        {code.max_uses && (
                          <span className="text-muted-foreground font-normal"> / {code.max_uses}</span>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {code.valid_until ? (
                        <span className="text-sm">
                          {format(new Date(code.valid_until), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.is_active ? (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewCodeUsers(code)}
                          title="View users who used this code"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(code)}
                          title="Edit code"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(code)}
                          title={code.is_active ? "Deactivate code" : "Activate code"}
                        >
                          {code.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCode(code.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete code"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Redemptions Tab */}
        <TabsContent value="redemptions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Redemptions</CardTitle>
              <CardDescription>Users who have redeemed referral codes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Savings</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Redeemed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.map((redemption) => (
                    <TableRow key={redemption.id}>
                      <TableCell>
                        {redemption.user ? (
                          <Link 
                            href={`/profile/${redemption.user.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary">
                              <AvatarImage src={redemption.user.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-xs">
                                {redemption.user.name?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{redemption.user.name}</p>
                              <p className="text-xs text-muted-foreground">{redemption.user.email}</p>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown user</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="font-mono">{redemption.referral_code?.code}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={redemption.status === "active" ? "default" : "secondary"}>
                          {redemption.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        £{(redemption.total_savings_pennies / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {redemption.bookings_with_benefit}
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(redemption.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Code Dialog */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          setSelectedCode(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editDialogOpen ? "Edit Referral Code" : "Create New Code"}</DialogTitle>
            <DialogDescription>
              {editDialogOpen ? "Update the code details below." : "Create a new referral or promo code."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2024"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button variant="outline" onClick={generateRandomCode} className="w-full">
                  <Hash className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code Type</Label>
                <Select value={formData.code_type} onValueChange={(v) => setFormData({ ...formData, code_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CODE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Benefit Type</Label>
                <Select value={formData.benefit_type} onValueChange={(v) => setFormData({ ...formData, benefit_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BENEFIT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  {formData.benefit_type === "fixed_credit" ? "Amount (pennies)" : "Discount (%)"}
                </Label>
                <Input
                  type="number"
                  value={formData.benefit_value}
                  onChange={(e) => setFormData({ ...formData, benefit_value: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (months)</Label>
                <Input
                  type="number"
                  value={formData.benefit_duration_months}
                  onChange={(e) => setFormData({ ...formData, benefit_duration_months: parseInt(e.target.value) || 0 })}
                  placeholder="0 = forever"
                />
              </div>
              <div className="space-y-2">
                <Label>Uses Limit</Label>
                <Input
                  type="number"
                  value={formData.benefit_uses_limit}
                  onChange={(e) => setFormData({ ...formData, benefit_uses_limit: parseInt(e.target.value) || 0 })}
                  placeholder="0 = unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Total Uses</Label>
                <Input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 0 })}
                  placeholder="0 = unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label>Expires On</Label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Internal note about this code"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={editDialogOpen ? handleUpdateCode : handleCreateCode} disabled={submitting || !formData.code}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editDialogOpen ? "Update Code" : "Create Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Code Users Dialog */}
      <Dialog open={usersDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setUsersDialogOpen(false);
          setSelectedCode(null);
          setCodeRedemptions([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Users who used code: <code className="font-mono bg-muted px-2 py-1 rounded">{selectedCode?.code}</code>
            </DialogTitle>
            <DialogDescription>
              {selectedCode?.owner ? (
                <>Created by {selectedCode.owner.name} ({selectedCode.owner.email})</>
              ) : (
                <>System/Admin created code</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingRedemptions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : codeRedemptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No one has used this code yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Savings</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Redeemed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codeRedemptions.map((redemption) => (
                    <TableRow key={redemption.id}>
                      <TableCell>
                        {redemption.user ? (
                          <Link 
                            href={`/profile/${redemption.user.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary">
                              <AvatarImage src={redemption.user.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-xs">
                                {redemption.user.name?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{redemption.user.name}</p>
                              <p className="text-xs text-muted-foreground">{redemption.user.email}</p>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown user</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={redemption.status === "active" ? "default" : "secondary"}>
                          {redemption.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        £{(redemption.total_savings_pennies / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {redemption.bookings_with_benefit}
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(redemption.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setUsersDialogOpen(false);
              setSelectedCode(null);
              setCodeRedemptions([]);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

