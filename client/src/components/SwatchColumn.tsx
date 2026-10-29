import { founderSwatches, schoolSwatches } from "../design/palette";

export function SwatchColumn() {
  const groups = [
    { title: "Founder Ember", swatches: founderSwatches },
    { title: "School accent", swatches: schoolSwatches },
  ];
  return (
    <div className="swatch-column">
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h2>{group.title}</h2>
          <ul>
            {group.swatches.map((swatch) => (
              <li key={swatch.name} className="swatch-row">
                <span className="swatch" style={{ background: swatch.hex }} aria-hidden="true" />
                <span>{swatch.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
