import PropTypes from 'prop-types';

export function InfoLocations ({ locations }) {
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

InfoLocations.propTypes = {
  locations: PropTypes.arrayOf(PropTypes.object).isRequired,
};
