const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

console.log("Script avviato...");

const fileExcel = path.join(__dirname, "FORM 01-06 EVIDENZE DI AUDIT.xlsm");
const fileOutput = path.join(__dirname, "data", "checklist.json");

if (!fs.existsSync(fileExcel)) {
  console.log("❌ ERRORE: file Excel non trovato");
  console.log("Percorso cercato:", fileExcel);
  process.exit(1);
}

console.log("✅ File Excel trovato");

const workbook = XLSX.readFile(fileExcel);
let risultato = [];

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

workbook.SheetNames.forEach((nomeFoglio) => {
  const sheet = workbook.Sheets[nomeFoglio];
  if (!sheet) return;

  console.log("Leggo foglio:", nomeFoglio);

  const dati = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  });

  // Riga iniziale speciale per il capitolo 8
  if (nomeFoglio.startsWith("8. Att. Operative")) {
    aggiungiRiga(nomeFoglio, "", "8", "PROCESSO AUDITATO:");
  }

  dati.forEach((riga) => {
    const standard = (riga["Standard"] || "").toString().trim();
    const req = (riga["Req."] || riga["Req"] || "").toString().trim();
    const domanda = (riga["Domanda"] || "").toString().trim();

    // salta righe vuote
    if (!domanda) return;

    // salta righe evidenze, perché il box evidenze lo genera già l'app
    if (standard.toLowerCase() === "evidenze") return;

    aggiungiRiga(nomeFoglio, standard, req, domanda);
  });
});

fs.writeFileSync(fileOutput, JSON.stringify(risultato, null, 2), "utf8");

console.log("✅ File creato:", fileOutput);
console.log("Totale righe esportate:", risultato.length);