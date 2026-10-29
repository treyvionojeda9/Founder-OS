import { Sprite } from "../design/Sprite";
import { SwatchColumn } from "../components/SwatchColumn";
import {
  agent,
  archDoorClosed,
  archDoorOpen,
  closedLogoSlot,
  deskLampFailed,
  deskLampOff,
  deskLampOn,
  flame,
  logoHale,
  offlineCloud,
  openLogoSlot,
  paperSheet,
} from "../design/sprites";
import type { SpriteGrid } from "../design/sprites";
import { Link } from "react-router-dom";

function Pair({
  title,
  rows,
  layers,
}: {
  title: string;
  rows: SpriteGrid;
  layers?: { rows: SpriteGrid; x: number; y: number }[];
}) {
  return (
    <section className="sprite-block">
      <h2>{title}</h2>
      <div className="sprite-row">
        <figure className="sprite-card">
          <Sprite rows={rows} scale={4} title={`${title} at 4×`} layers={layers} />
          <figcaption>×4</figcaption>
        </figure>
        <figure className="sprite-card">
          <Sprite rows={rows} scale={8} title={`${title} at 8×`} layers={layers} />
          <figcaption>×8</figcaption>
        </figure>
      </div>
    </section>
  );
}

export function DesignSystem() {
  return (
    <main className="design">
      <header className="stage-head">
        <h1>Design system</h1>
        <Link className="text-link" to="/home">
          Home
        </Link>
      </header>
      <div className="design-grid">
        <SwatchColumn />
        <div>
          <Pair title="Spark of Freedom" rows={flame} />
          <Pair
            title="Arch door, closed"
            rows={archDoorClosed}
            layers={[{ rows: logoHale, x: closedLogoSlot.x, y: closedLogoSlot.y }]}
          />
          <Pair
            title="Arch door, open"
            rows={archDoorOpen}
            layers={[{ rows: logoHale, x: openLogoSlot.x, y: openLogoSlot.y }]}
          />
          <Pair title="Desk lamp, off" rows={deskLampOff} />
          <Pair title="Desk lamp, on" rows={deskLampOn} />
          <Pair title="Desk lamp, failed" rows={deskLampFailed} />
          <Pair title="Agent" rows={agent} />
          <Pair title="Paper" rows={paperSheet} />
          <Pair title="Offline cloud" rows={offlineCloud} />
        </div>
      </div>
    </main>
  );
}
