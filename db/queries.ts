/**
 * Example usage of database operations
 * These functions can be used in API routes or server actions
 */

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Create a new user
 */
export async function createUser(email: string, name?: string) {
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      name,
      planType: "free",
    })
    .returning();

  return user;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));

  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  return user;
}

/**
 * Update user plan
 */
export async function updateUserPlan(
  userId: string,
  planType: "free" | "pro" | "enterprise",
) {
  const [user] = await db
    .update(schema.users)
    .set({ planType })
    .where(eq(schema.users.id, userId))
    .returning();

  return user;
}

// ============================================================================
// RECORDING OPERATIONS
// ============================================================================

/**
 * Create a new recording
 */
export async function createRecording(data: {
  userId: string;
  title: string;
  videoKey: string;
  duration: number;
  size: number;
}) {
  const [recording] = await db
    .insert(schema.recordings)
    .values(data)
    .returning();

  return recording;
}

/**
 * Get all recordings for a user
 */
export async function getUserRecordings(userId: string) {
  const recordings = await db
    .select()
    .from(schema.recordings)
    .where(eq(schema.recordings.userId, userId))
    .orderBy(schema.recordings.createdAt);

  return recordings;
}

/**
 * Get recording by ID
 */
export async function getRecordingById(recordingId: string) {
  const [recording] = await db
    .select()
    .from(schema.recordings)
    .where(eq(schema.recordings.id, recordingId));

  return recording;
}

/**
 * Update recording title
 */
export async function updateRecordingTitle(recordingId: string, title: string) {
  const [recording] = await db
    .update(schema.recordings)
    .set({ title })
    .where(eq(schema.recordings.id, recordingId))
    .returning();

  return recording;
}

/**
 * Delete recording
 */
export async function deleteRecording(recordingId: string) {
  await db
    .delete(schema.recordings)
    .where(eq(schema.recordings.id, recordingId));
}

/**
 * Update recording edit configuration
 */
export async function updateRecordingEditConfig(
  recordingId: string,
  editConfig: string,
) {
  const [recording] = await db
    .update(schema.recordings)
    .set({ editConfig })
    .where(eq(schema.recordings.id, recordingId))
    .returning();

  return recording;
}

/**
 * Get user with their recordings
 */
export async function getUserWithRecordings(userId: string) {
  const result = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    with: {
      recordings: {
        orderBy: (recordings, { desc }) => [desc(recordings.createdAt)],
      },
    },
  });

  return result;
}
