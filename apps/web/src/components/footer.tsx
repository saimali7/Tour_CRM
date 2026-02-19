import Link from "next/link";
import { Mail, Phone, Globe, MapPin, ShieldCheck, CalendarCheck2, BadgeCheck, ArrowRight } from "lucide-react";
import { Button } from "@tour/ui";

interface FooterProps {
  orgName: string;
  email: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  socialLinks: Record<string, string>;
}

export function Footer({
  orgName,
  email,
  phone,
  website,
  address,
  timezone,
  currency,
  socialLinks,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const socialEntries = Object.entries(socialLinks);

  return (
    <footer className="border-t border-border bg-surface-soft">
      <div className="mx-auto w-full max-w-[1560px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 rounded-3xl border border-border/60 bg-gradient-to-br from-card to-secondary/20 p-8 sm:p-10 shadow-sm relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between relative z-10">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Plan your next adventure</p>
              <h3 className="mt-1 font-display text-2xl">Ready to lock your dates?</h3>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Check live availability, secure your seats, and get instant booking confirmation with {orgName}.
              </p>
            </div>
            <Button asChild className="h-12 bg-foreground text-background hover:bg-foreground/90 sm:min-w-[240px] shadow-md transition-all hover:scale-[1.02] active:scale-95 text-base">
              <Link href="/#tours" className="inline-flex items-center justify-center gap-2">
                Check Availability
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/70 px-3 py-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Secure Stripe checkout
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/70 px-3 py-2">
              <CalendarCheck2 className="h-4 w-4 text-amber-700" />
              Instant booking confirmation
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/70 px-3 py-2">
              <BadgeCheck className="h-4 w-4 text-sky-700" />
              Local experts, verified tours
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <h3 className="mb-3 font-display text-xl">{orgName}</h3>
            <p className="mb-4 max-w-md text-sm text-muted-foreground">
              Exceptional local tours and private experiences with clear pricing,
              instant confirmations, and seamless support before your trip.
            </p>
            <p className="text-xs text-muted-foreground">
              {currency} · {timezone}
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Quick Links</h4>
            <nav className="flex flex-col space-y-2">
              <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-primary">All Tours</Link>
              <Link href="/private-tours" className="text-sm text-muted-foreground transition-colors hover:text-primary">Private Tours</Link>
              <Link href="/booking" className="text-sm text-muted-foreground transition-colors hover:text-primary">Manage Booking</Link>
              <Link href="/about" className="text-sm text-muted-foreground transition-colors hover:text-primary">About Us</Link>
              <Link href="/contact" className="text-sm text-muted-foreground transition-colors hover:text-primary">Contact</Link>
              <Link href="/terms" className="text-sm text-muted-foreground transition-colors hover:text-primary">Terms & Conditions</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-primary">Privacy Policy</Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Contact Us</h4>
            <div className="flex flex-col space-y-3">
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span>{email}</span>
                </a>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{phone}</span>
                </a>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span>{website}</span>
                </a>
              )}
              {address && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{address}</span>
                </div>
              )}
            </div>
            {socialEntries.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {socialEntries.map(([name, href]) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-xs capitalize text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">© {currentYear} {orgName}. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Built for travelers who value great experiences.</p>
        </div>
      </div>
    </footer>
  );
}
