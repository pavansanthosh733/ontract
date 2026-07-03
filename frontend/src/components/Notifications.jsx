import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api";
import { useUser } from "../context/UserContext";

function Notifications() {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("unread");

  useEffect(() => {
    if (userLoading || !user?.email_id) return;

    fetchNotifications();
  }, [userLoading, user]);

  // --------------------------
  // FETCH NOTIFICATIONS
  // --------------------------
  console.log("Notifications user:", user);
  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const res = await apiGet(
        `/api/notifications?email=${encodeURIComponent(user.email_id)}`
      );

      setNotifications(res.data || res);
    } catch (err) {
      console.error("NOTIFICATION ERROR:", err);
      setError("Error fetching notifications");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------
  // MARK AS READ
  // --------------------------
  const markAsRead = async (messageId) => {
    try {
      const response = await apiPost("/api/mark_read", {
        message_id: messageId,
      });

      if (response) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.message_id === messageId
              ? {
                  ...n,
                  is_read: true,
                  read_at: new Date().toISOString(),
                }
              : n
          )
        );
      }
    } catch (err) {
      console.error("Error marking notification:", err);
    }
  };

  // --------------------------
  // OPEN NOTIFICATION
  // --------------------------
  const openNotification = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif.message_id);
    }
    const match = notif.message.match(/Work Order\s+(\S+)/);
    const workorderId = match ? match[1] : null;
    console.log("Work Order ID:", workorderId);
    if (notif.action_url) {
      navigate(notif.action_url, {
        state: {
          workorderId,
          openDetails: true,
        },
      });
    }
  };

  // --------------------------
  // MARK ALL
  // --------------------------
  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);

    for (const notif of unread) {
      await markAsRead(notif.message_id);
    }
  };

  // --------------------------
  // FILTERS
  // --------------------------
  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);

  const displayedNotifications =
    activeTab === "unread"
      ? unreadNotifications
      : readNotifications;

  // --------------------------
  // COLORS
  // --------------------------
  const getTypeClass = (type) => {
    switch (type) {
      case "approval":
        return "text-success";

      case "rejection":
        return "text-danger";

      case "bank_submitted":
        return "text-info";

      case "workorder_assigned":
        return "text-primary";

      case "workorder_completed":
        return "text-success";

      case "message":
        return "text-warning";

      default:
        return "text-secondary";
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        Loading notifications...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger mt-5">
        {error}
      </div>
    );
  }

  return (
    <div className="container mt-4">

      <h2 className="fw-bold mb-4">Notifications</h2>

      <div className="d-flex justify-content-between align-items-center mb-4">

        <ul className="nav nav-pills m-0">

          <li className="nav-item me-2">
            <button
              className={`btn ${
                activeTab === "unread"
                  ? "btn-primary"
                  : "btn-outline-primary"
              }`}
              onClick={() => setActiveTab("unread")}
            >
              🔴 Unread ({unreadNotifications.length})
            </button>
          </li>

          <li className="nav-item">
            <button
              className={`btn ${
                activeTab === "read"
                  ? "btn-success"
                  : "btn-outline-success"
              }`}
              onClick={() => setActiveTab("read")}
            >
              ✅ Read ({readNotifications.length})
            </button>
          </li>

        </ul>

        {activeTab === "unread" &&
          unreadNotifications.length > 0 && (
            <button
              className="btn btn-outline-primary"
              onClick={markAllAsRead}
            >
              ✓ Mark All as Read
            </button>
          )}

      </div>


      {displayedNotifications.length === 0 ? (
        <div className="alert alert-info text-center">
          No {activeTab} notifications.
        </div>
      ) : (
        <div className="list-group">

          {displayedNotifications.map((notif) => (

            <div
              key={notif.message_id}
              className={`list-group-item shadow-sm mb-3 rounded ${
                !notif.is_read
                  ? "list-group-item-warning"
                  : ""
              }`}
            >

              <div className="d-flex justify-content-between align-items-start">

                <div>

                  <h5
                    className={`fw-bold ${getTypeClass(
                      notif.notification_type
                    )}`}
                  >
                    {notif.title || notif.notification_type}
                  </h5>

                  <p className="mb-2">
                    {notif.message}
                  </p>

                </div>

                <small className="text-muted">
                  {new Date(notif.sent_at).toLocaleString()}
                </small>

              </div>

              <div className="d-flex gap-2 mt-2">

                {!notif.is_read && (
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() =>
                      markAsRead(notif.message_id)
                    }
                  >
                    Mark as Read
                  </button>
                )}

                {notif.action_url && (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => openNotification(notif)}
                  >
                    View
                  </button>
                )}

              </div>

            </div>

          ))}

        </div>
      )}

    </div>
  );
}

export default Notifications;