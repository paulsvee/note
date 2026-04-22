import { NextRequest, NextResponse } from "next/server";
import { renameFolder, deleteFolder } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  renameFolder(params.id, body.name);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  deleteFolder(params.id);
  return NextResponse.json({ ok: true });
}
