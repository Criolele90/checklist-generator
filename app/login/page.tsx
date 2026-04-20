"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrore("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setErrore("Password non valida");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrore("Errore durante il login");
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f8fb",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          padding: 24,
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, color: "#156082" }}>Accesso</h1>

        <p style={{ margin: 0, color: "#4f6475" }}>
          Inserisci la password per accedere al generatore checklist.
        </p>

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: 12,
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            fontSize: 16,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            border: "none",
            borderRadius: 8,
            background: "#156082",
            color: "#ffffff",
            fontWeight: 700,
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>

        {errore ? (
          <p style={{ margin: 0, color: "#b42318" }}>{errore}</p>
        ) : null}
      </form>
    </main>
  );
}