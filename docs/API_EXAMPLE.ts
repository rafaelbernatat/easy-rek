/**
 * Example API Route for recordings
 * File: app/api/recordings/route.ts
 *
 * This is an example of how to use the database in Next.js API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { createRecording, getUserRecordings } from "@/db/queries";

// GET /api/recordings?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const recordings = await getUserRecordings(userId);

    return NextResponse.json(recordings);
  } catch (error) {
    console.error("Error fetching recordings:", error);
    return NextResponse.json(
      { error: "Failed to fetch recordings" },
      { status: 500 },
    );
  }
}

// POST /api/recordings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, videoKey, duration, size } = body;

    // Validate required fields
    if (!userId || !title || !videoKey || !duration || !size) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const recording = await createRecording({
      userId,
      title,
      videoKey,
      duration,
      size,
    });

    return NextResponse.json(recording, { status: 201 });
  } catch (error) {
    console.error("Error creating recording:", error);
    return NextResponse.json(
      { error: "Failed to create recording" },
      { status: 500 },
    );
  }
}
