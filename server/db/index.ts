import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    // Limit connections per serverless instance to avoid multiplying the
    // default pool size across Vercel's concurrent function instances.
    max: process.env.VERCEL ? 1 : 10,
    connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
