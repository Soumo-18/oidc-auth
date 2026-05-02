import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// 1. Forcefully remove the "-pooler" tag from the connection string
// This GUARANTEES a direct connection and stops the INSERT crash
const directDbUrl = process.env.DATABASE_URL!.replace("-pooler", "");

// 2. Create the connection pool with the clean URL
const pool = new Pool({
  connectionString: directDbUrl,
});

// 3. Export the db instance
export const db = drizzle(pool);