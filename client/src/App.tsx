import React, { useEffect, useState } from "react";
import {
  FounderOSLocalDatabase,
  IndexedDBNoteRepository,
  type Note,
} from "./storage/noteRepository";

const db = new FounderOSLocalDatabase();
const repo = new IndexedDBNoteRepository(db);

export function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("Ready — Human Vault active (local IndexedDB)");

  useEffect(() => {
    repo.listByProject("default-project").then(setNotes);
  }, []);

  async function handleSaveHumanNote() {
    if (!content.trim()) return;
    const note: Note = {
      id: `note-${Date.now()}`,
      projectId: "default-project",
      vault: "human",
      content: content.trim(),
      revision: 1,
      updatedAt: new Date().toISOString(),
    };
    await repo.saveHumanEdit(note, "human");
    setContent("");
    setStatus(`Saved ${note.id} to Human Vault`);
    setNotes(await repo.listByProject("default-project"));
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
      <header style={{ borderBottom: "1px solid #2A2A32", paddingBottom: 16, marginBottom: 24 }}>
        <p style={{ color: "#D4AF37", letterSpacing: "0.12em", fontSize: 12, margin: 0 }}>
          THE SOVEREIGN MONASTERY · FOUNDER OS
        </p>
        <h1 style={{ margin: "8px 0 4px", fontSize: 28 }}>Founder OS Frontend Shell</h1>
        <p style={{ color: "#A0A0AB", margin: 0, fontSize: 14 }}>{status}</p>
      </header>

      <section style={{ display: "grid", gap: 16 }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a Human Vault note (or replace this shell in src/App.tsx with your custom UI)..."
          rows={5}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#141418",
            color: "#F5F2EB",
            border: "1px solid #2A2A32",
            borderRadius: 8,
            padding: 14,
            fontSize: 15,
          }}
        />
        <div>
          <button
            onClick={handleSaveHumanNote}
            style={{
              background: "#D4AF37",
              color: "#0D0D0F",
              border: "none",
              borderRadius: 6,
              padding: "10px 18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Save to Human Vault
          </button>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: "#D4AF37" }}>Human Vault Notes ({notes.length})</h2>
        {notes.map((n) => (
          <article
            key={n.id}
            style={{
              background: "#141418",
              border: "1px solid #2A2A32",
              borderRadius: 8,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, color: "#A0A0AB", marginBottom: 6 }}>
              {n.id} · vault: <strong>{n.vault}</strong> · {n.updatedAt}
            </div>
            <div>{n.content}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
