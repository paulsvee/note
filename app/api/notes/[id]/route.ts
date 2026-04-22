import { NextRequest, NextResponse } from "next/server";
import { updateNote, deleteNote } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  updateNote(params.id, {
    title: body.title,
    subtitle: body.subtitle,
    folderId: body.folderId
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  deleteNote(params.id);
  return NextResponse.json({ ok: true });
}
