import React, { useState } from "react";
import { apiPost } from "../../api";
import "../css/ContractorRatingModal.css";
import { useAdmin } from "../../context/AdminContext"; // Ensure the AdminContext is imported for potential future use  

function ContractorRatingModal({
  show,
  workorderData,
  onClose,
  onRatingSaved,
}) {
    const { admin } = useAdmin();
    console.log("Logged In Admin:", admin);
    const ratingGivenBy =
  admin?.user_uid ||
  admin?.admin_id ||
  admin?.id ||
  null;
  const workorderValue =
    workorderData?.workorder ||
    workorderData?.WORKORDER_ID ||
    workorderData?.workorder_id ||
    "";
    console.log("ContractorRatingModal - workorderData:", workorderData);
    console.log("ContractorRatingModal - ratingGivenBy:", ratingGivenBy);

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleSubmit = async () => {
    if (!rating) {
      alert("Please select a rating");
      return;
    }

    try {
      setLoading(true);
      console.log({
  workorder: workorderValue,
  rating,
  feedback,
});

      await apiPost("/api/workorders/contractor-ratings/create", {
        workorder: workorderValue,
        rating,
        feedback,
         rating_given_by: ratingGivenBy
      });

      alert("✅ Contractor rated successfully");

      onRatingSaved?.();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save rating");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rating-modal-overlay">
      <div className="rating-modal">

        <div className="rating-header">
          Rate Contractor
        </div>

        <div className="rating-body">

          <div className="rating-workorder">
            <strong>Work Order:</strong>{" "}
            {workorderValue || "-"}
          </div>

          <div className="star-container">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star ${
                  rating >= star ? "active" : ""
                }`}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
          </div>

          <textarea
            className="rating-feedback"
            rows={4}
            placeholder="Enter feedback (optional)"
            value={feedback}
            onChange={(e) =>
              setFeedback(e.target.value)
            }
          />

          <div className="rating-actions">

            <button
              className="btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="btn-submit"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading
                ? "Saving..."
                : "Submit Rating"}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}

export default ContractorRatingModal;