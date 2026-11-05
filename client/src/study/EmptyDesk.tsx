type EmptyDeskProps = {
  still: boolean;
  /** Opens the existing Team swap slip. It does not hire and it does not write a vault. */
  onSeat: () => void;
};

/**
 * A vacant desk on the floor.
 * One pixel plaque, one sentence, one action. No status chip, no vault write.
 */
export function EmptyDesk({ still, onSeat }: EmptyDeskProps) {
  return (
    <div
      className="empty-desk"
      data-object="empty-desk"
      data-still={still ? "true" : "false"}
      data-frames="1"
    >
      <div className="empty-desk-bay" aria-hidden="true">
        <span className="empty-desk-seat" data-pattern="dashed" />
        <span className="empty-desk-top" data-material="desk" />
        <span className="empty-desk-front" />
      </div>
      <p className="empty-desk-plaque" data-plaque="engraved" data-label="pixel">
        Seat an agent
      </p>
      <p className="empty-desk-line">This desk is empty.</p>
      <button type="button" className="empty-desk-action" data-reach="local" onClick={onSeat}>
        Seat an agent
      </button>
    </div>
  );
}
