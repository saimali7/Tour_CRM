/**
 * Category configuration — single source of truth for the 4 experience hubs.
 *
 * Used by:
 *  - /experiences/[category] hub pages
 *  - Mega menu tabs (viewAllHref)
 *  - Footer category links
 *  - Sitemap generation
 */

export interface CategoryFAQ {
  question: string;
  answer: string;
}

export interface CategoryConfig {
  slug: string;
  /** Short label for navigation */
  label: string;
  /** Long page title */
  title: string;
  /** Subtitle / page sub-headline */
  subtitle: string;
  /** SEO meta description */
  metaDescription: string;
  /** Intro paragraphs rendered as SEO content on the hub page */
  intro: string[];
  /** Hero image URL (Unsplash or static asset) */
  heroImageUrl: string;
  /** Category badge shown in tour-card filters — must match tour.category in DB */
  dbCategory: string;
  faqs: CategoryFAQ[];
}

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    slug: "desert-safaris",
    label: "Desert Safaris",
    title: "Desert Safaris & Dune Experiences in Dubai",
    subtitle:
      "From the golden dunes at sunrise to Bedouin camps under a blanket of stars — the Arabian desert is unlike anywhere on Earth.",
    metaDescription:
      "Book Dubai desert safaris online. Morning, evening & overnight options. Expert local guides, instant confirmation. From dune bashing to camel rides.",
    intro: [
      "The Arabian desert is one of the world's most dramatic landscapes — a vast ocean of sand stretching beyond the horizon, shifting colours from gold at dawn to deep amber at dusk. A Dubai desert safari is more than a day trip; it's an encounter with the region's ancient soul.",
      "Our desert experiences range from heart-pounding dune bashing and sandboarding to serene camel treks and starlit Bedouin dinners. Whether you're seeking adventure or tranquillity, every safari departs with expert local guides who've spent years reading the dunes.",
      "The best time for a desert safari depends on what you're after. Early morning excursions offer cool temperatures and stunning golden-hour light — ideal for photography. Evening safaris reward you with the famous Dubai sunset and a traditional camp experience with live entertainment.",
    ],
    heroImageUrl:
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1600&q=80",
    dbCategory: "Desert Tours",
    faqs: [
      {
        question: "What should I wear on a desert safari?",
        answer:
          "Wear light, breathable clothing that covers your shoulders and knees — both for sun protection and out of respect for local culture at the Bedouin camp. Closed-toe shoes or sandals are best for the sandy terrain. Bring sunglasses and a hat for daytime excursions.",
      },
      {
        question: "Is a desert safari suitable for children?",
        answer:
          "Absolutely. Our family-friendly safaris are available for all ages. Dune bashing has minimum age requirements (usually 5+), but the camel rides, sandboarding, and camp activities are suitable for young children. Let us know the ages in your group when booking so we can prepare accordingly.",
      },
      {
        question: "Morning or evening safari — which should I choose?",
        answer:
          "Morning safaris (typically 6am–11am) offer cooler temperatures, clearer skies, and the best photography light. Evening safaris (3pm–9pm) include the famous desert sunset, a traditional Bedouin dinner, and live entertainment including belly dancing and tanoura shows. Both are exceptional — it simply depends on your schedule.",
      },
      {
        question: "What's included in a typical safari package?",
        answer:
          "Most packages include hotel pickup and drop-off, dune bashing in 4×4 vehicles, camel riding, sandboarding, traditional Arabic coffee and dates, and a barbecue dinner at a Bedouin-style camp with live entertainment. Premium packages add quad biking, falconry demonstrations, and private tent dining.",
      },
      {
        question: "Are there medical restrictions for dune bashing?",
        answer:
          "Dune bashing involves rapid movements over uneven terrain. We recommend guests with back problems, heart conditions, or pregnant women avoid this activity and opt for a gentler camp-only experience instead. Please mention any medical concerns at the time of booking.",
      },
      {
        question: "How far is the desert from Dubai city?",
        answer:
          "The main desert safari locations are 45–60 minutes from central Dubai. Your guide will collect you from your hotel and handle all transportation, so there's nothing to organise on your end.",
      },
    ],
  },
  {
    slug: "city-tours",
    label: "City Tours",
    title: "Dubai City Tours & Cultural Experiences",
    subtitle:
      "Old meets new in the most ambitious city on Earth. Discover the iconic skyline, hidden souks, and centuries-old heritage in a single day.",
    metaDescription:
      "Book Dubai city tours online. Full-day & half-day options. Burj Khalifa, Old Dubai, cultural heritage tours. Expert guides, instant booking.",
    intro: [
      "Dubai is one of the world's most remarkable cities — a place where ancient trading routes meet the tallest buildings on earth, where traditional dhow fishing boats share the water with superyachts, and where a visit to a gold souk takes place a few kilometres from a world-record-breaking ski slope.",
      "Our city tours are designed to show you both sides of Dubai: the gleaming skyscrapers and record-breaking attractions of modern Dubai, and the layered, fragrant streets of the historic Deira and Bur Dubai districts. Expert local guides bring context and stories that no guidebook can match.",
      "Whether you're in Dubai for a layover or a week-long holiday, a city tour gives you the most efficient and enriching way to experience the highlights — without the stress of navigating an unfamiliar city. We handle transport, tickets, and timing so you can focus on absorbing every moment.",
    ],
    heroImageUrl:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80",
    dbCategory: "City Tours",
    faqs: [
      {
        question: "How long does a full Dubai city tour take?",
        answer:
          "Full-day city tours run approximately 8–9 hours and cover the main landmarks across both old and new Dubai. Half-day tours (4–5 hours) focus on either modern Dubai or the historic districts. We can also create bespoke itineraries for multi-day visits.",
      },
      {
        question: "Is the Burj Khalifa included?",
        answer:
          "Burj Khalifa visits (to the At The Top observation deck) can be added to most city tour packages. Slots are limited and sell out quickly, so we recommend booking at least 48 hours in advance. Entry tickets are arranged on your behalf as part of your tour.",
      },
      {
        question: "What is the Dubai Frame and is it worth visiting?",
        answer:
          "The Dubai Frame is a 150-metre-tall picture frame-shaped building offering panoramic views of both old and new Dubai from a glass-floored skywalk. It's one of the best-value viewpoints in the city and provides a striking visual metaphor for Dubai's transformation — highly recommended.",
      },
      {
        question: "Can we visit the Gold Souk and Spice Souk?",
        answer:
          "Yes — both are standard stops on our heritage and old Dubai tours. You'll cross Dubai Creek by traditional abra (water taxi) and explore the labyrinthine lanes of Deira's legendary souks. Guides will help you navigate and, if you wish, negotiate at the gold and spice traders.",
      },
      {
        question: "Are city tours available in languages other than English?",
        answer:
          "We primarily operate in English but can arrange guides in Arabic, Hindi, and Urdu with advance notice. Please specify your language preference when booking.",
      },
    ],
  },
  {
    slug: "water-activities",
    label: "Water Activities",
    title: "Dubai Water Sports & Marina Experiences",
    subtitle:
      "The Arabian Gulf is your playground. Jet skis, parasailing, yacht cruises, and everything in between — all in the shadow of the Dubai Marina skyline.",
    metaDescription:
      "Book Dubai water sports online. Jet ski, parasailing, flyboard, yacht charter, scuba diving. Safe equipment, certified instructors, instant booking.",
    intro: [
      "The Dubai coastline stretches across 72 kilometres of pristine Arabian Gulf waterfront — warm, calm, and crystal-clear. Whether you're an adrenaline seeker wanting to fly above the water on a flyboard or a family looking for a relaxed afternoon on a yacht, the Gulf offers something for everyone.",
      "Our water activity experiences are led by certified instructors with full safety equipment provided. The Dubai Marina, Jumeirah Beach, and Palm Jumeirah all serve as stunning backdrops — meaning even a straightforward jet ski ride doubles as a sightseeing tour of the city's most iconic architecture.",
      "Water temperatures in Dubai range from 24°C in winter to 33°C in summer, making swimming and water sports comfortable year-round. The best time for water activities is October to April when the sea is calm and the weather is mild.",
    ],
    heroImageUrl:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600&q=80",
    dbCategory: "Water Activities",
    faqs: [
      {
        question: "Do I need experience to try flyboarding or jet skiing?",
        answer:
          "No prior experience is needed. Certified instructors provide a full safety briefing and training session before every activity. Most guests are confidently riding a jet ski or hovering on a flyboard within minutes. Minimum age requirements apply (typically 16+ for flyboard, 18+ for solo jet ski).",
      },
      {
        question: "What should I bring for a water sports session?",
        answer:
          "Wear a swimsuit and bring a towel, sunscreen, and sunglasses. We provide all safety equipment including life jackets and helmets where required. Lockers are available for valuables. Avoid heavy meals immediately before activities like jet skiing or parasailing.",
      },
      {
        question: "Is parasailing safe?",
        answer:
          "Yes — parasailing in Dubai is a well-regulated activity. All our operators are licensed by Dubai Tourism and Maritime authorities. You'll be harnessed, briefed, and supervised throughout. The majority of participants have no prior experience and find the experience surprisingly calm once airborne.",
      },
      {
        question: "Can non-swimmers participate in water activities?",
        answer:
          "Non-swimmers can participate in parasailing and some boat tours, as life jackets are always provided. Jet skiing and flyboarding require a basic level of water confidence. We recommend disclosing swimming ability at the time of booking so we can match you to the right activity.",
      },
      {
        question: "What's the best time of year for Dubai water sports?",
        answer:
          "October to April is ideal — sea temperatures sit around 24–26°C, weather is pleasant, and visibility for snorkelling and diving is excellent. Summer months (June–September) are hotter but water temperatures are warm and activities continue. We monitor sea conditions daily and reschedule if conditions are unsafe.",
      },
    ],
  },
  {
    slug: "private-tours",
    label: "Private Tours",
    title: "Private & Luxury Tour Experiences in Dubai",
    subtitle:
      "Your schedule, your group, your way. Bespoke itineraries and exclusive access for travellers who expect more.",
    metaDescription:
      "Book private tours in Dubai. Luxury desert safaris, private yacht charters, bespoke city tours. Fully customised, exclusive group experiences.",
    intro: [
      "A private tour isn't just a group tour without strangers — it's a completely different quality of experience. Your guide's full attention, flexible timing, custom route planning, and the ability to linger or accelerate wherever the moment takes you.",
      "Our private experiences range from intimate desert dinners for two under the stars to exclusive yacht charters for corporate groups. Each is built around your specific preferences: dietary requirements, mobility needs, particular interests, preferred departure times, and every other detail that makes travel feel genuinely personal.",
      "Many guests book private tours for celebrations — milestone birthdays, honeymoons, anniversary surprises, or family reunion trips. We specialise in creating experiences that go beyond the expected, with thoughtful touches arranged ahead of time so that everything feels effortless on the day.",
    ],
    heroImageUrl:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1600&q=80",
    dbCategory: "Private Tours",
    faqs: [
      {
        question: "How far in advance do I need to book a private tour?",
        answer:
          "We recommend booking at least 48–72 hours in advance for standard private tours. Luxury yacht charters and multi-day custom itineraries benefit from 5–7 days' notice to ensure all logistics are arranged perfectly. Last-minute requests (within 24 hours) are sometimes possible — contact us directly to check availability.",
      },
      {
        question: "Can I customise the itinerary?",
        answer:
          "Absolutely — that's the entire point of a private tour. Before your experience, you'll discuss your preferences with our planning team. We'll build a tailored itinerary including your choice of destinations, lunch preferences, photography stops, and any special surprises you'd like arranged. Nothing is fixed until you're happy.",
      },
      {
        question: "What is the minimum group size for a private tour?",
        answer:
          "Private tours start from 1 guest — they're ideal for solo travellers, couples, and small families. For larger groups of 15+, we can coordinate multiple vehicles or dedicated charter vessels to ensure everyone travels together comfortably.",
      },
      {
        question: "Do private tours cost significantly more than shared tours?",
        answer:
          "Per-person pricing for private tours is higher than shared group experiences — this reflects the dedicated vehicle, exclusive guide attention, and customisation. However, for families or groups of 4+, the per-person cost often becomes comparable to a premium shared tour while delivering a significantly superior experience.",
      },
      {
        question: "Can you arrange airport transfers as part of a private tour package?",
        answer:
          "Yes — we offer private airport transfers in luxury vehicles as a standalone service or as part of a wider tour package. Whether you need a seamless arrival transfer or a full-day itinerary that starts and ends at the airport, we'll handle every detail.",
      },
    ],
  },
];

/** Lookup a category config by slug. Returns undefined if not found. */
export function getCategoryConfig(slug: string): CategoryConfig | undefined {
  return CATEGORY_CONFIGS.find((c) => c.slug === slug);
}

/** Lookup a category config by the DB category string (e.g. "Desert Tours") */
export function getCategoryConfigByDbCategory(dbCategory: string): CategoryConfig | undefined {
  return CATEGORY_CONFIGS.find((c) => c.dbCategory === dbCategory);
}

/** All valid category slugs for static generation */
export const ALL_CATEGORY_SLUGS = CATEGORY_CONFIGS.map((c) => c.slug);
