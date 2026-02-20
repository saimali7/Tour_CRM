import { getCategoryConfig } from "@/lib/category-config";

export interface TripInspirationArticleSection {
  heading: string;
  paragraphs: string[];
}

export interface TripInspirationArticle {
  slug: string;
  title: string;
  kicker: string;
  excerpt: string;
  coverImageUrl: string;
  readMinutes: number;
  publishedAt: string; // ISO date string
  relatedCategorySlug: string;
  sections: TripInspirationArticleSection[];
}

export const TRIP_INSPIRATION_ARTICLES: TripInspirationArticle[] = [
  {
    slug: "sunrise-vs-sunset-desert-safari-dubai",
    title: "Sunrise vs Sunset Desert Safari in Dubai: Which One Fits Your Trip?",
    kicker: "Planning Guide",
    excerpt:
      "Both options are excellent, but they solve different travel goals. Use this practical breakdown to pick the right desert slot.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1600&q=80",
    readMinutes: 7,
    publishedAt: "2026-02-20",
    relatedCategorySlug: "desert-safaris",
    sections: [
      {
        heading: "If your priority is photos, choose sunrise",
        paragraphs: [
          "Morning desert light is cleaner and softer, with fewer crowds and cooler temperatures. If you care about landscape shots and comfort, sunrise wins.",
          "You also avoid late-day traffic and usually finish by midday, leaving the rest of the day free for city activities.",
        ],
      },
      {
        heading: "If your priority is atmosphere, choose sunset",
        paragraphs: [
          "Sunset safaris deliver the classic desert mood: golden-hour dunes, evening camp setup, and a social pace that feels like an event.",
          "This option works best for travelers who want the iconic UAE vibe in one session, especially couples and first-time visitors.",
        ],
      },
      {
        heading: "The practical checklist before you book",
        paragraphs: [
          "Check pickup window, meal inclusions, and return time before confirming. The biggest booking mistakes come from underestimating transfer time and evening finish times.",
          "If you are traveling with children or older guests, ask for gentler dune pacing and confirm seat layout in advance.",
        ],
      },
    ],
  },
  {
    slug: "48-hours-in-dubai-first-time-visitor-itinerary",
    title: "48 Hours in Dubai: A First-Time Visitor Itinerary That Actually Works",
    kicker: "Weekend Blueprint",
    excerpt:
      "A realistic two-day plan that balances modern highlights, old-city culture, and one signature experience without rushing.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80",
    readMinutes: 8,
    publishedAt: "2026-02-18",
    relatedCategorySlug: "city-tours",
    sections: [
      {
        heading: "Day 1: Build context before attractions",
        paragraphs: [
          "Start with old Dubai and souk areas in the morning to understand the city’s roots. Then move to modern districts in the afternoon when indoor stops are more comfortable.",
          "This sequencing gives your landmark visits better context and avoids peak midday walking heat.",
        ],
      },
      {
        heading: "Day 2: Pick one headline memory",
        paragraphs: [
          "Most visitors overbook. Instead, choose one standout experience for Day 2: either desert safari, marina water activity, or private custom day.",
          "Design the second day around that anchor and keep the rest flexible so your schedule stays enjoyable, not transactional.",
        ],
      },
      {
        heading: "What to pre-book before landing",
        paragraphs: [
          "Pre-book transfers, one city slot, and one signature experience. Leave restaurant and shopping windows flexible to absorb delays and weather.",
          "If your hotel is outside central zones, double-check pickup coverage and transfer fees in advance.",
        ],
      },
    ],
  },
  {
    slug: "family-friendly-dubai-tour-planning-without-overload",
    title: "Family-Friendly Dubai Trip Planning Without Overloading the Day",
    kicker: "Family Travel",
    excerpt:
      "How to design smoother days with kids: shorter activity blocks, fewer handoffs, and realistic energy pacing.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600&q=80",
    readMinutes: 6,
    publishedAt: "2026-02-16",
    relatedCategorySlug: "water-activities",
    sections: [
      {
        heading: "Use 90-minute activity blocks",
        paragraphs: [
          "Children tolerate transitions better when major activities stay under two hours. Build your day in short blocks with hydration and shade breaks.",
          "This keeps energy stable and prevents the last activity from becoming a forced experience.",
        ],
      },
      {
        heading: "Minimize transfer complexity",
        paragraphs: [
          "The best family itineraries reduce vehicle changes. Prioritize tours with direct pickup and drop-off from your hotel.",
          "One less transfer is often worth more than one extra attraction.",
        ],
      },
      {
        heading: "Book for flexibility, not volume",
        paragraphs: [
          "Choose fewer experiences with higher confidence: clear cancellation rules, explicit meeting instructions, and support access.",
          "A calm, predictable day improves both guest experience and booking satisfaction.",
        ],
      },
    ],
  },
  {
    slug: "when-to-go-private-in-dubai-tour-planning",
    title: "When It’s Worth Going Private for a Dubai Tour",
    kicker: "Private Experience",
    excerpt:
      "Private tours are not always necessary. Here is the decision model for when private is clearly worth the premium.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1600&q=80",
    readMinutes: 5,
    publishedAt: "2026-02-14",
    relatedCategorySlug: "private-tours",
    sections: [
      {
        heading: "Go private when timing matters",
        paragraphs: [
          "If your group has fixed constraints (flight windows, celebrations, mobility needs), private scheduling removes the most friction.",
          "Shared departures are cost-efficient, but they can’t optimize around your exact timeline.",
        ],
      },
      {
        heading: "Go private when group profile is mixed",
        paragraphs: [
          "Families with different pace requirements benefit from private control. You can extend, shorten, or reorder stops without affecting other guests.",
          "This usually improves day quality more than adding another attraction.",
        ],
      },
      {
        heading: "Go shared when your goal is simple",
        paragraphs: [
          "For single-category experiences with straightforward logistics, shared can deliver excellent value.",
          "Use private selectively for high-stakes or high-complexity days, not as a default for everything.",
        ],
      },
    ],
  },
];

export function getTripInspirationArticles() {
  return [...TRIP_INSPIRATION_ARTICLES].sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export function getTripInspirationArticleBySlug(slug: string) {
  return TRIP_INSPIRATION_ARTICLES.find((article) => article.slug === slug);
}

export function getTripInspirationArticleCategoryLabel(article: TripInspirationArticle) {
  return getCategoryConfig(article.relatedCategorySlug)?.label ?? "Travel Guide";
}
