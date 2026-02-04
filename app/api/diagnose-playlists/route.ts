import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: [],
  };

  try {
    // Check 1: DATABASE_URL environment variable
    const dbUrl = process.env.DATABASE_URL;
    diagnostics.checks.push({
      name: "DATABASE_URL",
      status: dbUrl ? "PASS" : "FAIL",
      message: dbUrl ? "DATABASE_URL is set" : "DATABASE_URL is NOT set",
    });

    if (!dbUrl) {
      return NextResponse.json(diagnostics, { status: 500 });
    }

    const sql = neon(dbUrl);

    // Check 2: Database connection
    try {
      await sql`SELECT 1`;
      diagnostics.checks.push({
        name: "Database Connection",
        status: "PASS",
        message: "Successfully connected to database",
      });
    } catch (error) {
      diagnostics.checks.push({
        name: "Database Connection",
        status: "FAIL",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return NextResponse.json(diagnostics, { status: 500 });
    }

    // Check 3: users table exists
    try {
      const result = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'users'
      `;
      diagnostics.checks.push({
        name: "users table",
        status: result.length > 0 ? "PASS" : "FAIL",
        message: result.length > 0 ? "users table exists" : "users table does NOT exist",
      });
    } catch (error) {
      diagnostics.checks.push({
        name: "users table",
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Check 4: recordings table exists
    try {
      const result = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'recordings'
      `;
      diagnostics.checks.push({
        name: "recordings table",
        status: result.length > 0 ? "PASS" : "FAIL",
        message: result.length > 0 ? "recordings table exists" : "recordings table does NOT exist",
      });
    } catch (error) {
      diagnostics.checks.push({
        name: "recordings table",
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Check 5: playlists table exists
    try {
      const result = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'playlists'
      `;
      diagnostics.checks.push({
        name: "playlists table",
        status: result.length > 0 ? "PASS" : "FAIL",
        message: result.length > 0 ? "playlists table exists" : "playlists table does NOT exist",
      });
    } catch (error) {
      diagnostics.checks.push({
        name: "playlists table",
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Check 6: playlist_items table exists
    try {
      const result = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'playlist_items'
      `;
      diagnostics.checks.push({
        name: "playlist_items table",
        status: result.length > 0 ? "PASS" : "FAIL",
        message: result.length > 0 ? "playlist_items table exists" : "playlist_items table does NOT exist",
      });
    } catch (error) {
      diagnostics.checks.push({
        name: "playlist_items table",
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Check 7: Demo user exists
    try {
      const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";
      const result = await sql`
        SELECT * FROM users WHERE id = ${DEMO_USER_ID}
      `;
      diagnostics.checks.push({
        name: "Demo User",
        status: result.length > 0 ? "PASS" : "FAIL",
        message: result.length > 0 ? "Demo user exists" : "Demo user does NOT exist",
      });
    } catch (error) {
      diagnostics.checks.push({
        name: "Demo User",
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Check 8: Try to query playlists
    try {
      const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";
      const playlists = await sql`
        SELECT * FROM playlists 
        WHERE user_id = ${DEMO_USER_ID}
      `;
      diagnostics.checks.push({
        name: "Query playlists",
        status: "PASS",
        message: `Successfully queried playlists, found ${playlists.length} playlists`,
      });
    } catch (error) {
      diagnostics.checks.push({
        name: "Query playlists",
        status: "FAIL",
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
