import { NextResponse } from "next/server";
import { getDatabase } from "@/storage/backend/sqlite";
import { issueVisitor, refusal, requireVisitor } from "@/storage/backend/visitor";

/**
 * "Reset demo data": everything this visitor stored is deleted, and the browser
 * gets a new id, so the next page it loads reads the template again.
 */
export const runtime = "nodejs";

export async function POST() {
  try {
    const uid = await requireVisitor();
    getDatabase().deleteVisitor(uid);
  } catch (failure) {
    return refusal(failure);
  }
  const response = new NextResponse(null, { status: 204 });
  issueVisitor(response);
  return response;
}
