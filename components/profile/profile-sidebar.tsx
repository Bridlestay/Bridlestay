"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { User, Plane, Settings, Star } from "lucide-react";
import { HorseshoeIcon } from "@/components/icons/horseshoe";

interface ProfileSidebarProps {
  activeSection: string;
}

export function ProfileSidebar({ activeSection }: ProfileSidebarProps) {
  const sections = [
    { id: "about", label: "About me", icon: User, href: "/profile?section=about" },
    { id: "trips", label: "Past trips", icon: Plane, href: "/profile?section=trips" },
    { id: "horses", label: "My Horses", icon: HorseshoeIcon, href: "/profile?section=horses" },
    { id: "reviews", label: "Reviews", icon: Star, href: "/profile?section=reviews" },
    { id: "settings", label: "Account settings", icon: Settings, href: "/account" },
  ];

  return (
    <div className="lg:col-span-1">
      <h1 className="font-serif text-4xl font-bold mb-8">Profile</h1>
      <nav className="space-y-2">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              activeSection === section.id
                ? "bg-muted font-medium"
                : "hover:bg-muted/50"
            )}
          >
            <section.icon className="h-5 w-5" />
            {section.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

