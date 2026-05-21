import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import './css/AdminApp.css';
import AdminStandardRate from './AdminStandardRate';
import AdminHome from './AdminHome';
import { Menu, X } from 'lucide-react';
import WorkOrderLayout from './workorders/WorkOrderLayout';
import SetuppageLayout from './setuppgae/SetuppageLayout';
import InvoiceCreate from './InvoiceCreate';
import AdminNotifications from './AdminNotifications';
import { useAdmin } from '../context/AdminContext';
import ContractorReport from './ContractorReport';
import WorkorderReport from './WorkorderReport';
import SummaryReport from './SummaryReport';
import RateComparisonReport from './RateComparisonReport';
import RegistrationPage from './AdminRegistration';
import AdminUpdate from './AdminUpdate';

function AdminApp({ admin, setAdmin }) {
  const { admin: ctxAdmin, loading } = useAdmin();

  const navigate = useNavigate();

  const [activeLink, setActiveLink] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [workorderOpen, setWorkorderOpen] = useState(false);

  // 🔥 Get assigned modules from DB
  const modules = ctxAdmin?.modules
   ? ctxAdmin.modules.split(",").map((m) => m.trim())
   : [];

 const hasModule = (moduleName) => modules.includes(moduleName);

 

  // 🔥 Login check
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // 🔥 Close dropdowns on outside click
  useEffect(() => {
    const closeMenus = () => {
      setRegistrationOpen(false);
      setReportsOpen(false);
      setWorkorderOpen(false);
    };

    document.addEventListener('click', closeMenus);

    return () => {
      document.removeEventListener('click', closeMenus);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin');
    setAdmin(null);
    navigate('/admin/login');
  };

  const handleLinkClick = (link) => {
    setActiveLink(link);
    setMenuOpen(false);

    setRegistrationOpen(false);
    setReportsOpen(false);
    setWorkorderOpen(false);
  };

  if (loading) return null;

  return (
    <div className="admin-app">
      {/* =========================================
          TOP NAVBAR
      ========================================= */}
      <nav className="admin-navbar">
        <div className="nav-left">
          <h3 className="nav-title">Admin Portal</h3>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* =========================================
            NAVIGATION LINKS
        ========================================= */}
        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>

  {/* Home */}
  {hasModule('Home') && (
    <li>
      <Link
        to="/admin/home"
        className={activeLink === 'home' ? 'active' : ''}
        onClick={() => handleLinkClick('home')}
      >
        Home
      </Link>
    </li>
  )}

  {/* Registration Dropdown */}
  {hasModule('Registration') && (
    <li className="nav-item registration-menu">
      <div
        className="nav-link-Home"
        onClick={(e) => {
          e.stopPropagation();

          setReportsOpen(false);
          setWorkorderOpen(false);

          setRegistrationOpen(!registrationOpen);
        }}
      >
        Registration
      </div>

      <ul className={`reports-dropdown ${registrationOpen ? 'open' : ''}`}>
        <li>
          <Link
            to="/admin/registration"
            onClick={() => handleLinkClick('registration')}
          >
            New Registration
          </Link>
        </li>

        <li>
          <Link
            to="/admin/update-user"
            onClick={() => handleLinkClick('update_user')}
          >
            Update User
          </Link>
        </li>
      </ul>
    </li>
  )}

  {/* Set Up page */}
  {hasModule('Set Up page') && (
    <li>
      <Link
        to="/admin/setuppage"
        className={activeLink === 'setuppage' ? 'active' : ''}
        onClick={() => handleLinkClick('setuppage')}
      >
        Set Up page
      </Link>
    </li>
  )}

  {/* Work Orders Dropdown */}
  {hasModule('Work Orders') && (
    <li className="nav-item workorder-menu">
      <div
        className="nav-link-Home"
        onClick={(e) => {
          e.stopPropagation();

          setRegistrationOpen(false);
          setReportsOpen(false);

          setWorkorderOpen(!workorderOpen);
        }}
      >
        Work Orders
      </div>

      <ul className={`reports-dropdown ${workorderOpen ? 'open' : ''}`}>
        <li>
          <Link
            to="/admin/workorder"
            onClick={() => handleLinkClick('service_workorder')}
          >
            Service Workorder
          </Link>
        </li>

        <li>
          <Link
            to="/admin/workorder/product-workorder"
            onClick={() => handleLinkClick('product_workorder')}
          >
            Product Workorder
          </Link>
        </li>
      </ul>
    </li>
  )}

  {/* Invoice */}
  {hasModule('Invoice') && (
    <li>
      <Link
        to="/admin/invoice"
        className={activeLink === 'invoice' ? 'active' : ''}
        onClick={() => handleLinkClick('invoice')}
      >
        Invoice
      </Link>
    </li>
  )}

  {/* Standard Rate */}
  {hasModule('Standard Rate') && (
    <li>
      <Link
        to="/admin/standard_rate"
        className={activeLink === 'standard_rate' ? 'active' : ''}
        onClick={() => handleLinkClick('standard_rate')}
      >
        Standard Rate
      </Link>
    </li>
  )}

  {/* Management */}
  {hasModule('Management') && (
    <li>
      <Link
        to="/admin/admindashboard"
        className={activeLink === 'management' ? 'active' : ''}
        onClick={() => handleLinkClick('management')}
      >
        Management
      </Link>
    </li>
  )}

  {/* Notifications */}
  {hasModule('Notifications') && (
    <li>
      <Link
        to="/admin/adminnotifications"
        className={activeLink === 'notification' ? 'active' : ''}
        onClick={() => handleLinkClick('notification')}
      >
        Notifications
      </Link>
    </li>
  )}

  {/* Reports Dropdown */}
  {hasModule('Reports') && (
    <li className="nav-item reports-menu">
      <div
        className="nav-link-Home"
        onClick={(e) => {
          e.stopPropagation();

          setRegistrationOpen(false);
          setWorkorderOpen(false);

          setReportsOpen(!reportsOpen);
        }}
      >
        REPORTS
      </div>

      <ul className={`reports-dropdown ${reportsOpen ? 'open' : ''}`}>
        <li>
          <Link
            to="/admin/reports/contractor"
            onClick={() => handleLinkClick('contractor_report')}
          >
            Contractor Report
          </Link>
        </li>

        <li>
          <Link
            to="/admin/reports/workorder"
            onClick={() => handleLinkClick('workorder_report')}
          >
            Workorder Report
          </Link>
        </li>

        <li>
          <Link
            to="/admin/reports/summary"
            onClick={() => handleLinkClick('summary_report')}
          >
            Summary Report
          </Link>
        </li>

        <li>
          <Link
            to="/admin/reports/rate-comparison"
            onClick={() => handleLinkClick('rate_comparison')}
          >
            Rate Comparison Report
          </Link>
        </li>
      </ul>
    </li>
  )}

  {/* Logout */}
  <li>
    <button
      className="logout-btn"
      onClick={handleLogout}
    >
      Logout
    </button>
  </li>

</ul>
      </nav>

      {/* =========================================
          PAGE CONTENT
      ========================================= */}
      <div className="admin-content">
        <Routes>
          <Route
            path="/home"
            element={<AdminHome admin={admin} setAdmin={setAdmin} />}
          />

          <Route
            path="/workorder/*"
            element={<WorkOrderLayout />}
          />

          <Route
            path="/setuppage/*"
            element={<SetuppageLayout />}
          />

          <Route
            path="/standard_rate"
            element={<AdminStandardRate admin={admin} setAdmin={setAdmin} />}
          />

          <Route
            path="/admindashboard"
            element={<AdminDashboard admin={admin} setAdmin={setAdmin} />}
          />

          <Route
            path="/invoice"
            element={<InvoiceCreate />}
          />

          <Route
            path="/adminnotifications"
            element={<AdminNotifications />}
          />

          <Route
            path="/reports/contractor"
            element={<ContractorReport />}
          />

          <Route
            path="/reports/workorder"
            element={<WorkorderReport />}
          />

          <Route
            path="/reports/summary"
            element={<SummaryReport />}
          />

          <Route
            path="/reports/rate-comparison"
            element={<RateComparisonReport />}
          />

          <Route
            path="/registration"
            element={<RegistrationPage />}
          />

          <Route
            path="/update-user"
            element={<AdminUpdate />}
          />
        </Routes>
      </div>
    </div>
  );
}

export default AdminApp;