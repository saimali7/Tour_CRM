"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X, ShieldCheck, Globe2, Clock3, ArrowRight, Sparkles, ChevronDown, Compass, Sun, Building2, Anchor, MapPin } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@tour/ui";

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
  description: string;
  links: { label: string; href: string; badge?: "Popular" | "New" | "Top Seller" }[];
  featured: { title: string; image: string; href: string }[];
  viewAllHref: string;
};

type NavItem = {
  label: string;
  href?: string;
  isMega?: boolean;
  tabs?: MegaMenuTab[];
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Destinations & Tours",
    isMega: true,
    tabs: [
      {
        id: "by-category",
        label: "By Category",
        description: "From thrilling desert safaris to relaxing yacht cruises, find the perfect activity for your trip.",
        links: [
          { label: "Desert Tours", href: "/?category=Desert+Tours", badge: "Top Seller" },
          { label: "City Sightseeing", href: "/?category=City+Tours", badge: "Popular" },
          { label: "Water Activities", href: "/?category=Water+Activities" },
          { label: "Theme Parks", href: "/?category=Theme+Parks" },
          { label: "Cultural Tours", href: "/?category=Cultural", badge: "New" },
          { label: "Adventure", href: "/?category=Adventure" },
        ],
        featured: [
          { title: "Premium Red Dune Safari", image: "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?q=80&w=400&auto=format&fit=crop", href: "/tours/premium-red-dune" },
          { title: "Dubai Marina Yacht Tour", image: "https://images.unsplash.com/photo-1512453979436-5a50ce8c6d20?q=80&w=400&auto=format&fit=crop", href: "/tours/marina-yacht" },
        ],
        viewAllHref: "/",
      },
      {
        id: "private",
        label: "Private Tours",
        description: "Exclusive VIP experiences tailored completely to your schedule, preferences, and group size.",
        links: [
          { label: "Private Desert Safaris", href: "/private-tours?type=desert" },
          { label: "Luxury Yacht Charters", href: "/private-tours?type=yacht", badge: "Popular" },
          { label: "Custom City Tours", href: "/private-tours?type=city" },
          { label: "Airport Transfers", href: "/private-tours?type=transfer" },
        ],
        featured: [
          { title: "Private VIP Desert Camp", image: "https://images.unsplash.com/photo-1542317148-8b0bd5165b4c?q=80&w=400&auto=format&fit=crop", href: "/tours/vip-camp" },
        ],
        viewAllHref: "/private-tours",
      }
    ]
  },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isRouteActive(pathname: string, href?: string): boolean {
  if (!href) return false;
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({ orgName, logo, primaryColor, timezone, currency }: HeaderProps) {
  const pathname = usePathname() || "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string>("by-category");
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const megaMenuTimeoutRef = useRef<NodeJS.Timeout>(null);

  const handleMegaMenuEnter = () => {
    if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
    setIsMegaMenuOpen(true);
  };

  const handleMegaMenuLeave = () => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setIsMegaMenuOpen(false);
    }, 150);
  };

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const topLine = useMemo(
    () => (
      <div className="border-b border-border bg-surface-dark text-surface-dark-foreground">
        <div className="mx-auto flex h-9 w-full max-w-[1560px] items-center justify-between px-4 text-xs sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            Secure Stripe checkout
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="inline-flex items-center gap-1">
              <Globe2 className="h-3.5 w-3.5 text-amber-300" />
              {currency}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5 text-amber-300" />
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

      <div
        className={`border-b border-border/40 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ${isScrolled ? "shadow-sm py-2" : "shadow-none py-3"
          }`}
      >
        <div className="mx-auto flex h-[4.75rem] w-full max-w-[1560px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center space-x-3">
            {logo ? (
              <Image
                src={logo}
                alt={`${orgName} logo`}
                width={44}
                height={44}
                className="rounded-lg object-contain shadow-sm"
              />
            ) : (
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-semibold text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {orgName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden min-w-0 sm:block">
              <p className="truncate font-display text-lg leading-none">{orgName}</p>
              <p className="mt-1 text-xs text-muted-foreground">UAE tours and private experiences</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex lg:h-full">
            {NAV_ITEMS.map((item) => {
              if (item.isMega && item.tabs) {
                const activeTab = item.tabs.find(t => t.id === activeTabId) || item.tabs[0];
                return (
                  <div
                    className="flex h-full items-center"
                    key={item.label}
                    onMouseEnter={handleMegaMenuEnter}
                    onMouseLeave={handleMegaMenuLeave}
                  >
                    <button className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isMegaMenuOpen ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                      {item.label}
                      <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isMegaMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Full Width Mega Menu Overlay */}
                    <div className={`absolute left-0 top-full w-full bg-background border-b border-border shadow-2xl transition-all duration-300 ease-out z-[100] overflow-hidden ${isMegaMenuOpen ? "opacity-100 visible pointer-events-auto max-h-[600px]" : "opacity-0 invisible pointer-events-none max-h-0"}`}>
                      <div className="mx-auto flex max-w-[1560px]">
                        {/* Sidebar */}
                        <div className="w-[280px] shrink-0 border-r border-border/40 bg-muted/30 p-6">
                          <div className="flex flex-col space-y-1">
                            {item.tabs.map((tab) => (
                              <button
                                key={tab.id}
                                onMouseEnter={() => setActiveTabId(tab.id)}
                                className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold transition-all ${activeTabId === tab.id
                                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                  }`}
                              >
                                {tab.label}
                                {activeTabId === tab.id && <ArrowRight className="h-4 w-4 text-primary" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-8 lg:p-10">
                          {activeTab && (
                            <div className="flex h-full flex-col animate-fade-in">
                              <p className="mb-8 max-w-3xl text-base text-muted-foreground leading-relaxed">
                                {activeTab.description}
                              </p>

                              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-10 lg:grid-cols-3">
                                {activeTab.links.map((link) => (
                                  <Link key={link.label} href={link.href} className="group inline-flex items-center w-fit">
                                    <span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                                      {link.label}
                                    </span>
                                    {link.badge && (
                                      <span className={`ml-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${link.badge === "Popular" ? "bg-blue-100 text-blue-700" :
                                        link.badge === "Top Seller" ? "bg-amber-100 text-amber-700" :
                                          "bg-emerald-100 text-emerald-700"
                                        }`}>
                                        {link.badge}
                                      </span>
                                    )}
                                  </Link>
                                ))}
                              </div>

                              <div className="mt-auto">
                                <h4 className="mb-4 text-sm font-bold text-foreground">Featured {activeTab.label}</h4>
                                <div className="flex gap-4">
                                  {activeTab.featured.map((feature, idx) => (
                                    <Link key={idx} href={feature.href} className="group relative h-24 w-48 overflow-hidden rounded-xl border border-border/50 bg-muted">
                                      <Image src={feature.image} alt={feature.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="200px" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                      <div className="absolute bottom-2 left-3 right-3 text-xs font-semibold leading-tight text-white drop-shadow-md line-clamp-2">
                                        {feature.title}
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                                <div className="mt-6 flex">
                                  <Button asChild variant="link" className="h-auto px-0 text-foreground hover:text-primary" onClick={() => setIsMegaMenuOpen(false)}>
                                    <Link href={activeTab.viewAllHref} className="inline-flex items-center gap-2">
                                      View all {activeTab.label} <ArrowRight className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              const active = isRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {item.href === "/private-tours" ? <Sparkles className="h-3.5 w-3.5" /> : null}
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="outline" className="h-10 border-border px-4">
              <Link href="/booking">Manage booking</Link>
            </Button>
            <Button
              asChild
              className="h-10 border-0 px-5 text-white shadow-shadow transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              <Link href="/#tours" className="inline-flex items-center gap-2 font-medium">
                Book Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          <button
            className="rounded-md p-2 transition-colors hover:bg-accent lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-x-0 top-[calc(4.75rem+2.25rem)] z-40 grid border-b border-border bg-background/95 backdrop-blur transition-[grid-template-rows,opacity] duration-300 lg:hidden ${mobileMenuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
      >
        <div className="overflow-hidden">
          <nav className="space-y-1 p-4">
            {NAV_ITEMS.map((item) => {
              if (item.isMega && item.tabs) {
                return (
                  <div key={item.label} className="py-2">
                    <div className="flex min-h-10 items-center px-3 font-semibold text-foreground text-sm tracking-wide uppercase">
                      {item.label}
                    </div>
                    <div className="mt-2 flex flex-col pl-4 border-l-2 border-border/40 ml-4 space-y-4">
                      {item.tabs.map((tab) => (
                        <div key={tab.id}>
                          <p className="mb-2 font-medium text-foreground">{tab.label}</p>
                          <div className="space-y-1 pl-3 border-l-2 border-border/30">
                            {tab.links.map(link => (
                              <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              const active = isRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  className={`flex min-h-12 items-center rounded-md px-3 py-3 text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "hover:bg-accent"
                    }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {item.href === "/private-tours" ? <Sparkles className="h-4 w-4" /> : null}
                    {item.label}
                  </span>
                </Link>
              );
            })}
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" />
              {currency}
              <span>·</span>
              {timezone}
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/booking">Manage booking</Link>
            </Button>
            <Button asChild className="mt-1 w-full" style={{ backgroundColor: primaryColor }}>
              <Link href="/">Book Now</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
