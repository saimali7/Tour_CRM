/**
 * Fix pricing models in default booking options
 * Run with: npx tsx scripts/fix-pricing-models.ts
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "../src";

config({ path: "../../.env.local" });

async function fixPricingModels() {
  console.log("🔧 Fixing pricing models in booking options...\n");

  // Get all booking options with incorrect format
  const optionsResult = await db.execute(sql`
    SELECT id, pricing_model, tour_id
    FROM booking_options
  `);

  const rows = Array.isArray(optionsResult)
    ? optionsResult
    : (optionsResult as any).rows || [];

  console.log(`Found ${rows.length} booking options to check`);

  let fixed = 0;
  for (const row of rows) {
    const option = row as { id: string; pricing_model: any; tour_id: string };
    const pricingModel = option.pricing_model;

    // Check if format needs fixing
    if (pricingModel?.type === "per_person" && pricingModel.tiers) {
      const needsFix = pricingModel.tiers.some((t: any) => t.tierType && !t.id);

      if (needsFix) {
        // Convert tierType/label format to id/name format
        const fixedTiers = pricingModel.tiers.map((tier: any) => ({
          id: tier.tierType || tier.id,
          name: tier.label || tier.name,
          price: tier.price,
          ageMin: tier.ageRange?.min ?? tier.ageMin,
          ageMax: tier.ageRange?.max ?? tier.ageMax,
          isFree: tier.isFree,
        }));

        const fixedModel = {
          ...pricingModel,
          tiers: fixedTiers,
        };

        await db.execute(sql`
          UPDATE booking_options
          SET pricing_model = ${JSON.stringify(fixedModel)}::jsonb
          WHERE id = ${option.id}
        `);

        console.log(`✓ Fixed option ${option.id}`);
        fixed++;
      }
    }
  }

  console.log(`\n✅ Fixed ${fixed} booking options\n`);
}

async function main() {
  try {
    await fixPricingModels();
    console.log("🎉 Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed:", error);
    process.exit(1);
  }
}

main();
