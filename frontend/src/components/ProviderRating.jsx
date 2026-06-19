// src/components/company/CompanyRating.jsx

import React, { useEffect, useState } from "react";
import { apiGet } from "../api";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import "./company/css/CompanyRating.css";
import RatingDetailsModal from "./modals/RatingDetailsModal";

function ProviderRating() {
 const { user,loading } = useUser();
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    average_rating: 0,
    total_ratings: 0,
    completed_workorders_count: 0,
    badge: "Bronze",
  });

  const [ratings, setRatings] = useState([]);
  const [lowRatings, setLowRatings] = useState([]);

  const [selectedRating, setSelectedRating] = useState(null);
  const [showModal, setShowModal] = useState(false);

  /* =========================
     AUTH CHECK modified
     ========================= */

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/contractor/login");
    }
  }, [user, loading, navigate]);

  /* =========================
     FETCH RATINGS
     ========================= */

  useEffect(() => {
    if (loading) return;

    if (!user?.user_uid) return;
    console.log("Fetching ratings for user_uid:", user.user_uid);

    fetchRatings(user.user_uid);
  }, [user, loading]);

  const fetchRatings = async (userUid) => {
    try {
      const res = await apiGet(
        `/api/workorders/contractor/ratings/dashboard?user_uid=${userUid}`
      );

      if (res?.success) {
        setSummary(res.summary || {});
        setRatings(res.ratings || []);
        setLowRatings(res.low_ratings || []);
      }
    } catch (err) {
      console.error("Failed to load ratings:", err);
    }
  };

  /* =========================
     MODAL
     ========================= */

  const openModal = (rating) => {
    setSelectedRating(rating);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedRating(null);
    setShowModal(false);
  };

  /* =========================
     RATING CLASS done
     ========================= */

  const getRatingClass = (rating) => {
    if (rating >= 4.5) return "rating-good";
    if (rating >= 3.5) return "rating-average";
    return "rating-poor";
  };

  if (loading) return null;

  return (
    <div className="container-fluid my-5 px-0">
      <div className="rating-card mx-auto">

        <div className="rating-header">
          PROVIDER PERFORMANCE & RATINGS for {user?.company_name || "Your Company"}
        </div>

        <div className="rating-inner">

          {/* =========================
              SUMMARY CARDS
          ========================= */}

          <div className="summary-grid">

            <div className="summary-box">
              <div className="summary-label">
                Average Rating
              </div>

              <div className="summary-value">
                ⭐ {summary.average_rating || 0}
              </div>
            </div>

            <div className="summary-box">
              <div className="summary-label">
                Badge
              </div>

              <div
                className={`badge-pill badge-${(
                  summary.badge || "bronze"
                ).toLowerCase()}`}
              >
                {summary.badge || "Bronze"}
              </div>
            </div>

            <div className="summary-box">
              <div className="summary-label">
                Total Badges Earned
              </div>

              <div className="summary-value">
                {summary.total_ratings || 0}
              </div>
            </div>

            <div className="summary-box">
              <div className="summary-label">
                Completed Workorders
              </div>

              <div className="summary-value">
                {summary.completed_workorders_count || 0}
              </div>
            </div>

          </div>

          {/* =========================
              ALL RATINGS TABLE
          ========================= */}

          <h5 className="section-title">
            Rating History
          </h5>

          {ratings.length === 0 ? (
            <p className="text-center text-muted py-4">
              No ratings found
            </p>
          ) : (
            <div className="rating-table-wrapper">

              <table className="rating-table">

                <thead>
                  <tr>
                    <th>Workorder</th>
                    <th>Rating</th>
                    <th>Feedback</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>

                  {ratings.map((row, index) => (
                    <tr
                      key={index}
                    >
                      <td
                        className="workorder-link"
                        onClick={() => openModal(row)}
                      >
                        {row.workorder}
                      </td>

                      <td
                        className={getRatingClass(
                          row.rating
                        )}
                      >
                        ⭐ {row.rating}
                      </td>

                      <td>
                        {row.feedback
                          ? row.feedback.length > 50
                            ? row.feedback.substring(
                                0,
                                50
                              ) + "..."
                            : row.feedback
                          : "-"}
                      </td>

                      <td>
                        {row.created_at}
                      </td>
                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

          {/* =========================
              LOW RATINGS
          ========================= */}

          <div className="low-rating-section">

            <div className="low-rating-header">
              ⚠️ Needs Improvement (Below 4 Star)
            </div>

            {lowRatings.length === 0 ? (
              <p className="text-success mb-0">
                Great job! No low ratings.
              </p>
            ) : (
              <div className="rating-table-wrapper">

                <table className="rating-table">

                  <thead>
                    <tr>
                      <th>Workorder</th>
                      <th>Rating</th>
                      <th>Feedback</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>

                    {lowRatings.map((row, index) => (
                      <tr key={index}>

                        <td
                          className="workorder-link"
                          onClick={() => openModal(row)}
                        >
                          {row.workorder}
                        </td>

                        <td className="rating-poor">
                          ⭐ {row.rating}
                        </td>

                        <td>
                          {row.feedback || "-"}
                        </td>

                        <td>
                          {row.created_at}
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>
            )}

          </div>

        </div>
      </div>

      {/* =========================
          MODAL
      ========================= */}

      <RatingDetailsModal
        show={showModal}
        rating={selectedRating}
        onClose={closeModal}
        getRatingClass={getRatingClass}
      />
        </div>
  );
}

export default ProviderRating;