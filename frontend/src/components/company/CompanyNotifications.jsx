// src/components/NotificationsPage.jsx
import React from "react";
import { useOutletContext } from "react-router-dom";
import Notifications from "../Notifications";

function CompanyNotifications() {
  const { email, contractor } = useOutletContext();
  const userEmail = contractor?.email_id || email; // safe fallback


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Notifications
        user={{ email: userEmail }} 
        apiPrefix="/api/contractor" 
        endpoints={{
          list: "contractor_notifications",
          unread: "contractor_unread_count",
          markRead: "contractor_mark_read"
        }}

      />
    </div>
  );
}

export default CompanyNotifications;