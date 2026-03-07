import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Client } = pkg;
import * as dotenv from "dotenv";

dotenv.config();

console.log("Connecting to database using:", process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing. Please check your .env file.");
    process.exit(1);
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function migrateCourses() {
    try {
        await client.connect();
        const db = drizzle(client);
        console.log("Connected successfully.");

        // We need to use raw SQL for the migration since we changed the schema

        console.log("Adding purchased_courses column...");
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS purchased_courses text[] DEFAULT '{}'::text[] NOT NULL;
        `);

        console.log("Migrating paid users to fullstack and cyber courses...");
        await client.query(`
            UPDATE users 
            SET purchased_courses = ARRAY['fullstack', 'cyber']
            WHERE is_paid = true;
        `);

        console.log("Dropping is_paid column...");
        // Using IF EXISTS to make it idempotent
        await client.query(`
            ALTER TABLE users 
            DROP COLUMN IF EXISTS is_paid;
        `);

        console.log("Migration completed successfully!");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await client.end();
        process.exit();
    }
}

migrateCourses();
