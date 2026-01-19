"use server";

import { neon } from "@neondatabase/serverless";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function testDatabaseConnection() {
  console.log("🔍 [TEST DB] Iniciando teste de conexão...");

  try {
    const dbUrl = process.env.DATABASE_URL;
    console.log(
      "🔍 [TEST DB] DATABASE_URL presente:",
      dbUrl ? "✅ SIM" : "❌ NÃO",
    );

    if (!dbUrl) {
      throw new Error("DATABASE_URL não está definida no ambiente");
    }

    const sql = neon(dbUrl);

    // Verificar usuário demo
    console.log("🔍 [TEST DB] Verificando usuário demo...");
    const existingUsers = await sql`
      SELECT * FROM users WHERE id = ${DEMO_USER_ID}
    `;

    if (existingUsers.length === 0) {
      console.log("🔍 [TEST DB] Criando usuário demo...");
      await sql`
        INSERT INTO users (id, email, name, plan_type)
        VALUES (${DEMO_USER_ID}, 'demo@easyrek.com', 'Demo User', 'free')
      `;
      console.log("🔍 [TEST DB] ✅ Usuário demo criado");
    } else {
      console.log("🔍 [TEST DB] ✅ Usuário demo já existe");
    }

    // Inserir registro de teste
    console.log("🔍 [TEST DB] Inserindo registro de teste...");
    const testTitle = `Teste DB - ${new Date().toISOString()}`;
    const testVideoKey = `test/video-${Date.now()}.webm`;

    const newRecordings = await sql`
      INSERT INTO recordings (user_id, title, video_key, duration, size)
      VALUES (${DEMO_USER_ID}, ${testTitle}, ${testVideoKey}, 30, 1024000)
      RETURNING *
    `;

    const newRecording = newRecordings[0];
    console.log("🔍 [TEST DB] ✅ Registro inserido com sucesso!");
    console.log("🔍 [TEST DB] ID do registro:", newRecording.id);

    return {
      success: true,
      message: "Conexão OK! Registro inserido e verificado com sucesso.",
      data: {
        id: newRecording.id,
        title: newRecording.title,
        videoKey: newRecording.video_key,
        duration: newRecording.duration,
        size: Number(newRecording.size),
        createdAt: new Date(newRecording.created_at).toISOString(),
        timestamp: new Date().toISOString(),
        databaseUrl: dbUrl.substring(0, 30) + "...",
      },
    };
  } catch (error) {
    console.error("🔍 [TEST DB] ❌ ERRO:", error);

    return {
      success: false,
      message: "Falha na conexão ou inserção no banco de dados",
      error:
        error instanceof Error
          ? `${error.message}\n\nStack:\n${error.stack}`
          : String(error),
    };
  }
}
