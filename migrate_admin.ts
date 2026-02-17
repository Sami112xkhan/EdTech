/**
 * Migration: Add admin management columns to users table
 * Run with: npx tsx migrate_admin.ts
 */
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function migrate() {
    console.log("🔄 Running admin migration...");

    try {
        // Add status column
        await db.execute(sql`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL
        `);
        console.log("✅ Added 'status' column");

        // Add certificate_status column
        await db.execute(sql`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS certificate_status TEXT DEFAULT 'locked' NOT NULL
        `);
        console.log("✅ Added 'certificate_status' column");

        // Add certificate_issue_date column
        await db.execute(sql`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS certificate_issue_date TIMESTAMP
        `);
        console.log("✅ Added 'certificate_issue_date' column");

        console.log("🎉 Admin migration completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
    }

    process.exit(0);
}

migrate();
