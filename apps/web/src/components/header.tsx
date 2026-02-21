"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  Compass,
  Sun,
  Building2,
  Anchor,
  ChevronRight,
  Search,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@tour/ui";
import { useScrollState } from "@/hooks/use-scroll-state";

/* ============================================================================
   TYPES
   ========================================================================== */

interface HeaderProps {
  orgName: string;
  logo: string | null;
  primaryColor: string;
  timezone: string;
  currency: string;
}

type MegaMenuTab = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  links: {
    label: string;
    href: string;
    badge?: "Popular" | "New" | "Top Seller";
  }[];
  viewAllHref: string;
};

/* ============================================================================
   NAVIGATION DATA
   ========================================================================== */

const MEGA_TABS: MegaMenuTab[] = [
  {
    id: "desert-tours",
    label: "Desert Tours",
    icon: Sun,
    description:
      "From thrilling dune bashing to tranquil camel rides under the stars — experience the magic of Arabian desert landscapes.",
    links: [
      { label: "Morning Safari", href: "/experiences/desert-safaris", badge: "Popular" },
      { label: "Evening Safari", href: "/experiences/desert-safaris", badge: "Top Seller" },
      { label: "Overnight Camp", href: "/experiences/desert-safaris" },
      { label: "Dune Buggy", href: "/experiences/desert-safaris" },
      { label: "Camel Trekking", href: "/experiences/desert-safaris" },
      { label: "VIP Safari", href: "/experiences/desert-safaris", badge: "New" },
    ],
    viewAllHref: "/experiences/desert-safaris",
  },
  {
    id: "city-tours",
    label: "City Tours",
    icon: Building2,
    description:
      "Explore the modern skyline, cultural heritage, and iconic landmarks of the UAE's most vibrant cities.",
    links: [
      { label: "Dubai City Tour", href: "/experiences/city-tours", badge: "Popular" },
      { label: "Abu Dhabi Full Day", href: "/experiences/city-tours", badge: "Top Seller" },
      { label: "Burj Khalifa Tickets", href: "/experiences/city-tours" },
      { label: "Old Dubai Heritage", href: "/experiences/city-tours" },
      { label: "Hop-On Hop-Off Bus", href: "/experiences/city-tours" },
    ],
    viewAllHref: "/experiences/city-tours",
  },
  {
    id: "water-sports",
    label: "Water Sports",
    icon: Anchor,
    description:
      "Feel the adrenaline with jet skis, parasailing, and boat adventures across the stunning Arabian Gulf.",
    links: [
      { label: "Jet Ski Rental", href: "/experiences/water-activities", badge: "Popular" },
      { label: "Parasailing", href: "/experiences/water-activities" },
      { label: "Flyboard Experience", href: "/experiences/water-activities" },
      { label: "Scuba Diving", href: "/experiences/water-activities", badge: "New" },
      { label: "Speedboat Tour", href: "/experiences/water-activities" },
    ],
    viewAllHref: "/experiences/water-activities",
  },
  {
    id: "private-tours",
    label: "Private Tours",
    icon: Compass,
    description:
      "Exclusive VIP experiences tailored completely to your schedule, preferences, and group size.",
    links: [
      { label: "Private Desert Safaris", href: "/experiences/private-tours" },
      { label: "Luxury Yacht Charters", href: "/experiences/private-tours", badge: "Popular" },
      { label: "Custom City Tours", href: "/experiences/private-tours" },
      { label: "Airport Transfers", href: "/experiences/private-tours" },
    ],
    viewAllHref: "/experiences/private-tours",
  },
];

/* ============================================================================
   BADGE
   ========================================================================== */

function BadgePill({ badge }: { badge: "Popular" | "New" | "Top Seller" }) {
  const colors =
    badge === "Popular"
      ? "bg-orange-50 text-orange-700 ring-orange-200/60"
      : badge === "Top Seller"
        ? "bg-amber-50 text-amber-700 ring-amber-200/60"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200/60";

  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${colors}`}
    >
      {badge}
    </span>
  );
}

/* ============================================================================
   HEADER COMPONENT
   ========================================================================== */

export function Header({
  orgName,
  logo,
  primaryColor,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  timezone: _timezone,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currency: _currency,
}: HeaderProps) {
  const pathname = usePathname() || "/";
  const { isScrolled } = useScrollState(8);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [activeTabId, setActiveTabId] = useState("desert-tours");
  const [mobileExpandedCategory, setMobileExpandedCategory] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const openMega = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setMegaOpen(true);
  }, []);

  const scheduleMegaClose = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => setMegaOpen(false), 200);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  const closeNow = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setMegaOpen(false);
  }, []);

  // Close everything on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  const isToursActive = pathname === "/" || pathname.startsWith("/tours") || pathname.startsWith("/experiences");
  const activeTab = MEGA_TABS.find((t) => t.id === activeTabId) ?? MEGA_TABS[0]!;

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* ========== SINGLE-TIER NAV BAR (Glass morphism) ========== */}
      <div
        className={`border-b transition-all duration-300 ${
          isScrolled
            ? "border-border/60 bg-background/80 backdrop-blur-2xl shadow-[var(--shadow-sm)]"
            : "border-transparent bg-transparent"
        }`}
        onMouseLeave={scheduleMegaClose}
      >
        <div
          className="mx-auto flex h-[72px] w-full items-center gap-6 px-[var(--page-gutter)]"
          style={{ maxWidth: "var(--page-max-width, 1400px)" }}
        >
          {/* Logo */}
          <Link href="/" className="flex min-w-0 items-center gap-3">
            {logo ? (
              <Image
                src={logo}
                alt={`${orgName} logo`}
                width={40}
                height={40}
                className="rounded-xl object-contain"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {orgName.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="hidden truncate font-display text-lg font-bold sm:block">
              {orgName}
            </p>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* ========== DESKTOP NAV ========== */}
          <nav className="hidden items-center gap-1 lg:flex">
            {/* Tours dropdown */}
            <button
              onMouseEnter={openMega}
              onClick={() => setMegaOpen((o) => !o)}
              className={`relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                megaOpen
                  ? "bg-accent text-foreground"
                  : isToursActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tours & Experiences
              <ChevronDown
                className={`h-3 w-3 opacity-50 transition-transform duration-200 ${megaOpen ? "rotate-180 opacity-100" : ""}`}
              />
            </button>

            <Link
              href="/about"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                pathname === "/about" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              About
            </Link>

            <Link
              href="/contact"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                pathname === "/contact" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Contact
            </Link>

            {/* Divider */}
            <div className="mx-2 h-5 w-px bg-border/60" />

            {/* Search */}
            <button
              onClick={() => {
                const el = document.getElementById("tours");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Search tours"
            >
              <Search className="h-4 w-4" />
            </button>

            <Button asChild variant="ghost" className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground">
              <Link href="/booking">Manage booking</Link>
            </Button>

            {/* Book Now CTA with glow */}
            <Button
              asChild
              className="h-10 rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition-all duration-300 hover:bg-primary/90 hover:shadow-[var(--shadow-glow)] hover:scale-[1.02] active:scale-95"
            >
              <Link href="/#tours" className="inline-flex items-center gap-2">
                Book Now
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </nav>

          {/* Mobile menu button */}
          <button
            className="rounded-lg p-2.5 transition-colors hover:bg-accent lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ========== MEGA MENU ========== */}
      <div
        className={`absolute left-0 right-0 z-40 border-b border-border/40 bg-background shadow-[var(--shadow-xl)] transition-all duration-200 origin-top ${
          megaOpen
            ? "opacity-100 scale-y-100"
            : "opacity-0 scale-y-95 pointer-events-none"
        }`}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleMegaClose}
      >
        <div className="mx-auto flex" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          {/* Category sidebar */}
          <div className="w-[240px] shrink-0 border-r border-border/30 bg-stone-50 py-4 px-3">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
              Categories
            </p>
            <div className="flex flex-col gap-0.5">
              {MEGA_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    onMouseEnter={() => setActiveTabId(tab.id)}
                    className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-white shadow-md"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                        isActive ? "bg-white/20" : "bg-stone-200/60 group-hover:bg-accent"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`} />
                    </div>
                    <span className="flex-1 text-sm font-semibold">{tab.label}</span>
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-all duration-200 ${
                        isActive ? "opacity-100 translate-x-0 text-white/80" : "opacity-0 -translate-x-1"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-8">
            <div className="mb-5">
              <h3 className="text-base font-bold text-foreground">{activeTab.label}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {activeTab.description}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-0.5 lg:grid-cols-3">
              {activeTab.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={closeNow}
                  className="group flex items-center rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                >
                  <span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {link.label}
                  </span>
                  {link.badge && <BadgePill badge={link.badge} />}
                </Link>
              ))}
            </div>

            <Link
              href={activeTab.viewAllHref}
              onClick={closeNow}
              className="group flex items-center justify-between rounded-2xl bg-stone-50 px-5 py-3.5 transition-colors hover:bg-stone-100"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Browse all {activeTab.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {activeTab.links.length}+ experiences available
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          </div>
        </div>
      </div>

      {/* ========== MOBILE MENU (full-screen overlay) ========== */}
      <div
        className={`fixed inset-0 top-[72px] z-40 bg-background transition-all duration-300 lg:hidden ${
          mobileMenuOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="h-full overflow-y-auto overscroll-contain">
          <nav className="space-y-1 p-5">
            {/* Tours Section */}
            <div className="py-1">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Tours & Experiences
              </p>
              <div className="flex flex-col gap-0.5">
                {MEGA_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isExpanded = mobileExpandedCategory === tab.id;
                  return (
                    <div key={tab.id}>
                      <button
                        onClick={() => setMobileExpandedCategory(isExpanded ? null : tab.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                          isExpanded
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-accent"
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isExpanded ? "bg-primary/15" : "bg-stone-100"}`}>
                          <Icon className={`h-4 w-4 ${isExpanded ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <span className="flex-1 text-sm font-semibold">{tab.label}</span>
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      <div className={`grid transition-[grid-template-rows] duration-300 ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden">
                          <div className="space-y-0.5 pl-14 pr-3 pb-2 pt-1">
                            {tab.links.map((link) => (
                              <Link
                                key={link.label}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              >
                                {link.label}
                                {link.badge && <BadgePill badge={link.badge} />}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="my-3 border-t border-border" />

            {/* Other links */}
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-12 items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              About
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-12 items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Contact
            </Link>
            <Link
              href="/trip-inspiration"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-12 items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Trip Inspiration
            </Link>

            {/* Actions */}
            <div className="pt-4 space-y-3">
              <Button asChild variant="outline" className="w-full h-12 rounded-xl text-sm">
                <Link href="/booking">Manage booking</Link>
              </Button>
              <Button
                asChild
                className="w-full h-12 rounded-xl text-sm font-semibold bg-primary text-white"
              >
                <Link href="/" className="inline-flex items-center justify-center gap-2">
                  Book Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
