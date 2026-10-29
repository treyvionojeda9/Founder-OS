import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sprite } from "../design/Sprite";
import { flame } from "../design/sprites";
import { DoorButton } from "../components/DoorButton";
import { SectionToggle } from "../components/SectionToggle";
import { doors as fixtureDoors, type Door, type DoorSection } from "../fixtures/doors";
import { settingsRepo } from "../storage/services";

type HomeProps = {
  doors?: Door[];
};

export function Home({ doors = fixtureDoors }: HomeProps) {
  const navigate = useNavigate();
  const [section, setSection] = useState<DoorSection>("work");
  const hydrated = useRef(false);
  const showToggle = doors.length >= 2;

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
    setSection(next);
    if (showToggle) void settingsRepo.setSection(next).catch(() => undefined);
  }

  const visible = showToggle ? doors.filter((door) => door.section === section) : doors;
  const headingId = section === "work" ? "tab-work" : "tab-school";

  return (
    <>
      <div className="hall">
        <aside className="rail">
          <Sprite rows={flame} scale={4} title="Spark of Freedom flame" />
          <h1 className="wordmark">Spark of Freedom</h1>
          <p className="rail-copy">A quiet hall for the work you author and the study you keep.</p>
          <Link className="text-link" to="/settings">
            Settings
          </Link>
        </aside>
        <main className="stage">
          <header className="stage-head">
            <div className="compact-brand">
              <Sprite rows={flame} scale={4} title="Spark of Freedom flame" />
              <h1 className="wordmark">Spark of Freedom</h1>
            </div>
            {showToggle ? <h2 className="stage-title">{section === "work" ? "Work" : "School"}</h2> : null}
            <Link className="text-link stage-settings" to="/settings">
              Settings
            </Link>
          </header>
          <div
            className="door-wrap"
            id={showToggle ? "hall-panel" : undefined}
            role={showToggle ? "tabpanel" : undefined}
            aria-labelledby={showToggle ? headingId : undefined}
          >
            <ul className="door-grid">
              {visible.map((door) => (
                <li key={door.id}>
                  <DoorButton
                    door={door}
                    onOpen={(chosen) => {
                      const path = chosen.section === "work" ? `/team/${chosen.id}` : `/learn/${chosen.id}`;
                      navigate(path);
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
      {showToggle ? (
        <div className="toggle-dock">
          <SectionToggle section={section} onChange={onSection} />
        </div>
      ) : null}
    </>
  );
}
