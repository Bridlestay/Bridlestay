"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Edit, Trash2, Eye, Calendar, Loader2, ExternalLink, Upload, Image as ImageIcon, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  category: string;
  status: string;
  published_at: string | null;
  views_count: number;
  featured: boolean;
  tags: string[];
  created_at: string;
}

export function NewsManager() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<NewsPost | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [contentTab, setContentTab] = useState<"write" | "preview">("write");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    cover_image_url: "",
    category: "announcement",
    status: "draft",
    featured: false,
    tags: "",
    seo_description: "",
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  // Simple markdown to HTML converter
  const renderMarkdown = (text: string) => {
    if (!text) return "";
    return text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline" target="_blank">$1</a>')
      // Lists
      .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/(<li.*<\/li>)/s, '<ul class="list-disc my-2">$1</ul>')
      // Paragraphs (double newline)
      .replace(/\n\n/g, '</p><p class="my-3">')
      // Single newlines
      .replace(/\n/g, '<br />')
      // Wrap in paragraph
      .replace(/^(.*)$/, '<p class="my-3">$1</p>');
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, GIF, WebP)",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const supabase = createClient();
      
      // Create unique filename
      const ext = file.name.split('.').pop();
      const filename = `news-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('news-images')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('news-images')
        .getPublicUrl(filename);

      setFormData({ ...formData, cover_image_url: urlData.publicUrl });
      
      toast({
        title: "Image uploaded",
        description: "Cover image has been uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload image. Make sure 'news-images' storage bucket exists.",
      });
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/admin/news");
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingPost
        ? `/api/admin/news/${editingPost.id}`
        : "/api/admin/news";
      
      const method = editingPost ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });

      if (!response.ok) throw new Error("Failed to save post");

      toast({
        title: editingPost ? "Post updated" : "Post created",
        description: `The news post has been ${editingPost ? "updated" : "created"} successfully.`,
      });

      setDialogOpen(false);
      resetForm();
      fetchPosts();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save news post. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (post: NewsPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      cover_image_url: post.cover_image_url || "",
      category: post.category,
      status: post.status,
      featured: post.featured,
      tags: post.tags?.join(", ") || "",
      seo_description: "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    try {
      const response = await fetch(`/api/admin/news/${postToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete post");

      toast({
        title: "Post deleted",
        description: "The news post has been deleted successfully.",
      });

      fetchPosts();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete news post. Please try again.",
      });
    } finally {
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      excerpt: "",
      content: "",
      cover_image_url: "",
      category: "announcement",
      status: "draft",
      featured: false,
      tags: "",
      seo_description: "",
    });
    setEditingPost(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-600";
      case "draft":
        return "bg-gray-600";
      case "archived":
        return "bg-orange-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>News & Blog Posts</CardTitle>
            <CardDescription>Manage padoq news, updates, and announcements</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPost ? "Edit Post" : "Create New Post"}</DialogTitle>
                <DialogDescription>
                  {editingPost ? "Update the news post details" : "Create a new news post or announcement"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Introducing new features for hosts..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="feature">New Feature</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="community">Community</SelectItem>
                        <SelectItem value="tips">Tips & Tricks</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt *</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    placeholder="A brief summary that appears in the news list..."
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content *</Label>
                  <Tabs value={contentTab} onValueChange={(v) => setContentTab(v as "write" | "preview")} className="mt-2">
                    <TabsList className="mb-2">
                      <TabsTrigger value="write" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Write
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="write" className="mt-0">
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Full article content...

Supports Markdown:
# Heading 1
## Heading 2
**bold** and *italic*
[link text](url)
- list items"
                        rows={12}
                        required
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Supports Markdown and HTML formatting
                      </p>
                    </TabsContent>
                    <TabsContent value="preview" className="mt-0">
                      <div 
                        className="min-h-[280px] max-h-[400px] overflow-y-auto p-4 border rounded-md bg-white prose prose-sm"
                        dangerouslySetInnerHTML={{ 
                          __html: formData.content 
                            ? renderMarkdown(formData.content) 
                            : '<p class="text-muted-foreground">Start writing to see preview...</p>' 
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                <div>
                  <Label>Cover Image</Label>
                  <div className="mt-2 space-y-3">
                    {/* Current image preview */}
                    {formData.cover_image_url && (
                      <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-muted">
                        <img 
                          src={formData.cover_image_url} 
                          alt="Cover preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Upload button */}
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="gap-2"
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {uploadingImage ? "Uploading..." : "Upload Image"}
                      </Button>
                      <span className="text-xs text-muted-foreground self-center">
                        Recommended: 1200x630px, max 5MB
                      </span>
                    </div>
                    
                    {/* Manual URL input */}
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-muted-foreground">Or paste URL:</span>
                      <Input
                        type="url"
                        value={formData.cover_image_url}
                        onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="new-feature, hosts, properties"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="featured" className="cursor-pointer">
                    Feature this post (shows at the top of the news page)
                  </Label>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingPost ? "Update Post" : "Create Post"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No news posts yet. Create your first post!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{post.title}</h3>
                    {post.featured && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Featured
                      </Badge>
                    )}
                    <Badge className={getStatusColor(post.status)}>{post.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {post.published_at
                        ? format(new Date(post.published_at), "MMM d, yyyy")
                        : "Not published"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.views_count} views
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {post.status === "published" && (
                    <Link href={`/news/${post.slug}`} target="_blank">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setPreviewPost(post);
                      setPreviewOpen(true);
                    }}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(post)} title="Edit">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPostToDelete(post.id);
                      setDeleteDialogOpen(true);
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete News Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPostToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog - Matches published page layout */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          {previewPost && (
            <div className="min-h-[600px]">
              {/* Cover Image - Full width like published page */}
              {previewPost.cover_image_url && (
                <div className="relative w-full h-72 bg-muted">
                  <img 
                    src={previewPost.cover_image_url} 
                    alt={previewPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Article Content - Same layout as published page */}
              <div className="px-8 py-8 max-w-4xl mx-auto">
                {/* Article Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className={`${
                      previewPost.category === "announcement" ? "bg-blue-600" :
                      previewPost.category === "feature" ? "bg-purple-600" :
                      previewPost.category === "update" ? "bg-green-600" :
                      previewPost.category === "community" ? "bg-orange-600" :
                      previewPost.category === "tips" ? "bg-yellow-600" :
                      previewPost.category === "event" ? "bg-pink-600" : "bg-gray-600"
                    }`}>
                      {previewPost.category === "announcement" ? "Announcement" :
                       previewPost.category === "feature" ? "New Feature" :
                       previewPost.category === "update" ? "Update" :
                       previewPost.category === "community" ? "Community" :
                       previewPost.category === "tips" ? "Tips & Tricks" :
                       previewPost.category === "event" ? "Event" : previewPost.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {previewPost.published_at 
                        ? format(new Date(previewPost.published_at), "MMMM d, yyyy")
                        : format(new Date(previewPost.created_at), "MMMM d, yyyy")}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {previewPost.views_count} views
                    </span>
                    {previewPost.featured && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Featured</Badge>
                    )}
                  </div>

                  <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-6">
                    {previewPost.title}
                  </h1>

                  <p className="text-xl text-muted-foreground mb-6">
                    {previewPost.excerpt}
                  </p>

                  {/* Author Info - Like published page */}
                  <div className="flex items-center justify-between py-6 border-y">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">P</span>
                      </div>
                      <div>
                        <p className="font-medium">padoq Team</p>
                        <p className="text-sm text-muted-foreground">
                          {previewPost.published_at 
                            ? `Published ${format(new Date(previewPost.published_at), "MMMM d, yyyy")}`
                            : `Draft - ${format(new Date(previewPost.created_at), "MMMM d, yyyy")}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Article Body - Same prose styling as published */}
                <div 
                  className="prose prose-lg max-w-none mb-12"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(previewPost.content) }}
                />

                {/* Tags */}
                {previewPost.tags && previewPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-6 border-t">
                    {previewPost.tags.map((tag, i) => (
                      <Badge key={i} variant="outline">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

