import type { Location } from '../../../types';

interface Props {
  locations: Location[];
}

export function InfoLocations ({ locations }: Props) {
  return (
    <div className="info-locations">
      {locations.map((location) => {
        return (
          <div key={location.game.id}>
            <h3>Pokémon {location.game.name}</h3>
            <ul>
              {location.value.map((loc) => <li key={loc}>{loc}</li>)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
