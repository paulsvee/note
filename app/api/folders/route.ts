import { NextRequest, NextResponse } from "next/server";
import { createFolder } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "폴더 이름이 필요합니다." }, { status: 400 });
  }

  return NextResponse.json({ folderId: createFolder(name) });
}
