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

    // Check recordings table schema
    try {
      const columns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'recordings'
        ORDER BY ordinal_position
      `;
      diagnostics.checks.push({
        name: "recordings table columns",
        status: "PASS",
        columns: columns,
      });
    } catch (error) {
      diagnostics.checks.push({
        name: "recordings table columns",
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
