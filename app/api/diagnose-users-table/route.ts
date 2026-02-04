import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: [],
  };

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    // Check users table schema
    try {
      const columns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `;
      diagnostics.checks.push({
        name: "users table columns",
        status: "PASS",
        columns: columns,
      });
    } catch (error) {
      diagnostics.checks.push({
        name: "users table columns",
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Check existing foreign key constraints
    try {
      const constraints = await sql`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, tc.constraint_name
      `;
      diagnostics.checks.push({
        name: "Foreign key constraints",
        status: "PASS",
        constraints: constraints,
      });
    } catch (error) {
      diagnostics.checks.push({
        name: "Foreign key constraints",
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Check if there are any existing playlists-related constraints
    try {
      const playlistConstraints = await sql`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (tc.table_name = 'playlists' OR tc.table_name = 'playlist_items')
        ORDER BY tc.table_name, tc.constraint_name
      `;
      diagnostics.checks.push({
        name: "Playlists foreign key constraints",
        status: "PASS",
        constraints: playlistConstraints,
      });
    } catch (error) {
      diagnostics.checks.push({
        name: "Playlists foreign key constraints",
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return NextResponse.json(diagnostics);
  } catch (error) {
    diagnostics.checks.push({
      name: "Diagnostics",
      status: "ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
