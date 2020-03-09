import PropTypes from 'prop-types';

export function FormWarning ({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div className="form-warning">
      <div className="tooltip">
        <i className="fa fa-exclamation-triangle" />
        <span className="tooltip-text">{message}</span>
      </div>
    </div>
  );
}

FormWarning.propTypes = {
  message: PropTypes.any
};
