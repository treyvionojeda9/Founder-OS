import { useParams } from "react-router-dom";
import { Sprite } from "../design/Sprite";
import { bookStack, openNotebook } from "../design/sprites";
import { doors } from "../fixtures/doors";
import { useDoorShut } from "../hall/doorApi";
import { useFormFactor } from "../hooks/useFormFactor";
import { StudyStage } from "../study/StudyStage";

type LearnStubProps = {
  doorId?: string;
  preview?: boolean;
};

export function LearnStub({ doorId: doorIdProp, preview = false }: LearnStubProps) {
  const params = useParams();
  const id = doorIdProp ?? params.id ?? "";
  const door = doors.find((item) => item.id === id);
  const shut = useDoorShut();
  const layout = useFormFactor();
  const lampScale = layout === "portrait" ? 4 : 3;
  const propScale = layout === "portrait" ? 8 : 6;

  return (
    <main className="study learn-room" data-room="learn" data-preview={preview ? "true" : "false"}>
      <header className="study-bar">
        <button type="button" className="text-link" onClick={() => shut(id)}>
          Back
        </button>
        <p className="study-team">{door?.name ?? "School"}</p>
      </header>
      <div className="study-scene">
        <StudyStage
          lampStatus="working"
          lampScale={lampScale}
          beside={
            <figure className="figure book-stack">
              <Sprite rows={bookStack} scale={propScale} title="Stacked books" />
            </figure>
          }
          onDesk={
            <div className="notebook">
              <Sprite rows={openNotebook} scale={propScale} title="Open notebook" />
            </div>
          }
          caption={<h1 className="learn-label">AI University — coming later</h1>}
        />
      </div>
    </main>
  );
}
