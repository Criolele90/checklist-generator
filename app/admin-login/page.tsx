"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./styles.module.css";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Accesso amministratore non riuscito.");
      }

      router.replace("/gestione-checklist");
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Accesso amministratore non riuscito."
      );
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <Link href="/" className={styles.back}>← Torna al generatore</Link>
        <div className={styles.logo}>
          <Image src="/logo.png" alt="Logo aziendale" width={68} height={68} />
        </div>
        <span className={styles.eyebrow}>Area amministratore</span>
        <h1>Gestione checklist</h1>
        <p>
          Inserisci la password amministratore per scaricare o sostituire il file Excel.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="admin-password">Password amministratore</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Verifica in corso…" : "Accedi all’area riservata"}
          </button>
        </form>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        <small>Questa password è distinta da quella usata per entrare nell’applicativo.</small>
      </section>
    </main>
  );
}
