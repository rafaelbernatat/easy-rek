"use server";

import { neon } from "@neondatabase/serverless";

// Temporary demo user ID - Replace with actual auth in Phase 5
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Ensure demo user exists
 */
async function ensureDemoUser() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(dbUrl);

  const existingUsers = await sql`
    SELECT * FROM users WHERE id = ${DEMO_USER_ID}
  `;

  if (existingUsers.length === 0) {
    await sql`
      INSERT INTO users (id, email, name, plan_type)
      VALUES (${DEMO_USER_ID}, 'demo@easyrek.com', 'Demo User', 'free')
    `;
  }
}

export interface SaveRecordingInput {
  title: string;
  videoKey: string;
  duration: number; // in seconds
  size: number; // in bytes
}

/**
 * Save recording metadata to database
 */
export async function saveRecordingAction(input: SaveRecordingInput) {
  console.log("💾 [SAVE RECORDING] Iniciando salvamento...");
  console.log(
    "💾 [SAVE RECORDING] DATABASE_URL presente:",
    process.env.DATABASE_URL ? "✅ SIM" : "❌ NÃO",
  );
  console.log("💾 [SAVE RECORDING] Input recebido:", {
    title: input.title,
    videoKey: input.videoKey,
    duration: input.duration,
    size: input.size,
  });

  try {
    // Ensure demo user exists
    console.log("💾 [SAVE RECORDING] Garantindo usuário demo...");
    await ensureDemoUser();
    console.log("💾 [SAVE RECORDING] ✅ Usuário demo OK");

    // Create recording
    console.log("💾 [SAVE RECORDING] Criando registro no banco...");
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const newRecordings = await sql`
      INSERT INTO recordings (user_id, title, video_key, duration, size)
      VALUES (${DEMO_USER_ID}, ${input.title}, ${input.videoKey}, ${input.duration}, ${input.size})
      RETURNING *
    `;

    const recording = newRecordings[0];
    console.log("💾 [SAVE RECORDING] ✅ Registro criado com sucesso!");
    console.log("💾 [SAVE RECORDING] ID do registro:", recording.id);

    return {
      success: true,
      recording: {
        id: recording.id,
        userId: recording.user_id,
        title: recording.title,
        videoKey: recording.video_key,
        duration: recording.duration,
        size: Number(recording.size),
        createdAt: new Date(recording.created_at).toISOString(),
      },
    };
  } catch (error) {
    console.error("💾 [SAVE RECORDING] ❌ ERRO:", error);
    console.error(
      "💾 [SAVE RECORDING] Erro detalhado:",
      error instanceof Error ? error.stack : String(error),
    );
    return {
      success: false,
      error: "Failed to save recording",
    };
  }
}

/**
 * Get all recordings for demo user
 */
export async function getRecordingsAction() {
  try {
    await ensureDemoUser();

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    const sql = neon(dbUrl);

    const recordings = await sql`
      SELECT * FROM recordings 
      WHERE user_id = ${DEMO_USER_ID}
      ORDER BY created_at DESC
    `;

    return {
      success: true,
      recordings: recordings.map((rec: any) => ({
        id: rec.id,
        userId: rec.user_id,
        title: rec.title,
        videoKey: rec.video_key,
        duration: rec.duration,
        size: Number(rec.size),
        createdAt: new Date(rec.created_at).toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching recordings:", error);
    return {
      success: false,
      recordings: [],
    };
  }
}
