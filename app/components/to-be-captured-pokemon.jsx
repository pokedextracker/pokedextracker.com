import PropTypes                    from 'prop-types';
import { useState }        from 'react';

export function ToBeCapturedButton () {
  const [isHidden, setIsHidden] = useState(false);

  const handleButtonClickHide = async () => {
    setIsHidden(true);
  };

  const handleButtonClickShow = async () => {
    setIsHidden(false);
  };

  return (
    <button className="btn btn-blue hide" onClick={isHidden ? handleButtonClickShow : handleButtonClickHide}>
      <span>{isHidden ? 'Show all Pokemon' : 'Hide caught pokemon' }</span>
      <HiddenStyle hide={isHidden} />
    </button>
  );
}

const HiddenStyle = ({ hide }) => {
  if (hide) {
    return (
      <style type="text/css">
        { '.pokemon.captured{ display: none; }' }
      </style>
    );
  } else {
    return <noscript />;
  }
};

ToBeCapturedButton.propTypes = {
  hideCaughtPokemon: PropTypes.object
};
