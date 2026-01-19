import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Create the connection
const sql = neon(process.env.DATABASE_URL);

// Export the db instance
export const db = drizzle(sql, { schema });

// Export schema for convenience
export { schema };
