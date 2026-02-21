import Link from "next/link";
import { Mail, Phone, Globe, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@tour/ui";
import { CATEGORY_CONFIGS } from "@/lib/category-config";

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
  socialLinks,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const socialEntries = Object.entries(socialLinks);

  return (
    <footer>
      {/* ========== PRE-FOOTER CTA ========== */}
      <section className="relative overflow-hidden bg-stone-950 py-20 sm:py-28">
        {/* Decorative gradient orbs */}
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-amber-500/8 blur-3xl" />

        <div
          className="relative z-10 mx-auto px-[var(--page-gutter)] text-center"
          style={{ maxWidth: "var(--page-max-width, 1400px)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
            Start planning
          </p>
          <h2 className="text-display text-white">
            Your Dubai Adventure Starts Here
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-stone-400 leading-relaxed">
            Browse our curated collection of tours and experiences. Instant confirmation, best price guaranteed.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              asChild
              className="h-13 rounded-full bg-primary px-8 text-base font-semibold text-white shadow-[var(--shadow-glow)] transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
            >
              <Link href="/#tours" className="inline-flex items-center gap-2">
                Browse All Tours
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-13 rounded-full border-stone-700 px-8 text-base text-stone-300 hover:bg-stone-800 hover:text-white"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ========== FOOTER PROPER ========== */}
      <div className="bg-stone-950 border-t border-stone-800/50">
        <div
          className="mx-auto px-[var(--page-gutter)] py-16"
          style={{ maxWidth: "var(--page-max-width, 1400px)" }}
        >
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <h3 className="font-display text-xl font-bold text-white">{orgName}</h3>
              <p className="mt-3 max-w-xs text-sm text-stone-400 leading-relaxed">
                Exceptional local tours and private experiences with clear pricing,
                instant confirmations, and seamless support.
              </p>
              {socialEntries.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {socialEntries.map(([name, href]) => (
                    <a
                      key={name}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-stone-800 px-3 py-1.5 text-xs capitalize text-stone-400 transition-colors hover:border-stone-600 hover:text-stone-200"
                    >
                      {name}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Experiences */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                Experiences
              </h4>
              <nav className="flex flex-col space-y-2.5">
                {CATEGORY_CONFIGS.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/experiences/${cat.slug}`}
                    className="text-sm text-stone-400 transition-colors hover:text-white"
                  >
                    {cat.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                Quick Links
              </h4>
              <nav className="flex flex-col space-y-2.5">
                <Link href="/" className="text-sm text-stone-400 transition-colors hover:text-white">All Tours</Link>
                <Link href="/trip-inspiration" className="text-sm text-stone-400 transition-colors hover:text-white">Trip Inspiration</Link>
                <Link href="/booking" className="text-sm text-stone-400 transition-colors hover:text-white">Manage Booking</Link>
                <Link href="/about" className="text-sm text-stone-400 transition-colors hover:text-white">About Us</Link>
                <Link href="/contact" className="text-sm text-stone-400 transition-colors hover:text-white">Contact</Link>
                <Link href="/terms" className="text-sm text-stone-400 transition-colors hover:text-white">Terms & Conditions</Link>
                <Link href="/privacy" className="text-sm text-stone-400 transition-colors hover:text-white">Privacy Policy</Link>
              </nav>
            </div>

            {/* Contact */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                Contact Us
              </h4>
              <div className="flex flex-col space-y-3">
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2.5 text-sm text-stone-400 transition-colors hover:text-white"
                  >
                    <Mail className="h-4 w-4 flex-shrink-0 text-stone-600" />
                    {email}
                  </a>
                )}
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-2.5 text-sm text-stone-400 transition-colors hover:text-white"
                  >
                    <Phone className="h-4 w-4 flex-shrink-0 text-stone-600" />
                    {phone}
                  </a>
                )}
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm text-stone-400 transition-colors hover:text-white"
                  >
                    <Globe className="h-4 w-4 flex-shrink-0 text-stone-600" />
                    {website}
                  </a>
                )}
                {address && (
                  <div className="flex items-start gap-2.5 text-sm text-stone-400">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-600" />
                    {address}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-stone-800/50 pt-8 sm:flex-row">
            <p className="text-xs text-stone-500">
              &copy; {currentYear} {orgName}. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <svg width="38" height="24" viewBox="0 0 38 24" fill="none" className="text-stone-600" aria-label="Visa">
                <rect width="38" height="24" rx="4" fill="currentColor" opacity="0.15" />
                <text x="19" y="15" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="bold">VISA</text>
              </svg>
              <svg width="38" height="24" viewBox="0 0 38 24" fill="none" className="text-stone-600" aria-label="Mastercard">
                <rect width="38" height="24" rx="4" fill="currentColor" opacity="0.15" />
                <circle cx="15" cy="12" r="6" fill="currentColor" opacity="0.3" />
                <circle cx="23" cy="12" r="6" fill="currentColor" opacity="0.3" />
              </svg>
              <svg width="38" height="24" viewBox="0 0 38 24" fill="none" className="text-stone-600" aria-label="Apple Pay">
                <rect width="38" height="24" rx="4" fill="currentColor" opacity="0.15" />
                <text x="19" y="15" textAnchor="middle" fill="currentColor" fontSize="6" fontWeight="bold">Pay</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
