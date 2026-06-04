import { NextResponse } from "next/server";
import { getAllDocumentsForImport } from "@/app/lib/data";

export async function GET() {
  const docs = await getAllDocumentsForImport();
  return NextResponse.json(docs);
}
