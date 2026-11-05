import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { DoorButton } from "../components/DoorButton";
import { SectionToggle } from "../components/SectionToggle";
import { doors as fixtureDoors, type Door, type DoorSection } from "../fixtures/doors";
import { useDoorArm, useDoorOpen, type HallLocationState } from "../hall/doorApi";
import { doorPath } from "../hall/doorMotion";
import { doorPixelScale, doorPose, doorsForSearch } from "../hall/layout";
import { SpaceBackdrop } from "../hall/SpaceBackdrop";
import { spaceSwapFrames } from "../hall/spaceSkin";
import { SpaceSoundToggle } from "../hall/SpaceSoundToggle";
import { useFormFactor } from "../hooks/useFormFactor";
import { useStillFrame } from "../hooks/useStillFrame";
import { SparkFlame } from "../nav/FlamePress";
import { publishRoom, readHallGoto } from "../nav/room";
import { settingsRepo } from "../storage/services";

type HomeProps = {
  doors?: Door[];
};

export function Home({ doors = fixtureDoors }: HomeProps) {
  const openDoor = useDoorOpen();
  const armDoor = useDoorArm();
  const location = useLocation();
  const focusDoorId = (location.state as HallLocationState | null)?.focusDoorId;
  const focusedDoor = useRef<string | null>(null);
  const layout = useFormFactor();
  const [params] = useSearchParams();
  const hallDoors = doorsForSearch(doors, params.toString());
  const hallGoto = readHallGoto(location.state);
  const [section, setSection] = useState<DoorSection>(hallGoto?.section ?? "work");
  const [spaceTick, setSpaceTick] = useState(0);
  const sectionNow = useRef(section);
  const hydrated = useRef(hallGoto !== null);
  const appliedGoto = useRef(hallGoto?.seq ?? 0);
  const still = useStillFrame();
  const showToggle = hallDoors.length >= 2;
  sectionNow.current = section;

  useEffect(() => {
    let live = true;
    settingsRepo
      .getSection()
      .then((saved) => {
        if (!live || hydrated.current) return;
        hydrated.current = true;
        setSection(saved);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  function onSection(next: DoorSection) {
    hydrated.current = true;
    if (sectionNow.current !== next) setSpaceTick((tick) => tick + 1);
    sectionNow.current = next;
    setSection(next);
    if (showToggle) void settingsRepo.setSection(next).catch(() => undefined);
  }

  useEffect(() => {
    const next = readHallGoto(location.state);
    if (!next || next.seq === appliedGoto.current) return;
    appliedGoto.current = next.seq;
    onSection(next.section);
  }, [location.state, showToggle]);

  useLayoutEffect(() => {
    publishRoom({ room: section === "school" ? "school" : "work", teamId: null, learnId: null });
  }, [section]);

  useEffect(() => {
    if (!focusDoorId || focusedDoor.current === focusDoorId) return;
    const target = doors.find((door) => door.id === focusDoorId);
    if (target && showToggle && target.section !== section) {
      setSection(target.section);
      return;
    }
    const node = document.querySelector<HTMLElement>(`[data-door-id="${CSS.escape(focusDoorId)}"]`);
    if (!node) return;
    node.focus({ preventScroll: true });
    focusedDoor.current = focusDoorId;
  }, [doors, focusDoorId, section, showToggle]);

  const visible = showToggle ? hallDoors.filter((door) => door.section === section) : hallDoors;
  const headingId = section === "work" ? "tab-work" : "tab-school";
  const scale = doorPixelScale(layout, visible.length);

  return (
    <>
      <div
        className="hall"
        data-place={section === "school" ? "school" : "work"}
        data-space={section === "school" ? "school" : "work"}
        data-lighting={section === "school" ? "school" : "ember"}
        data-motion={still ? "cut" : "crossfade"}
        data-frames={spaceSwapFrames(still)}
        data-space-tick={spaceTick}
      >
        <aside className="rail">
          <SparkFlame scale={4} enabled={layout !== "desktop"} />
          <h1 className="wordmark">Spark of Freedom</h1>
          <p className="rail-copy">A quiet hall for the work you author and the study you keep.</p>
          <Link className="text-link hall-fixture type-meta" to="/settings">
            Settings
          </Link>
        </aside>
        <main className="stage" data-hall="void">
          <SpaceBackdrop space={section === "school" ? "school" : "work"} still={still} />
          <header className="pixel-bar stage-head">
            <div className="compact-brand">
              <SparkFlame scale={4} enabled={layout !== "desktop"} />
              <h1 className="wordmark">Spark of Freedom</h1>
            </div>
            {showToggle ? <h2 className="stage-title">{section === "work" ? "Work" : "School"}</h2> : null}
            <Link className="text-link stage-settings hall-fixture type-meta" to="/settings">
              Settings
            </Link>
          </header>
          <div
            className="door-wrap"
            id={showToggle ? "hall-panel" : undefined}
            role={showToggle ? "tabpanel" : undefined}
            aria-labelledby={showToggle ? headingId : undefined}
          >
            <ul className="door-grid" data-count={visible.length}>
              {visible.map((door, index) => {
                const pose = doorPose(index, visible.length);
                return (
                  <li
                    key={door.id}
                    className="door-slot"
                    data-yaw={pose.yaw}
                    data-z={pose.z}
                    data-drop={pose.drop}
                  >
                    <DoorButton
                      door={door}
                      scale={scale}
                      pose={pose}
                      onArm={(chosen, frame) => {
                        armDoor(doorPath(chosen), frame);
                      }}
                      onOpen={(chosen) => {
                        openDoor(doorPath(chosen));
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </main>
      </div>
      {showToggle ? (
        <div className="toggle-dock">
          <SectionToggle section={section} onChange={onSection} />
          <SpaceSoundToggle />
        </div>
      ) : null}
    </>
  );
}
