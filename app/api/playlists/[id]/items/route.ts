import { NextResponse } from "next/server";
import { getPlaylistItemsAction } from "@/app/actions/playlists";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  console.log("🔍 [API GET ITEMS] Request received for playlist:", params.id);
  
  try {
    const result = await getPlaylistItemsAction(params.id);
    
    console.log("🔍 [API GET ITEMS] Result:", result);

    if (result.success) {
      return NextResponse.json(result);
    }

    return NextResponse.json(result, { status: 500 });
  } catch (error) {
    console.error("🔍 [API GET ITEMS] ❌ ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
