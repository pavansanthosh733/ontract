import React from "react";

function CompanyProfileView({ profile, contractor, BASE_URLS, navigate, successMessage }) {
  return (
    <div className="company-view mt-4">
      <div className="company-header mb-4 p-4 shadow-sm rounded bg-white">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between">
          <div className="d-flex align-items-center mb-3 mb-md-0">
            <img
              src={`${BASE_URLS.user}/api/contractor/get_image/${contractor.email_id}/contractor_logo`}
              alt="Company Logo"
              className="rounded-circle shadow-sm me-3"
              width="100"
              height="100"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div>
              <h3 className="fw-bold text-primary mb-1">{profile.company_name}</h3>
              <p className="text-muted mb-0">{profile.head_name}</p>
            </div>
          </div>
          <div>
            <button
              className="btn btn-outline-primary btn-sm me-2"
              onClick={() => navigate("/contractor/dashboard/contractor-personal-details")}
            >
              Edit Profile
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => navigate("/contractor/dashboard/contractorbankdetails")}
            >
              Update Bank
            </button>
          </div>
        </div>
      </div>

      <div className="info-grid shadow-sm p-4 rounded bg-white mb-4">
        <h5 className="fw-semibold text-secondary mb-3">Company Information</h5>
        <div className="row gy-3">
          <div className="col-md-6"><label className="fw-bold text-dark d-block">BRN Number</label><span className="text-muted">{profile.brn_number}</span></div>
          <div className="col-md-6"><label className="fw-bold text-dark d-block">TIN Number</label><span className="text-muted">{profile.tin_number || "N/A"}</span></div>
          <div className="col-md-6"><label className="fw-bold text-dark d-block">Contact Number</label><span className="text-muted">{profile.contact_number}</span></div>
          <div className="col-md-6"><label className="fw-bold text-dark d-block">Contact Person</label><span className="text-muted">{profile.name}</span></div>
          <div className="col-md-6"><label className="fw-bold text-dark d-block">Mailing Address</label><span className="text-muted">{profile.mailing_address}</span></div>
          <div className="col-md-6"><label className="fw-bold text-dark d-block">Billing Address</label><span className="text-muted">{profile.billing_address}</span></div>
        </div>
      </div>

      <div className="services-section shadow-sm p-4 rounded bg-white mb-4">
        <h5 className="fw-semibold text-secondary mb-3">Services & Locations</h5>
        {Array.isArray(profile.services) && profile.services.length > 0 ? (
          Object.entries(
            profile.services.reduce((acc, svc) => {
              acc[svc.service_location] = acc[svc.service_location] || [];
              acc[svc.service_location].push(svc);
              return acc;
            }, {})
          ).map(([location, svcs], idx) => (
            <div key={idx} className="mb-3 border-start border-primary ps-3">
              <ul className="list-unstyled ms-3 mb-0">
                {svcs.map((s, i) => (
                  <li key={i} className="text-muted">
                    {s.region}, {s.state}, {s.service_name} — <span className="fw-bold">MYR {s.service_rate}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-muted">No services available</p>
        )}
      </div>

      <div className="certificate-section shadow-sm p-4 rounded bg-white">
        <h5 className="fw-semibold text-secondary mb-3">Documents</h5>
        {Array.isArray(profile.certificate_path) &&
          profile.certificate_path.map((file, index) => (
<div key={index} className="mb-2">
  <a
    href={`${BASE_URLS.user}${file}`}
    target="_blank"
    rel="noreferrer"
    className="btn btn-outline-primary btn-sm"
  >
    View Certificate {index + 1}
  </a>
</div>
          ))}
      </div>

      {successMessage && <div className="alert alert-success mt-3">{successMessage}</div>}
    </div>
  );
}

export default CompanyProfileView;