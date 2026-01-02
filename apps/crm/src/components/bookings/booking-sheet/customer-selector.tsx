"use client";

import { useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  X,
  Mail,
  Phone,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface CustomerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export interface CustomerSelectorProps {
  mode: "search" | "create";
  onModeChange: (mode: "search" | "create") => void;
  // Search mode
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCustomer: CustomerData | null;
  onSelectCustomer: (customer: CustomerData | null) => void;
  filteredCustomers: CustomerSearchResult[];
  recentCustomers: CustomerSearchResult[];
  // Create mode
  newCustomer: CustomerData;
  onNewCustomerChange: (customer: CustomerData) => void;
  // Validation
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  onTouch: (field: string) => void;
  hasValidContact: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomerSelector({
  mode,
  onModeChange,
  searchQuery,
  onSearchChange,
  selectedCustomer,
  onSelectCustomer,
  filteredCustomers,
  recentCustomers,
  newCustomer,
  onNewCustomerChange,
  errors,
  touched,
  onTouch,
  hasValidContact,
}: CustomerSelectorProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Customer</label>
        <button
          type="button"
          onClick={() => {
            onModeChange(mode === "create" ? "search" : "create");
            onSelectCustomer(null);
            onSearchChange("");
          }}
          className="text-xs text-primary hover:underline font-medium"
        >
          {mode === "create" ? "Search Existing \u2192" : "\u2190 New Customer"}
        </button>
      </div>

      {mode === "search" ? (
        <div className="space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Selected customer display */}
          {selectedCustomer && (
            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {selectedCustomer.firstName[0]}{selectedCustomer.lastName[0] || ""}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.email || selectedCustomer.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectCustomer(null)}
                className="p-1.5 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Search results */}
          {!selectedCustomer && filteredCustomers.length > 0 && (
            <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    onSelectCustomer({
                      id: customer.id,
                      firstName: customer.firstName,
                      lastName: customer.lastName,
                      email: customer.email || "",
                      phone: customer.phone || "",
                    });
                    onSearchChange("");
                  }}
                  className="w-full p-3 text-left hover:bg-accent transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {customer.firstName[0]}{customer.lastName[0] || ""}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {customer.email || customer.phone || "No contact"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent customers (when no search) */}
          {!selectedCustomer && searchQuery.length < 2 && recentCustomers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Recent
              </p>
              <div className="flex flex-wrap gap-2">
                <TooltipProvider delayDuration={300}>
                  {recentCustomers.slice(0, 4).map((customer) => (
                    <Tooltip key={customer.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCustomer({
                              id: customer.id,
                              firstName: customer.firstName,
                              lastName: customer.lastName,
                              email: customer.email || "",
                              phone: customer.phone || "",
                            });
                          }}
                          className="px-3 py-1.5 text-sm bg-muted hover:bg-accent rounded-full transition-colors"
                        >
                          {customer.firstName} {customer.lastName?.[0] || ""}.
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <div className="text-sm">
                          <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                          <p className="text-muted-foreground text-xs">
                            {customer.email || customer.phone || "No contact info"}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </div>
          )}

          {errors.customer && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.customer}
            </p>
          )}
        </div>
      ) : (
        /* New customer form */
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="text"
                value={newCustomer.firstName}
                onChange={(e) => onNewCustomerChange({ ...newCustomer, firstName: e.target.value })}
                onBlur={() => onTouch("firstName")}
                placeholder="First Name *"
                className={cn(
                  "w-full px-3 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                  touched.firstName && errors.firstName ? "border-destructive" : "border-input"
                )}
              />
              {touched.firstName && errors.firstName && (
                <p className="text-xs text-destructive mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                value={newCustomer.lastName}
                onChange={(e) => onNewCustomerChange({ ...newCustomer, lastName: e.target.value })}
                placeholder="Last Name"
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
          {(touched.contact || touched.email || touched.phone) && errors.contact ? (
            <p className="text-xs text-destructive">{errors.contact}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Email or phone required</p>
          )}
          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={newCustomer.email}
                onChange={(e) => onNewCustomerChange({ ...newCustomer, email: e.target.value })}
                onBlur={() => onTouch("email")}
                placeholder="Email"
                className={cn(
                  "w-full pl-10 pr-3 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                  touched.email && errors.email ? "border-destructive" :
                    (touched.contact && errors.contact && !hasValidContact) ? "border-destructive" : "border-input"
                )}
              />
            </div>
            {touched.email && errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="tel"
              value={newCustomer.phone}
              onChange={(e) => onNewCustomerChange({ ...newCustomer, phone: e.target.value })}
              onBlur={() => onTouch("phone")}
              placeholder="Phone"
              className={cn(
                "w-full pl-10 pr-3 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                (touched.contact && errors.contact && !hasValidContact) ? "border-destructive" : "border-input"
              )}
            />
          </div>
        </div>
      )}
    </section>
  );
}
