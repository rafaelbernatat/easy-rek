import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json(
        { error: "DATABASE_URL not set" },
        { status: 500 },
      );
    }

    const sql = neon(dbUrl);
    const changes = [];

    // Verificar e adicionar plan_type na tabela users
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free'
      `;
      changes.push("✅ Coluna plan_type adicionada/verificada em users");
    } catch (error) {
      changes.push(`❌ Erro ao adicionar plan_type: ${error}`);
    }

    // Verificar e adicionar created_at na tabela users
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL
      `;
      changes.push("✅ Coluna created_at adicionada/verificada em users");
    } catch (error) {
      changes.push(`❌ Erro ao adicionar created_at: ${error}`);
    }

    // Verificar e adicionar created_at na tabela recordings
    try {
      await sql`
        ALTER TABLE recordings 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL
      `;
      changes.push("✅ Coluna created_at adicionada/verificada em recordings");
    } catch (error) {
      changes.push(`❌ Erro ao adicionar created_at em recordings: ${error}`);
    }

    return NextResponse.json({
      success: true,
      message: "Schema atualizado com sucesso!",
      changes,
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
