import { NextResponse } from "next/server";
import { createPlaylistAction } from "@/app/actions/playlists";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await createPlaylistAction(body);

  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: 500 });
}
