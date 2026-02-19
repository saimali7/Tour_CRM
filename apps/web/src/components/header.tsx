"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X, ShieldCheck, Globe2, Clock3, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@tour/ui";

interface HeaderProps {
  orgName: string;
  logo: string | null;
  primaryColor: string;
  timezone: string;
  currency: string;
}

const NAV_ITEMS = [
  { href: "/", label: "All Tours" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/booking", label: "Manage Booking" },
] as const;

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({ orgName, logo, primaryColor, timezone, currency }: HeaderProps) {
  const pathname = usePathname() || "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
        <div className="container flex h-9 items-center justify-between px-4 text-xs">
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
        className={`border-b border-border bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 ${
          isScrolled ? "shadow-sm" : "shadow-none"
        }`}
      >
        <div className="container flex h-[4.5rem] items-center justify-between gap-4 px-4 py-3">
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
              <p className="mt-1 text-xs text-muted-foreground">Curated tours and private experiences</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = isRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:block">
            <Button
              asChild
              className="h-10 border-0 px-4 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-95"
              style={{ backgroundColor: primaryColor }}
            >
              <Link href="/" className="inline-flex items-center gap-2">
                Book Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <button
            className="rounded-md p-2 transition-colors hover:bg-accent md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-x-0 top-[calc(4.5rem+2.25rem)] z-40 grid border-b border-border bg-background/95 backdrop-blur transition-[grid-template-rows,opacity] duration-300 md:hidden ${
          mobileMenuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <nav className="space-y-2 p-4">
            {NAV_ITEMS.map((item) => {
              const active = isRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-12 items-center rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary" : "hover:bg-accent"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" />
              {currency}
              <span>·</span>
              {timezone}
            </div>
            <Button asChild className="mt-2 w-full" style={{ backgroundColor: primaryColor }}>
              <Link href="/">Book Now</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
