import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, hasValidOrigin, verifySessionToken } from "@/lib/auth";
import { parseChecklist } from "@/lib/checklist";
import { getCurrentChecklist, saveChecklist } from "@/lib/checklist-storage";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = /\.(xlsx|xlsm)$/i;

export const runtime = "nodejs";

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  return verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ ok: false, error: "Non autorizzato." }, { status: 401 });
  }

  const checklist = await getCurrentChecklist();

  return NextResponse.json(
    {
      ok: true,
      rows: checklist.rows,
      metadata: {
        filename: checklist.filename,
        uploadedAt: checklist.uploadedAt,
        size: checklist.size,
        rowCount: checklist.rows.length,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ ok: false, error: "Non autorizzato." }, { status: 401 });
  }

  if (!hasValidOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Origine della richiesta non valida." },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Seleziona un file Excel." },
        { status: 400 }
      );
    }

    if (!ACCEPTED_EXTENSIONS.test(file.name)) {
      return NextResponse.json(
        { ok: false, error: "Sono ammessi solo file .xlsx o .xlsm." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "Il file deve avere una dimensione massima di 3 MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const rows = parseChecklist(arrayBuffer);

    if (rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Il file non contiene righe valide. Verifica le colonne Standard, Req. e Domanda.",
        },
        { status: 400 }
      );
    }

    const storedChecklist = {
      filename: file.name,
      contentType: file.name.toLowerCase().endsWith(".xlsm")
        ? "application/vnd.ms-excel.sheet.macroEnabled.12"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: Buffer.from(arrayBuffer).toString("base64"),
      rows,
      uploadedAt: new Date().toISOString(),
      size: file.size,
    };

    await saveChecklist(storedChecklist);

    return NextResponse.json({
      ok: true,
      metadata: {
        filename: storedChecklist.filename,
        uploadedAt: storedChecklist.uploadedAt,
        size: storedChecklist.size,
        rowCount: storedChecklist.rows.length,
      },
    });
  } catch (error) {
    console.error("Errore durante il caricamento della checklist:", error);

    if (error instanceof Error && error.message.includes("Storage Redis")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Archivio non configurato. Verifica le variabili Redis dell’ambiente.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Impossibile elaborare o salvare il file. Verifica il formato e riprova.",
      },
      { status: 500 }
    );
  }
}
