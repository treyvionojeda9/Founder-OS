type EmptyShelfProps = {
  still: boolean;
  /** Opens the existing human sheet. Nothing is written until that person saves. */
  onAdd: () => void;
};

/**
 * Dust where the notes would stand.
 * One sentence and one action. The outlines are not spines and they do not write.
 */
export function EmptyShelf({ still, onAdd }: EmptyShelfProps) {
  return (
    <div
      className="shelf-dust"
      data-object="empty-shelf"
      data-still={still ? "true" : "false"}
      data-frames="1"
      role="group"
      aria-label="Empty shelf"
    >
      <div className="dust-row" aria-hidden="true">
        <span className="dust-spine" data-band="high" data-pattern="dashed" />
        <span className="dust-spine" data-band="mid" data-pattern="dashed" />
        <span className="dust-spine" data-band="low" data-pattern="dashed" />
      </div>
      <p className="shelf-dust-line">The shelf is bare.</p>
      <button type="button" className="shelf-dust-action" data-reach="local" onClick={onAdd}>
        Add a note
      </button>
    </div>
  );
}
