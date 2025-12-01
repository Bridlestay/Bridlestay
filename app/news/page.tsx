import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "BridleStay News | Updates, Features & Community Stories",
  description: "Stay up to date with the latest BridleStay updates, new features, and community stories",
};

export default async function NewsPage() {
  const supabase = await createClient();

  // Get featured post
  const { data: featuredPost } = await supabase
    .from("news_posts")
    .select(`
      *,
      author:author_id (name, avatar_url)
    `)
    .eq("status", "published")
    .eq("featured", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .single();

  // Get all published posts
  const { data: posts } = await supabase
    .from("news_posts")
    .select(`
      *,
      author:author_id (name, avatar_url)
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false });

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
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl">
              <h1 className="font-serif text-5xl font-bold mb-4">
                BridleStay News
              </h1>
              <p className="text-xl text-muted-foreground">
                Stay informed with the latest updates, features, and stories from the BridleStay community
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Featured Post */}
          {featuredPost && (
            <Link href={`/news/${featuredPost.slug}`}>
              <Card className="mb-12 overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                  {featuredPost.cover_image_url && (
                    <div className="relative h-64 lg:h-full">
                      <Image
                        src={featuredPost.cover_image_url}
                        alt={featuredPost.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-yellow-500 text-black font-semibold">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      </div>
                    </div>
                  )}
                  <CardContent className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className={getCategoryColor(featuredPost.category || "")}>
                        {getCategoryLabel(featuredPost.category || "")}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(featuredPost.published_at!), "MMMM d, yyyy")}
                      </span>
                    </div>
                    <h2 className="font-serif text-3xl font-bold mb-4 hover:text-primary transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="text-muted-foreground mb-6 line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center gap-3">
                      {featuredPost.author?.avatar_url && (
                        <div className="relative h-10 w-10 rounded-full overflow-hidden">
                          <Image
                            src={featuredPost.author.avatar_url}
                            alt={featuredPost.author.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {featuredPost.author?.name || "BridleStay Team"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.ceil((featuredPost.content?.length || 0) / 1000)} min read
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </Link>
          )}

          {/* All Posts Grid */}
          <div>
            <h2 className="font-serif text-2xl font-bold mb-6">Latest News</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts?.filter(post => !post.featured || post.id !== featuredPost?.id).map((post) => (
                <Link key={post.id} href={`/news/${post.slug}`}>
                  <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    {post.cover_image_url && (
                      <div className="relative h-48">
                        <Image
                          src={post.cover_image_url}
                          alt={post.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getCategoryColor(post.category || "")} variant="secondary">
                          {getCategoryLabel(post.category || "")}
                        </Badge>
                      </div>
                      <h3 className="font-serif text-xl font-bold mb-2 line-clamp-2 hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(post.published_at!), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.ceil((post.content?.length || 0) / 1000)} min
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {(!posts || posts.length === 0) && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No news posts yet. Check back soon!</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

