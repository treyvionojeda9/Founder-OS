export type PonderParts = {
  noteId: string | null;
  assetId: string | null;
  body: string;
};

const FRONT =
  /^---\r?\nid: (HN-[A-Z0-9]+)\r?\nsource_type: ink\r?\nink_asset: (INK-[A-Z0-9]+)\r?\n---\r?\n?/;

/** Split a human note into an ink link and the typed body. Plain text has no link. */
export function splitPonderContent(content: string): PonderParts {
  const match = FRONT.exec(content);
  if (!match) return { noteId: null, assetId: null, body: content };
  const rest = content.slice(match[0].length);
  return {
    noteId: match[1] ?? null,
    assetId: match[2] ?? null,
    body: rest.replace(/^\n/, ""),
  };
}

export function joinPonderContent(noteId: string, assetId: string, body: string): string {
  const text = body.replace(/^\n+/, "");
  const tail = text ? `\n${text}` : "";
  return `---\nid: ${noteId}\nsource_type: ink\nink_asset: ${assetId}\n---\n${tail}`;
}

export function ponderBody(content: string): string {
  return splitPonderContent(content).body;
}

/** Keep the ink link when the typed body changes. Plain notes stay plain. */
export function replacePonderBody(content: string, body: string): string {
  const parts = splitPonderContent(content);
  if (!parts.assetId || !parts.noteId) return body;
  return joinPonderContent(parts.noteId, parts.assetId, body);
}
