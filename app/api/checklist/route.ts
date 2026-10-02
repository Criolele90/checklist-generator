import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  COOKIE_NAME,
  hasValidOrigin,
  verifyAdminSessionToken,
  verifySessionToken,
} from "@/lib/auth";
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
        edition: checklist.edition,
        revision: checklist.revision,
        revisionDate: checklist.revisionDate,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdminSessionToken(
    request.cookies.get(ADMIN_COOKIE_NAME)?.value
  );

  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: "Autorizzazione amministratore richiesta." },
      { status: 403 }
    );
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

    const currentChecklist = await getCurrentChecklist();
    const storedChecklist = {
      filename: file.name,
      contentType: file.name.toLowerCase().endsWith(".xlsm")
        ? "application/vnd.ms-excel.sheet.macroEnabled.12"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: Buffer.from(arrayBuffer).toString("base64"),
      rows,
      uploadedAt: new Date().toISOString(),
      size: file.size,
      edition: currentChecklist.edition,
      revision: currentChecklist.revision,
      revisionDate: currentChecklist.revisionDate,
    };

    await saveChecklist(storedChecklist);

    return NextResponse.json({
      ok: true,
      metadata: {
        filename: storedChecklist.filename,
        uploadedAt: storedChecklist.uploadedAt,
        size: storedChecklist.size,
        rowCount: storedChecklist.rows.length,
        edition: storedChecklist.edition,
        revision: storedChecklist.revision,
        revisionDate: storedChecklist.revisionDate,
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

export async function PATCH(request: NextRequest) {
  const isAdmin = await verifyAdminSessionToken(
    request.cookies.get(ADMIN_COOKIE_NAME)?.value
  );

  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: "Autorizzazione amministratore richiesta." },
      { status: 403 }
    );
  }

  if (!hasValidOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Origine della richiesta non valida." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const edition =
      typeof body.edition === "string"
        ? body.edition.trim().replace(/^ed\.?\s*/i, "")
        : "";
    const revision =
      typeof body.revision === "string"
        ? body.revision.trim().replace(/^rev\s*/i, "")
        : "";
    const revisionDate =
      typeof body.revisionDate === "string" ? body.revisionDate.trim() : "";

    if (!edition || edition.length > 30) {
      return NextResponse.json(
        { ok: false, error: "Inserisci un'edizione valida (massimo 30 caratteri)." },
        { status: 400 }
      );
    }

    if (!revision || revision.length > 30) {
      return NextResponse.json(
        { ok: false, error: "Inserisci una revisione valida (massimo 30 caratteri)." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(revisionDate)) {
      return NextResponse.json(
        { ok: false, error: "Inserisci una data di revisione valida." },
        { status: 400 }
      );
    }

    const checklist = await getCurrentChecklist();
    const updatedChecklist = { ...checklist, edition, revision, revisionDate };
    await saveChecklist(updatedChecklist);

    return NextResponse.json({
      ok: true,
      metadata: {
        filename: updatedChecklist.filename,
        uploadedAt: updatedChecklist.uploadedAt,
        size: updatedChecklist.size,
        rowCount: updatedChecklist.rows.length,
        edition: updatedChecklist.edition,
        revision: updatedChecklist.revision,
        revisionDate: updatedChecklist.revisionDate,
      },
    });
  } catch (error) {
    console.error("Errore durante l’aggiornamento del versionamento:", error);

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
      { ok: false, error: "Impossibile aggiornare il versionamento." },
      { status: 500 }
    );
  }
}
