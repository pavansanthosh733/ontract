import React, { Suspense, useState, useEffect, lazy } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import './css/AdminApp.css';
import { Menu, X } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import LoadingScreen from './LoadingScreen';

const AdminDashboard = lazy(() => import('./AdminDashboard'));
const AdminStandardRate = lazy(() => import('./AdminStandardRate'));
const AdminHome = lazy(() => import('./AdminHome'));
const WorkOrderLayout = lazy(() => import('./workorders/WorkOrderLayout'));
const SetuppageLayout = lazy(() => import('./setuppgae/SetuppageLayout'));
const InvoiceCreate = lazy(() => import('./InvoiceCreate'));
const AdminNotifications = lazy(() => import('./AdminNotifications'));
const ContractorReport = lazy(() => import('./ContractorReport'));
const WorkorderReport = lazy(() => import('./WorkorderReport'));
const SummaryReport = lazy(() => import('./SummaryReport'));
const RateComparisonReport = lazy(() => import('./RateComparisonReport'));
const RegistrationPage = lazy(() => import('./AdminRegistration'));
const AdminUpdate = lazy(() => import('./AdminUpdate'));
const AIReport = lazy(() => import('./AiReport'));
const ManualAssignedWorkorders = lazy(() => import('./ManualAssignedWorkorders'));
const RFQ = lazy(() => import('./RFQ'));
const AdminRFQResponses = lazy(() => import('./AdminRFQResponses'));
const AdminRFQPublish = lazy(() => import('./AdminRFQPublish'));

function AdminApp({ admin, setAdmin }) {
  const {admin: ctxAdmin,loading,logoutAdmin,} = useAdmin();

  const navigate = useNavigate();

  const [activeLink, setActiveLink] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [rfqOpen, setRfqOpen] = useState(false);

  // 🔥 Get assigned modules from DB  ok
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
      setAuditOpen(false);
      setRfqOpen(false);

    };

    document.addEventListener('click', closeMenus);

    return () => {
      document.removeEventListener('click', closeMenus);
    };
  }, []);

  const handleLogout = async () => {
  try {
    await logoutAdmin();
  } finally {
    navigate("/admin/login");
  }
};

  const handleLinkClick = (link) => {
    setActiveLink(link);
    setMenuOpen(false);

    setRegistrationOpen(false);
    setReportsOpen(false);
    setAuditOpen(false);
    setRfqOpen(false);
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

        {/* Mobile Menu Toggle for */}
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={25} /> : <Menu size={25} />}
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
        HOME
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

  {/* Work Orders */}
  {hasModule('Work Orders') && (
    <li>
        <Link
          to="/admin/workorder"
          className={activeLink === 'workorders' ? 'active' : ''}
          onClick={() => handleLinkClick('workorders')}
        >
          Work Orders
        </Link>
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



  <li className="nav-item rfq-menu">
    <div className="nav-link-Home"
      onClick={(e) => {
        e.stopPropagation();
        setRegistrationOpen(false);
        setReportsOpen(false);
        setAuditOpen(false);
        setRfqOpen(!rfqOpen);
      }}
    > RFQ
    </div>

    <ul className={`reports-dropdown ${rfqOpen ? "open" : ""}`}>
      <li>
        <Link
          to="/admin/rfq"
          onClick={() => handleLinkClick("rfq_create")}
        >
          Create RFQ
        </Link>
      </li>
      <li>
        <Link
          to="/admin/rfq/publish"
          onClick={() => handleLinkClick("rfq_responses")}
        > RFQ Publish
        </Link>
      </li>
      <li>
        <Link
          to="/admin/rfq/responses"
          onClick={() => handleLinkClick("rfq_responses")}
        > Responses
        </Link>
      </li>
    </ul>
  </li>

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

  {/* Audit Dropdown */}
<li className="nav-item audit-menu">
  <div
    className="nav-link-Home"
    onClick={(e) => {
      e.stopPropagation();

      setRegistrationOpen(false);
      setReportsOpen(false);

      setAuditOpen(!auditOpen);
    }}
  >
    Audit
  </div>

  <ul className={`reports-dropdown ${auditOpen ? 'open' : ''}`}>
    <li>
      <Link
        to="/admin/audit/manual-assigned-workorders"
        onClick={() =>
          handleLinkClick('manual_assigned_workorders')
        }
      >
        Manual Assigned Workorders
      </Link>
    </li>
  </ul>
</li>

  {/* Reports Dropdown */}
  {hasModule('Reports') && (
    <li className="nav-item reports-menu">
      <div
        className="nav-link-Home"
        onClick={(e) => {
          e.stopPropagation();

          setRegistrationOpen(false);

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
                <li>
          <Link
            to="/admin/reports/aireport"
            onClick={() => handleLinkClick('aireport')}
          >
            Prompt Based Reports
          </Link>
        </li>
      </ul>
    </li>
  )}

  {/* Logout  route*/}
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
        <Suspense fallback={<LoadingScreen message="Loading admin page..." />}>
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
            path="/rfq"
            element={<RFQ />}
          />
          <Route path="/rfq/publish"
                 element={<AdminRFQPublish />}
          />
          <Route
              path="/rfq/responses"
              element={<AdminRFQResponses />}
          />

          <Route
            path="/adminnotifications"
            element={<AdminNotifications />}
          />
          <Route
            path="audit/manual-assigned-workorders"
            element={<ManualAssignedWorkorders />}
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
            path="/reports/aireport"
            element={<AIReport />}
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
        </Suspense>
      </div>
    </div>
  );
}

export default AdminApp;