import type { Location } from "../../../types";

interface Props {
  locations: Location[];
}

export function InfoLocations({ locations }: Props) {
  return (
    <div className="flex-[1_1_auto] overflow-y-scroll border-b-2 border-info-edge bg-info p-30">
      {locations.map((location) => {
        return (
          <div key={location.game.id}>
            <h3 className="m-0 font-secondary text-11 font-bold tracking-1 uppercase">
              Pokémon {location.game.name}
            </h3>
            <ul className="mx-0 mt-10 mb-20 pl-33 text-16 leading-[1.4]">
              {location.value.map((loc) => (
                <li key={loc}>{loc}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
