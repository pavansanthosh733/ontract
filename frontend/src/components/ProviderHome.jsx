import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FaUserCircle,
  FaBell,
  FaClipboardList,
  FaHome,
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import { useState, useRef, useEffect } from "react";
import "./css/ProviderHome.css";
import { apiGet } from "../api";
import { useUser } from "../context/UserContext";

function ProviderHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileNavRef = useRef(null);
  const [userName, setUserName] = useState("Provider");
  const [unreadCount, setUnreadCount] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const { user, loading } = useUser();

  const [gate, setGate] = useState({
    loading: true,
    allowed: false,
    reason_code: "",
    reason_message: "",
  });

  const allowedWhenRestricted = [
    "/provider_home/profile",
    "/provider_home/providerupdateprofile",
    "/provider_home/personal-details",
    "/provider_home/providerbankdetails",
    "/provider_home/notifications",
    "/provider_home/services",
  ];

  const isAllowedRouteWhenRestricted = allowedWhenRestricted.includes(location.pathname);
  const shouldBlockMainContent = !gate.loading && !gate.allowed && !isAllowedRouteWhenRestricted;

  useEffect(() => {
    const checkGate = async () => {
      if (loading || !user?.user_uid) return;

      try {
        const data = await apiGet(
          `/api/provider/provider_gate_status?user_uid=${user.user_uid}`
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
          reason_message: "Unable to verify provider access.",
        });
      }
    };

    checkGate();
  }, [user, loading]);

  useEffect(() => {
    if (!user || !user.user_uid) return;

    setUserName(user.name || user.email_id.split("@")[0]);
    setUserEmail(user.email_id);
  }, [user]);

  // Close both menus on any route change
  useEffect(() => {
    setNavOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!userEmail) return;

    const fetchUnreadCount = async () => {
      try {
        const data = await apiGet(
          `/api/unread_count?email=${encodeURIComponent(userEmail)}`
        );
        setUnreadCount(data.count || 0);
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [userEmail]);

  const handleLogout = () => {
    setNavOpen(false);
    setDropdownOpen(false);
    localStorage.removeItem("provider_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  /* Desktop dropdown behavior */
  const toggleDropdown = () => setDropdownOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Mobile anchored menu behavior */
  useEffect(() => {
    const handleClickOutsideMobile = (event) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target)) {
        setNavOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideMobile);
    return () => document.removeEventListener("mousedown", handleClickOutsideMobile);
  }, []);

  if (loading || gate.loading) return null;

  return (
    <div className="provider-dashboard-page d-flex flex-column">
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
        <div className="container-fluid px-4">
          <Link className="navbar-brand fw-bold text-primary d-flex align-items-center" to="/provider_home">
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

              <Link className="anchored-link" to="/provider_home" onClick={() => setNavOpen(false)}>
                <FaHome className="me-2" /> Home
              </Link>

              <Link
                className="anchored-link"
                to="/provider_home/notifications"
                onClick={() => setNavOpen(false)}
              >
                <FaBell className="me-2" /> Notifications
                {unreadCount > 0 && <span className="anchored-badge">{unreadCount}</span>}
              </Link>

              <Link
                className="anchored-link"
                to="/provider_home/providerupdateprofile"
                onClick={() => setNavOpen(false)}
              >
                <FaUserCircle className="me-2" /> Profile
              </Link>

              <Link
                className="anchored-link"
                to="/provider_home/workorders"
                onClick={() => setNavOpen(false)}
              >
                <FaClipboardList className="me-2" /> Work Orders
              </Link>

              <div className="anchored-divider"></div>

              <button className="anchored-link logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>

          {/* Desktop nav - unchanged, only visible on large screens */}
          <div className="collapse navbar-collapse d-none d-lg-flex" id="navbarNavDesktop">
            <ul className="navbar-nav ms-auto align-items-center">
              <li className="nav-item">
                <Link className="nav-link px-3" to="/provider_home">HOME</Link>
              </li>

              <li className="nav-item">
                <Link to="/provider_home/notifications" className="nav-link position-relative px-3">
                  <FaBell size={20} className="text-primary" />
                  <span
                    style={{
                      color: "red",
                      fontSize: "20px",
                      fontWeight: "bold",
                      marginLeft: "10px",
                    }}
                  >
                    {unreadCount}
                  </span>
                </Link>
              </li>

              <li className="nav-item dropdown ms-2" ref={dropdownRef}>
                <button
                  className="btn border-0 bg-transparent d-flex align-items-center gap-2"
                  onClick={toggleDropdown}
                >
                  <FaUserCircle size={32} className="text-primary" />
                  <span className="text-dark">{userName}</span>
                </button>

                {dropdownOpen && (
                  <ul className="dropdown-menu dropdown-menu-end show mt-2">
                    <li>
                      <Link
                        className="dropdown-item"
                        to="/provider_home/providerupdateprofile"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <FaUserCircle className="me-2" />Profile
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="dropdown-item"
                        to="/provider_home/workorders"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <FaClipboardList className="me-2" />Work Orders
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={handleLogout}>
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
          <div className="provider-access-notice">
            <h4>Access Restricted</h4>
            <p>{gate.reason_message}</p>
          </div>
        ) : (
          <Outlet />
        )}
      </div>

      <footer className="dashboard-footer">
        <div className="container-fluid px-4">
          <div className="footer-content">
            <p>© 2025 Ontract Services. All Rights Reserved.</p>
            <div className="footer-links">
              <a href="#">Help Center</a>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ProviderHome;