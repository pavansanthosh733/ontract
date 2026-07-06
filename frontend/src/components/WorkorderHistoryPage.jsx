import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet } from "../api";
import "./css/WorkorderHistoryPage.css";

const EVENT_META = {
  created:          { icon: "🆕", color: "#2563eb", label: "Created" },
  assignment_round: { icon: "📋", color: "#7c3aed", label: "Assignment Round" },
  assignment_entry: { icon: "📌", color: "#0891b2", label: "Assigned" },
  contractor_action:{ icon: "👷", color: "#d97706", label: "Contractor Action" },
  completed:        { icon: "✅", color: "#15803d", label: "Completed" },
  reopened:         { icon: "🔄", color: "#eab308", label: "Reopened" },
  closed:           { icon: "🔒", color: "#334155", label: "Closed" },
  withdrawn:        { icon: "🚫", color: "#b91c1c", label: "Withdrawn" },
};

const STATUS_META = {
  OPEN:      { icon: "📂", color: "#2563eb", label: "Open" },
  ACCEPTED:  { icon: "👍", color: "#16a34a", label: "Accepted" },
  REJECTED:  { icon: "👎", color: "#dc2626", label: "Rejected" },
  COMPLETED: { icon: "✅", color: "#15803d", label: "Completed" },
  REOPEN:    { icon: "🔄", color: "#eab308", label: "Reopened" },
  CLOSED:    { icon: "🔒", color: "#334155", label: "Closed" },
  WITHDRAW:  { icon: "🚫", color: "#b91c1c", label: "Withdrawn" },
};

function WorkorderHistoryPage() {
  const { workorder } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await apiGet(
          `/api/workorders/${encodeURIComponent(workorder)}/full-history`
        );

        setData(res?.data || res);
      } catch (err) {
        console.error("Error fetching workorder history:", err);
        setError("Failed to load workorder history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [workorder]);

  if (loading) {
    return <div className="wo-history-status">Loading history...</div>;
  }

  if (error) {
    return <div className="wo-history-status wo-history-error">{error}</div>;
  }

  if (!data) {
    return <div className="wo-history-status">No data found</div>;
  }

  return (
    <div className="wo-history-page">
      <div className="wo-history-header">
        <h2>Workorder History — {data.workorder}</h2>
        <span className="wo-history-current-status">
          {data.current_status}
        </span>
      </div>

      <div className="wo-history-timeline">
        {data.timeline.map((event, idx) => {
          const meta =
            event.type === "contractor_action"
              ? STATUS_META[event.details.status] || EVENT_META.contractor_action
              : EVENT_META[event.type] || { icon: "•", color: "#64748b", label: event.type };

          return (
            <div className="wo-history-item" key={idx}>
              <div className="wo-history-dot" style={{ background: meta.color }}>
                {meta.icon}
              </div>

              <div className="wo-history-content">
                <div className="wo-history-time">
                  {new Date(event.timestamp).toLocaleString()}
                </div>

                <div className="wo-history-title">
                  {event.type === "contractor_action" ? meta.label : event.title}
                  {event.type === "contractor_action" && event.details.contractor_name
                    ? ` — ${event.details.contractor_name}`
                    : ""}
                </div>

                {/* Assignment round details */}
                {event.type === "assignment_round" && (
                  <div className="wo-history-details">
                    <div><b>Reason:</b> {event.details.assignment_reason}</div>
                    <div>
                      <b>Selected:</b>{" "}
                      {event.details.selected_contractor?.contractor_name}
                    </div>

                    <details>
                      <summary>
                        {event.details.suggested_count} contractors suggested — view all
                      </summary>
                      <table className="wo-history-mini-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>City</th>
                            <th>Rate</th>
                            <th>Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {event.details.suggested_contractors.map((c) => (
                            <tr key={c.contractor_id}>
                              <td>{c.contractor_name}</td>
                              <td>{c.city}</td>
                              <td>₹{Number(c.rate || 0).toFixed(2)}</td>
                              <td>⭐{Number(c.rating || 0).toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  </div>
                )}

                {/* Rejected */}
                {event.type === "contractor_action" &&
                  event.details.status === "REJECTED" &&
                  event.details.contractor_remarks && (
                    <div className="wo-history-details wo-history-reject-reason">
                      <b>Rejection Reason:</b> {event.details.contractor_remarks}
                    </div>
                )}

                {/* Accepted */}
                {event.type === "contractor_action" &&
                  event.details.status === "ACCEPTED" && (
                    <div className="wo-history-details">
                      Contractor accepted the workorder
                      {event.details.contractor_remarks
                        ? ` — ${event.details.contractor_remarks}`
                        : ""}
                    </div>
                )}

                {/* Completed (from contractor_action) */}
                {event.type === "contractor_action" &&
                  event.details.status === "COMPLETED" &&
                  event.details.contractor_remarks && (
                    <div className="wo-history-details">
                      <b>Completion Notes:</b> {event.details.contractor_remarks}
                    </div>
                )}

                {/* Closed / Reopened / Withdrawn admin reason */}
                {(event.type === "closed" ||
                  event.type === "reopened" ||
                  event.type === "withdrawn") &&
                  (event.details.admin_remarks || event.details.reason) && (
                    <div className="wo-history-details">
                      <b>Reason:</b>{" "}
                      {event.details.admin_remarks || event.details.reason}
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WorkorderHistoryPage;