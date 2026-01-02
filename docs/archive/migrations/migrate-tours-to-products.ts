/**
 * Migration: Tours → Products
 *
 * This migration creates Product records for all existing Tours and links them.
 *
 * Usage:
 *   npx tsx packages/database/src/migrations/migrate-tours-to-products.ts
 *
 * What it does:
 *   1. Finds all tours without a productId
 *   2. Creates a product record for each tour (type: "tour")
 *   3. Updates the tour's productId to reference the new product
 *   4. Copies common fields from tour to product
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, isNull, count } from "drizzle-orm";
import * as schema from "../schema";

const { tours, products } = schema;

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  console.log("🚀 Starting Tours → Products migration...\n");

  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });

  try {
    // Find all tours without productId
    const toursWithoutProduct = await db
      .select()
      .from(tours)
      .where(isNull(tours.productId));

    console.log(`📊 Found ${toursWithoutProduct.length} tours without product records\n`);

    if (toursWithoutProduct.length === 0) {
      console.log("✅ All tours already have product records. Nothing to migrate.");
      await client.end();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const tour of toursWithoutProduct) {
      try {
        // Map tour status to product status
        const productStatus = mapTourStatusToProductStatus(tour.status);

        // Create product record
        const [product] = await db
          .insert(products)
          .values({
            organizationId: tour.organizationId,
            type: "tour" as const,
            name: tour.name,
            slug: tour.slug,
            description: tour.description,
            shortDescription: tour.shortDescription,
            status: productStatus,
            visibility: tour.isPublic ? "public" : "private",
            basePrice: tour.basePrice,
            currency: tour.currency ?? "USD",
            featuredImage: tour.coverImageUrl,
            gallery: tour.images ?? [],
            metaTitle: tour.metaTitle,
            metaDescription: tour.metaDescription,
            tags: tour.tags ?? [],
          })
          .returning();

        if (!product) {
          throw new Error("Failed to create product record");
        }

        // Update tour with productId
        await db
          .update(tours)
          .set({ productId: product.id })
          .where(eq(tours.id, tour.id));

        successCount++;
        console.log(`  ✓ ${tour.name} (${tour.id}) → Product ${product.id}`);
      } catch (error) {
        errorCount++;
        console.error(`  ✗ ${tour.name} (${tour.id}): ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✓ Successfully migrated: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   ✗ Errors: ${errorCount}`);
    }

    // Verify all tours now have productId
    const remainingWithoutProduct = await db
      .select({ count: count() })
      .from(tours)
      .where(isNull(tours.productId));

    const remaining = remainingWithoutProduct[0]?.count ?? 0;
    if (remaining > 0) {
      console.log(`\n⚠️  Warning: ${remaining} tours still without productId`);
    } else {
      console.log(`\n✅ All tours now have product records!`);
    }

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

function mapTourStatusToProductStatus(tourStatus: string | null): "draft" | "active" | "archived" {
  switch (tourStatus) {
    case "active":
      return "active";
    case "archived":
      return "archived";
    case "draft":
    case "paused":
    default:
      return "draft";
  }
}

// Run migration
migrate().catch(console.error);
