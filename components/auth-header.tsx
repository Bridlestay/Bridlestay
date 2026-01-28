"use client";

import Link from "next/link";
import Image from "next/image";

/**
 * Simple header for authentication pages
 * Provides navigation back to home and brand recognition
 */
export function AuthHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-center">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image
            src="/logo.png"
            alt="padoq"
            width={120}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>
      </div>
    </header>
  );
}

