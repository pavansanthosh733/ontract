// components/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPut, apiDelete, BASE_URL } from "../api";
import ProviderDetailsModal from "./modals/ProviderDetailsModal";
import ContractorDetailsModal from "./modals/ContractorDetailsModal";



function AdminDashboard({ admin, setAdmin }) {
  console.log("admin details ",admin);
  const [providerModal, setProviderModal] = useState(null);
const [contractorModal, setContractorModal] = useState(null);


  const [assignmentScope, setAssignmentScope] = useState({});
  const [editingScope, setEditingScope] = useState({});

  const [providers, setProviders] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); // { email, type }
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [servicesModalUser, setServicesModalUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [providerPage, setProviderPage] = useState(1);
  const [contractorPage, setContractorPage] = useState(1);
  const [certificateModal, setCertificateModal] = useState(null);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
const pageSize = 5;

  // ---------------- COLUMN FILTERS ----------------
  const [providerFilters, setProviderFilters] = useState({
    name: "",
    email: "",
    phone: "",
    status: "",
  });

  const [contractorFilters, setContractorFilters] = useState({
    company_name: "",
    email: "",
    phone: "",
    status: "",
  });

  const handleProviderFilterChange = (field, value) => {
    setProviderFilters((prev) => ({ ...prev, [field]: value }));
    setProviderPage(1); // reset to page 1 whenever a filter changes
  };

  const handleContractorFilterChange = (field, value) => {
    setContractorFilters((prev) => ({ ...prev, [field]: value }));
    setContractorPage(1);
  };

 

  const navigate = useNavigate();

  // On mount: ensure admin exists and load data
  useEffect(() => {
    try {
      const storedAdmin = localStorage.getItem("admin");
      if (!storedAdmin || storedAdmin === "undefined") {
        navigate("/admin/login");
        return;
      }
      const adminData = JSON.parse(storedAdmin);
      setAdmin(adminData);
      // load providers and contractors
      fetchProviders();
      fetchContractors();
    } catch (err) {
      console.error("Admin restore error:", err);
      localStorage.removeItem("admin");
      navigate("/admin/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

 const handleActivate = async (email) => {
  if (!window.confirm("Activate this user?")) return;
  await apiPut("/api/admin/activate_user", { email });
  fetchProviders();
  fetchContractors();
};

const handleDeactivate = async (email) => {
  if (!window.confirm("Deactivate this user?")) return;
  await apiPut("/api/admin/deactivate_user", { email });
  fetchProviders();
  fetchContractors();
};




  // ---------------- PROVIDERS ----------------
  const fetchProviders = async () => {
  setLoading(true);
  setError("");

  try {
    const data = await apiGet("/api/admin/providers");

    let providerList = [];

    if (Array.isArray(data)) {
      providerList = data;
    } else if (data && Array.isArray(data.results)) {
      providerList = data.results;
    } else {
      providerList = data.providers || [];
    }

    setProviders(providerList);

    // ✅ Initialize assignment scope state
    const scopeMap = {};

    providerList.forEach((p) => {
      scopeMap[p.email_id] = p.assignment_scope || "";
    });

    setAssignmentScope((prev) => ({
      ...prev,
      ...scopeMap,
    }));

    setCurrentPage(1);
  } catch (err) {
    console.error(err);
    setProviders([]);
  } finally {
    setLoading(false);
  }
};

  const handleApproveProvider = async (email) => {
  const provider = providers.find((p) => p.email_id === email);

  const scope =
    assignmentScope[email] ||
    provider?.assignment_scope;

  if (!scope) {
    alert("Please select Contractor Type");
    return;
  }

  console.log("Email:", email);
  console.log("Scope:", scope);

  try {
    await apiPost("/api/admin/approve_provider", {
      email,
      assignment_scope: scope,
    });

    await fetchProviders();

    alert("Provider approved successfully.");

    setAssignmentScope((prev) => ({
      ...prev,
      [email]: "",
    }));
  } catch (err) {
    console.error(err);
    alert(err.message || "Error approving provider");
  }
};


const updateAssignmentScope = async (email) => {
  if (!window.confirm("Are you sure you want to update the Contractor Type?")) {
    return;
  }

  try {
    await apiPut("/api/admin/update_assignment_scope", {
      email,
      assignment_scope: assignmentScope[email],
    });

    await fetchProviders();

    setEditingScope((prev) => ({
      ...prev,
      [email]: false,
    }));

    alert("Contractor Type updated successfully.");
  } catch (err) {
    console.error(err);
    alert("Update failed");
  }
};


const cancelAssignmentScope = (email) => {
  const provider = providers.find(
    (p) => p.email_id === email
  );

  setAssignmentScope((prev) => ({
    ...prev,
    [email]: provider.assignment_scope,
  }));

  setEditingScope((prev) => ({
    ...prev,
    [email]: false,
  }));
};


  const handleRejectProvider = async (email) => {
    if (!window.confirm("Reject this provider?")) return;
    try {
      await apiPost("/api/admin/reject_provider", { email });
      await fetchProviders();
      alert("Provider rejected");
    } catch (err) {
      console.error("Reject provider failed:", err);
      alert(err.message || "Error rejecting provider");
    }
  };

  // ---------------- CONTRACTORS ----------------
 const fetchContractors = async () => {
  setLoading(true);
  setError("");

  try {
    const data = await apiGet("/api/admin/contractors");

    let contractorList = [];

    if (Array.isArray(data)) {
      contractorList = data;
    } else if (data && Array.isArray(data.results)) {
      contractorList = data.results;
    } else {
      contractorList = data.contractors || [];
    }

    setContractors(contractorList);

    // ✅ Initialize assignment scope state
    const scopeMap = {};

    contractorList.forEach((c) => {
      scopeMap[c.email_id] = c.assignment_scope || "";
    });

    setAssignmentScope((prev) => ({
      ...prev,
      ...scopeMap,
    }));

    setCurrentPage(1);
  } catch (err) {
    console.error(err);
    setContractors([]);
  } finally {
    setLoading(false);
  }
};

  const handleApproveContractor = async (email) => {
  const contractor = contractors.find(
    (c) => c.email_id === email
  );

  const scope =
    assignmentScope[email] ||
    contractor?.assignment_scope;

  if (!scope) {
    alert("Please select Contractor Type");
    return;
  }

  console.log("Email:", email);
  console.log("Scope:", scope);

  try {
    await apiPost("/api/admin/approve_contractor", {
      email,
      assignment_scope: scope,
    });

    await fetchContractors();

    alert("Contractor approved successfully.");

    setAssignmentScope((prev) => ({
      ...prev,
      [email]: "",
    }));
  } catch (err) {
    console.error(err);
    alert(err.message || "Error approving contractor");
  }
};
const updateContractorAssignmentScope = async (email) => {
  if (!window.confirm("Are you sure you want to update the Contractor Type?")) {
    return;
  }

  try {
    await apiPut("/api/admin/update_assignment_scope", {
      email,
      assignment_scope: assignmentScope[email],
    });

    await fetchContractors();

    setEditingScope((prev) => ({
      ...prev,
      [email]: false,
    }));

    alert("Contractor Type updated successfully.");
  } catch (err) {
    console.error(err);
    alert("Update failed");
  }
};

const cancelContractorAssignmentScope = (email) => {
  const contractor = contractors.find(
    (c) => c.email_id === email
  );

  setAssignmentScope((prev) => ({
    ...prev,
    [email]: contractor.assignment_scope,
  }));

  setEditingScope((prev) => ({
    ...prev,
    [email]: false,
  }));
};




  const handleRejectContractor = async (email) => {
    if (!window.confirm("Reject this contractor?")) return;
    try {
      await apiPost("/api/admin/reject_contractor", { email });
      await fetchContractors();
      alert("Contractor rejected");
    } catch (err) {
      console.error("Reject contractor failed:", err);
      alert(err.message || "Error rejecting contractor");
    }
  };

  // ---------------- COMMON: send message ----------------
  const handleSendMessage = async (email, type) => {
    if (!message || !message.trim()) {
      alert("Message cannot be empty");
      return;
    }
    setSending(true);
    try {
      const route =
        type === "provider" ? "/api/admin/send_message" : "/api/admin/send_message_contractor";

      await apiPost(route, { email, message });
      setMessage("");
      setSelectedUser(null);
      alert("Message sent successfully");
    } catch (err) {
      console.error("Send message error:", err);
      alert(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const openServicesModal = (user) => {
    // normalize services to an array for display
    // your backend sometimes returns object keyed by service id - convert to array
    const normalizedUser = { ...user };
    if (normalizedUser.services && !Array.isArray(normalizedUser.services)) {
      // convert from object map to array
      try {
        normalizedUser.services = Object.keys(normalizedUser.services).map((k) => normalizedUser.services[k]);
      } catch {
        normalizedUser.services = [];
      }
    }
    setServicesModalUser(normalizedUser);
  };
  const closeServicesModal = () => setServicesModalUser(null);

  // ---------------- Render / UI ----------------
  if (loading) return <div className="text-center mt-5">Loading...</div>;
  if (error) return <div className="alert alert-danger text-center mt-5">{error}</div>;

  // ---------------- APPLY FILTERS ----------------
  const filteredProviders = providers.filter((p) => {
    const name = (p.name || p.full_name || "").toLowerCase();
    const email = (p.email_id || p.email || "").toLowerCase();
    const phone = (p.contact_number || p.phone || "").toString().toLowerCase();
    const status = (p.status || "").toLowerCase();

    return (
      name.includes(providerFilters.name.toLowerCase()) &&
      email.includes(providerFilters.email.toLowerCase()) &&
      phone.includes(providerFilters.phone.toLowerCase()) &&
      status.includes(providerFilters.status.toLowerCase())
    );
  });

  const filteredContractors = contractors.filter((c) => {
    const companyName = (c.company_name || "").toLowerCase();
    const email = (c.email_id || c.email || "").toLowerCase();
    const phone = (c.contact_number || c.phone || "").toString().toLowerCase();
    const status = (c.status || "").toLowerCase();

    return (
      companyName.includes(contractorFilters.company_name.toLowerCase()) &&
      email.includes(contractorFilters.email.toLowerCase()) &&
      phone.includes(contractorFilters.phone.toLowerCase()) &&
      status.includes(contractorFilters.status.toLowerCase())
    );
  });

  // Provider pagination (now based on filtered results)
  const providerStartIndex = (providerPage - 1) * pageSize;
  const providerEndIndex = providerStartIndex + pageSize;

  const paginatedProviders = filteredProviders.slice(providerStartIndex, providerEndIndex);
  const providerTotalPages = Math.ceil(filteredProviders.length / pageSize);

  // Contractor pagination (now based on filtered results)
  const contractorStartIndex = (contractorPage - 1) * pageSize;
  const contractorEndIndex = contractorStartIndex + pageSize;

  const paginatedContractors = filteredContractors.slice(
    contractorStartIndex,
    contractorEndIndex
  );

  const contractorTotalPages = Math.ceil(filteredContractors.length / pageSize);

  return (
    <div className="admin-dashboard container mt-4">
      {/* ---------------- PROVIDER SECTION ---------------- */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5>Individual Management</h5>
        </div>
        <div className="card-body table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Services</th>
                <th>Contractor Type</th>
                <th>Status</th>
                <th>Actions</th>
                <th>Certificates</th>
              </tr>
              {/* ---------------- COLUMN FILTER ROW ---------------- */}
              <tr>
                <th>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search name..."
                    value={providerFilters.name}
                    onChange={(e) => handleProviderFilterChange("name", e.target.value)}
                  />
                </th>
                <th>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search email..."
                    value={providerFilters.email}
                    onChange={(e) => handleProviderFilterChange("email", e.target.value)}
                  />
                </th>
                <th>
                 
                </th>
                <th></th>
                
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedProviders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    No providers found
                  </td>
                </tr>
              ) : (
paginatedProviders.map((p) => (
                  <tr key={p.provider_id || p.email_id || p.id || Math.random()}>
                    <td data-label="Full Name">{p.name || p.full_name || "N/A"}</td>
                    <td data-label="Email">{p.email_id || p.email || "N/A"}</td>
                    <td data-label="Phone">{p.contact_number || p.phone || "N/A"}</td>
                    <td data-label="Services">
<button
  className="btn btn-link btn-sm"
  onClick={() => setProviderModal(p)}
>
  View
</button>


                    </td>

    <td className="text-center">
  <div className="contractor-type-wrapper">
    <select
      className="form-select form-select-sm contractor-type-select"
      value={
        assignmentScope[p.email_id] ??
        p.assignment_scope ??
        ""
      }
      onChange={(e) => {
        setAssignmentScope((prev) => ({
          ...prev,
          [p.email_id]: e.target.value,
        }));

        setEditingScope((prev) => ({
          ...prev,
          [p.email_id]: true,
        }));
      }}
    >
      <option value="">Select</option>
      <option value="GENERAL">General</option>
      <option value="SPECIALIZED">Specialized</option>
      <option value="PANEL">Panel</option>
    </select>

  {editingScope[p.email_id] && (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      gap: "8px",
      marginTop: "8px",
    }}
  >
    <button
      className="btn btn-success btn-sm"
      onClick={() => updateAssignmentScope(p.email_id)}
    >
      Update
    </button>

    <button
      className="btn btn-secondary btn-sm"
      onClick={() => cancelAssignmentScope(p.email_id)}
    >
      Cancel
    </button>
  </div>
)}
  </div>
</td>
                    <td data-label="Status">
                      <span
                        className={`badge ${
                          p.status === "approved" ? "bg-success" : p.status === "pending" ? "bg-warning" : "bg-danger"
                        }`}
                      >
                        {p.status || "N/A"}
                      </span>
                    </td>
            <td data-label="Actions">
  <div className="action-btn-group">
    {p.status === "pending" ? (
      <>
        <button
          className="btn btn-sm btn-success"
          onClick={() => handleApproveProvider(p.email_id)}
        >
          Approve
        </button>

        <button
          className="btn btn-sm btn-danger"
          onClick={() => handleRejectProvider(p.email_id)}
        >
          Reject
        </button>
      </>
    ) : (
      <>
        {p.active_status ? (
          <button
            className="btn btn-sm btn-warning"
            onClick={() => handleDeactivate(p.email_id)}
          >
            Deactivate
          </button>
        ) : (
          <button
            className="btn btn-sm btn-success"
            onClick={() => handleActivate(p.email_id)}
          >
            Activate
          </button>
        )}
      </>
    )}
  </div>
</td>

                    <td data-label="Certificates">
  {(p.name || p.full_name) && (
    <div className="certificate-btn-group">
      <a
        href={`${BASE_URL}/api/get_image/${p.email_id || p.email}/profile`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-sm btn-outline-primary"
      >
        Profile
      </a>

      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() => {
          setCertificateModal(p);
          setSelectedCertificate(null);
        }}
      >
        Certificate
      </button>
    </div>
  )}
</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="d-flex justify-content-center mt-3">
        <ul className="pagination">
          {Array.from(
            { length: providerTotalPages },
            (_, index) => {
              const pageNumber = index + 1;

              return (
                <li
                  key={pageNumber}
                  className={`page-item ${
                    providerPage === pageNumber ? "active" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() => setProviderPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                </li>
              );
            }
          )}
        </ul>
      </div>
      {/* ---------------- CONTRACTOR SECTION ---------------- */}
      <div className="card mb-4">
        <div className="card-header bg-secondary text-white">
          <h5>Company Management</h5>
        </div>
        <div className="card-body table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Services</th>
                <th>Contractor Type</th>
                <th>Status</th>
                <th>Actions</th>
                <th>Certificates</th>
              </tr>
              {/* ---------------- COLUMN FILTER ROW ---------------- */}
              <tr>
                <th>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search company..."
                    value={contractorFilters.company_name}
                    onChange={(e) => handleContractorFilterChange("company_name", e.target.value)}
                  />
                </th>
                <th>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search email..."
                    value={contractorFilters.email}
                    onChange={(e) => handleContractorFilterChange("email", e.target.value)}
                  />
                </th>
                
                <th></th>
                <th></th>
               
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedContractors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center">
                    No companies found
                  </td>
                </tr>
              ) : (
               paginatedContractors.map((c) => (
                  <tr key={c.company_id || c.email_id || c.id || Math.random()}>
                    <td data-label="Company Name">{c.company_name || "N/A"}</td>
                    <td data-label="Email">{c.email_id || c.email || "N/A"}</td>
                    <td data-label="Contact">{c.contact_number || c.phone || "N/A"}</td>
                    <td data-label="Services">
<button
  className="btn btn-link btn-sm"
  onClick={() => setContractorModal(c)}
>
  View
</button>


                    </td>
                   <td className="text-center">
  <div className="contractor-type-wrapper">
    <select
      className="form-select form-select-sm contractor-type-select"
      value={
        assignmentScope[c.email_id] ??
        c.assignment_scope ??
        ""
      }
      onChange={(e) => {
        setAssignmentScope((prev) => ({
          ...prev,
          [c.email_id]: e.target.value,
        }));

        setEditingScope((prev) => ({
          ...prev,
          [c.email_id]: true,
        }));
      }}
    >
      <option value="">Select</option>
      <option value="GENERAL">General</option>
      <option value="SPECIALIZED">Specialized</option>
      <option value="PANEL">Panel</option>
    </select>

    {editingScope[c.email_id] && (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      gap: "8px",
      marginTop: "8px",
    }}
  >
    <button
      className="btn btn-success btn-sm"
      onClick={() => updateContractorAssignmentScope(c.email_id)}
    >
      Update
    </button>

    <button
      className="btn btn-secondary btn-sm"
      onClick={() => cancelContractorAssignmentScope(c.email_id)}
    >
      Cancel
    </button>
  </div>
)}
  </div>
</td>
                    <td data-label="Status">
                      <span
                        className={`badge ${
                          c.status === "approved" ? "bg-success" : c.status === "pending" ? "bg-warning" : "bg-danger"
                        }`}
                      >
                        {c.status || "N/A"}
                      </span>
                    </td>
<td data-label="Actions">
  {c.status === "pending" && (
    <div className="action-btn-group">
      <button
        className="btn btn-sm btn-success"
        onClick={() => handleApproveContractor(c.email_id)}
      >
        Approve
      </button>
      <button
        className="btn btn-sm btn-danger"
        onClick={() => handleRejectProvider(c.email_id)}
      >
        Reject
      </button>
    </div>
  )}

  {c.status === "approved" && (
    <>
      {c.active_status ? (
        <button
          className="btn btn-sm btn-warning"
          onClick={() => handleDeactivate(c.email_id)}
        >
          Deactivate
        </button>
      ) : (
        <button
          className="btn btn-sm btn-success"
          onClick={() => handleActivate(c.email_id)}
        >
          Activate
        </button>
      )}
    </>
  )}
</td>

                    <td data-label="Certificates">
  {c.company_name && (
    <div className="action-btn-group">
      <a
        href={`${BASE_URL}/api/get_image/${c.email_id}/contractor_logo`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-sm btn-outline-primary"
      >
        Logo
      </a>

      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() => {
          setCertificateModal(c);
          setSelectedCertificate(null);
        }}
      >
        Certificate
      </button>
    </div>
  )}
</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="d-flex justify-content-center mt-3">
        <ul className="pagination">
          {Array.from(
            { length: contractorTotalPages },
            (_, index) => {
              const pageNumber = index + 1;

              return (
                <li
                  key={pageNumber}
                  className={`page-item ${
                    contractorPage === pageNumber ? "active" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() => setContractorPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                </li>
              );
            }
          )}
        </ul>
      </div>



      {/* Shared Message Modal for deployment */}
      {selectedUser && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Send Message to {selectedUser.email}</h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setSelectedUser(null);
                    setMessage("");
                  }}
                  disabled={sending}
                ></button>
              </div>
              <div className="modal-body">
                {sending ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Sending message...</p>
                  </div>
                ) : (
                  <textarea
                    className="form-control"
                    rows="4"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message..."
                  ></textarea>
                )}
              </div>
              {!sending && (
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedUser(null);
                      setMessage("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSendMessage(selectedUser.email, selectedUser.type)}
                    disabled={sending || !message.trim()}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <ProviderDetailsModal
  provider={providerModal}
  onClose={() => setProviderModal(null)}
/>

<ContractorDetailsModal
  contractor={contractorModal}
  onClose={() => setContractorModal(null)}
/>

{/* =========================================================
    CERTIFICATE MODAL
========================================================= */}

{certificateModal && (
  <div
    className="modal fade show d-block"
    style={{ background: "rgba(0,0,0,0.6)" }}
  >
    <div
      className="modal-dialog modal-xl"
      style={{ maxWidth: "90%" }}
    >
      <div className="modal-content">

        {/* HEADER */}
        <div className="modal-header">
          <h5 className="modal-title">
            {certificateModal.company_name
              ? "Company Certificates"
              : "Provider Certificates"}
          </h5>

          <button
            type="button"
            className="btn-close"
            onClick={() => {
              setCertificateModal(null);
              setSelectedCertificate(null);
            }}
          />
        </div>

        {/* BODY */}
        <div className="modal-body">
          <div className="row">

            {/* DOCUMENT LIST */}
            <div className="col-md-3 border-end">
              <h6>Documents</h6>

              {(
                certificateModal.certificate_path ||
                certificateModal.authorized_certificate ||
                []
              ).map((doc, index) => (
                <button
                  key={index}
                  type="button"
                  className="btn btn-outline-primary w-100 mb-2"
                  onClick={() => setSelectedCertificate(doc)}
                >
                  Document {index + 1}
                </button>
              ))}
            </div>

            {/* DOCUMENT VIEW */}
            <div className="col-md-9">
              {selectedCertificate ? (
                selectedCertificate.endsWith(".pdf") ? (
                  <div className="text-center mt-5">
                    <a
                      href={`${BASE_URL}${selectedCertificate}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      Open PDF Document
                    </a>
                  </div>
                ) : (
                  <img
                    src={`${BASE_URL}${selectedCertificate}`}
                    alt="certificate"
                    className="img-fluid"
                  />
                )
              ) : (
                <div className="text-center mt-5">
                  Select a document
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
)}





    </div>
  );
}

export default AdminDashboard;