// ProviderProfile.jsx (updated: concatenated auto-fill into address textarea)

import React, { useState, useEffect } from "react";
import "./css/ProviderProfile.css";
import {
  BASE_URL,
  BASE_URLS,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from "../api";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

function ProviderUpdateProfile() {
  const navigate = useNavigate();
  const { user } = useUser();

  const [profile, setProfile] = useState(null);

  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [mailingPostalCode, setMailingPostalCode] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [alternateContactNumber, setAlternateContactNumber] = useState("");
  const [tinNumber, setTinNumber] = useState("");
  const [locationServiceList, setLocationServiceList] = useState([]);

  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    holderName: "",
    accountNumber: "",
    swift: "",
  });

  const [bankStatement, setBankStatement] = useState(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [pollInterval, setPollInterval] = useState(null);

  const [idTypes, setIdTypes] = useState([]);
  const [servicesList, setServicesList] = useState([]);

  // --------------------------------------
  // LOAD ID TYPES
  // --------------------------------------
  useEffect(() => {
    apiGet("/api/state/id-types")
      .then((data) => {
        if (Array.isArray(data)) setIdTypes(data);
        else setIdTypes([]);
      })
      .catch(() => setIdTypes([]));
  }, []);

  // --------------------------------------
  // FETCH PROFILE ON LOAD
  // --------------------------------------
  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  // --------------------------------------
  // AUTO REFRESH WHEN STATUS IS PENDING
  // --------------------------------------
  useEffect(() => {
    if (profile?.status === "pending") {
      const interval = setInterval(fetchProfile, 10000);
      setPollInterval(interval);
      return () => clearInterval(interval);
    } else if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [profile?.status]);

  const fetchProfile = async () => {
    try {
      const data = await apiPost("/api/profile", {
        email: user.email_id,
      });

      setProfile(data);

      if (data.status === "approved" && !data.bank_details) {
        setShowBankForm(true);
      }

      if (Array.isArray(data.services)) {
        const locServ = data.services.map((s) => ({
          region: s.region || "",
          state: s.state || "",
          city: s.city || "",
          service: s.service_name || "",
          price: s.service_rate || "",
        }));
        setLocationServiceList(locServ);
      } else {
        setLocationServiceList([]);
      }

      setFullName(data.full_name || "");
      setIdType(data.id_type || "");
      setIdNumber(data.id_number || "");
      setMailingAddress(data.mailing_address || "");
      setBillingAddress(data.billing_address || "");

      const mailingMatch = data.mailing_address?.match(/(\d{5})$/);
      if (mailingMatch) setMailingPostalCode(mailingMatch[1]);

      const billingMatch = data.billing_address?.match(/(\d{5})$/);
      if (billingMatch) setBillingPostalCode(billingMatch[1]);

      setContactNumber(data.contact_number || data.phone_number || "");
      setAlternateContactNumber(data.alternate_contact_number || "");
      setTinNumber(data.tin_number || "");
    } catch (error) {
      console.error("Profile fetch error:", error);
      setErrors({
        general: error.message || "Error fetching profile.",
      });
    }
  };

  const malaysianBanks = [
    "Maybank",
    "CIMB Bank",
    "Public Bank",
    "RHB Bank",
    "Hong Leong Bank",
    "AmBank",
    "Standard Chartered Bank Malaysia",
    "HSBC Bank Malaysia",
    "UOB Malaysia",
    "OCBC Bank Malaysia",
  ];

  // --------------------------------------
  // BANK FILE
  // --------------------------------------
  const handleBankStatementChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
    ];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        bankStatement: "Only PDF, JPEG, PNG, or GIF files are allowed.",
      }));
      e.target.value = "";
      setBankStatement(null);
      return;
    }

    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        bankStatement: "File size must be less than 10 MB.",
      }));
      e.target.value = "";
      setBankStatement(null);
      return;
    }

    setErrors((prev) => ({ ...prev, bankStatement: null }));
    setBankStatement(file);
  };

  const validateBankDetails = () => {
    const newErrors = {};
    const swiftRegex = /^([A-Z]{4}MY[A-Z0-9]{2})([A-Z0-9]{3})?$/;
    const accountRegex = /^[0-9]{9,18}$/;
    const holderNameRegex = /^[A-Za-z\s\-']{1,100}$/;

    if (!bankDetails.bankName) newErrors.bankName = "Bank required.";
    if (!holderNameRegex.test(bankDetails.holderName))
      newErrors.holderName = "Invalid holder name.";
    if (!accountRegex.test(bankDetails.accountNumber))
      newErrors.accountNumber = "9-18 digits only.";
    if (!swiftRegex.test(bankDetails.swift))
      newErrors.swift = "Invalid SWIFT (e.g., MAYBMYKL).";
    if (!bankStatement) newErrors.bankStatement = "Statement required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    if (!validateBankDetails()) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("email", user.email_id);
    formData.append("bank_name", bankDetails.bankName);
    formData.append("holder_name", bankDetails.holderName);
    formData.append("account_number", bankDetails.accountNumber);
    formData.append("swift", bankDetails.swift);
    if (bankStatement) formData.append("bank_statement", bankStatement);

    try {
      await apiPost("/api/update_bank", formData);

      setSuccessMessage("You can start your services. All the best!");
      setShowBankForm(false);
      fetchProfile();
    } catch (error) {
      setErrors({
        general: error.message || "Error submitting bank details.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user)
    return (
      <div className="text-center text-danger">
        Please login to view your dashboard.
      </div>
    );

  if (!profile) return <div className="text-center">Loading...</div>;

  const isPending = profile.status === "pending";
  const isRejected = profile.status === "rejected";
  const isApproved = profile.status === "approved";

  return (
    <div className="provider-container">
      {isPending ? (
        <div className="text-center">
          <p className="text-muted mb-3">
            Your profile is pending admin approval.
          </p>
        </div>
      ) : isRejected ? (
        <p className="text-center text-danger">
          Profile rejected. Contact admin.
        </p>
      ) : showBankForm ? (
        <form onSubmit={handleBankSubmit} className="row g-3">
          <div className="col-12 text-center mb-4">
            <h1>Bank Details</h1>
          </div>

          <div className="col-md-6">
            <label className="form-label">Bank</label>
            <select
              className={`form-select ${
                errors.bankName ? "is-invalid" : ""
              }`}
              value={bankDetails.bankName}
              onChange={(e) =>
                setBankDetails({
                  ...bankDetails,
                  bankName: e.target.value,
                })
              }
            >
              <option value="">Select</option>
              {malaysianBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {errors.bankName && (
              <div className="invalid-feedback">{errors.bankName}</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">
              Holder Name <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${
                errors.holderName ? "is-invalid" : ""
              }`}
              value={bankDetails.holderName}
              onChange={(e) =>
                setBankDetails({
                  ...bankDetails,
                  holderName: e.target.value,
                })
              }
            />
            {errors.holderName && (
              <div className="invalid-feedback">{errors.holderName}</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">
              Account Number <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${
                errors.accountNumber ? "is-invalid" : ""
              }`}
              value={bankDetails.accountNumber}
              onChange={(e) =>
                setBankDetails({
                  ...bankDetails,
                  accountNumber: e.target.value,
                })
              }
            />
            {errors.accountNumber && (
              <div className="invalid-feedback">{errors.accountNumber}</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">
              SWIFT Code <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${
                errors.swift ? "is-invalid" : ""
              }`}
              value={bankDetails.swift}
              onChange={(e) =>
                setBankDetails({
                  ...bankDetails,
                  swift: e.target.value.toUpperCase(),
                })
              }
            />
            {errors.swift && (
              <div className="invalid-feedback">{errors.swift}</div>
            )}
          </div>

          <div className="col-12">
            <label className="form-label">
              Bank Statement <span className="required-asterisk">*</span>
            </label>
            <input
              type="file"
              className={`form-control ${
                errors.bankStatement ? "is-invalid" : ""
              }`}
              onChange={handleBankStatementChange}
              accept="application/pdf,image/*"
            />
            {errors.bankStatement && (
              <div className="invalid-feedback d-block">
                {errors.bankStatement}
              </div>
            )}
          </div>

          <div className="col-12">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Bank Details"}
            </button>

            {errors.general && (
              <div className="text-danger text-center mt-2">
                {errors.general}
              </div>
            )}
          </div>
        </form>
      ) : (
        <div className="dashboard-card">
 
          <div className="mb-4">
  <h5 className="mb-3">Provider Profile Overview</h5>

  {/* ✅ Buttons on Left Side One Below Another */}
  <div className="d-flex flex-column align-items-end gap-2">
    <button
      className="btn btn-outline-primary btn-sm"
      onClick={() => navigate("/provider_home/personal-details")}
    >
      Edit Personal Details
    </button>

    <button
      className="btn btn-outline-primary btn-sm"
      onClick={() => navigate("/provider_home/providerbankdetails")}
    >
      Edit Bank Details
    </button>
  </div>
</div>


          {/* Profile Header */}
          <div className="dashboard-header mb-4">
            <img
              src={`${BASE_URLS.user}/api/get_image/${user.email_id}/profile`}
              alt="Profile"
              className="profile-photo"
            />

            <div className="info">
              <h4>{profile.full_name}</h4>
              <p className="text-muted">{profile.email_id}</p>

              <p className="text-muted">
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    color:
                      profile.status === "approved"
                        ? "green"
                        : profile.status === "pending"
                        ? "#f0ad4e"
                        : "red",
                    fontWeight: "600",
                  }}
                >
                  {profile.status?.toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="profile-info-grid">
            <div className="profile-field">
              <strong>ID Type</strong>
              <span>{profile.id_type}</span>
            </div>

            <div className="profile-field">
              <strong>ID Number</strong>
              <span>{profile.id_number}</span>
            </div>

            <div className="profile-field">
              <strong>TIN Number</strong>
              <span>{profile.tin_number}</span>
            </div>

            <div className="profile-field">
              <strong>Contact Number</strong>
              <span>{profile.contact_number}</span>
            </div>

            <div className="profile-field">
              <strong>Mailing Address</strong>
              <span>{profile.mailing_address}</span>
            </div>

            <div className="profile-field">
              <strong>Billing Address</strong>
              <span>{profile.billing_address}</span>
            </div>
          </div>

          {/* Services */}
          <div className="mt-4">
            <h6 className="fw-bold mb-3">Services Offered</h6>

            <div className="services-list">
              {profile.services?.map((s, i) => (
                <div key={i}>
                  <strong>{s.state}</strong> → {s.service_name} — MYR{" "}
                  {s.service_rate}
                </div>
              ))}
            </div>
          </div>

          {/* Certificate */}
          <div className="mt-4">
            <strong>Certificate: </strong>

            {profile.authorized_certificate ? (
              <a
                href={`${BASE_URLS.user}/api/get_image/${user.email_id}/certificate`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Document
              </a>
            ) : (
              <span className="text-muted">Not Uploaded</span>
            )}
          </div>

          {successMessage && (
            <p className="text-success text-center mt-4">
              {successMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ProviderUpdateProfile;
