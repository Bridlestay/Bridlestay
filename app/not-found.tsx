import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-12 pb-12 text-center">
          {/* Large 404 */}
          <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
          
          {/* Message */}
          <h2 className="text-3xl font-serif font-bold mb-4">Page Not Found</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/">
                <Home className="mr-2 h-5 w-5" />
                Go Home
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/search">
                <Search className="mr-2 h-5 w-5" />
                Search Properties
              </Link>
            </Button>
          </div>

          {/* Helpful Links */}
          <div className="mt-12 pt-8 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Looking for something specific?
            </p>
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <Link href="/routes" className="text-primary hover:underline">
                Browse Routes
              </Link>
              <Link href="/dashboard" className="text-primary hover:underline">
                My Dashboard
              </Link>
              <Link href="/messages" className="text-primary hover:underline">
                Messages
              </Link>
              <Link href="/account" className="text-primary hover:underline">
                Account Settings
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

