import React from "react";

function RatingDetailsModal({
  show,
  rating,
  onClose,
  getRatingClass
}) {

  if (!show || !rating) return null;

  return (
    <div className="modal-overlay">

      <div className="modal-box">

        <span
          className="modal-close"
          onClick={onClose}
        >
          ×
        </span>

        <div className="modal-header">
          Rating Details
        </div>

        <div className="kv-grid">

          <div className="kv-row">
            <span className="kv-label">
              Workorder
            </span>

            <span className="kv-value">
              {rating.workorder}
            </span>
          </div>

          <div className="kv-row">
            <span className="kv-label">
              Rating
            </span>

            <span
              className={`kv-value ${getRatingClass(
                rating.rating
              )}`}
            >
              ⭐ {rating.rating}
            </span>
          </div>

          <div className="kv-row">
            <span className="kv-label">
              Feedback
            </span>

            <span className="kv-value">
              {rating.feedback || "-"}
            </span>
          </div>

          <div className="kv-row">
            <span className="kv-label">
              Rated On
            </span>

            <span className="kv-value">
              {rating.created_at}
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}

export default RatingDetailsModal;