'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  MapPin,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Route } from 'next';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { name: 'Home', href: '', icon: LayoutDashboard },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Bookings', href: '/bookings', icon: ClipboardList },
  { name: 'Tours', href: '/tours', icon: MapPin },
  { name: 'Customers', href: '/customers', icon: Users },
];

interface MobileNavProps {
  orgSlug: string;
}

/**
 * Mobile bottom navigation bar
 * - Fixed to bottom with safe area padding
 * - Hides on scroll down, shows on scroll up
 * - Touch-friendly 44px+ tap targets
 * - Active state with scale animation
 */
export function MobileNav({ orgSlug }: MobileNavProps) {
  const pathname = usePathname();
  const basePath = `/org/${orgSlug}`;

  // Hide on scroll behavior
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY;

    // Clear any existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    // Only hide if scrolling down significantly and past initial threshold
    if (scrollDelta > 10 && currentScrollY > 100) {
      setIsVisible(false);
    } else if (scrollDelta < -5 || currentScrollY < 50) {
      // Show immediately when scrolling up or near top
      setIsVisible(true);
    }

    // Always show after scroll stops
    scrollTimeout.current = setTimeout(() => {
      setIsVisible(true);
    }, 150);

    setLastScrollY(currentScrollY);
  }, [lastScrollY]);

  useEffect(() => {
    // Passive scroll listener for performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [handleScroll]);

  // Reset visibility on route change
  useEffect(() => {
    setIsVisible(true);
    setLastScrollY(0);
  }, [pathname]);

  return (
    <nav
      className={cn(
        'md:hidden mobile-bottom-nav transition-transform duration-200 ease-out',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
      role="navigation"
      aria-label="Main navigation"
      data-testid="mobile-menu"
    >
      <div className="flex items-center justify-around h-16 px-2 bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
        {navItems.map((item) => {
          const itemPath = `${basePath}${item.href}` as Route;
          const isActive =
            item.href === ''
              ? pathname === basePath
              : pathname === itemPath || pathname.startsWith(`${itemPath}/`);

          return (
            <Link
              key={item.name}
              href={itemPath}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5',
                'min-w-[56px] min-h-[44px] py-1.5 px-2 rounded-xl',
                'transition-all duration-150 ease-out',
                'touch-target active:scale-95',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:bg-muted'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}

              <item.icon
                className={cn(
                  'h-5 w-5 transition-transform duration-150',
                  isActive && 'scale-110'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span
                className={cn(
                  'text-[10px] leading-tight',
                  isActive ? 'font-semibold' : 'font-medium'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Subtle top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </nav>
  );
}

/**
 * Floating action button for mobile
 * Use for primary actions like "Quick Book"
 */
interface MobileFabProps {
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
  className?: string;
}

export function MobileFab({ icon, onClick, label, className }: MobileFabProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      // Hide when scrolling down significantly
      if (scrollDelta > 10 && currentScrollY > 100) {
        setIsVisible(false);
      } else if (scrollDelta < -5 || currentScrollY < 50) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'mobile-fab',
        'transition-all duration-200 ease-out',
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-20 opacity-0 pointer-events-none',
        className
      )}
    >
      {icon}
    </button>
  );
}

/**
 * Mobile action bar for horizontal scrolling actions/filters
 */
interface MobileActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileActionBar({ children, className }: MobileActionBarProps) {
  return (
    <div
      className={cn(
        'mobile-action-bar',
        'flex gap-2 overflow-x-auto py-2 -mx-4 px-4',
        'scrollbar-hide scroll-smooth',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Mobile action chip for use in MobileActionBar
 */
interface MobileActionChipProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  className?: string;
}

export function MobileActionChip({
  icon,
  label,
  active,
  count,
  onClick,
  className,
}: MobileActionChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1.5',
        'h-9 px-3 rounded-full text-sm font-medium',
        'transition-colors duration-150',
        'touch-target',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground active:bg-accent',
        className
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center',
            'min-w-[18px] h-[18px] px-1 rounded-full text-xs font-semibold',
            active ? 'bg-primary-foreground/20' : 'bg-foreground/10'
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
