// src/pages/CompanyApp.jsx
import React, { useEffect, useState, useRef } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { FaUserCircle, FaBell, FaClipboardList } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "./css/CompanyApp.css";

import { BASE_URLS ,apiGet} from "../../api";
import { useContractor } from "../../context/ContractorContext";


function CompanyApp() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userName, setUserName] = useState("Company");

  const { contractor, logoutContractor, loading } = useContractor();


  /* =========================
     GLOBAL DEBUG LOGS
     ========================= */
  console.group("🏢 CompanyApp Render");
//   console.log("Context loading:", loading);
// console.log("Context contractor:", contractor);
// console.log("LocalStorage contractor:", localStorage.getItem("contractor"));

  console.groupEnd();

  /* =========================
     AUTH GUARD
     ========================= */
  useEffect(() => {
  console.group("🔐 CompanyApp Auth Check");

  if (loading) {
    // console.log("⏳ Waiting for UserContext...");
    console.groupEnd();
    return;
  }

  // 🚨 THIS IS THE FIX
if (!contractor) {
  //  console.log("⏳ contractor value not came ");
  // logoutContractor();
  // navigate("/contractor/login", { replace: true });
  return;
}


  // console.log("✅ Contractor authenticated:", contractor.company_name);
  console.groupEnd();
}, [contractor, loading, navigate, logoutContractor]);

  /* =========================
     USER DISPLAY NAME
     ========================= */
  useEffect(() => {
    console.group("👤 Load Company Name");

    if (contractor?.company_name) {
      setUserName(contractor.company_name);
      // console.log("Company name set:", contractor.company_name);
    } else {
      setUserName("Company");
      console.warn("Company name missing, using default");
    }

    console.groupEnd();
  }, [contractor]);

  const email = contractor?.email_id;

  /* =========================
     NOTIFICATIONS
     ========================= */
  const fetchUnreadCount = async () => {
  if (!email) {
    console.warn("Unread count skipped → email missing");
    return;
  }

  console.group("🔔 Fetch Unread Notifications");
  console.log("Email:", email);

  try {
    const data = await apiGet(
      `/api/contractor/contractor_unread_count?email=${encodeURIComponent(email)}`
    );

    // console.log("Unread count response:", data);
    setUnreadCount(data?.count || 0);
  } catch (err) {
    console.error("Unread count error:", err.message);
  }

  console.groupEnd();
};


  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [email]);

  /* =========================
     LOGOUT
     ========================= */
 const handleLogout = () => {
  console.group("🚪 Logout");
  // console.log("Logging out contractor:", contractor);
  logoutContractor();
  navigate("/contractor/login", { replace: true });
  console.groupEnd();
};


  /* =========================
     DROPDOWN BEHAVIOR
     ========================= */
  const toggleDropdown = () => setDropdownOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    // console.log("⏳ CompanyApp waiting for context...");
    return null;
  }

  /* =========================
     RENDER
     ========================= */
  return (
    <div className="company-dashboard-page d-flex flex-column">
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
  <div className="container-fluid px-4">

    {/* LOGO */}
    <Link
      className="navbar-brand fw-bold text-primary d-flex align-items-center"
      to="/contractor/dashboard/companydashboardhome"
    >
      <div className="brand-icon">OS</div>
      <span className="ms-2">Ontract Services</span>
    </Link>

    {/* 🔥 MOBILE TOGGLER BUTTON */}
    <button
      className="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#contractorNavbar"
      aria-controls="contractorNavbar"
      aria-expanded="false"
    >
      <span className="navbar-toggler-icon"></span>
    </button>

    {/* 🔥 COLLAPSIBLE MENU */}
    <div className="collapse navbar-collapse" id="contractorNavbar">
      <ul className="navbar-nav ms-auto align-items-center">

        <li className="nav-item">
          <Link className="nav-link px-3" to="/contractor/dashboard/companydashboardhome">
            Home
          </Link>
        </li>

        <li className="nav-item">
          <Link
            to="/contractor/dashboard/notifications"
            className="nav-link position-relative px-3"
          >
            <FaBell size={20} className="text-primary" />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </Link>
        </li>

        <li className="nav-item dropdown ms-2" ref={dropdownRef}>
          <button
            className="btn border-0 bg-transparent d-flex align-items-center gap-2"
            onClick={toggleDropdown}
          >
            <FaUserCircle size={32} className="text-primary" />
            <span className="d-none d-lg-inline text-dark">
              {userName}
            </span>
          </button>

          {dropdownOpen && (
            <ul className="dropdown-menu dropdown-menu-end show mt-2">
              <li>
                <Link
                  className="dropdown-item"
                  to="/contractor/dashboard/updatecompanyprofile"
                >
                  Profile
                </Link>
              </li>
              <li>
                <Link
                  className="dropdown-item"
                  to="/contractor/dashboard/services"
                >
                  Services
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button
                  className="dropdown-item text-danger"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </li>
            </ul>
          )}
        </li>

      </ul>
    </div>

  </div>
</nav>

      {/* MAIN CONTENT */}
      <div className="dashboard-content container-fluid mt-4 flex-grow-1">
        <Outlet context={{ email, refreshNotifications: fetchUnreadCount }} />
      </div>

      {/* FOOTER */}
      <footer className="dashboard-footer">
        <div className="container-fluid px-4">
          <p>© 2025 Ontract Services. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default CompanyApp;
