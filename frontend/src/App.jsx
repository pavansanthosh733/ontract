import React, { useEffect } from "react";
import { Routes, Route,useLocation, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { apiPost, apiGet } from "./api";
import { useContractor } from "./context/ContractorContext";

/* Common / Individual */
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import OTPVerification from "./components/OTPVerification";
import ActivateAccount from "./components/ActivateAccount";
import ProviderProfile from "./components/ProviderProfile";
import ProviderServices from "./components/ProviderServices";
import ProviderHome from "./components/ProviderHome";
import ForgotPassword from "./components/ForgotPassword";
import ProviderUpdateProfile from "./components/ProviderUpdateProfile";
import ProviderPersonalDetails from "./components/ProviderPersonalDetails";
import ProviderBankDetails from "./components/ProviderBankDetails";
import ProviderInvoice from "./components/ProviderInvoice";

/* Admin */
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";

/* Contractor (company) components changes done */
import CompanyLogin from "./components/company/CompanyLogin";
import CompanySignup from "./components/company/CompanySignup";
import CompanyActivateAccount from "./components/company/CompanyActivateAccount";
import CompanyOTPVerification from "./components/company/CompanyOTPVerification";
import CompanyDashboardHome from "./components/company/CompanyDashboardHome";
import CompanyProfile from "./components/company/CompanyProfile";
import CompanyServices from "./components/company/CompanyServices";
import AdminApp from "./components/AdminApp";
import Notifications from "./components/Notifications";
import CompanyApp from "./components/company/CompanyApp";
import CompanyNotifications from "./components/company/CompanyNotifications";
import ProviderWorkOrders from "./components/ProviderWorkOrders";
import CompanyWorkorders from "./components/company/CompanyWorkorders";
import UpdateCompanyProfile from "./components/company/UpdateCompanyProfile";
import ContractorPersonalDetails from "./components/company/ContractorPersonalDetails";
import ContractorBankDetails from "./components/company/ContractorBankDetails";
import CompanyInvoice from "./components/company/CompanyInvoice";
import RateComparisonReport from "./components/RateComparisonReport";
import ProviderDashboardHome from "./components/ProviderDashboardHome";
import CompanyRating from "./components/company/CompanyRating";
import ProviderRating from "./components/ProviderRating";
import WorkorderHistoryPage from "./components/WorkorderHistoryPage"; 
import ProviderRFQ from "./components/ProviderRFQ";
import ContractorRFQ from "./components/company/ContractorRFQ";

function PublicCompanyProfileRoute() {
  const location = useLocation();

  const contractor = location.state?.email
    ? { email_id: location.state.email }
    : null;

  return <CompanyProfile contractor={contractor} />;
}


function Layout({
  user,
  setUser,
  admin,
  setAdmin,
  contractor,
  contractorLoading,
}) {
  const params = new URLSearchParams(window.location.search);
const isApk = params.get("source") === "apk";
  return (
    <div
      className="min-h-screen d-flex flex-column"
      style={{ minHeight: "100vh" }}
    >
      {/* ROUTES */}
      <main className="flex-fill">
        <Routes>
          {/* Common / Individuals routes */}
          {/* <Route path="/" element={<Home user={user} />} /> */}
          <Route
  path="/"
  element={
    contractorLoading ? (
      <div>Loading...</div>
    ) : isApk ? (
      contractor ? (
        <Navigate
          to="/contractor/dashboard/companydashboardhome"
          replace
        />
      ) : (
        <Home user={user} />
      )
    ) : (
      <Home user={user} />
    )
  }
/>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/verify-otp"
            element={<OTPVerification setUser={setUser} />}
          />
          <Route
            path="/activate"
            element={<ActivateAccount setUser={setUser} />}
          />
          <Route
            path="/forgot_password"
            element={<ForgotPassword setUser={setUser} />}
          />
          <Route
            path="/provider_home/profile"
            element={<ProviderProfile user={user} />}
          />
           <Route path="/workorders/:workorder/history" element={<WorkorderHistoryPage />} />

          {/* Provider nested */}
          <Route path="/provider_home" element={<ProviderHome user={user} />}>
         

            <Route
              path="services"
              element={<ProviderServices user={user} />}
            />
            <Route path="notifications" element={<Notifications />} />
            <Route path="providerrating" element={<ProviderRating />} />
            <Route path="workorders" element={<ProviderWorkOrders />} />
            <Route path="invoice" element={<ProviderInvoice />} />
            <Route path="rfq" element={<ProviderRFQ />} />
            <Route
              path="providerupdateprofile"
              element={<ProviderUpdateProfile user={user} />}
            />
            <Route
              path="personal-details"
              element={<ProviderPersonalDetails user={user} />}
            />
            <Route index element={<ProviderDashboardHome />} />
            <Route
              path="providerbankdetails"
              element={<ProviderBankDetails />}
            />
          </Route>

          <Route
            path="/personal/reports/ratecomparison"
            element={<RateComparisonReport />}
          />

          {/* Contractor routes done */}
          <Route
            path="/contractor/login"
            element={
              contractorLoading ? (
                <div>LOADING...</div>
              ) : contractor ? (
                <Navigate
                  to="/contractor/dashboard/companydashboardhome"
                  replace
                />
              ) : (
                <CompanyLogin />
              )
            }
          />

          <Route path="/contractor/signup" element={<CompanySignup />} />
          <Route
            path="/contractor/activate"
            element={<CompanyActivateAccount />}
          />
          <Route
            path="/contractor/verify_otp"
            element={<CompanyOTPVerification />}
          />
          <Route
  path="/contractor/companyprofile"
  element={<PublicCompanyProfileRoute />}
/>


          <Route
            path="/contractor/dashboard"
            element={
              contractorLoading ? (
                <div>Loading...</div>
              ) : contractor ? (
                <CompanyApp contractor={contractor} />
              ) : (
                <Navigate to="/contractor/login" replace />
              )
            }
          >
            <Route
              path="companydashboardhome"
              element={
                <CompanyDashboardHome contractor={contractor} />
              }
            />
            <Route
              path="profile"
              element={<CompanyProfile contractor={contractor} />}
            />
            <Route
              path="services"
              element={<CompanyServices contractor={contractor} />}
            />
            <Route
              path="notifications"
              element={
                <CompanyNotifications contractor={contractor} />
              }
            />
            <Route path="rating" element={<CompanyRating />} />
            <Route path="companyworkorders" element={<CompanyWorkorders />} />
            <Route path="invoice" element={<CompanyInvoice />} />
            <Route path="rfq" element={<ContractorRFQ />} />
            <Route
              path="updatecompanyprofile"
              element={
                <UpdateCompanyProfile contractor={contractor} />
              }
            />
            <Route
              path="contractor-personal-details"
              element={
                <ContractorPersonalDetails contractor={contractor} />
              }
            />
            <Route
              path="contractorbankdetails"
              element={
                <ContractorBankDetails contractor={contractor} />
              }
            />
          </Route>

          {/* Admin */}
          <Route
            path="/admin/*"
            element={<AdminApp admin={admin} setAdmin={setAdmin} />}
          />
          <Route
            path="/admin/login"
            element={<AdminLogin setAdmin={setAdmin} />}
          />

          {/* Fallback TO THE HOME PAGE */}
          <Route path="*" element={<Home user={user} />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = React.useState(null);
  const [admin, setAdmin] = React.useState(null);
  const { contractor, loading: contractorLoading } = useContractor();

  useEffect(() => {
    const restoreAppState = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser && storedUser !== "undefined") {
          setUser(JSON.parse(storedUser));
        }

        const storedAdmin = localStorage.getItem("admin");
        if (storedAdmin && storedAdmin !== "undefined") {
          setAdmin(JSON.parse(storedAdmin));
        }
      } catch (err) {
        console.error("Failed to restore app state:", err);

        localStorage.removeItem("user");
        localStorage.removeItem("admin");
        localStorage.removeItem("contractor");
      }
    };

    restoreAppState();
  }, []);

  return (
    <Layout
      user={user}
      setUser={setUser}
      admin={admin}
      setAdmin={setAdmin}
      contractor={contractor}
      contractorLoading={contractorLoading}
    />
  );
}    