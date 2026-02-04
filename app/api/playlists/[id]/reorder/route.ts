import { NextResponse } from "next/server";
import { reorderPlaylistItemsAction } from "@/app/actions/playlists";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const result = await reorderPlaylistItemsAction(params.id, body.itemIds);

  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: 500 });
}
