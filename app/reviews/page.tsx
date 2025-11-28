import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReviewsList } from "@/components/reviews/reviews-list";

export default async function ReviewsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif mb-2">Leave a Review</h1>
          <p className="text-muted-foreground">
            Share your experience and help build trust in our community. Reviews must be submitted within 14 days after checkout.
          </p>
        </div>

        <ReviewsList />
      </div>
    </div>
  );
}

