#!/usr/bin/env tsx
/**
 * Platform Settings Seeding Script
 *
 * This script populates the platform_settings table with default configuration values
 * that can be managed by administrators through the admin panel.
 *
 * What this script does:
 * 1. Creates default platform settings if they don't exist
 * 2. Organizes settings by category (general, fees, limits, features)
 * 3. Provides descriptions for each setting
 */

// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import { db } from "../server/db.js";
import { platformSettings, users } from "../shared/schema.js";
import { eq } from "drizzle-orm";

interface SettingConfig {
  key: string;
  value: string;
  description: string;
  category: string;
}

const defaultSettings: SettingConfig[] = [
  // General Settings
  {
    key: "maintenance_mode",
    value: "false",
    description: "Enable maintenance mode to prevent users from accessing the platform",
    category: "general",
  },
  {
    key: "platform_name",
    value: "AffiliateXchange",
    description: "The name of the platform displayed throughout the application",
    category: "general",
  },
  {
    key: "new_user_registration_enabled",
    value: "true",
    description: "Allow new users to register on the platform",
    category: "general",
  },
  {
    key: "email_notifications_enabled",
    value: "true",
    description: "Enable or disable email notifications system-wide",
    category: "general",
  },

  // Fee Settings
  {
    key: "platform_fee_percentage",
    value: "4",
    description: "Platform commission percentage charged on all transactions (in %)",
    category: "fees",
  },
  {
    key: "stripe_fee_percentage",
    value: "3",
    description: "Payment processing fee percentage charged by Stripe (in %)",
    category: "fees",
  },
  {
    key: "minimum_commission_amount",
    value: "5",
    description: "Minimum commission amount that can be set for an offer (in USD)",
    category: "fees",
  },

  // Limits and Thresholds
  {
    key: "minimum_payout_threshold",
    value: "50",
    description: "Minimum balance required before a creator can request a payout (in USD)",
    category: "limits",
  },
  {
    key: "maximum_withdrawal_amount",
    value: "10000",
    description: "Maximum amount that can be withdrawn in a single transaction (in USD)",
    category: "limits",
  },
  {
    key: "daily_withdrawal_limit",
    value: "25000",
    description: "Maximum total amount that can be withdrawn per day (in USD)",
    category: "limits",
  },
  {
    key: "max_active_offers_per_company",
    value: "50",
    description: "Maximum number of active offers a company can have",
    category: "limits",
  },
  {
    key: "max_applications_per_creator_daily",
    value: "10",
    description: "Maximum number of applications a creator can submit per day",
    category: "limits",
  },

  // Feature Flags
  {
    key: "kyc_verification_required",
    value: "false",
    description: "Require KYC verification before users can access platform features",
    category: "features",
  },
  {
    key: "auto_approve_applications",
    value: "false",
    description: "Automatically approve all creator applications to offers",
    category: "features",
  },
  {
    key: "analytics_enabled",
    value: "true",
    description: "Enable analytics tracking for offers and applications",
    category: "features",
  },
  {
    key: "referral_program_enabled",
    value: "true",
    description: "Enable referral program for users to earn rewards",
    category: "features",
  },
  {
    key: "two_factor_auth_required",
    value: "false",
    description: "Require two-factor authentication for all users",
    category: "features",
  },
];

async function seedPlatformSettings() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║     Platform Settings Seeding Script                ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  try {
    // Get admin user to set as updatedBy
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    const adminId = adminUsers.length > 0 ? adminUsers[0].id : null;

    if (!adminId) {
      console.log("⚠️  Warning: No admin user found. Settings will be created without updatedBy.");
    }

    console.log("📝 Creating default platform settings...\n");

    let created = 0;
    let skipped = 0;

    for (const setting of defaultSettings) {
      // Check if setting already exists
      const existing = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, setting.key))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(platformSettings).values({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          category: setting.category,
          updatedBy: adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`   ✓ Created: ${setting.key} = ${setting.value}`);
        console.log(`     Category: ${setting.category}`);
        console.log(`     Description: ${setting.description}\n`);
        created++;
      } else {
        console.log(`   ⊕ Skipped (exists): ${setting.key}\n`);
        skipped++;
      }
    }

    // Summary by category
    const categories = [...new Set(defaultSettings.map(s => s.category))];

    console.log("\n╔═══════════════════════════════════════════════════════╗");
    console.log("║              Seeding Complete! ✅                     ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

    console.log("📊 Summary:");
    console.log(`   Settings created: ${created}`);
    console.log(`   Settings skipped: ${skipped}`);
    console.log(`   Total settings: ${defaultSettings.length}\n`);

    console.log("📋 Settings by Category:");
    for (const category of categories) {
      const count = defaultSettings.filter(s => s.category === category).length;
      console.log(`   ${category}: ${count} settings`);
    }

    console.log("\n🎯 Next Steps:");
    console.log("   1. Start the development server: npm run dev");
    console.log("   2. Login as admin");
    console.log("   3. Navigate to Admin → Platform Settings");
    console.log("   4. Configure settings as needed\n");

  } catch (error: any) {
    console.error("\n❌ Error during seeding:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedPlatformSettings();
