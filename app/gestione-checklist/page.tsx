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

export default function ChecklistManagementPage() {
  const [metadata, setMetadata] = useState<ChecklistMetadata | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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

        if (active) setMetadata(data.metadata);
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
            file. Dopo il caricamento, il generatore userà subito i dati aggiornati.
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

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {success ? <div className={styles.success} role="status">{success}</div> : null}

        <aside className={styles.notice}>
          <span aria-hidden="true">i</span>
          <p>
            <strong>Aggiornamento immediato.</strong> Dopo il caricamento puoi tornare
            al generatore: standard, domande e requisiti saranno letti dalla nuova
            checklist senza dover pubblicare nuovamente il sito.
          </p>
        </aside>
      </section>
    </main>
  );
}
