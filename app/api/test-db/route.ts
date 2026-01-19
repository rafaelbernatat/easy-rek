import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET() {
  try {
    console.log("🧪 [API TEST] Testando conexão com banco...");

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json(
        { error: "DATABASE_URL não está definida" },
        { status: 500 },
      );
    }

    const sql = neon(dbUrl);

    // Garantir usuário demo
    const existingUsers = await sql`
      SELECT * FROM users WHERE id = ${DEMO_USER_ID}
    `;

    if (existingUsers.length === 0) {
      await sql`
        INSERT INTO users (id, email, name, plan_type)
        VALUES (${DEMO_USER_ID}, 'demo@easyrek.com', 'Demo User', 'free')
      `;
      console.log("🧪 [API TEST] ✅ Usuário demo criado");
    }

    // Inserir registro de teste
    const testTitle = `API Test - ${new Date().toISOString()}`;
    const testVideoKey = `test/api-${Date.now()}.webm`;

    const newRecordings = await sql`
      INSERT INTO recordings (user_id, title, video_key, duration, size)
      VALUES (${DEMO_USER_ID}, ${testTitle}, ${testVideoKey}, 15, 500000)
      RETURNING *
    `;

    console.log("🧪 [API TEST] ✅ Teste bem-sucedido!");

    return NextResponse.json({
      success: true,
      message: "Conexão OK! Registro criado com SQL direto.",
      recording: newRecordings[0],
      databaseUrl: dbUrl.substring(0, 30) + "...",
    });
  } catch (error) {
    console.error("🧪 [API TEST] ❌ Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
