import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Eye, ArrowLeft, Share2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface NewsPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: NewsPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("news_posts")
    .select("title, excerpt, cover_image_url, seo_description")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) {
    return {
      title: "Post Not Found | padoq News",
    };
  }

  return {
    title: `${post.title} | padoq News`,
    description: post.seo_description || post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.cover_image_url ? [post.cover_image_url] : [],
    },
  };
}

export default async function NewsPostPage({ params }: NewsPostPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("news_posts")
    .select(`
      *,
      author:author_id (name, avatar_url)
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) {
    notFound();
  }

  // Increment view count (fire and forget)
  supabase.rpc("increment_news_post_views", { post_id: post.id }).then();

  // Get related posts
  const { data: relatedPosts } = await supabase
    .from("news_posts")
    .select("id, title, slug, excerpt, cover_image_url, published_at, category")
    .eq("status", "published")
    .eq("category", post.category)
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(3);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      announcement: "bg-blue-600",
      feature: "bg-purple-600",
      update: "bg-green-600",
      community: "bg-orange-600",
      tips: "bg-yellow-600",
      event: "bg-pink-600",
    };
    return colors[category] || "bg-gray-600";
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      announcement: "Announcement",
      feature: "New Feature",
      update: "Update",
      community: "Community",
      tips: "Tips & Tricks",
      event: "Event",
    };
    return labels[category] || category;
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Back Button */}
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Link href="/news">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to News
              </Button>
            </Link>
          </div>
        </div>

        {/* Cover Image */}
        {post.cover_image_url && (
          <div className="relative h-96 bg-muted">
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Article Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Article Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Badge className={getCategoryColor(post.category || "")}>
                  {getCategoryLabel(post.category || "")}
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(post.published_at!), "MMMM d, yyyy")}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.ceil((post.content?.length || 0) / 1000)} min read
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {post.views_count} views
                </span>
              </div>

              <h1 className="font-serif text-5xl font-bold mb-6">
                {post.title}
              </h1>

              <p className="text-xl text-muted-foreground mb-6">
                {post.excerpt}
              </p>

              {/* Author Info */}
              <div className="flex items-center justify-between py-6 border-y">
                <div className="flex items-center gap-3">
                  {post.author?.avatar_url && (
                    <div className="relative h-12 w-12 rounded-full overflow-hidden">
                      <Image
                        src={post.author.avatar_url}
                        alt={post.author.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{post.author?.name || "padoq Team"}</p>
                    <p className="text-sm text-muted-foreground">
                      Published {format(new Date(post.published_at!), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Article Body */}
            <div 
              className="prose prose-lg max-w-none mb-12"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-12">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Related Posts */}
            {relatedPosts && relatedPosts.length > 0 && (
              <div className="mt-16 pt-12 border-t">
                <h2 className="font-serif text-3xl font-bold mb-8">Related News</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedPosts.map((relatedPost) => (
                    <Link key={relatedPost.id} href={`/news/${relatedPost.slug}`}>
                      <Card className="h-full overflow-hidden hover:shadow-lg transition-all">
                        {relatedPost.cover_image_url && (
                          <div className="relative h-40">
                            <Image
                              src={relatedPost.cover_image_url}
                              alt={relatedPost.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <Badge className={getCategoryColor(relatedPost.category || "")} variant="secondary" className="mb-2">
                            {getCategoryLabel(relatedPost.category || "")}
                          </Badge>
                          <h3 className="font-semibold mb-2 line-clamp-2 hover:text-primary transition-colors">
                            {relatedPost.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {relatedPost.excerpt}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

