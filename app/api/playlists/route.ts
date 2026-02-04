import { NextResponse } from "next/server";
import { getPlaylistsAction } from "@/app/actions/playlists";

export async function GET() {
  const result = await getPlaylistsAction();

  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: 500 });
}
