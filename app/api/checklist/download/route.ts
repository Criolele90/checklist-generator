import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getCurrentChecklist } from "@/lib/checklist-storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authenticated = await verifySessionToken(
    request.cookies.get(COOKIE_NAME)?.value
  );

  if (!authenticated) {
    return NextResponse.json({ ok: false, error: "Non autorizzato." }, { status: 401 });
  }

  const checklist = await getCurrentChecklist();
  const file = Buffer.from(checklist.base64, "base64");
  const encodedFilename = encodeURIComponent(checklist.filename);

  return new NextResponse(file, {
    headers: {
      "Content-Type": checklist.contentType,
      "Content-Length": String(file.length),
      "Content-Disposition": `attachment; filename="checklist.xlsm"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "private, no-store",
    },
  });
}
