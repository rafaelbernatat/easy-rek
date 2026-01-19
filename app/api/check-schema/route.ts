import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json(
        { error: "DATABASE_URL not set" },
        { status: 500 },
      );
    }

    const sql = neon(dbUrl);

    // Verificar colunas da tabela users
    const userColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    // Verificar colunas da tabela recordings
    const recordingColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'recordings'
      ORDER BY ordinal_position
    `;

    return NextResponse.json({
      success: true,
      users: {
        columns: userColumns,
        count: userColumns.length,
      },
      recordings: {
        columns: recordingColumns,
        count: recordingColumns.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
