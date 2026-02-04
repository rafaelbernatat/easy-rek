import { NextResponse } from "next/server";
import { removeRecordingFromPlaylistAction } from "@/app/actions/playlists";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; recordingId: string } },
) {
  const result = await removeRecordingFromPlaylistAction(params.id, params.recordingId);

  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: 500 });
}
