"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SUPPORTED_CURRENCIES,
  getCurrenciesByRegion,
  type CurrencyCode,
  type CurrencyConfig,
} from "@tour/validators";

interface CurrencySelectorProps {
  value: string;
  onValueChange: (value: CurrencyCode) => void;
  disabled?: boolean;
  className?: string;
}

export function CurrencySelector({
  value,
  onValueChange,
  disabled = false,
  className,
}: CurrencySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const currenciesByRegion = getCurrenciesByRegion();
  const selectedCurrency = SUPPORTED_CURRENCIES[value as CurrencyCode];

  // Filter currencies based on search
  const filteredRegions = React.useMemo(() => {
    if (!search) return currenciesByRegion;

    const searchLower = search.toLowerCase();
    const filtered: Record<string, CurrencyConfig[]> = {};

    for (const [region, currencies] of Object.entries(currenciesByRegion)) {
      const matchingCurrencies = currencies.filter(
        (currency) =>
          currency.code.toLowerCase().includes(searchLower) ||
          currency.name.toLowerCase().includes(searchLower) ||
          currency.symbol.toLowerCase().includes(searchLower)
      );

      if (matchingCurrencies.length > 0) {
        filtered[region] = matchingCurrencies;
      }
    }

    return filtered;
  }, [search, currenciesByRegion]);

  const hasResults = Object.keys(filteredRegions).length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedCurrency ? (
            <span className="flex items-center gap-2">
              <span className="text-base">{selectedCurrency.flag}</span>
              <span className="font-medium">{selectedCurrency.code}</span>
              <span className="text-muted-foreground">
                - {selectedCurrency.name}
              </span>
            </span>
          ) : (
            "Select currency..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search currency..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!hasResults && (
              <CommandEmpty>No currency found.</CommandEmpty>
            )}
            {Object.entries(filteredRegions).map(([region, currencies]) => (
              <CommandGroup key={region} heading={region}>
                {currencies.map((currency) => (
                  <CommandItem
                    key={currency.code}
                    value={currency.code}
                    onSelect={() => {
                      onValueChange(currency.code as CurrencyCode);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === currency.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="mr-2 text-base">{currency.flag}</span>
                    <span className="font-medium mr-2">{currency.code}</span>
                    <span className="text-muted-foreground flex-1">
                      {currency.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {currency.symbol}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
