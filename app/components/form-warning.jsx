import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

export function FormWarning ({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div className="form-warning">
      <div className="tooltip">
        <FontAwesomeIcon icon={faExclamationTriangle} />
        <span className="tooltip-text">{message}</span>
      </div>
    </div>
  );
}

FormWarning.propTypes = {
  message: PropTypes.any,
};
