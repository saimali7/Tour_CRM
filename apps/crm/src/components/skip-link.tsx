'use client';

/**
 * Skip Link Component
 *
 * Provides keyboard users with a quick way to skip navigation and jump
 * directly to the main content. This is essential for accessibility,
 * especially for users who rely on keyboard navigation or screen readers.
 *
 * The link is visually hidden until focused, appearing at the top of the
 * viewport when a keyboard user tabs into the page.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        sr-only
        focus:not-sr-only
        focus:absolute
        focus:top-4
        focus:left-4
        focus:z-[100]
        focus:px-4
        focus:py-2
        focus:bg-primary
        focus:text-primary-foreground
        focus:rounded-md
        focus:shadow-lg
        focus:outline-none
        focus:ring-2
        focus:ring-ring
        focus:ring-offset-2
        transition-all
        text-sm
        font-medium
      "
    >
      Skip to main content
    </a>
  );
}

/**
 * Skip Navigation Component
 *
 * A more comprehensive skip navigation that offers multiple skip targets.
 * Use this when you have multiple landmark regions users might want to skip to.
 */
export function SkipNavigation() {
  return (
    <nav
      aria-label="Skip navigation"
      className="
        sr-only
        focus-within:not-sr-only
        focus-within:absolute
        focus-within:top-4
        focus-within:left-4
        focus-within:z-[100]
        focus-within:flex
        focus-within:flex-col
        focus-within:gap-1
        focus-within:p-2
        focus-within:bg-card
        focus-within:border
        focus-within:border-border
        focus-within:rounded-lg
        focus-within:shadow-lg
      "
    >
      <a
        href="#main-content"
        className="
          px-3
          py-1.5
          text-sm
          font-medium
          text-foreground
          hover:bg-accent
          rounded-md
          focus:outline-none
          focus:ring-2
          focus:ring-ring
          transition-colors
        "
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="
          px-3
          py-1.5
          text-sm
          font-medium
          text-foreground
          hover:bg-accent
          rounded-md
          focus:outline-none
          focus:ring-2
          focus:ring-ring
          transition-colors
        "
      >
        Skip to navigation
      </a>
    </nav>
  );
}
