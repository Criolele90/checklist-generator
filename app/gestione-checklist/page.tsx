"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./styles.module.css";

type ChecklistMetadata = {
  filename: string;
  uploadedAt: string;
  size: number;
  rowCount: number;
  edition: string;
  revision: string;
  revisionDate: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export default function ChecklistManagementPage() {
  const [metadata, setMetadata] = useState<ChecklistMetadata | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [edition, setEdition] = useState("");
  const [revision, setRevision] = useState("");
  const [revisionDate, setRevisionDate] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function fetchMetadata() {
      try {
        const response = await fetch("/api/checklist", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Impossibile leggere la checklist corrente.");
        }

        if (active) {
          setMetadata(data.metadata);
          setEdition(data.metadata.edition);
          setRevision(data.metadata.revision);
          setRevisionDate(data.metadata.revisionDate);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossibile leggere la checklist corrente."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchMetadata();
    return () => {
      active = false;
    };
  }, []);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedFile) return;

    const confirmed = window.confirm(
      "Vuoi sostituire la checklist corrente? La nuova versione sarà usata subito dal generatore."
    );
    if (!confirmed) return;

    setUploading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.set("file", selectedFile);

    try {
      const response = await fetch("/api/checklist", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Caricamento non riuscito.");
      }

      setMetadata(data.metadata);
      setEdition(data.metadata.edition);
      setRevision(data.metadata.revision);
      setRevisionDate(data.metadata.revisionDate);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setSuccess(
        `Checklist aggiornata correttamente: ${data.metadata.rowCount} righe disponibili.`
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Caricamento non riuscito."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleVersionSave(event: React.FormEvent) {
    event.preventDefault();
    setSavingVersion(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edition, revision, revisionDate }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Aggiornamento del versionamento non riuscito.");
      }

      setMetadata(data.metadata);
      setEdition(data.metadata.edition);
      setRevision(data.metadata.revision);
      setRevisionDate(data.metadata.revisionDate);
      setSuccess(
        `Versionamento aggiornato: Ed. ${data.metadata.edition} Rev. ${data.metadata.revision} del ${formatDateOnly(data.metadata.revisionDate)}.`
      );
    } catch (versionError) {
      setError(
        versionError instanceof Error
          ? versionError.message
          : "Aggiornamento del versionamento non riuscito."
      );
    } finally {
      setSavingVersion(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="Torna al generatore">
            <span className={styles.logoWrap}>
              <Image src="/logo.png" alt="" width={54} height={54} />
            </span>
            <span>
              <strong>Audit Service &amp; Certification</strong>
              <small>Amministrazione checklist</small>
            </span>
          </Link>
          <div className={styles.headerActions}>
            <Link href="/" className={styles.secondaryButton}>
              Torna al generatore
            </Link>
            <button type="button" className={styles.logoutButton} onClick={handleLogout}>
              Esci
            </button>
          </div>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>Area riservata</span>
          <h1>Gestione checklist Excel</h1>
          <p>
            Scarica la versione attualmente in uso oppure sostituiscila con un nuovo
            file. Puoi anche aggiornare edizione, revisione e data riportate nel documento Word.
          </p>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardIcon} aria-hidden="true">↓</div>
            <div className={styles.cardHeading}>
              <div>
                <span className={styles.step}>PASSAGGIO 1</span>
                <h2>Checklist corrente</h2>
              </div>
              <span className={styles.status}>In uso</span>
            </div>

            {loading ? (
              <div className={styles.skeleton}>Caricamento informazioni…</div>
            ) : metadata ? (
              <dl className={styles.details}>
                <div>
                  <dt>Nome file</dt>
                  <dd>{metadata.filename}</dd>
                </div>
                <div>
                  <dt>Ultimo aggiornamento</dt>
                  <dd>{formatDate(metadata.uploadedAt)}</dd>
                </div>
                <div>
                  <dt>Contenuto</dt>
                  <dd>{metadata.rowCount} righe · {formatBytes(metadata.size)}</dd>
                </div>
                <div>
                  <dt>Versionamento</dt>
                  <dd>Ed. {metadata.edition} Rev. {metadata.revision} · {formatDateOnly(metadata.revisionDate)}</dd>
                </div>
              </dl>
            ) : null}

            <a className={styles.primaryButton} href="/api/checklist/download">
              Scarica l’ultima checklist
            </a>
            <p className={styles.hint}>
              Conserva una copia del file prima di apportare modifiche.
            </p>
          </section>

          <section className={styles.card}>
            <div className={`${styles.cardIcon} ${styles.uploadIcon}`} aria-hidden="true">↑</div>
            <div className={styles.cardHeading}>
              <div>
                <span className={styles.step}>PASSAGGIO 2</span>
                <h2>Carica nuova versione</h2>
              </div>
            </div>

            <form onSubmit={handleUpload}>
              <label className={styles.dropzone}>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
                  onChange={(event) => {
                    setSelectedFile(event.target.files?.[0] ?? null);
                    setError("");
                    setSuccess("");
                  }}
                />
                <span className={styles.fileSymbol}>XLS</span>
                <strong>
                  {selectedFile ? selectedFile.name : "Seleziona il file Excel aggiornato"}
                </strong>
                <span>
                  {selectedFile
                    ? `${formatBytes(selectedFile.size)} · pronto per il caricamento`
                    : "Formati .xlsx o .xlsm · massimo 3 MB"}
                </span>
              </label>

              <button
                className={styles.primaryButton}
                type="submit"
                disabled={!selectedFile || uploading}
              >
                {uploading ? "Verifica e caricamento…" : "Sostituisci la checklist"}
              </button>
            </form>

            <p className={styles.hint}>
              Il file viene verificato prima della sostituzione. Deve contenere la
              colonna “Domanda”; “Standard” e “Req.” mantengono la struttura attuale.
            </p>
          </section>
        </div>

        <section className={`${styles.card} ${styles.versionCard}`}>
          <div className={styles.versionIntro}>
            <div>
              <span className={styles.step}>VERSIONAMENTO DOCUMENTO</span>
              <h2>Edizione e revisione della checklist generata</h2>
              <p>
                Questi valori verranno riportati automaticamente nell’intestazione
                della checklist Word.
              </p>
            </div>
            <div className={styles.versionPreview} aria-label="Anteprima versionamento">
              <strong>FORM 01-09</strong>
              <strong>Ed. {edition || "—"} Rev. {revision || "—"}</strong>
              <strong>{revisionDate ? formatDateOnly(revisionDate) : "—"}</strong>
            </div>
          </div>

          <form className={styles.versionForm} onSubmit={handleVersionSave}>
            <label>
              <span>Ed</span>
              <input
                type="text"
                value={edition}
                onChange={(event) => setEdition(event.target.value)}
                placeholder="Es. 01"
                maxLength={30}
                required
              />
              <small>Inserisci solo il valore, senza scrivere “Ed.”.</small>
            </label>

            <label>
              <span>Rev</span>
              <input
                type="text"
                value={revision}
                onChange={(event) => setRevision(event.target.value)}
                placeholder="Es. 09"
                maxLength={30}
                required
              />
              <small>Inserisci solo il valore, senza scrivere “REV”.</small>
            </label>

            <label>
              <span>Data</span>
              <input
                type="date"
                value={revisionDate}
                onChange={(event) => setRevisionDate(event.target.value)}
                required
              />
              <small>Data di emissione della revisione.</small>
            </label>

            <button
              className={styles.primaryButton}
              type="submit"
              disabled={
                loading ||
                savingVersion ||
                !edition.trim() ||
                !revision.trim() ||
                !revisionDate ||
                (metadata?.edition === edition.trim().replace(/^ed\.?\s*/i, "") &&
                  metadata?.revision === revision.trim().replace(/^rev\s*/i, "") &&
                  metadata?.revisionDate === revisionDate)
              }
            >
              {savingVersion ? "Salvataggio…" : "Salva versionamento"}
            </button>
          </form>
        </section>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {success ? <div className={styles.success} role="status">{success}</div> : null}

        <aside className={styles.notice}>
          <span aria-hidden="true">i</span>
          <p>
            <strong>Aggiornamento immediato.</strong> Dopo il salvataggio puoi tornare
            al generatore: contenuti, edizione, revisione e data saranno letti dai dati aggiornati
            senza dover pubblicare nuovamente il sito.
          </p>
        </aside>
      </section>
    </main>
  );
}
