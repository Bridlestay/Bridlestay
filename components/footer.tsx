import Link from "next/link";
import { Facebook, Twitter, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Company */}
          <div>
            <h3 className="font-serif font-semibold text-lg mb-4">BridleStay</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The UK&apos;s premier equestrian accommodation marketplace
            </p>
            <div className="flex gap-4">
              <Link
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Discover */}
          <div>
            <h4 className="font-semibold mb-4">Discover</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/search"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Search Properties
                </Link>
              </li>
              <li>
                <Link
                  href="/routes"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Riding Routes
                </Link>
              </li>
              <li>
                <Link
                  href="/host"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Become a Host
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/host-agreement"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Host Agreement
                </Link>
              </li>
              <li>
                <Link
                  href="/cancellation-policy"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Cancellation Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/modern-slavery"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Modern Slavery Act
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/help"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works/guests"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  How It Works (Guests)
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works/hosts"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  How It Works (Hosts)
                </Link>
              </li>
              <li>
                <Link
                  href="/safety"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Safety Tips
                </Link>
              </li>
              <li>
                <Link
                  href="/feedback"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Settings */}
          <div>
            <h4 className="font-semibold mb-4">Settings</h4>
            <ul className="space-y-2">
              <li>
                <button className="text-sm text-muted-foreground hover:text-primary transition-colors text-left">
                  🌐 Language: English (UK)
                </button>
              </li>
              <li>
                <button className="text-sm text-muted-foreground hover:text-primary transition-colors text-left">
                  £ Currency: GBP
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} BridleStay. All rights reserved.</p>
          <p className="mt-2">
            Company Registration No: 12345678 | Registered in England and Wales
          </p>
        </div>
      </div>
    </footer>
  );
}


