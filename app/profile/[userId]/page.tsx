import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MapPin, Briefcase, GraduationCap, Music, Lightbulb, Plane, Clock, Heart, Cake, Star, BookOpen, Globe, Languages as LanguagesIcon } from "lucide-react";
import { UserReviewsDisplay } from "@/components/reviews/user-reviews-display";
import { PublicHorsesDisplay } from "@/components/profile/public-horses-display";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Check if current user is verified (required to view profiles)
  // Admins and hosts can always view profiles, guests need to be verified
  if (currentUser) {
    const { data: currentUserData } = await supabase
      .from("users")
      .select("admin_verified, email_verified, role")
      .eq("id", currentUser.id)
      .single();

    // Allow admins and hosts to bypass verification check
    // Hosts need to view profiles to communicate with guests
    const isAdminOrHost = currentUserData?.role === 'admin' || currentUserData?.role === 'host';
    
    if (!isAdminOrHost && (!currentUserData?.admin_verified || !currentUserData?.email_verified)) {
      redirect("/dashboard?error=not_verified");
    }
  } else {
    redirect("/auth/sign-in");
  }

  // Get the target user's profile
  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    redirect("/dashboard?error=profile_not_found");
  }

  // Get user's properties if they're a host
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, city, county, nightly_price_pennies, published, property_photos(url, is_cover)")
    .eq("host_id", userId)
    .eq("published", true)
    .limit(3);

  // Get user's horses (only public ones for profile view)
  const { data: horses } = await supabase
    .from("user_horses")
    .select("id, name, photo_url, breed, age, gender, temperament, quick_facts")
    .eq("user_id", userId)
    .eq("public", true)
    .order("created_at", { ascending: false });

  return (
    <>
      <Header />
      <main className="bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile.name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h1 className="font-serif text-3xl font-bold">{profile.name}</h1>
                        {profile.admin_verified && (
                          <Badge className="bg-blue-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 mb-4">
                        {profile.role === "host" && (
                          <Badge variant="outline">Host</Badge>
                        )}
                        {profile.average_rating && profile.review_count > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">⭐ {profile.average_rating.toFixed(1)}</span>
                            <span className="text-sm text-muted-foreground">
                              ({profile.review_count} {profile.review_count === 1 ? 'review' : 'reviews'})
                            </span>
                          </div>
                        )}
                      </div>

                      {profile.bio && (
                        <p className="text-muted-foreground mt-4">{profile.bio}</p>
                      )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          {(profile.dream_destination || profile.work || profile.spend_time || profile.pets || profile.decade_born || profile.school || profile.fun_fact || profile.useless_skill || profile.favorite_song || profile.biography_title || profile.obsessed_with || profile.languages) && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>About {profile.name?.split(' ')[0]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.dream_destination && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Where I've always wanted to go</p>
                        <p className="text-sm">{profile.dream_destination}</p>
                      </div>
                    </div>
                  )}
                  {profile.work && (
                    <div className="flex items-start gap-3">
                      <Briefcase className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">My work</p>
                        <p className="text-sm">{profile.work}</p>
                      </div>
                    </div>
                  )}
                  {profile.spend_time && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">I spend too much time</p>
                        <p className="text-sm">{profile.spend_time}</p>
                      </div>
                    </div>
                  )}
                  {profile.pets && (
                    <div className="flex items-start gap-3">
                      <Heart className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pets</p>
                        <p className="text-sm">{profile.pets}</p>
                      </div>
                    </div>
                  )}
                  {profile.decade_born && (
                    <div className="flex items-start gap-3">
                      <Cake className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Decade I was born</p>
                        <p className="text-sm">{profile.decade_born}</p>
                      </div>
                    </div>
                  )}
                  {profile.school && (
                    <div className="flex items-start gap-3">
                      <GraduationCap className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Where I went to school</p>
                        <p className="text-sm">{profile.school}</p>
                      </div>
                    </div>
                  )}
                  {profile.fun_fact && (
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">My fun fact</p>
                        <p className="text-sm">{profile.fun_fact}</p>
                      </div>
                    </div>
                  )}
                  {profile.useless_skill && (
                    <div className="flex items-start gap-3">
                      <Star className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">My most useless skill</p>
                        <p className="text-sm">{profile.useless_skill}</p>
                      </div>
                    </div>
                  )}
                  {profile.favorite_song && (
                    <div className="flex items-start gap-3">
                      <Music className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">My favourite song</p>
                        <p className="text-sm">{profile.favorite_song}</p>
                      </div>
                    </div>
                  )}
                  {profile.biography_title && (
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">My biography title would be</p>
                        <p className="text-sm">{profile.biography_title}</p>
                      </div>
                    </div>
                  )}
                  {profile.obsessed_with && (
                    <div className="flex items-start gap-3">
                      <Heart className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">I'm obsessed with</p>
                        <p className="text-sm">{profile.obsessed_with}</p>
                      </div>
                    </div>
                  )}
                  {profile.languages && (
                    <div className="flex items-start gap-3">
                      <LanguagesIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Languages I speak</p>
                        <p className="text-sm">{profile.languages}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Listings (if host) */}
          {properties && properties.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{profile.name?.split(' ')[0]}&apos;s Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {properties.map((property) => {
                    const coverPhoto = property.property_photos?.find(p => p.is_cover) || property.property_photos?.[0];
                    return (
                      <a
                        key={property.id}
                        href={`/property/${property.id}`}
                        className="block hover:opacity-80 transition-opacity"
                      >
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-2">
                          {coverPhoto?.url && (
                            <img
                              src={coverPhoto.url}
                              alt={property.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <p className="font-medium text-sm">{property.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.city}, {property.county}
                        </p>
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Horses Section */}
          {horses && horses.length > 0 && (
            <div className="mt-6">
              <PublicHorsesDisplay horses={horses} userName={profile.name?.split(' ')[0] || profile.name} />
            </div>
          )}

          {/* Reviews Section - Reviews from hosts */}
          <div className="mt-6">
            <UserReviewsDisplay userId={profile.id} />
          </div>
        </div>
      </main>
    </>
  );
}

