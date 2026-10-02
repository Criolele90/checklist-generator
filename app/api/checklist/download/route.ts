import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { getCurrentChecklist } from "@/lib/checklist-storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authenticated = await verifyAdminSessionToken(
    request.cookies.get(ADMIN_COOKIE_NAME)?.value
  );

  if (!authenticated) {
    return NextResponse.json(
      { ok: false, error: "Autorizzazione amministratore richiesta." },
      { status: 403 }
    );
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
