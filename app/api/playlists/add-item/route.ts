import { NextResponse } from "next/server";
import { addRecordingToPlaylistAction } from "@/app/actions/playlists";

export async function POST(request: Request) {
  console.log("🔍 [API ADD ITEM] Request received");
  
  try {
    const body = await request.json();
    console.log("🔍 [API ADD ITEM] Body:", body);
    
    const result = await addRecordingToPlaylistAction(
      body.playlistId,
      body.recordingId,
    );
    
    console.log("🔍 [API ADD ITEM] Result:", result);

    if (result.success) {
      return NextResponse.json(result);
    }

    return NextResponse.json(result, { status: 500 });
  } catch (error) {
    console.error("🔍 [API ADD ITEM] ❌ ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
