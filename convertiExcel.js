const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

console.log("Script avviato...");

const fileExcel = path.join(__dirname, "FORM 01-06 EVIDENZE DI AUDIT.xlsx");
const fileOutput = path.join(__dirname, "data", "checklist.json");

if (!fs.existsSync(fileExcel)) {
  console.log("ERRORE: file Excel non trovato");
  console.log("Percorso cercato:", fileExcel);
  process.exit(1);
}

console.log("File Excel trovato");

const workbook = XLSX.readFile(fileExcel);
const risultato = [];

function aggiungiRiga(capitolo, standard, req, domanda) {
  const domandaPulita = (domanda || "").toString().trim();
  const standardPulito = (standard || "").toString().trim();
  const reqPulito = (req || "").toString().trim();

  if (!domandaPulita) return;

  risultato.push({
    capitolo,
    standard: standardPulito,
    req: reqPulito,
    domanda: domandaPulita,
    esito: "",
  });
}

function normalizzaIntestazione(valore) {
  return (valore || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ");
}

function trovaIndiceIntestazione(intestazioni, nomiPossibili) {
  const normalizzati = intestazioni.map(normalizzaIntestazione);

  return normalizzati.findIndex((intestazione) =>
    nomiPossibili.some((nome) => intestazione === normalizzaIntestazione(nome))
  );
}

workbook.SheetNames.forEach((nomeFoglio) => {
  const sheet = workbook.Sheets[nomeFoglio];
  if (!sheet) return;

  console.log("Leggo foglio:", nomeFoglio);

  const righe = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  const indiceIntestazioni = righe.findIndex((riga) => {
    const intestazioni = riga.map(normalizzaIntestazione);
    return (
      intestazioni.includes("domanda") ||
      intestazioni.includes("controllo")
    );
  });

  if (indiceIntestazioni === -1) return;

  const intestazioni = righe[indiceIntestazioni];
  const indiceStandard = trovaIndiceIntestazione(intestazioni, ["Standard"]);
  const indiceReq = trovaIndiceIntestazione(intestazioni, [
    "Req.",
    "Req",
    "controllo",
  ]);
  const indiceDomanda = trovaIndiceIntestazione(intestazioni, ["Domanda"]);
  const indiceTitolo = trovaIndiceIntestazione(intestazioni, [
    "Titolo controllo",
    "Control Title",
  ]);
  const indiceDescrizioneIta = trovaIndiceIntestazione(intestazioni, [
    "Control Description (ITA)",
    "Control Description ITA",
  ]);

  righe.slice(indiceIntestazioni + 1).forEach((riga) => {
    const standard =
      indiceStandard >= 0
        ? (riga[indiceStandard] || "").toString().trim()
        : "ISO/IEC 27701:2025";
    const req = indiceReq >= 0 ? (riga[indiceReq] || "").toString().trim() : "";
    const domandaDiretta =
      indiceDomanda >= 0 ? (riga[indiceDomanda] || "").toString().trim() : "";
    const titolo =
      indiceTitolo >= 0 ? (riga[indiceTitolo] || "").toString().trim() : "";
    const descrizioneIta =
      indiceDescrizioneIta >= 0
        ? (riga[indiceDescrizioneIta] || "").toString().trim()
        : "";
    const domanda =
      domandaDiretta || [titolo, descrizioneIta].filter(Boolean).join(" - ");

    if (!domanda) return;
    if (!req && !domandaDiretta) return;

    // Salta righe evidenze: il box evidenze viene generato dall'app.
    if (standard.toLowerCase() === "evidenze") return;

    aggiungiRiga(nomeFoglio, standard, req, domanda);
  });
});

fs.writeFileSync(fileOutput, JSON.stringify(risultato, null, 2), "utf8");

console.log("File creato:", fileOutput);
console.log("Totale righe esportate:", risultato.length);
