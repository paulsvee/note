import { NextRequest, NextResponse } from "next/server";
import { createBlock, type BlockType } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const noteId = String(body.noteId ?? "").trim();
  const type = String(body.type ?? "").trim() as BlockType;

  if (!noteId || !type) {
    return NextResponse.json({ error: "noteId와 type이 필요합니다." }, { status: 400 });
  }

  return NextResponse.json({
    blockId: createBlock({
      noteId,
      type,
      content: body.content,
      caption: body.caption,
      left: body.left,
      right: body.right,
      imageUrl: body.imageUrl
    })
  });
}
