import { NextRequest, NextResponse } from "next/server";
import { createNote } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const folderId = String(body.folderId ?? "").trim();
  const title = String(body.title ?? "").trim();

  if (!folderId || !title) {
    return NextResponse.json({ error: "folderId와 title이 필요합니다." }, { status: 400 });
  }

  return NextResponse.json({ noteId: createNote(folderId, title) });
}
