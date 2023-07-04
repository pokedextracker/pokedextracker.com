import PropTypes from 'prop-types';

import { decimal } from '../utils/formatting';

export function Progress ({ caught, total }) {
  const percent = 100 * caught / total;

  return (
    <div className="progress-container">
      <div className="progress-outer">
        <div className="progress-numbers"><b>{decimal(percent, 1)}%</b> done!<span className="mobile"> (<b>{caught}</b> caught, <b>{total - caught}</b> to go)</span></div>
        <div className="progress-inner" style={{ width: `${percent}%` }} />
      </div>
      <h3>(<b>{caught}</b> caught, <b>{total - caught}</b> to go)</h3>
    </div>
  );
}

Progress.propTypes = {
  caught: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
};
