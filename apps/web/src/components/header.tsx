"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  X,
  ShieldCheck,
  Globe2,
  Clock3,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Compass,
  Sun,
  Building2,
  Anchor,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Users,
  Heart,
  Shield,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@tour/ui";
import { motion, AnimatePresence } from "motion/react";

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

type NavPanel = {
  id: string;
  label: string;
  panelType: "tours" | "about" | "contact";
  tabs?: MegaMenuTab[];
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
      { label: "Morning Safari", href: "/?category=Desert+Tours", badge: "Popular" },
      { label: "Evening Safari", href: "/?category=Desert+Tours", badge: "Top Seller" },
      { label: "Overnight Camp", href: "/?category=Desert+Tours" },
      { label: "Dune Buggy", href: "/?category=Desert+Tours" },
      { label: "Camel Trekking", href: "/?category=Desert+Tours" },
      { label: "VIP Safari", href: "/?category=Desert+Tours", badge: "New" },
    ],
    viewAllHref: "/?category=Desert+Tours",
  },
  {
    id: "city-tours",
    label: "City Tours",
    icon: Building2,
    description:
      "Explore the modern skyline, cultural heritage, and iconic landmarks of the UAE's most vibrant cities.",
    links: [
      { label: "Dubai City Tour", href: "/?category=City+Tours", badge: "Popular" },
      { label: "Abu Dhabi Full Day", href: "/?category=City+Tours", badge: "Top Seller" },
      { label: "Burj Khalifa Tickets", href: "/?category=City+Tours" },
      { label: "Old Dubai Heritage", href: "/?category=City+Tours" },
      { label: "Hop-On Hop-Off Bus", href: "/?category=City+Tours" },
    ],
    viewAllHref: "/?category=City+Tours",
  },
  {
    id: "water-sports",
    label: "Water Sports",
    icon: Anchor,
    description:
      "Feel the adrenaline with jet skis, parasailing, and boat adventures across the stunning Arabian Gulf.",
    links: [
      { label: "Jet Ski Rental", href: "/?category=Water+Activities", badge: "Popular" },
      { label: "Parasailing", href: "/?category=Water+Activities" },
      { label: "Flyboard Experience", href: "/?category=Water+Activities" },
      { label: "Scuba Diving", href: "/?category=Water+Activities", badge: "New" },
      { label: "Speedboat Tour", href: "/?category=Water+Activities" },
    ],
    viewAllHref: "/?category=Water+Activities",
  },
  {
    id: "private-tours",
    label: "Private Tours",
    icon: Compass,
    description:
      "Exclusive VIP experiences tailored completely to your schedule, preferences, and group size.",
    links: [
      { label: "Private Desert Safaris", href: "/private-tours?type=desert" },
      { label: "Luxury Yacht Charters", href: "/private-tours?type=yacht", badge: "Popular" },
      { label: "Custom City Tours", href: "/private-tours?type=city" },
      { label: "Airport Transfers", href: "/private-tours?type=transfer" },
    ],
    viewAllHref: "/private-tours",
  },
];

const NAV_PANELS: NavPanel[] = [
  { id: "tours", label: "Tours & Experiences", panelType: "tours", tabs: MEGA_TABS },
  { id: "about", label: "About", panelType: "about" },
  { id: "contact", label: "Contact", panelType: "contact" },
];

/* ============================================================================
   BADGE COMPONENT
   ========================================================================== */

function BadgePill({ badge }: { badge: "Popular" | "New" | "Top Seller" }) {
  const colors =
    badge === "Popular"
      ? "bg-blue-50 text-blue-600 ring-blue-200/60"
      : badge === "Top Seller"
        ? "bg-amber-50 text-amber-600 ring-amber-200/60"
        : "bg-emerald-50 text-emerald-600 ring-emerald-200/60";

  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${colors}`}
    >
      {badge}
    </span>
  );
}

/* ============================================================================
   PANEL CONTENT COMPONENTS
   ========================================================================== */

function ToursPanel({
  tabs,
  activeTabId,
  setActiveTabId,
  onClose,
}: {
  tabs: MegaMenuTab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  onClose: () => void;
}) {
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]!;

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-[240px] shrink-0 border-r border-border/30 bg-muted/20 py-4 px-3">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
          Categories
        </p>
        <div className="flex flex-col gap-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                onMouseEnter={() => setActiveTabId(tab.id)}
                className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-200 ${isActive ? "bg-white/20" : "bg-muted/60 group-hover:bg-accent"
                    }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive
                      ? "text-white"
                      : "text-muted-foreground group-hover:text-foreground"
                      }`}
                  />
                </div>
                <span className="flex-1 text-sm font-semibold">{tab.label}</span>
                <ChevronRight
                  className={`h-3.5 w-3.5 transition-all duration-200 ${isActive
                    ? "opacity-100 translate-x-0 text-white/80"
                    : "opacity-0 -translate-x-1"
                    }`}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-4 border-t border-border/30 pt-3 px-1">
          <Link
            href="/#tours"
            onClick={onClose}
            className="group flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Explore all tours
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full flex-col"
          >
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
                  onClick={onClose}
                  className="group flex items-center rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                >
                  <span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {link.label}
                  </span>
                  {link.badge && <BadgePill badge={link.badge} />}
                </Link>
              ))}
            </div>

            <div className="mt-auto">
              <Link
                href={activeTab.viewAllHref}
                onClick={onClose}
                className="group flex items-center justify-between rounded-xl bg-accent/60 px-4 py-3 transition-colors hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Browse all {activeTab.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {activeTab.links.length}+ experiences available
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AboutPanel({ onClose }: { onClose: () => void }) {
  const cards = [
    {
      icon: Heart,
      title: "Our Story",
      description: "How we became the UAE's most trusted tour operator",
      href: "/about",
    },
    {
      icon: Users,
      title: "Our Team",
      description: "Meet the passionate experts behind every experience",
      href: "/about#team",
    },
    {
      icon: Shield,
      title: "Safety & Trust",
      description: "Licensed, insured, and committed to your safety",
      href: "/about#safety",
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-5">
        <h3 className="text-base font-bold text-foreground">About Us</h3>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
          We craft unforgettable experiences across the UAE — from desert adventures to city
          explorations, every tour is built on local expertise and genuine passion.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              onClick={onClose}
              className="group flex flex-col rounded-xl border border-border/40 bg-accent/30 p-4 transition-all hover:bg-accent hover:shadow-sm"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-[18px] w-[18px] text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">{card.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {card.description}
              </p>
              <ArrowRight className="mt-3 h-3.5 w-3.5 text-muted-foreground/50 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ContactPanel({ onClose }: { onClose: () => void }) {
  const contacts = [
    {
      icon: Phone,
      label: "Call Us",
      value: "+971 4 XXX XXXX",
      sublabel: "Daily 8AM — 10PM GST",
      href: "tel:+97140000000",
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "Chat with us",
      sublabel: "Instant replies, 7 days a week",
      href: "https://wa.me/97140000000",
    },
    {
      icon: Mail,
      label: "Email",
      value: "hello@company.com",
      sublabel: "We respond within 2 hours",
      href: "mailto:hello@company.com",
    },
    {
      icon: MapPin,
      label: "Visit Us",
      value: "Dubai, United Arab Emirates",
      sublabel: "Licensed UAE tour operator",
      href: "/contact",
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-5">
        <h3 className="text-base font-bold text-foreground">Get in Touch</h3>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Have a question about a tour or need help planning your trip? We're here for you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {contacts.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              onClick={onClose}
              className="group flex items-start gap-3 rounded-xl border border-border/40 bg-accent/30 p-4 transition-all hover:bg-accent hover:shadow-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-[18px] w-[18px] text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{c.label}</p>
                <p className="mt-0.5 text-sm text-foreground/80">{c.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{c.sublabel}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4">
        <Link
          href="/contact"
          onClick={onClose}
          className="group flex items-center justify-between rounded-xl bg-accent/60 px-4 py-3 transition-colors hover:bg-accent"
        >
          <p className="text-sm font-semibold text-foreground">
            Visit our full contact page
          </p>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
        </Link>
      </div>
    </div>
  );
}

/* ============================================================================
   UTILITIES
   ========================================================================== */

function isRouteActive(pathname: string, panelId: string): boolean {
  if (panelId === "tours") return pathname === "/" || pathname.startsWith("/tours");
  if (panelId === "about") return pathname === "/about" || pathname.startsWith("/about/");
  if (panelId === "contact") return pathname === "/contact" || pathname.startsWith("/contact/");
  return false;
}

/* ============================================================================
   HEADER COMPONENT
   ========================================================================== */

export function Header({
  orgName,
  logo,
  primaryColor,
  timezone,
  currency,
}: HeaderProps) {
  const pathname = usePathname() || "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>("desert-tours");
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileExpandedCategory, setMobileExpandedCategory] = useState<string | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const openPanel = useCallback((panelId: string) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setActivePanel(panelId);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      setActivePanel(null);
    }, 200);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  const closeNow = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setActivePanel(null);
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setActivePanel(null);
  }, [pathname]);

  /* ---------- Trust Strip ---------- */
  const topLine = useMemo(
    () => (
      <div className="border-b border-border bg-surface-dark text-surface-dark-foreground">
        <div className="mx-auto flex h-8 w-full max-w-7xl items-center justify-between px-4 text-[11px] sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-3 w-3 text-emerald-300" />
            Secure Stripe checkout
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="inline-flex items-center gap-1">
              <Globe2 className="h-3 w-3 text-amber-300" />
              {currency}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3 text-amber-300" />
              {timezone}
            </span>
          </div>
        </div>
      </div>
    ),
    [currency, timezone]
  );

  return (
    <header className="sticky top-0 z-50 w-full">
      {topLine}

      {/* ========== MAIN NAV BAR ========== */}
      <div
        ref={navRef}
        className={`border-b border-border/40 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ${isScrolled ? "shadow-sm" : "shadow-none"
          }`}
        onMouseLeave={scheduleClose}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            {logo ? (
              <Image
                src={logo}
                alt={`${orgName} logo`}
                width={36}
                height={36}
                className="rounded-lg object-contain"
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {orgName.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="hidden truncate font-display text-base font-semibold sm:block">
              {orgName}
            </p>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* ========== DESKTOP NAV (right-aligned) ========== */}
          <div className="hidden items-center gap-1 lg:flex">
            {/* Nav links */}
            <nav className="flex items-center gap-0.5">
              {NAV_PANELS.map((panel) => {
                const isActive = activePanel === panel.id;
                const isCurrentRoute = isRouteActive(pathname, panel.id);
                return (
                  <button
                    key={panel.id}
                    onMouseEnter={() => openPanel(panel.id)}
                    onClick={() =>
                      setActivePanel((prev) => (prev === panel.id ? null : panel.id))
                    }
                    className={`relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive
                        ? "bg-accent text-foreground"
                        : isCurrentRoute
                          ? "text-primary"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      }`}
                  >
                    {panel.label}
                    <ChevronDown
                      className={`h-3 w-3 opacity-50 transition-transform duration-200 ${isActive ? "rotate-180 opacity-100" : ""
                        }`}
                    />
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-1 left-3 right-3 h-[2px] rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Divider */}
            <div className="mx-2 h-5 w-px bg-border/60" />

            {/* Search button */}
            <button
              onClick={() => {
                const el = document.getElementById("tours");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Search tours"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </button>

            {/* CTAs */}
            <Button asChild variant="ghost" className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground">
              <Link href="/booking">Manage booking</Link>
            </Button>
            <Button
              asChild
              className="h-9 border-0 rounded-full px-5 text-sm text-white transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              <Link href="/#tours" className="inline-flex items-center gap-1.5 font-medium">
                Book Now
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="rounded-md p-2 transition-colors hover:bg-accent lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ========== MEGA MENU PANEL (absolute overlay) ========== */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 40,
              opacity: { duration: 0.15 },
            }}
            className="absolute left-0 right-0 z-40 border-b border-border/40 bg-background shadow-xl shadow-black/8 backdrop-blur-xl"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="mx-auto max-w-7xl">
              {activePanel === "tours" && (
                <ToursPanel
                  tabs={MEGA_TABS}
                  activeTabId={activeTabId}
                  setActiveTabId={setActiveTabId}
                  onClose={closeNow}
                />
              )}
              {activePanel === "about" && <AboutPanel onClose={closeNow} />}
              {activePanel === "contact" && <ContactPanel onClose={closeNow} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== MOBILE MENU ========== */}
      <div
        className={`fixed inset-x-0 top-[calc(3.5rem+2rem)] z-40 grid border-b border-border bg-background/95 backdrop-blur transition-[grid-template-rows,opacity] duration-300 lg:hidden ${mobileMenuOpen
          ? "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0"
          }`}
      >
        <div className="overflow-hidden">
          <nav className="space-y-1 p-4">
            {/* Tours Section */}
            <div className="py-1">
              <div className="flex min-h-9 items-center px-3 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Tours & Experiences
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {MEGA_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isExpanded = mobileExpandedCategory === tab.id;
                  return (
                    <div key={tab.id}>
                      <button
                        onClick={() =>
                          setMobileExpandedCategory(isExpanded ? null : tab.id)
                        }
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${isExpanded
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-accent"
                          }`}
                      >
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-md ${isExpanded ? "bg-primary/15" : "bg-muted"
                            }`}
                        >
                          <Icon
                            className={`h-3.5 w-3.5 ${isExpanded ? "text-primary" : "text-muted-foreground"
                              }`}
                          />
                        </div>
                        <span className="flex-1 text-sm font-semibold">{tab.label}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                            }`}
                        />
                      </button>

                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          }`}
                      >
                        <div className="overflow-hidden">
                          <div className="space-y-0.5 pl-12 pr-3 pb-2 pt-1">
                            {tab.links.map((link) => (
                              <Link
                                key={link.label}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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

            {/* About & Contact */}
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              About
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Contact
            </Link>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <Globe2 className="h-3 w-3" />
              {currency}
              <span>·</span>
              {timezone}
            </div>
            <Button asChild variant="outline" className="w-full text-sm">
              <Link href="/booking">Manage booking</Link>
            </Button>
            <Button
              asChild
              className="mt-1 w-full text-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Link href="/">Book Now</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
