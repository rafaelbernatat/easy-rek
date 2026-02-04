import { NextResponse } from "next/server";
import { deletePlaylistAction } from "@/app/actions/playlists";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const result = await deletePlaylistAction(params.id);

  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: 500 });
}
