import React, { Suspense, useEffect, lazy } from "react";
import { Routes, Route,useLocation, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "./components/css/AdminLogin.css";
import { useContractor } from "./context/ContractorContext";
import LoadingScreen from "./components/LoadingScreen";

/* Common / Individual */
const Home = lazy(() => import("./components/Home"));
const Login = lazy(() => import("./components/Login"));
const Signup = lazy(() => import("./components/Signup"));
const OTPVerification = lazy(() => import("./components/OTPVerification"));
const ActivateAccount = lazy(() => import("./components/ActivateAccount"));
const ProviderProfile = lazy(() => import("./components/ProviderProfile"));
const ProviderServices = lazy(() => import("./components/ProviderServices"));
const ProviderHome = lazy(() => import("./components/ProviderHome"));
const ForgotPassword = lazy(() => import("./components/ForgotPassword"));
const ProviderUpdateProfile = lazy(() => import("./components/ProviderUpdateProfile"));
const ProviderPersonalDetails = lazy(() => import("./components/ProviderPersonalDetails"));
const ProviderBankDetails = lazy(() => import("./components/ProviderBankDetails"));
const ProviderInvoice = lazy(() => import("./components/ProviderInvoice"));

/* Admin */
const AdminLogin = lazy(() => import("./components/AdminLogin"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard"));

/* Contractor (company) components changes done */
const CompanyLogin = lazy(() => import("./components/company/CompanyLogin"));
const CompanySignup = lazy(() => import("./components/company/CompanySignup"));
const CompanyActivateAccount = lazy(() => import("./components/company/CompanyActivateAccount"));
const CompanyOTPVerification = lazy(() => import("./components/company/CompanyOTPVerification"));
const CompanyDashboardHome = lazy(() => import("./components/company/CompanyDashboardHome"));
const CompanyProfile = lazy(() => import("./components/company/CompanyProfile"));
const CompanyServices = lazy(() => import("./components/company/CompanyServices"));
const AdminApp = lazy(() => import("./components/AdminApp"));
const Notifications = lazy(() => import("./components/Notifications"));
const CompanyApp = lazy(() => import("./components/company/CompanyApp"));
const CompanyNotifications = lazy(() => import("./components/company/CompanyNotifications"));
const ProviderWorkOrders = lazy(() => import("./components/ProviderWorkOrders"));
const CompanyWorkorders = lazy(() => import("./components/company/CompanyWorkorders"));
const UpdateCompanyProfile = lazy(() => import("./components/company/UpdateCompanyProfile"));
const ContractorPersonalDetails = lazy(() => import("./components/company/ContractorPersonalDetails"));
const ContractorBankDetails = lazy(() => import("./components/company/ContractorBankDetails"));
const CompanyInvoice = lazy(() => import("./components/company/CompanyInvoice"));
const RateComparisonReport = lazy(() => import("./components/RateComparisonReport"));
const ProviderDashboardHome = lazy(() => import("./components/ProviderDashboardHome"));
const CompanyRating = lazy(() => import("./components/company/CompanyRating"));
const ProviderRating = lazy(() => import("./components/ProviderRating"));
const WorkorderHistoryPage = lazy(() => import("./components/WorkorderHistoryPage"));
const ProviderRFQ = lazy(() => import("./components/ProviderRFQ"));
const ContractorRFQ = lazy(() => import("./components/company/ContractorRFQ"));

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
        <Suspense fallback={<LoadingScreen message="Loading page..." />}>
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
            path="/admin/login"
            element={<AdminLogin setAdmin={setAdmin} />}
          />
          <Route
            path="/admin/*"
            element={<AdminApp admin={admin} setAdmin={setAdmin} />}
          />

          {/* Fallback TO THE HOME PAGE */}
          <Route path="*" element={<Home user={user} />} />
        </Routes>
        </Suspense>
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