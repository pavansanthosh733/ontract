// src/pages/CompanyDashboardHome.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaClipboardList,
  FaDollarSign,
  FaArrowUp,
  FaCheckCircle,
  FaBuilding,
  FaMapMarkerAlt,
  FaTools,
} from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./css/CompanyDashboardHome.css";

import { apiGet, apiPost } from "../../api";
import { useContractor } from "../../context/ContractorContext";
import { useNavigate } from "react-router-dom";



function CompanyDashboardHome() {
const { contractor, loading } = useContractor();


  const companyName = contractor?.company_name || "Your Company";

  const [completedOrders, setCompletedOrders] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();
  const [serviceCoverage, setServiceCoverage] = useState({
    regions: [],
    services: [],
  });

  const stats = {
    activeProjects: 0,
  };

  /* =========================
     DEBUG
     ========================= */
  console.group("🏢 CompanyDashboardHome");
  console.log("Loading:", loading);
  console.log("contractor from context:", contractor);
  console.groupEnd();

  /* =========================
     LOAD DASHBOARD DATA
     ========================= */

  useEffect(() => {
  if (loading) return;

  if (!contractor) {
    console.log("🚫 Contractor not authenticated, redirecting...");
    navigate("/contractor/login");
  }
}, [contractor, loading, navigate]);
     
  useEffect(() => {
    if (loading) {
      console.log("⏳ Waiting for context...");
      return;
    }

    if (!contractor || !contractor.user_uid) {
      console.warn("❌ user_uid missing in user object");
      return;
    }

    console.log("✅ Using user_uid:", contractor.user_uid);

    fetchCompletedOrders(contractor.user_uid);
    fetchServiceCoverageDetails(contractor.user_uid);
    fetchPendingWorkOrders();
  }, [contractor, loading]);

  /* =========================
     API CALLS (SAME AS PROVIDER)
     ========================= */
  const fetchCompletedOrders = async (userUid) => {
    try {
      const data = await apiGet(
        `/api/dashboard/completed-orders?user_uid=${userUid}`
      );
      setCompletedOrders(data?.completed_orders || 0);
    } catch (err) {
      console.error("❌ Failed to fetch completed orders:", err.message);
    }
  };

  const fetchServiceCoverageDetails = async (userUid) => {
    try {
      const data = await apiGet(
        `/api/dashboard/service-coverage-details?user_uid=${userUid}`
      );

      if (data?.success) {
        setServiceCoverage({
          regions: data.regions || [],
          services: data.services || [],
        });
      }
    } catch (err) {
      console.error("❌ Failed to fetch service coverage:", err.message);
    }
  };
  
   const fetchPendingWorkOrders = async () => {
      try {
        const response = await apiPost(
          "/api/workorders/provider/workorders/pending",
          {
            provider_id: contractor.user_uid,
          }
        );

        if (Array.isArray(response)) {
          setPendingCount(response.length);
        } else if (Array.isArray(response.data)) {
          setPendingCount(response.data.length);
        } else if (Array.isArray(response.workorders)) {
          setPendingCount(response.workorders.length);
        } else {
          setPendingCount(response.count || 0);
        }
      } catch (err) {
        console.error("Failed to fetch pending work orders:", err);
      }
    };
  /* =========================
     STATIC CHART DATA
     ========================= */
  const revenueData = [
    { month: "Jun", revenue: 76800 },
    { month: "Jul", revenue: 78500 },
    { month: "Aug", revenue: 80200 },
    { month: "Sep", revenue: 81500 },
    { month: "Oct", revenue: 83200 },
    { month: "Nov", revenue: 84500 },
  ];

  if (loading) return null;

  /* =========================
     RENDER the output
     ========================= */
  return (
    <div className="company-dashboard-home">
      {/* WELCOME */}
      <div className="welcome-section mb-4">
        <h2 className="fw-bold">Welcome, {companyName} 👋</h2>
        <p className="text-muted">
          Here’s a quick overview of your business performance:
        </p>
   {  /*   <Link to="/contractor/dashboard/Invoice" className="workorder-pill">
          <FaClipboardList className="me-2" />
          Invoice
        </Link>  */ }
        <Link to="/contractor/dashboard/rating" className="workorder-pill">
          <FaClipboardList className="me-2" />
          Rating Section
        </Link>

        <Link to="/contractor/dashboard/companyworkorders" className="workorder-pill">
          <FaClipboardList className="me-2" />WorkOrders
          <span
            className="badge bg-danger ms-2"
            style={{ fontSize: "12px" }}
          >
            {pendingCount}
          </span>
        </Link>
      </div>

      {/* METRICS */}
      <div className="metrics-grid mb-4">
        <div className="metric-card revenue-card">
          <div className="metric-icon bg-primary text-white">
            <FaDollarSign />
          </div>
          <div className="metric-details">
            <h5>Monthly Revenue</h5>
            <h3>$0</h3>
            <p className="text-success mb-0">
              <FaArrowUp className="me-1" /> 9.2% growth
            </p>
          </div>
        </div>

        <div className="metric-card projects-card">
          <div className="metric-icon bg-info text-white">
            <FaClipboardList />
          </div>
          <div className="metric-details">
            <h5>Active Projects</h5>
            <h3>{stats.activeProjects}</h3>
            <p className="text-muted mb-0">Currently in progress</p>
          </div>
        </div>

        <div className="metric-card completed-card">
          <div className="metric-icon bg-warning text-white">
            <FaCheckCircle />
          </div>
          <div className="metric-details">
            <h5>Completed Orders</h5>
            <h3>{completedOrders}</h3>
            <p className="text-muted mb-0">Total lifetime completions</p>
          </div>
        </div>
      </div>

      {/* CHART + SERVICE COVERAGE */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="dashboard-card">
            <div className="card-header-custom">
              <h5>Revenue Overview</h5>
            </div>
            <div className="card-body-custom">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0d6efd"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="dashboard-card">
            <div className="card-header-custom">
              <h5>Service Coverage</h5>
            </div>
            <div className="card-body-custom">
              {/* Regions */}
              <div className="service-stat-item">
                <FaMapMarkerAlt className="me-2 text-primary" />
                <div>
                  <p className="fw-bold mb-1">Service Regions</p>
                  {serviceCoverage.regions.length > 0 ? (
                    <ul>
                      {serviceCoverage.regions.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">No regions found</p>
                  )}
                </div>
              </div>

              {/* Services */}
              <div className="service-stat-item mt-3">
                <FaTools className="me-2 text-success" />
                <div>
                  <p className="fw-bold mb-1">Active Services</p>
                  {serviceCoverage.services.length > 0 ? (
                    <ul>
                      {serviceCoverage.services.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">No services found</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="dashboard-card p-4">
        <div className="d-flex align-items-center mb-2">
          <FaBuilding className="me-2 text-primary" />
          <h5 className="mb-0">Business Summary</h5>
        </div>
        <p className="text-muted">
          {companyName} has successfully completed {completedOrders} orders
          across multiple regions with active service coverage.
        </p>
      </div>
    </div>
  );
}

export default CompanyDashboardHome;