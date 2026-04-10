import type { Metadata } from "next";
import { Inter, Playfair_Display, Cormorant_Garamond } from "next/font/google";
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

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "padoq - Your Complete Horse Companion",
  description: "The UK's complete horse app - find equestrian stays, riding routes, and connect with the horse community",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${cormorant.variable}`}>
      <head>
        <script
          defer
          data-domain={process.env.PLAUSIBLE_DOMAIN || "padoq.com"}
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

