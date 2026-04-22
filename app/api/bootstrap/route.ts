import { NextResponse } from "next/server";
import { getBootstrap } from "@/lib/db";

export function GET() {
  return NextResponse.json(getBootstrap());
}
