import { NextResponse } from "next/server";
import { getPlaylistsForRecordingAction } from "@/app/actions/playlists";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recordingId = searchParams.get("recordingId");

  if (!recordingId) {
    return NextResponse.json(
      { success: false, error: "Recording ID is required" },
      { status: 400 }
    );
  }

  console.log("🔍 [API GET PLAYLISTS FOR RECORDING] Request received for recording:", recordingId);

  try {
    const result = await getPlaylistsForRecordingAction(recordingId);

    console.log("🔍 [API GET PLAYLISTS FOR RECORDING] Result:", result);

    if (result.success) {
      return NextResponse.json(result);
    }

    return NextResponse.json(result, { status: 500 });
  } catch (error) {
    console.error("🔍 [API GET PLAYLISTS FOR RECORDING] ❌ ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
