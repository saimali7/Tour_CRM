import { LucideIcon } from "lucide-react";

export interface SummaryCard {
  name: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  subtitle?: string;
}

interface SummaryCardsProps {
  cards: SummaryCard[];
}

export function SummaryCards({ cards }: SummaryCardsProps) {
  const getChangeColor = (type?: "positive" | "negative" | "neutral") => {
    switch (type) {
      case "positive":
        return "text-success";
      case "negative":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.name}
          className="rounded-lg border border-border bg-card p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{card.name}</p>
              <p className="text-2xl font-bold text-foreground mt-2">
                {card.value}
              </p>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              )}
              {card.change && (
                <p className={`text-sm mt-2 ${getChangeColor(card.changeType)}`}>
                  {card.change}
                </p>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <card.icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
