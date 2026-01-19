import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json(
        { error: "DATABASE_URL não está definida" },
        { status: 500 },
      );
    }

    const sql = neon(dbUrl);

    // Verificar tabelas
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    return NextResponse.json({
      success: true,
      tables: tables.map((t: any) => t.table_name),
      totalTables: tables.length,
      message:
        tables.length === 0
          ? "Nenhuma tabela encontrada. Execute 'npm run db:push'"
          : "Tabelas encontradas",
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
