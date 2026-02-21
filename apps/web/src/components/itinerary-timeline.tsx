import { MapPin, Clock } from "lucide-react";

interface ItineraryStop {
  title: string;
  description?: string;
  duration?: string;
  location?: string;
}

interface ItineraryTimelineProps {
  stops: ItineraryStop[];
  className?: string;
}

export function ItineraryTimeline({ stops, className }: ItineraryTimelineProps) {
  if (stops.length === 0) return null;

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-6">
        {stops.map((stop, i) => (
          <div key={i} className="relative flex gap-4">
            {/* Dot */}
            <div className="relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center">
              <div
                className={`h-3 w-3 rounded-full border-2 ${
                  i === 0
                    ? "border-primary bg-primary"
                    : i === stops.length - 1
                      ? "border-stone-400 bg-stone-400"
                      : "border-primary bg-white"
                }`}
              />
            </div>

            {/* Content */}
            <div className="flex-1 pb-1">
              <h4 className="text-sm font-semibold text-foreground">{stop.title}</h4>
              {stop.description && (
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {stop.description}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {stop.duration && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {stop.duration}
                  </span>
                )}
                {stop.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {stop.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
