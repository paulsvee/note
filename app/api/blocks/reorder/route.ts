import { NextRequest, NextResponse } from "next/server";
import { reorderBlocks } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const noteId = String(body.noteId ?? "").trim();
  const orderedBlockIds = Array.isArray(body.orderedBlockIds)
    ? body.orderedBlockIds.map(String)
    : [];

  if (!noteId || orderedBlockIds.length === 0) {
    return NextResponse.json({ error: "정렬할 데이터가 필요합니다." }, { status: 400 });
  }

  reorderBlocks(noteId, orderedBlockIds);
  return NextResponse.json({ ok: true });
}
