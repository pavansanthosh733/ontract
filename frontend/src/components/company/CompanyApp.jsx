// src/pages/CompanyApp.jsx
import React, { useEffect, useState, useRef } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { FaUserCircle, FaBell, FaClipboardList, FaHome } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "./css/CompanyApp.css";

import { BASE_URLS, apiGet } from "../../api";
import { useContractor } from "../../context/ContractorContext";

function CompanyApp() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const mobileNavRef = useRef(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userName, setUserName] = useState("Company");
  const [navOpen, setNavOpen] = useState(false);

  const { contractor, logoutContractor, loading } = useContractor();

  const [gate, setGate] = useState({
    loading: true,
    allowed: false,
    reason_code: "",
    reason_message: "",
  });
  const location = useLocation();

  const allowedWhenRestricted = [
    "/contractor/dashboard/updatecompanyprofile",
    "/contractor/dashboard/contractorbankdetails",
    "/contractor/dashboard/contractor-personal-details",
    "/contractor/dashboard/notifications",
    "/contractor/dashboard/profile",
    "/contractor/dashboard/services",
  ];

  const isAllowedRouteWhenRestricted = allowedWhenRestricted.includes(
    location.pathname
  );

  const shouldBlockMainContent = !gate.loading && !gate.allowed && !isAllowedRouteWhenRestricted;

  useEffect(() => {
    const checkGate = async () => {
      if (loading || !contractor?.user_uid) return;

      try {
        const data = await apiGet(
          `/api/contractor/contractor_gate_status?user_uid=${contractor.user_uid}`
        );

        setGate({
          loading: false,
          allowed: !!data?.allowed,
          reason_code: data?.reason_code || "",
          reason_message: data?.reason_message || "",
        });
      } catch (err) {
        setGate({
          loading: false,
          allowed: false,
          reason_code: "GATE_CHECK_FAILED",
          reason_message: "Unable to verify contractor access.",
        });
      }
    };

    checkGate();
  }, [contractor, loading]);

  /* =========================
     AUTH GUARD
     ========================= */
  useEffect(() => {
    if (loading) return;
    if (!contractor) {
      return;
    }
  }, [contractor, loading, navigate, logoutContractor]);

  /* =========================
     USER DISPLAY NAME
     ========================= */
  useEffect(() => {
    if (contractor?.company_name) {
      setUserName(contractor.company_name);
    } else {
      setUserName("Company");
    }
  }, [contractor]);

  const email = contractor?.email_id;

  /* =========================
     NOTIFICATIONS
     ========================= */
  const fetchUnreadCount = async () => {
    if (!email) return;

    try {
      const data = await apiGet(
        `/api/contractor/contractor_unread_count?email=${encodeURIComponent(email)}`
      );
      setUnreadCount(data?.count || 0);
    } catch (err) {
      console.error("Unread count error:", err.message);
    }
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
    setNavOpen(false);
    setDropdownOpen(false);
    logoutContractor();
    navigate("/contractor/login", { replace: true });
  };

  // Close both menus on any route change
  useEffect(() => {
    setNavOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  /* =========================
     DESKTOP DROPDOWN BEHAVIOR
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

  /* =========================
     MOBILE ANCHORED MENU BEHAVIOR
     ========================= */
  useEffect(() => {
    const handleClickOutsideMobile = (e) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target)) {
        setNavOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideMobile);
    return () => document.removeEventListener("mousedown", handleClickOutsideMobile);
  }, []);

  if (loading) {
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

          {/* MOBILE TOGGLER + ANCHORED DROPDOWN */}
          <div className="position-relative d-inline-block d-lg-none" ref={mobileNavRef}>
            <button
              className="navbar-toggler"
              type="button"
              onClick={() => setNavOpen((prev) => !prev)}
              aria-expanded={navOpen}
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            <div className={`mobile-anchored-menu ${navOpen ? "open" : ""}`}>
              <div className="anchored-user-block">
                <FaUserCircle size={28} className="text-primary" />
                <span className="ms-2 fw-semibold">{userName}</span>
              </div>

              <div className="anchored-divider"></div>

              <Link
                className="anchored-link"
                to="/contractor/dashboard/companydashboardhome"
                onClick={() => setNavOpen(false)}
              >
                <FaHome className="me-2" /> Home
              </Link>

              <Link
                className="anchored-link"
                to="/contractor/dashboard/notifications"
                onClick={() => setNavOpen(false)}
              >
                <FaBell className="me-2" /> Notifications
                {unreadCount > 0 && (
                  <span className="anchored-badge">{unreadCount}</span>
                )}
              </Link>

              <Link
                className="anchored-link"
                to="/contractor/dashboard/updatecompanyprofile"
                onClick={() => setNavOpen(false)}
              >
                <FaUserCircle className="me-2" /> Profile
              </Link>

              <Link
                className="anchored-link"
                to="/contractor/dashboard/services"
                onClick={() => setNavOpen(false)}
              >
                <FaClipboardList className="me-2" /> Services
              </Link>

              <div className="anchored-divider"></div>

              <button className="anchored-link logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>

          {/* DESKTOP NAV - unchanged, only visible on large screens */}
          <div className="collapse navbar-collapse d-none d-lg-flex" id="contractorNavbarDesktop">
            <ul className="navbar-nav ms-auto align-items-center">

              <li className="nav-item">
                <Link
                  className="nav-link px-3"
                  to="/contractor/dashboard/companydashboardhome"
                >
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
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="dropdown-item"
                        to="/contractor/dashboard/services"
                        onClick={() => setDropdownOpen(false)}
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

      <div className="dashboard-content container-fluid mt-4 flex-grow-1">
        {shouldBlockMainContent ? (
          <div className="contractor-access-notice">
            <h4>Access Restricted</h4>
            <p>{gate.reason_message}</p>
          </div>
        ) : (
          <Outlet context={{ email, refreshNotifications: fetchUnreadCount }} />
        )}
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