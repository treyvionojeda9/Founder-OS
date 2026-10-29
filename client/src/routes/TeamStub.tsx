import { Link, useParams } from "react-router-dom";
import { Sprite } from "../design/Sprite";
import { paperSheet } from "../design/sprites";
import { doors } from "../fixtures/doors";

export function TeamStub() {
  const { id } = useParams();
  const door = doors.find((item) => item.id === id);

  return (
    <main className="stub">
      <Link className="text-link" to="/home">
        Back
      </Link>
      <div className="sheet">
        <Sprite rows={paperSheet} scale={8} title="Paper" />
        <div className="sheet-copy">
          <h1>CEO chat — PR #2</h1>
          {door ? <p>{door.name}</p> : null}
        </div>
      </div>
    </main>
  );
}
