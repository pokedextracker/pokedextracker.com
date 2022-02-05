import PropTypes  from 'prop-types';
import classNames from 'classnames';

export function SortByButton ({ sortByGeneration, setSortByGeneration }) {
  return (
    <>
      <button className={classNames('btn', {
        'btn-blue': sortByGeneration === true
      })} onClick={() => setSortByGeneration(true)}>
        <span>Generation</span>
      </button>
      <button className={classNames('btn', {
        'btn-blue': sortByGeneration === false
      })} onClick={() => setSortByGeneration(false)}>
        <span>Dex Number</span>
      </button>
    </>
  );
}

SortByButton.propTypes = {
  sortByGeneration: PropTypes.bool.isRequired,
  setSortByGeneration: PropTypes.func.isRequired,
};
