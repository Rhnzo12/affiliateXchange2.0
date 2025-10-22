import { db } from "../server/db";
import * as schema from "../shared/schema";
import { writeFileSync } from "fs";

/**
 * Database Export Utility
 * Exports all data from the database to JSON files for backup/migration
 */

async function exportDatabase() {
  console.log("🔄 Starting database export...\n");

  try {
    // Export all tables
    const data: Record<string, any[]> = {};

    console.log("📊 Exporting tables:");

    // Users (excluding passwords for security)
    const users = await db.select({
      id: schema.users.id,
      username: schema.users.username,
      email: schema.users.email,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      role: schema.users.role,
      profileImageUrl: schema.users.profileImageUrl,
      createdAt: schema.users.createdAt,
    }).from(schema.users);
    data.users = users;
    console.log(`  ✓ Users: ${users.length} records`);

    // Creator profiles
    const creatorProfiles = await db.select().from(schema.creatorProfiles);
    data.creatorProfiles = creatorProfiles;
    console.log(`  ✓ Creator Profiles: ${creatorProfiles.length} records`);

    // Company profiles
    const companyProfiles = await db.select().from(schema.companyProfiles);
    data.companyProfiles = companyProfiles;
    console.log(`  ✓ Company Profiles: ${companyProfiles.length} records`);

    // Offers
    const offers = await db.select().from(schema.offers);
    data.offers = offers;
    console.log(`  ✓ Offers: ${offers.length} records`);

    // Offer videos
    const offerVideos = await db.select().from(schema.offerVideos);
    data.offerVideos = offerVideos;
    console.log(`  ✓ Offer Videos: ${offerVideos.length} records`);

    // Applications
    const applications = await db.select().from(schema.applications);
    data.applications = applications;
    console.log(`  ✓ Applications: ${applications.length} records`);

    // Conversations
    const conversations = await db.select().from(schema.conversations);
    data.conversations = conversations;
    console.log(`  ✓ Conversations: ${conversations.length} records`);

    // Messages
    const messages = await db.select().from(schema.messages);
    data.messages = messages;
    console.log(`  ✓ Messages: ${messages.length} records`);

    // Reviews
    const reviews = await db.select().from(schema.reviews);
    data.reviews = reviews;
    console.log(`  ✓ Reviews: ${reviews.length} records`);

    // Favorites
    const favorites = await db.select().from(schema.favorites);
    data.favorites = favorites;
    console.log(`  ✓ Favorites: ${favorites.length} records`);

    // Click events
    const clickEvents = await db.select().from(schema.clickEvents);
    data.clickEvents = clickEvents;
    console.log(`  ✓ Click Events: ${clickEvents.length} records`);

    // Payment settings
    const paymentSettings = await db.select().from(schema.paymentSettings);
    data.paymentSettings = paymentSettings;
    console.log(`  ✓ Payment Settings: ${paymentSettings.length} records`);

    // Payments
    const payments = await db.select().from(schema.payments);
    data.payments = payments;
    console.log(`  ✓ Payments: ${payments.length} records`);

    // Retainer contracts
    const retainerContracts = await db.select().from(schema.retainerContracts);
    data.retainerContracts = retainerContracts;
    console.log(`  ✓ Retainer Contracts: ${retainerContracts.length} records`);

    // Retainer applications
    const retainerApplications = await db.select().from(schema.retainerApplications);
    data.retainerApplications = retainerApplications;
    console.log(`  ✓ Retainer Applications: ${retainerApplications.length} records`);

    // Retainer deliverables
    const retainerDeliverables = await db.select().from(schema.retainerDeliverables);
    data.retainerDeliverables = retainerDeliverables;
    console.log(`  ✓ Retainer Deliverables: ${retainerDeliverables.length} records`);

    // Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database-export-${timestamp}.json`;
    
    writeFileSync(filename, JSON.stringify(data, null, 2));
    
    console.log(`\n✅ Export complete!`);
    console.log(`📁 File saved: ${filename}`);
    console.log(`📊 Total records exported: ${Object.values(data).reduce((sum, arr) => sum + arr.length, 0)}`);
    
    // Create SQL dump instructions
    console.log(`\n📝 Additional export options:`);
    console.log(`\nTo export as SQL (for PostgreSQL):`);
    console.log(`pg_dump $DATABASE_URL > database-dump.sql`);
    
    console.log(`\nTo export specific table as CSV:`);
    console.log(`psql $DATABASE_URL -c "COPY users TO STDOUT WITH CSV HEADER" > users.csv`);

  } catch (error) {
    console.error("❌ Export failed:", error);
    throw error;
  }
}

exportDatabase()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Error:", error);
    process.exit(1);
  });
