import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  DollarSign,
  Users,
  Building2,
  User,
  TrendingUp,
  Activity,
  Calendar,
  FileText
} from "lucide-react";
import { apiGet } from "../api";  // <-- Make sure path is correct
import "./css/AdminHome.css";
import { useAdmin } from "../context/AdminContext";


function AdminHome() {
  const { admin, loading } = useAdmin();
const permissionLevel = admin?.email?.permission_level;
console.log("logina admin detils",permissionLevel)
  const [dashboardData, setDashboardData] = useState({
    workOrders: {
      total: 0,
      active: 0,
      completed: 0,
      pending: 0,
      today: 0,
      trend: "+0%"
    },
    standardRate: {
      hourly: 85,
      overtime: 127.5,
      weekend: 170,
      emergency: 212.5
    },
    users: {
      companyUsers: 0,
      individualUsers: 0,
      newThisMonth: 0,
      activeToday: 0
    },
    revenue: {
      thisMonth: 125840,
      lastMonth: 108230,
      growth: "+16.3%"
    },
    recentActivity: [
      { id: 1, type: "workorder", desc: "New work order #WO-1249 created", time: "5 min ago" },
      { id: 2, type: "user", desc: "New company user registered", time: "12 min ago" },
      { id: 3, type: "complete", desc: "Work order #WO-1245 completed", time: "1 hour ago" },
     { id: 4, type: "rate", desc: "Standard rate updated", time: "2 hours ago" }
   ]
  });

  // ------------------------------------------
  // 🚀 FETCH WORK ORDER COUNTS
  // ------------------------------------------
  useEffect(() => {
  async function loadDashboard() {
    try {
      const [
        totalRes,
        openRes,
        closedRes,
        todayWORes,
        companyRes,
        individualRes,
        activeRes,
        todayRes2
      ] = await Promise.all([
        apiGet("/api/workorders/count/all"),
        apiGet("/api/workorders/count/open"),
        apiGet("/api/workorders/count/closed"),
        apiGet("/api/workorders/count/today"),

        apiGet("/api/admin/users/count/company"),
        apiGet("/api/admin/users/count/individual"),

        apiGet("/api/admin/users/count/active"),  
        apiGet("/api/admin/users/count/today")     
      ]);

      setDashboardData(prev => ({
        ...prev,
        workOrders: {
          ...prev.workOrders,
          total: totalRes.total_count,
          active: openRes.open_count,
          completed: closedRes.closed_count,
          today: todayWORes.today_count,
          trend: "+12%"
        },
        users: {
          ...prev.users,
          companyUsers: companyRes.company_count,
          individualUsers: individualRes.individual_count,

          activeToday: activeRes.active_count,      // ⭐ NEW
          newThisMonth: todayRes2.today_count      // ⭐ NEW
        }
      }));

    } catch (err) {
      console.error("Dashboard API Error:", err);
    }
  }

  loadDashboard();
}, []);


  // ------------------------------------------
  // CARD COMPONENT
  // ------------------------------------------
  const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800 mb-2">{value}</h3>

          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}

          {trend && (
            <span className={`inline-flex items-center text-sm font-medium mt-2 ${
              trend.startsWith("+") ? "text-green-600" : "text-red-600"
            }`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {trend} from last months
            </span>
          )}
        </div>

        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your business overview.</p>
        </div>

        {/* ------------------------------------------
            WORK ORDERS SUMMARY
        ------------------------------------------ */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Briefcase className="w-5 h-5 mr-2" />
            Work Orders Summary
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <StatCard
              title="Total Work Orders"
              value={dashboardData.workOrders.total}
              icon={FileText}
              trend={dashboardData.workOrders.trend}
              color="bg-blue-500"
            />

            <StatCard
              title="Open Work Orders"
              value={dashboardData.workOrders.active}
              icon={Activity}
              color="bg-green-500"
              subtitle="Currently in progress"
            />

            <StatCard
              title="Completed"
              value={dashboardData.workOrders.completed}
              icon={CheckCircle}
              color="bg-purple-500"
              subtitle="Successfully finished"
            />

            <StatCard
              title="Today Created"
              value={dashboardData.workOrders.today}
              icon={Clock}
              color="bg-orange-500"
              subtitle="Created today"
            />

          </div>
        </div>

        {/* ------------------------------------------
            STANDARD RATES SECTION
        ------------------------------------------ */}
               {/* ------------------------------------------
            USERS SECTION
        ------------------------------------------ */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Users Overview
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <StatCard
              title="Company Users"
              value={dashboardData.users.companyUsers}
              icon={Building2}
              color="bg-indigo-500"
              subtitle="Business accounts"
            />

            <StatCard
              title="Individual Users"
              value={dashboardData.users.individualUsers}
              icon={User}
              color="bg-cyan-500"
              subtitle="Personal accounts"
            />

            <StatCard
              title="New This Month"
              value={dashboardData.users.newThisMonth}
              icon={TrendingUp}
              color="bg-green-500"
              subtitle="Recent sign-ups"
            />

            <StatCard
              title="Active Today"
              value={dashboardData.users.activeToday}
              icon={Activity}
              color="bg-blue-500"
              subtitle="Currently online"
            />

          </div>
        </div>

        {/* ------------------------------------------
            REVENUE + RECENT ACTIVITY
        ------------------------------------------ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Revenue Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Revenue Overview
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">This Month</p>
                  <p className="text-2xl font-bold text-gray-800">
                    ${dashboardData.revenue.thisMonth.toLocaleString()}
                  </p>
                </div>
                <span className="text-green-600 font-semibold text-lg">
                  {dashboardData.revenue.growth}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Last Month</p>
                  <p className="text-2xl font-bold text-gray-800">
                    ${dashboardData.revenue.lastMonth.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Recent Activity
            </h2>

            <div className="space-y-3">
              {dashboardData.recentActivity.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`p-2 rounded-full mr-3 ${
                    activity.type === "workorder"
                      ? "bg-blue-100"
                      : activity.type === "user"
                      ? "bg-green-100"
                      : activity.type === "complete"
                      ? "bg-purple-100"
                      : "bg-orange-100"
                  }`}>
                    {activity.type === "workorder" && <FileText className="w-4 h-4 text-blue-600" />}
                    {activity.type === "user" && <Users className="w-4 h-4 text-green-600" />}
                    {activity.type === "complete" && <CheckCircle className="w-4 h-4 text-purple-600" />}
                    {activity.type === "rate" && <DollarSign className="w-4 h-4 text-orange-600" />}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{activity.desc}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default AdminHome;