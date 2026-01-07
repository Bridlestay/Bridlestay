import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Footer } from "@/components/footer";
import { CookieConsent } from "@/components/cookie-consent";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Cantra - Your Complete Horse Companion",
  description: "The UK's complete horse app - find equestrian stays, riding routes, and connect with the horse community",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script
          defer
          data-domain={process.env.PLAUSIBLE_DOMAIN || "cantra.app"}
          src="https://plausible.io/js/script.js"
        ></script>
      </head>
      <body className="font-sans antialiased flex flex-col min-h-screen">
        <div className="flex-1">
          {children}
        </div>
        <Footer />
        <Toaster />
        <CookieConsent />
      </body>
    </html>
  );
}

