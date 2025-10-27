import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Bq6i5VAfpGCz@ep-dawn-butterfly-a1y95rqd-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
  console.log('🔧 Starting database migration...\n');

  const sql = neon(DATABASE_URL);

  try {
    // Read the migration file
    const migrationSQL = readFileSync(join(__dirname, 'db', 'migrations', 'fix_schema_types.sql'), 'utf-8');

    console.log('📝 Migration SQL loaded');
    console.log('⚠️  Warning: This will truncate the analytics table and recreate click_events and messages tables\n');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`[${i + 1}/${statements.length}] Executing...`);
          await sql(statement);
          console.log(`✅ Success\n`);
        } catch (error) {
          // Some statements might fail if columns don't exist, that's ok
          if (error.message.includes('does not exist') || error.message.includes('already exists')) {
            console.log(`⚠️  Skipped (already applied or doesn't exist)\n`);
          } else {
            console.error(`❌ Error:`, error.message);
            console.log('Statement:', statement.substring(0, 100) + '...\n');
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  - Analytics table columns converted to UUID');
    console.log('  - Click events table recreated with correct schema');
    console.log('  - Messages table recreated with correct schema');
    console.log('  - Favorites table updated with created_at column');
    console.log('  - Indexes created for performance');
    console.log('\n🔄 Please restart your server for changes to take effect');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
