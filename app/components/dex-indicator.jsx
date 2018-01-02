export function DexIndicatorComponent ({ dex }) {
  if (!dex) {
    return null;
  }

  let shiny = null;

  if (dex && dex.shiny) {
    shiny = (
      <i className="fa fa-star" title="shiny" />
    );
  }

  return (
    <div className="dex-indicator">
      {shiny}
      <span className="label">{dex.regional ? 'Regional' : 'National'}</span>
      <span className="label">{dex.game.name}</span>
    </div>
  );
}
