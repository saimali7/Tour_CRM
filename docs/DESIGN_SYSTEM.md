# Design System

A first-principles approach to building a consistent, maintainable, and accessible UI for Tour CRM.

## Philosophy

### Core Principle: Own Your Components

Following shadcn/ui philosophy, we don't install a component library as a dependency. Instead, we **own the source code** of every component. This gives us:

1. **Full Control** - Modify any component without fighting abstractions
2. **No Version Lock** - Update components on our schedule
3. **Deep Understanding** - The team knows exactly how everything works
4. **Zero Bloat** - Only include what we actually use

> "This is not a component library. It's how you build your component library."
> — shadcn/ui

### The Token System

We use **semantic design tokens** instead of hardcoded colors. This enables:

- Automatic dark mode support
- Consistent theming across the entire application
- Easy global changes from a single source
- Accessibility compliance

---

## Semantic Color Tokens

### Background Colors

| Token | Usage | Light Mode | Dark Mode |
|-------|-------|------------|-----------|
| `bg-background` | Page backgrounds, base layer | white | slate-950 |
| `bg-card` | Cards, panels, elevated surfaces | white | slate-900 |
| `bg-muted` | Subtle backgrounds, disabled states | slate-100 | slate-800 |
| `bg-accent` | Hover states, highlights | slate-100 | slate-800 |
| `bg-popover` | Dropdowns, tooltips, popovers | white | slate-900 |

### Text Colors

| Token | Usage |
|-------|-------|
| `text-foreground` | Primary text, headings, important content |
| `text-muted-foreground` | Secondary text, descriptions, placeholders |
| `text-card-foreground` | Text on card backgrounds |
| `text-accent-foreground` | Text on accent backgrounds |
| `text-primary-foreground` | Text on primary buttons |
| `text-destructive-foreground` | Text on destructive buttons |

### Border Colors

| Token | Usage |
|-------|-------|
| `border-border` | General borders, dividers, table lines |
| `border-input` | Form input borders |
| `divide-border` | Table row dividers |

### Interactive Colors

| Token | Usage |
|-------|-------|
| `bg-primary` / `text-primary` | Primary actions, links, focus states |
| `bg-secondary` / `text-secondary` | Secondary buttons, less prominent actions |
| `bg-destructive` / `text-destructive` | Delete, cancel, dangerous actions |

### Status Colors

For booking/schedule status displays, use CSS utility classes:

```tsx
// Status badge classes (defined in globals.css)
.status-pending      // Yellow - awaiting confirmation
.status-confirmed    // Green - confirmed and ready
.status-completed    // Blue - finished successfully
.status-cancelled    // Red - cancelled
.status-no-show      // Gray - customer didn't show

// Usage
<span className="status-confirmed">Confirmed</span>
```

### Semantic Status Tokens

| Token | Usage |
|-------|-------|
| `text-success` / `bg-success` | Success states, confirmations |
| `text-warning` / `bg-warning` | Warnings, pending states |
| `text-destructive` | Errors, failures, cancellations |

---

## Migration Guide: Hardcoded to Semantic

When you encounter hardcoded colors, replace them with semantic tokens:

### Backgrounds

```tsx
// Before                    // After
bg-white                  → bg-background or bg-card
bg-gray-50                → bg-muted
bg-gray-100               → bg-muted or bg-accent
bg-gray-200               → bg-muted
hover:bg-gray-50          → hover:bg-muted
hover:bg-gray-100         → hover:bg-accent
```

### Text

```tsx
// Before                    // After
text-black                → text-foreground
text-gray-900             → text-foreground
text-gray-800             → text-foreground
text-gray-700             → text-foreground
text-gray-600             → text-muted-foreground
text-gray-500             → text-muted-foreground
text-gray-400             → text-muted-foreground
text-gray-300             → text-muted-foreground
text-white                → text-primary-foreground (on buttons)
                          → text-background (on dark surfaces)
```

### Borders

```tsx
// Before                    // After
border-gray-200           → border-border
border-gray-300           → border-input
divide-gray-200           → divide-border
```

### Status Colors

```tsx
// Before                              // After
bg-green-100 text-green-800         → status-confirmed
bg-yellow-100 text-yellow-800       → status-pending
bg-red-100 text-red-800             → status-cancelled
bg-blue-100 text-blue-800           → status-completed
bg-gray-100 text-gray-800           → status-no-show

// For non-status success/error states
bg-green-100 text-green-700         → bg-success/20 text-success
bg-red-100 text-red-700             → bg-destructive/20 text-destructive
bg-yellow-100 text-yellow-700       → bg-warning/20 text-warning
```

---

## Component Patterns

### 1. Use CVA for Variants

Class Variance Authority (CVA) provides type-safe variant management:

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### 2. Always Use forwardRef

Components must forward refs for proper DOM access:

```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
```

### 3. Use cn() for Class Merging

The `cn()` utility merges Tailwind classes properly:

```tsx
import { cn } from "@/lib/utils";

// Proper merging - later classes win
cn("px-4 py-2", "px-6")  // → "py-2 px-6"

// With conditional classes
cn(
  "base-styles",
  isActive && "active-styles",
  className
)
```

### 4. Composition Over Configuration

Build complex components from simple primitives:

```tsx
// Good: Composable
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Actions here</CardFooter>
</Card>

// Avoid: Mega-components with many props
<Card
  title="Title"
  description="Description"
  content="Content"
  footerActions={[...]}
/>
```

---

## File Structure

```
apps/crm/src/
├── components/
│   └── ui/                    # Base UI primitives
│       ├── button.tsx         # CVA-based, forwardRef
│       ├── card.tsx           # Composable card components
│       ├── dialog.tsx         # Modal dialogs
│       ├── data-table.tsx     # Table with sorting, pagination
│       ├── form.tsx           # Form primitives
│       ├── input.tsx          # Text inputs
│       ├── select.tsx         # Select dropdowns
│       ├── skeleton.tsx       # Loading states
│       ├── status-badge.tsx   # Status display component
│       └── ...
├── lib/
│   └── utils.ts               # cn() and other utilities
└── app/
    └── globals.css            # CSS variables, status classes
```

---

## CSS Variables

All tokens are defined as CSS variables in `globals.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;

    /* Extended tokens */
    --success: 142 76% 36%;
    --warning: 38 92% 50%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode overrides */
  }
}
```

---

## Status Classes

Status display classes for consistent badge styling:

```css
/* In globals.css */
@layer components {
  .status-pending {
    @apply bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400;
  }
  .status-confirmed {
    @apply bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400;
  }
  .status-completed {
    @apply bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400;
  }
  .status-cancelled {
    @apply bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400;
  }
  .status-no-show {
    @apply bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400;
  }
}
```

---

## Best Practices

### Do

- Use semantic tokens for all colors
- Use CVA for component variants
- Use `cn()` for class merging
- Use forwardRef for all components
- Keep components composable and simple
- Define status displays with CSS utility classes

### Don't

- Use hardcoded colors (`bg-gray-500`, `text-white`, etc.)
- Create mega-components with many configuration props
- Skip forwardRef on interactive components
- Mix Tailwind utilities with inline styles
- Create one-off color values

### Code Review Checklist

- [ ] No hardcoded gray/color values
- [ ] Uses semantic tokens throughout
- [ ] Components use forwardRef
- [ ] Variants defined with CVA
- [ ] Classes merged with cn()
- [ ] Status displays use CSS utility classes
- [ ] Works in both light and dark mode

---

## Adding New Components

When creating a new component:

1. **Check shadcn/ui first** - See if there's a reference implementation
2. **Use semantic tokens** - Never hardcode colors
3. **Apply CVA pattern** - For any component with variants
4. **Use forwardRef** - Always forward refs
5. **Export from ui/index.ts** - Keep exports organized
6. **Document variants** - Add TypeScript types for variants

Example template:

```tsx
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const componentVariants = cva(
  "base-classes-here",
  {
    variants: {
      variant: {
        default: "default-variant-classes",
        // ... more variants
      },
      size: {
        default: "default-size-classes",
        // ... more sizes
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(componentVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Component.displayName = "Component";

export { Component, componentVariants };
```

---

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Class Variance Authority](https://cva.style)
- [Radix UI Primitives](https://www.radix-ui.com)
