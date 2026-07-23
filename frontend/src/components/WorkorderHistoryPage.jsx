import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet } from "../api";
import "./css/WorkorderHistoryPage.css";

function WorkorderHistoryPage() {
  const { workorder } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await apiGet(
          `/api/admin/workorders/${encodeURIComponent(workorder)}/full-history`
        );
        setData(res);
        setError("");
      } catch (err) {
        setError(err.message || "Failed to load history");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [workorder]);

  const fmt = (t) => (t ? new Date(t).toLocaleString() : "-");

  const renderContractorRound = (details) => {
    const suggested = details.suggested_contractors || [];
    const selectedId = details.selected_contractor_id;

    return (
      <div className="wh-round-card">
        <div className="wh-round-header">
          <span>{details.suggested_count} Contractor(s) Suggested</span>
          {details.assignment_reason && (
            <span className="wh-reason-badge">
              Reason: {details.assignment_reason}
            </span>
          )}
        </div>

        <table className="wh-contractor-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Contractor</th>
              <th>City</th>
              <th>Rate</th>
              <th>Rating</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {suggested.map((c, idx) => {
              const isSelected =
                Number(c.contractor_id) === Number(selectedId);
              return (
                <tr
                  key={c.contractor_id ?? idx}
                  className={isSelected ? "wh-selected-row" : ""}
                >
                  <td>{idx + 1}</td>
                  <td>{c.contractor_name}</td>
                  <td>{c.city || "-"}</td>
                  <td>{Number(c.rate || 0).toFixed(2)}</td>
                  <td>⭐{Number(c.rating || 0).toFixed(1)}</td>
                  <td>{isSelected ? "✅ Selected" : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderGenericEvent = (event) => (
    <div className="wh-event-card">
      {event.details?.contractor_name && (
        <div>
          <strong>Contractor:</strong> {event.details.contractor_name}
        </div>
      )}
      {event.details?.expiry_time && (
        <div>
          <strong>Expiry:</strong> {fmt(event.details.expiry_time)}
        </div>
      )}
      {event.details?.remarks && (
        <div>
          <strong>Remarks:</strong> {event.details.remarks}
        </div>
      )}
    </div>
  );

  return (
    <div className="wh-page">
      <button className="wh-back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <h2 className="wh-title">Workorder History — {workorder}</h2>

      {loading && <div className="wh-loading">Loading...</div>}
      {error && <div className="wh-error">{error}</div>}

      {!loading && !error && data && (
        <>
          <div className="wh-summary-card">
            <div><strong>Status:</strong> {data.status}</div>
            <div><strong>Region:</strong> {data.region_name || "-"}</div>
            <div><strong>City:</strong> {data.city_name || "-"}</div>
            <div><strong>Category:</strong> {data.category_name || "-"}</div>
          </div>

          <div className="wh-timeline">
            {(data.timeline || []).map((event, idx) => (
              <div className="wh-timeline-item" key={idx}>
                <div className="wh-timeline-marker" />
                <div className="wh-timeline-body">
                  <div className="wh-timeline-meta">
                    <span className={`wh-badge wh-badge-${event.event_type}`}>
                      {event.title}
                    </span>
                    <span className="wh-time">{fmt(event.time)}</span>
                  </div>

                  {event.event_type === "CONTRACTOR_ROUND"
                    ? renderContractorRound(event.details)
                    : renderGenericEvent(event)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default WorkorderHistoryPage;