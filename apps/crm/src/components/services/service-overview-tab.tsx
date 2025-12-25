"use client";

import {
  Clock,
  DollarSign,
  Tag,
  Users,
  Settings,
  CheckCircle,
  XCircle,
  Package,
  AlertCircle,
} from "lucide-react";
import type { CatalogServiceWithProduct } from "@tour/services";

interface ServiceOverviewTabProps {
  service: CatalogServiceWithProduct;
}

export function ServiceOverviewTab({ service }: ServiceOverviewTabProps) {
  const formatPricingModel = (model: string) => {
    const labels: Record<string, string> = {
      flat: "Flat Rate",
      per_person: "Per Person",
      per_hour: "Per Hour",
      per_day: "Per Day",
      per_vehicle: "Per Vehicle",
      custom: "Custom Pricing",
    };
    return labels[model] || model;
  };

  const formatServiceType = (type: string) => {
    const labels: Record<string, string> = {
      transfer: "Transfer",
      addon: "Add-on",
      rental: "Rental",
      package: "Package",
      custom: "Custom Service",
    };
    return labels[type] || type;
  };

  const formatAvailabilityType = (type: string) => {
    const labels: Record<string, string> = {
      always: "Always Available",
      scheduled: "Scheduled",
      on_request: "On Request",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Base Price</p>
              <p className="font-semibold text-foreground">
                ${parseFloat(service.product.basePrice).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <Tag className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pricing Model</p>
              <p className="font-semibold text-foreground text-sm">
                {formatPricingModel(service.pricingModel)}
              </p>
            </div>
          </div>
        </div>

        {service.duration && (
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold text-foreground">{service.duration} min</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Package className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service Type</p>
              <p className="font-semibold text-foreground text-sm">
                {formatServiceType(service.serviceType)}
              </p>
            </div>
          </div>
        </div>

        {service.maxQuantity && (
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Max Quantity</p>
                <p className="font-semibold text-foreground">{service.maxQuantity}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Description</h2>
        {service.product.shortDescription && (
          <p className="text-muted-foreground mb-4 font-medium">
            {service.product.shortDescription}
          </p>
        )}
        {service.product.description ? (
          <p className="text-muted-foreground whitespace-pre-wrap">
            {service.product.description}
          </p>
        ) : (
          <p className="text-muted-foreground italic">No description provided</p>
        )}
      </div>

      {/* Service Configuration */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Service Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Availability Type</p>
              <p className="font-medium text-foreground text-sm">
                {formatAvailabilityType(service.availabilityType)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {service.isStandalone ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Can Book Standalone</p>
              <p className="font-medium text-foreground text-sm">
                {service.isStandalone ? "Yes" : "No"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {service.isAddon ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Available as Add-on</p>
              <p className="font-medium text-foreground text-sm">
                {service.isAddon ? "Yes" : "No"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {service.requiresApproval ? (
              <AlertCircle className="h-5 w-5 text-warning" />
            ) : (
              <CheckCircle className="h-5 w-5 text-success" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Requires Approval</p>
              <p className="font-medium text-foreground text-sm">
                {service.requiresApproval ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Applicable Products/Types */}
      {((service.applicableToProducts && service.applicableToProducts.length > 0) ||
        (service.applicableToTypes && service.applicableToTypes.length > 0)) && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Applicable Products/Types
          </h2>
          <div className="space-y-4">
            {service.applicableToProducts && service.applicableToProducts.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Specific Products
                </p>
                <div className="flex flex-wrap gap-2">
                  {service.applicableToProducts.map((productId) => (
                    <span
                      key={productId}
                      className="px-3 py-1 bg-muted rounded-full text-sm text-foreground"
                    >
                      {productId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {service.applicableToTypes && service.applicableToTypes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Product Types</p>
                <div className="flex flex-wrap gap-2">
                  {service.applicableToTypes.map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-muted rounded-full text-sm text-foreground capitalize"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing Tiers */}
      {service.pricingTiers && service.pricingTiers.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pricing Tiers</h2>
          <div className="space-y-3">
            {service.pricingTiers.map((tier: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div>
                  <p className="font-medium text-foreground">{tier.name || `Tier ${index + 1}`}</p>
                  {tier.description && (
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ${parseFloat(tier.price || "0").toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer Config */}
      {service.serviceType === "transfer" && service.transferConfig && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Transfer Configuration</h2>
          <div className="space-y-2">
            {Object.entries(service.transferConfig as Record<string, any>).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rental Config */}
      {service.serviceType === "rental" && service.rentalConfig && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Rental Configuration</h2>
          <div className="space-y-2">
            {Object.entries(service.rentalConfig as Record<string, any>).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
