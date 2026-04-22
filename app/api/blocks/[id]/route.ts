import { NextRequest, NextResponse } from "next/server";
import { deleteBlock, updateBlock } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  updateBlock(params.id, {
    content: body.content,
    caption: body.caption,
    left: body.left,
    right: body.right,
    imageUrl: body.imageUrl,
    ...("color" in body ? { color: body.color } : {}),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  deleteBlock(params.id);
  return NextResponse.json({ ok: true });
}
