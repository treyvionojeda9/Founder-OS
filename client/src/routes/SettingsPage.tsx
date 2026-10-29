import { useState } from "react";
import { Link } from "react-router-dom";

export function SettingsPage() {
  const [note, setNote] = useState("");

  return (
    <main className="stub settings">
      <div className="pixel-bar">
        <Link className="text-link" to="/home">
          Back
        </Link>
      </div>
      <h1>Settings</h1>
      <p>Export copies a human-authored archive. This build only reserves the action.</p>
      <button type="button" className="continue" onClick={() => setNote("Export is not available in this build.")}>
        Export
      </button>
      {note ? <p role="status">{note}</p> : null}
    </main>
  );
}
