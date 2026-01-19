/**
 * Test script to verify database connection
 * Run with: npx tsx scripts/test-db.ts
 */

import { db } from "./db";
import { createUser, getUserByEmail, getUserRecordings } from "./db/queries";

async function testDatabase() {
  console.log("🔍 Testing database connection...\n");

  try {
    // Test 1: Create a test user
    console.log("1️⃣  Creating test user...");
    const testUser = await createUser("test@example.com", "Test User");
    console.log("✅ User created:", testUser);

    // Test 2: Get user by email
    console.log("\n2️⃣  Getting user by email...");
    const foundUser = await getUserByEmail("test@example.com");
    console.log("✅ User found:", foundUser);

    // Test 3: Get user recordings (should be empty)
    console.log("\n3️⃣  Getting user recordings...");
    const recordings = await getUserRecordings(testUser.id);
    console.log("✅ Recordings:", recordings);

    console.log("\n✅ All tests passed! Database is working correctly.");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

testDatabase();
