import { Link, useParams } from "react-router-dom";
import { Sprite } from "../design/Sprite";
import { deskLampOff } from "../design/sprites";
import { doors } from "../fixtures/doors";

export function LearnStub() {
  const { id } = useParams();
  const door = doors.find((item) => item.id === id);

  return (
    <main className="stub">
      <Link className="text-link" to="/home">
        Back
      </Link>
      <Sprite rows={deskLampOff} scale={4} title="Desk lamp, unlit" />
      <h1>Learning desk — PR #4</h1>
      {door ? <p>{door.name}</p> : null}
    </main>
  );
}
