import React, { useEffect, useState } from "react";
import {
  FaMapMarkerAlt,
  FaTools,
  FaDollarSign,
  FaClock,
  FaCheckCircle,
  FaUsers,
  FaArrowUp,
  FaEye,
  FaClipboardList,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Link } from "react-router-dom";
import { apiGet } from "../api";
import { useUser } from "../context/UserContext";
import "./css/ProviderHome.css";

function ProviderDashboardHome() {
  const { user } = useUser();
  const [completedOrders, setCompletedOrders] = useState(0);
  const [serviceCoverage, setServiceCoverage] = useState({
    regions: [],
    services: [],
  });

  const stats = {
    monthlyRevenue: 0,
    revenueGrowth: 0,
    activeClients: 0,
  };

  const revenueData = [
    { month: "Jun", revenue: 38500 },
    { month: "Jul", revenue: 41200 },
    { month: "Aug", revenue: 39800 },
    { month: "Sep", revenue: 43500 },
    { month: "Oct", revenue: 44100 },
    { month: "Nov", revenue: 45280 },
  ];

  useEffect(() => {
    if (!user?.user_uid) return;

    const fetchCompletedOrders = async () => {
      try {
        const data = await apiGet(`/api/dashboard/completed-orders?user_uid=${user.user_uid}`);
        setCompletedOrders(data?.completed_orders || 0);
      } catch (err) {
        console.error("Failed to load completed orders:", err.message);
      }
    };

    const fetchServiceCoverageDetails = async () => {
      try {
        const data = await apiGet(`/api/dashboard/service-coverage-details?user_uid=${user.user_uid}`);
        if (data?.success) {
          setServiceCoverage({
            regions: data.regions || [],
            services: data.services || [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch service coverage details:", err.message);
      }
    };

    fetchCompletedOrders();
    fetchServiceCoverageDetails();
  }, [user]);

  return (
    <main className="dashboard-container">
      <div className="container-fluid px-4 py-4">
        <div className="welcome-section mb-4">
          <div>
            <h2 className="welcome-title">Welcome</h2>
            <p className="welcome-subtitle">Here's what's happening with your business today</p>
          </div>
          <div className="quick-actions d-none d-md-flex gap-3">
            <Link to="/provider_home/workorders" className="btn btn-primary btn-action">
              <FaClipboardList className="me-2" /> WORK ORDERS
            </Link>
          </div>
        </div>

        <div className="metrics-grid mb-4">
          <div className="metric-card revenue-card">
            <div className="metric-icon-wrapper revenue-icon">
              <FaDollarSign />
            </div>
            <div className="metric-content">
              <p className="metric-label">Monthly Revenue</p>
              <h3 className="metric-value">${stats.monthlyRevenue.toLocaleString()}</h3>
              <div className="metric-change positive">
                <FaArrowUp size={12} />
                <span>{stats.revenueGrowth}% from last month</span>
              </div>
            </div>
          </div>

          <div className="metric-card clients-card">
            <div className="metric-icon-wrapper clients-icon">
              <FaUsers />
            </div>
            <div className="metric-content">
              <p className="metric-label">Active Clients</p>
              <h3 className="metric-value">{stats.activeClients}</h3>
              <p className="metric-subtext">Businesses served this month</p>
            </div>
          </div>

          <div className="metric-card completed-card">
            <div className="metric-icon-wrapper completed-icon">
              <FaCheckCircle />
            </div>
            <div className="metric-content">
              <p className="metric-label">Completed Orders</p>
              <h3 className="metric-value">{completedOrders}</h3>
              <p className="metric-subtext">Total lifetime completions</p>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-lg-8">
            <div className="dashboard-card">
              <div className="card-header-custom">
                <div>
                  <h5 className="card-title-custom">Revenue Overview</h5>
                  <p className="card-subtitle-custom">Your earnings over the last 6 months</p>
                </div>
                <button className="btn btn-sm btn-outline-secondary">
                  <FaEye className="me-1" />View Details
                </button>
              </div>
              <div className="card-body-custom">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                    <XAxis dataKey="month" stroke="#6c757d" />
                    <YAxis stroke="#6c757d" />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#0d6efd" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="dashboard-card">
              <div className="card-header-custom">
                <h5 className="card-title-custom">Service Coverage</h5>
              </div>
              <div className="card-body-custom">
                <div className="service-stat-item">
                  <div className="service-stat-icon location-icon">
                    <FaMapMarkerAlt />
                  </div>
                  <div className="service-stat-content">
                    <p className="fw-bold mb-1">Service Region</p>
                    {serviceCoverage.regions.length > 0 ? (
                      <ul className="mb-0">
                        {serviceCoverage.regions.map((region, idx) => (
                          <li key={idx}>{region}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted">No locations found</p>
                    )}
                  </div>
                </div>

                <div className="service-stat-item mt-3">
                  <div className="service-stat-icon services-icon">
                    <FaTools />
                  </div>
                  <div className="service-stat-content">
                    <p className="fw-bold mb-1">Active Service(s)</p>
                    {serviceCoverage.services.length > 0 ? (
                      <ul className="mb-0">
                        {serviceCoverage.services.map((service, idx) => (
                          <li key={idx}>{service}</li>
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
      </div>
    </main>
  );
}

export default ProviderDashboardHome;