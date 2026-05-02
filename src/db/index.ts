import "dotenv/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

// Forcefully remove the "-pooler" tag from the connection string
// This guarantees Drizzle will use a Direct Connection and stops the $1 param crash
const directDbUrl = process.env.DATABASE_URL!.replace("-pooler", "");

export const db: NodePgDatabase = drizzle(directDbUrl);

// import "dotenv/config";
// import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"

// export const db: NodePgDatabase = drizzle(process.env.DATABASE_URL!)
