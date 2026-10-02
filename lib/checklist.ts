import * as XLSX from "xlsx";

export type ChecklistRow = {
  capitolo: string;
  standard: string;
  req: string;
  domanda: string;
  esito: string;
};

type ExcelRow = Record<string, unknown>;

function clean(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

export function parseChecklist(buffer: ArrayBuffer): ChecklistRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const result: ChecklistRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    if (sheetName.startsWith("8. Att. Operative")) {
      result.push({
        capitolo: sheetName,
        standard: "",
        req: "8",
        domanda: "PROCESSO AUDITATO:",
        esito: "",
      });
    }

    const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: "" });

    for (const row of rows) {
      const standard = clean(row.Standard);
      const requirement = clean(row["Req."] ?? row.Req);
      const question = clean(row.Domanda);

      if (!question || standard.toLowerCase() === "evidenze") continue;

      result.push({
        capitolo: sheetName,
        standard,
        req: requirement,
        domanda: question,
        esito: "",
      });
    }
  }

  return result;
}
