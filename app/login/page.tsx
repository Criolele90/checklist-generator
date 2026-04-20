"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import righeChecklist from "@/data/checklist.json";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";

const COLORI = {
  bluScuro: "#0E2841",
  bluTema: "#156082",
  azzurroChiaro: "#C0E6F5",
  sfondo: "#F4F8FB",
  bianco: "#FFFFFF",
  bordo: "#C9DCE8",
  bordoWord: "7F9DB9",
  nero: "000000",
  testo: "#1F2D3D",
  testoSecondario: "#4F6475",
};

const RUOLI_AUDIT = [
  "Lead Auditor",
  "Auditor",
  "Esperto Tecnico",
  "Auditor in formazione",
  "Osservatore",
  "Addetto al monitoraggio",
] as const;

type RigaChecklist = {
  capitolo: string;
  standard: string;
  req: string;
  domanda: string;
  esito: string;
};

type MembroTeam = {
  nome: string;
  ruolo: string;
};

function normalizzaStandard(valore: string): string {
  if (!valore) return "";

  let risultato = valore.trim().toUpperCase();

  risultato = risultato.replace(/\r/g, " ").replace(/\n/g, " ").trim();

  while (risultato.startsWith("ISO")) {
    risultato = risultato.replace(/^ISO\s*/i, "").trim();
  }

  risultato = risultato.replace(/\s+/g, " ").trim();

  if (
    risultato === "" ||
    risultato === "COMUNE" ||
    risultato === "ISO COMUNE"
  ) {
    return "";
  }

  return risultato;
}

function estraiStandardSingoli(valore: string): string[] {
  if (!valore || valore.trim() === "") {
    return [];
  }

  const parti = valore.split(/[,;/|\n]+/);

  const puliti = parti
    .map((s) => normalizzaStandard(s))
    .filter((s) => s !== "");

  return Array.from(new Set(puliti));
}

export default function Home() {
  const [ragioneSociale, setRagioneSociale] = useState("");
  const [sitoAuditato, setSitoAuditato] = useState("");
  const [iaf, setIaf] = useState("");
  const [scopo, setScopo] = useState("");
  const [faseAudit, setFaseAudit] = useState("");
  const [dataInizio, setDataInizio] = useState("");
  const [dataFine, setDataFine] = useState("");
  const [giornateUomo, setGiornateUomo] = useState("");

  const [teamAudit, setTeamAudit] = useState<MembroTeam[]>([
    { nome: "", ruolo: "Lead Auditor" },
  ]);

  const righe = righeChecklist as RigaChecklist[];

  const tutteLeNorme = useMemo(() => {
    const insieme = new Set<string>();

    righe.forEach((riga) => {
      const standardSingoli = estraiStandardSingoli(riga.standard);
      standardSingoli.forEach((norma) => insieme.add(norma));
    });

    return Array.from(insieme).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [righe]);

  const [normeSelezionate, setNormeSelezionate] = useState<Record<string, boolean>>({});

  const standardSelezionati = tutteLeNorme.filter(
    (norma) => normeSelezionate[norma]
  );

  const righeFiltrate = righe.filter((riga) => {
    const standardDellaRiga = estraiStandardSingoli(riga.standard);

    if (standardDellaRiga.length === 0) {
      return true;
    }

    return standardDellaRiga.some((standard) =>
      standardSelezionati.includes(standard)
    );
  });

  const gruppiPerCapitolo: Record<string, RigaChecklist[]> = {};

  righeFiltrate.forEach((riga) => {
    if (!gruppiPerCapitolo[riga.capitolo]) {
      gruppiPerCapitolo[riga.capitolo] = [];
    }

    gruppiPerCapitolo[riga.capitolo].push(riga);
  });

  function toggleNorma(norma: string, checked: boolean) {
    setNormeSelezionate((prev) => ({
      ...prev,
      [norma]: checked,
    }));
  }

  function selezionaTutte() {
    const tutte: Record<string, boolean> = {};
    tutteLeNorme.forEach((norma) => {
      tutte[norma] = true;
    });
    setNormeSelezionate(tutte);
  }

  function deselezionaTutte() {
    const nessuna: Record<string, boolean> = {};
    tutteLeNorme.forEach((norma) => {
      nessuna[norma] = false;
    });
    setNormeSelezionate(nessuna);
  }

  function aggiungiMembroTeam() {
    setTeamAudit((prev) => [...prev, { nome: "", ruolo: "Auditor" }]);
  }

  function rimuoviMembroTeam(index: number) {
    setTeamAudit((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function aggiornaNomeMembro(index: number, valore: string) {
    setTeamAudit((prev) =>
      prev.map((membro, i) =>
        i === index ? { ...membro, nome: valore } : membro
      )
    );
  }

  function aggiornaRuoloMembro(index: number, valore: string) {
    setTeamAudit((prev) =>
      prev.map((membro, i) =>
        i === index ? { ...membro, ruolo: valore } : membro
      )
    );
  }

  function creaCellaHeaderWord(testo: string, larghezza?: number) {
    return new TableCell({
      width: larghezza
        ? { size: larghezza, type: WidthType.PERCENTAGE }
        : undefined,
      shading: {
        fill: "C0E6F5",
        color: "000000",
            },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({
              text: testo,
              bold: true,
              color: "0E2841",
            }),
          ],
        }),
      ],
    });
  }

  function creaCellaValoreWord(testo: string, larghezza?: number) {
    return new TableCell({
      width: larghezza
        ? { size: larghezza, type: WidthType.PERCENTAGE }
        : undefined,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({
              text: testo ?? "",
              color: "000000",
            }),
          ],
        }),
      ],
    });
  }

  function creaParagrafoInfo(etichetta: string, valore: string) {
    return new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: etichetta,
          bold: true,
          color: "156082",
        }),
        new TextRun({
          text: valore,
          color: "000000",
        }),
      ],
    });
  }

  function creaTabellaNonConformitaWord() {
    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
        left: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
        right: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
        insideVertical: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
      },
      rows: [
        new TableRow({
          children: [
            creaCellaHeaderWord("Req", 15),
            creaCellaHeaderWord("Descrizione", 45),
            creaCellaHeaderWord("Standard", 20),
            creaCellaHeaderWord("Grado", 20),
          ],
        }),
        ...Array.from({ length: 3 }).map(
          () =>
            new TableRow({
              children: [
                creaCellaValoreWord("", 15),
                creaCellaValoreWord("", 45),
                creaCellaValoreWord("", 20),
                creaCellaValoreWord("", 20),
              ],
            })
        ),
      ],
    });
  }

  async function generaWord() {
    const intestazioneTabella = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        insideVertical: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 32, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "Audit Service & Certification",
                      bold: true,
                      size: 20,
                      color: "156082",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 34, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "CHECKLIST DI AUDIT",
                      bold: true,
                      size: 24,
                      color: "000000",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 34, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: "FORM 01-09",
                      bold: true,
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: "REV 08",
                      bold: true,
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "21/11/2022",
                      bold: true,
                      size: 18,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    const membriCompilati = teamAudit.filter(
      (membro) => membro.nome.trim() !== "" || membro.ruolo.trim() !== ""
    );

    const tabellaTeamAudit = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
        left: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
        right: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
        insideVertical: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: COLORI.bordoWord,
        },
      },
      rows: [
        new TableRow({
          children: [
            creaCellaHeaderWord("Nome", 60),
            creaCellaHeaderWord("Ruolo", 40),
          ],
        }),
        ...(membriCompilati.length > 0
          ? membriCompilati.map((membro) =>
              new TableRow({
                children: [
                  creaCellaValoreWord(membro.nome, 60),
                  creaCellaValoreWord(membro.ruolo, 40),
                ],
              })
            )
          : [
              new TableRow({
                children: [
                  creaCellaValoreWord("", 60),
                  creaCellaValoreWord("", 40),
                ],
              }),
            ]),
      ],
    });

    const capitoliOrdinati = Object.keys(gruppiPerCapitolo);

    const contenutoDocumento = capitoliOrdinati.flatMap((capitolo) => {
      const righeDelCapitolo = gruppiPerCapitolo[capitolo];

      const gruppiPerRequisito: Record<string, RigaChecklist[]> = {};

      righeDelCapitolo.forEach((riga) => {
        if (!gruppiPerRequisito[riga.req]) {
          gruppiPerRequisito[riga.req] = [];
        }

        gruppiPerRequisito[riga.req].push(riga);
      });

      const requisitiOrdinati = Object.keys(gruppiPerRequisito).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );

      const blocchiCapitolo = requisitiOrdinati.flatMap((req) => {
        const righeDelRequisito = gruppiPerRequisito[req];

        if (!righeDelRequisito || righeDelRequisito.length === 0) {
          return [];
        }

        const tabellaRequisito = new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
            bottom: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
            left: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
            right: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
            insideHorizontal: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
            insideVertical: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
          },
          rows: [
            new TableRow({
              children: [
                creaCellaHeaderWord("Standard", 15),
                creaCellaHeaderWord("Req", 15),
                creaCellaHeaderWord("Domanda", 55),
                creaCellaHeaderWord("Esito", 15),
              ],
            }),

            ...righeDelRequisito.map((riga) =>
              new TableRow({
                children: [
                  creaCellaValoreWord(
                    estraiStandardSingoli(riga.standard).join(", ") || "Comune",
                    15
                  ),
                  creaCellaValoreWord(riga.req, 15),
                  creaCellaValoreWord(riga.domanda, 55),
                  creaCellaValoreWord(riga.esito || "", 15),
                ],
              })
            ),
          ],
        });

        const tabellaEvidenze = new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
            bottom: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
            left: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
            right: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
            insideHorizontal: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
            insideVertical: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: COLORI.bordoWord,
            },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: {
                    fill: "C0E6F5",
                    color: "000000",
                            },
                  children: [
                    new Paragraph({
                      spacing: { before: 80, after: 80 },
                      children: [
                        new TextRun({
                          text: "Evidenze",
                          bold: true,
                          color: "0E2841",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph(""),
                    new Paragraph(""),
                    new Paragraph(""),
                    new Paragraph(""),
                    new Paragraph(""),
                    new Paragraph(""),
                  ],
                }),
              ],
            }),
          ],
        });

        return [
          new Paragraph({
            spacing: { before: 220, after: 120 },
            children: [
              new TextRun({
                text: "Requisito " + req,
                bold: true,
                size: 26,
                color: "156082",
              }),
            ],
          }),
          new Paragraph(""),
          tabellaRequisito,
          new Paragraph(""),
          tabellaEvidenze,
          new Paragraph(""),
        ];
      });

      return [
        new Paragraph({
          spacing: { before: 320, after: 180 },
          children: [
            new TextRun({
              text: capitolo,
              bold: true,
              size: 32,
              color: "0E2841",
            }),
          ],
        }),
        new Paragraph(""),
        ...blocchiCapitolo,

        new Paragraph({
          spacing: { before: 220, after: 120 },
          children: [
            new TextRun({
              text: "Non Conformità",
              bold: true,
              size: 26,
              color: "156082",
            }),
          ],
        }),
        new Paragraph(""),
        creaTabellaNonConformitaWord(),
        new Paragraph(""),
      ];
    });

    const doc = new Document({
      sections: [
        {
          children: [
            intestazioneTabella,
            new Paragraph(""),

            creaParagrafoInfo("Ragione Sociale: ", ragioneSociale),
            creaParagrafoInfo("Sito Auditato: ", sitoAuditato),
            creaParagrafoInfo("IAF: ", iaf),
            creaParagrafoInfo("Scopo: ", scopo),
            creaParagrafoInfo("Fase di Audit: ", faseAudit),
            creaParagrafoInfo("Data Inizio Audit: ", dataInizio),
            creaParagrafoInfo("Data Fine Audit: ", dataFine),
            creaParagrafoInfo("Numero giornate uomo: ", giornateUomo),

            new Paragraph(""),

            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: "Team di Audit",
                  bold: true,
                  size: 24,
                  color: "156082",
                }),
              ],
            }),

            tabellaTeamAudit,

            new Paragraph(""),

            new Paragraph({
              spacing: { after: 150 },
              children: [
                new TextRun({
                  text: "Standard selezionati: ",
                  bold: true,
                  color: "156082",
                }),
                new TextRun({
                  text:
                    standardSelezionati.length > 0
                      ? standardSelezionati.join(", ")
                      : "Nessuno",
                  color: "000000",
                }),
              ],
            }),

            ...contenutoDocumento,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "checklist.docx");
  }

  const stili = {
    pagina: {
      padding: 0,
      fontFamily: "Arial, sans-serif",
      backgroundColor: COLORI.sfondo,
      minHeight: "100vh",
      color: COLORI.testo,
    } as const,

    hero: {
      background: `linear-gradient(135deg, ${COLORI.bluScuro} 0%, ${COLORI.bluTema} 100%)`,
      color: COLORI.bianco,
      padding: "24px 20px",
      boxShadow: "0 8px 24px rgba(14, 40, 65, 0.18)",
    } as const,

    heroInner: {
      maxWidth: 1300,
      margin: "0 auto",
      display: "flex",
      alignItems: "center",
      gap: 18,
      flexWrap: "wrap" as const,
    } as const,

    heroLogoWrap: {
      backgroundColor: "rgba(255,255,255,0.92)",
      borderRadius: 12,
      padding: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 92,
      minHeight: 92,
    } as const,

    heroTitolo: {
      fontSize: 30,
      fontWeight: 800,
      margin: 0,
      marginBottom: 6,
    } as const,

    heroSottotitolo: {
      fontSize: 15,
      margin: 0,
      maxWidth: 840,
      opacity: 0.96,
      lineHeight: 1.4,
    } as const,

    contenitore: {
      padding: "24px 16px 36px 16px",
      maxWidth: 1300,
      margin: "0 auto",
    } as const,

    griglia: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      gap: 20,
      marginBottom: 22,
    } as const,

    card: {
      backgroundColor: COLORI.bianco,
      border: `1px solid ${COLORI.bordo}`,
      borderRadius: 14,
      padding: 22,
      boxShadow: "0 6px 18px rgba(21, 96, 130, 0.08)",
      minWidth: 0,
    } as const,

    titoloCard: {
      color: COLORI.bluTema,
      marginTop: 0,
      marginBottom: 16,
      fontSize: 22,
      fontWeight: 700,
    } as const,

    label: {
      display: "block",
      marginBottom: 6,
      fontSize: 14,
      fontWeight: 700,
      color: COLORI.bluTema,
    } as const,

    input: {
      padding: 11,
      width: "100%",
      border: `1px solid ${COLORI.bordo}`,
      borderRadius: 8,
      backgroundColor: "#FAFCFE",
      color: COLORI.testo,
      boxSizing: "border-box" as const,
      marginBottom: 14,
    },

    select: {
      padding: 11,
      width: "100%",
      border: `1px solid ${COLORI.bordo}`,
      borderRadius: 8,
      backgroundColor: "#FAFCFE",
      color: COLORI.testo,
      boxSizing: "border-box" as const,
      marginBottom: 14,
      height: 44,
    },

    textarea: {
      padding: 11,
      width: "100%",
      minHeight: 90,
      border: `1px solid ${COLORI.bordo}`,
      borderRadius: 8,
      backgroundColor: "#FAFCFE",
      color: COLORI.testo,
      boxSizing: "border-box" as const,
      marginBottom: 14,
      resize: "vertical" as const,
    },

    checkboxGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: 8,
      marginTop: 12,
    } as const,

    checkboxRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 0",
      color: COLORI.testo,
    } as const,

    actionRow: {
      display: "flex",
      gap: 10,
      marginBottom: 12,
      flexWrap: "wrap" as const,
    } as const,

    actionButton: {
      padding: "8px 12px",
      backgroundColor: "#EAF6FB",
      color: COLORI.bluTema,
      border: `1px solid ${COLORI.bordo}`,
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
    } as const,

    sezioneTabella: {
      backgroundColor: COLORI.bianco,
      border: `1px solid ${COLORI.bordo}`,
      borderRadius: 14,
      padding: 22,
      boxShadow: "0 6px 18px rgba(21, 96, 130, 0.08)",
      overflowX: "auto" as const,
    } as const,

    tabella: {
      borderCollapse: "collapse" as const,
      width: "100%",
      minWidth: 760,
      backgroundColor: COLORI.bianco,
    },

    th: {
      border: `1px solid ${COLORI.bordo}`,
      padding: 10,
      backgroundColor: COLORI.azzurroChiaro,
      color: COLORI.bluScuro,
      textAlign: "left" as const,
      fontSize: 14,
    },

    td: {
      border: `1px solid ${COLORI.bordo}`,
      padding: 10,
      fontSize: 14,
      verticalAlign: "top" as const,
    },

    toolbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      marginBottom: 18,
      flexWrap: "wrap" as const,
    } as const,

    badge: {
      display: "inline-block",
      backgroundColor: "#EAF6FB",
      color: COLORI.bluTema,
      border: `1px solid ${COLORI.bordo}`,
      borderRadius: 999,
      padding: "6px 12px",
      fontSize: 13,
      fontWeight: 700,
    } as const,

    bottone: {
      padding: "12px 18px",
      backgroundColor: COLORI.bluTema,
      color: COLORI.bianco,
      border: "none",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
      boxShadow: "0 6px 14px rgba(21, 96, 130, 0.22)",
    } as const,

    nota: {
      color: COLORI.testoSecondario,
      fontSize: 13,
      marginTop: 10,
      lineHeight: 1.4,
    } as const,

    teamRow: {
      border: `1px solid ${COLORI.bordo}`,
      borderRadius: 10,
      padding: 14,
      marginBottom: 12,
      backgroundColor: "#FAFCFE",
    } as const,

    teamGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 10,
      alignItems: "end",
    } as const,

    removeButton: {
      padding: "10px 12px",
      backgroundColor: "#FDECEC",
      color: "#B42318",
      border: "1px solid #F5C2C7",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
      minHeight: 44,
      width: "100%",
    } as const,
  };

  return (
    <main style={stili.pagina}>
      <section style={stili.hero}>
        <div style={stili.heroInner}>
          <div style={stili.heroLogoWrap}>
            <Image src="/logo.png" alt="Logo aziendale" width={78} height={78} />
          </div>

          <div style={{ minWidth: 0 }}>
            <h1 style={stili.heroTitolo}>Audit Service & Certification</h1>
            <p style={stili.heroSottotitolo}>
              Generatore checklist di audit strutturato per standard ISO,
              coerente con il sistema documentale aziendale.
            </p>
          </div>
        </div>
      </section>

      <div style={stili.contenitore}>
        <div style={stili.griglia}>
          <section style={stili.card}>
            <h2 style={stili.titoloCard}>Dati audit</h2>

            <label style={stili.label}>Ragione Sociale</label>
            <input
              type="text"
              placeholder="Ragione Sociale"
              value={ragioneSociale}
              onChange={(e) => setRagioneSociale(e.target.value)}
              style={stili.input}
            />

            <label style={stili.label}>Sito Auditato</label>
            <input
              type="text"
              placeholder="Sito Auditato"
              value={sitoAuditato}
              onChange={(e) => setSitoAuditato(e.target.value)}
              style={stili.input}
            />

            <label style={stili.label}>IAF</label>
            <input
              type="text"
              placeholder="IAF"
              value={iaf}
              onChange={(e) => setIaf(e.target.value)}
              style={stili.input}
            />

            <label style={stili.label}>Scopo</label>
            <textarea
              placeholder="Scopo"
              value={scopo}
              onChange={(e) => setScopo(e.target.value)}
              style={stili.textarea}
            />

            <label style={stili.label}>Fase di Audit</label>
            <input
              type="text"
              placeholder="Es. Stage 1, Stage 2, Sorveglianza, Rinnovo"
              value={faseAudit}
              onChange={(e) => setFaseAudit(e.target.value)}
              style={stili.input}
            />

            <label style={stili.label}>Data Inizio Audit</label>
            <input
              type="date"
              value={dataInizio}
              onChange={(e) => setDataInizio(e.target.value)}
              style={stili.input}
            />

            <label style={stili.label}>Data Fine Audit</label>
            <input
              type="date"
              value={dataFine}
              onChange={(e) => setDataFine(e.target.value)}
              style={stili.input}
            />

            <label style={stili.label}>Numero giornate uomo</label>
            <input
              type="text"
              placeholder="Es. 2"
              value={giornateUomo}
              onChange={(e) => setGiornateUomo(e.target.value)}
              style={stili.input}
            />
          </section>

          <section style={stili.card}>
            <h2 style={stili.titoloCard}>Standard ISO</h2>

            <div style={stili.actionRow}>
              <button type="button" onClick={selezionaTutte} style={stili.actionButton}>
                Seleziona tutte
              </button>
              <button type="button" onClick={deselezionaTutte} style={stili.actionButton}>
                Deseleziona tutte
              </button>
            </div>

            <div style={stili.checkboxGrid}>
              {tutteLeNorme.map((norma) => (
                <label key={norma} style={stili.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!normeSelezionate[norma]}
                    onChange={(e) => toggleNorma(norma, e.target.checked)}
                  />
                  ISO {norma}
                </label>
              ))}
            </div>

            <p style={stili.nota}>
              Le righe con più standard vengono mostrate anche se è selezionato
              uno solo degli standard associati.
            </p>
          </section>
        </div>

        <section style={{ ...stili.card, marginBottom: 22 }}>
          <div style={stili.toolbar}>
            <h2 style={{ ...stili.titoloCard, marginBottom: 0 }}>Team di Audit</h2>
            <button type="button" onClick={aggiungiMembroTeam} style={stili.actionButton}>
              + Aggiungi membro
            </button>
          </div>

          {teamAudit.map((membro, index) => (
            <div key={index} style={stili.teamRow}>
              <div style={stili.teamGrid}>
                <div>
                  <label style={stili.label}>Nome</label>
                  <input
                    type="text"
                    placeholder={`Membro ${index + 1}`}
                    value={membro.nome}
                    onChange={(e) => aggiornaNomeMembro(index, e.target.value)}
                    style={{ ...stili.input, marginBottom: 0 }}
                  />
                </div>

                <div>
                  <label style={stili.label}>Ruolo</label>
                  <select
                    value={membro.ruolo}
                    onChange={(e) => aggiornaRuoloMembro(index, e.target.value)}
                    style={{ ...stili.select, marginBottom: 0 }}
                  >
                    {RUOLI_AUDIT.map((ruolo) => (
                      <option key={ruolo} value={ruolo}>
                        {ruolo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={stili.label}>Azione</label>
                  <button
                    type="button"
                    onClick={() => rimuoviMembroTeam(index)}
                    style={stili.removeButton}
                    disabled={teamAudit.length === 1}
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section style={stili.sezioneTabella}>
          <div style={stili.toolbar}>
            <div>
              <h2 style={{ ...stili.titoloCard, marginBottom: 6 }}>
                Righe visibili
              </h2>
              <span style={stili.badge}>
                {righeFiltrate.length} righe selezionate
              </span>
            </div>

            <button onClick={generaWord} style={stili.bottone}>
              Genera Word
            </button>
          </div>

          <table style={stili.tabella}>
            <thead>
              <tr>
                <th style={stili.th}>Capitolo</th>
                <th style={stili.th}>Standard</th>
                <th style={stili.th}>Req</th>
                <th style={stili.th}>Domanda</th>
                <th style={stili.th}>Esito</th>
              </tr>
            </thead>

            <tbody>
              {righeFiltrate.map((riga, index) => (
                <tr key={index}>
                  <td style={stili.td}>{riga.capitolo}</td>
                  <td style={stili.td}>
                    {estraiStandardSingoli(riga.standard).join(", ") || "Comune"}
                  </td>
                  <td style={stili.td}>{riga.req}</td>
                  <td style={stili.td}>{riga.domanda}</td>
                  <td style={stili.td}>{riga.esito}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}