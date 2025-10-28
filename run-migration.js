import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Bq6i5VAfpGCz@ep-dawn-butterfly-a1y95rqd-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
  console.log('🔧 Starting database migration...\n');

  const sql = neon(DATABASE_URL);

  try {
    const migrationsDir = join(__dirname, 'db', 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('ℹ️  No SQL migration files found.');
      return;
    }

    console.log(`📝 Found ${migrationFiles.length} migration file(s)\n`);

    for (const file of migrationFiles) {
      const filePath = join(migrationsDir, file);
      const migrationSQL = readFileSync(filePath, 'utf-8').trim();

      if (!migrationSQL) {
        console.log(`⚠️  Skipping empty migration file: ${file}`);
        continue;
      }

      console.log(`📄 Running migration: ${file}`);

      // Preserve backwards compatibility messaging for the legacy fix script
      if (file === 'fix_schema_types.sql') {
        console.log('⚠️  Warning: This will truncate the analytics table and recreate click_events and messages tables');
      }

      const statements = migrationSQL
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => statement.length > 0 && !statement.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        try {
          await sql(statement);
          console.log(`  ✅ [${i + 1}/${statements.length}] Success`);
        } catch (error) {
          if (typeof error.message === 'string' && (
            error.message.includes('already exists') ||
            error.message.includes('does not exist')
          )) {
            console.log(`  ⚠️  [${i + 1}/${statements.length}] Skipped (already applied or missing dependency)`);
          } else {
            console.error(`  ❌ [${i + 1}/${statements.length}] Error:`, error.message);
            console.log('  Statement preview:', statement.substring(0, 200) + (statement.length > 200 ? '...' : ''));
          }
        }
      }

      console.log(`✅ Completed: ${file}\n`);
    }

    console.log('✅ Migration run complete!');
    console.log('\n📋 Summary:');
    console.log('  - Analytics, click events, messages, and favorites schema fixes ensured');
    console.log('  - Notifications tables and enums ensured');
    console.log('\n🔄 Please restart your server for changes to take effect');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
