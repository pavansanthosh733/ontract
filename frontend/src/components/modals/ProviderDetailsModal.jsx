import React from "react";

const ProviderDetailsModal = ({ provider, onClose }) => {
  if (!provider) return null;

  // ✅ Bank Details Object
  const bank = provider.bank_details;

  return (
    <div
      className="modal fade show d-block"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">

          {/* HEADER */}
          <div className="modal-header">
            <h5 className="modal-title">Provider Details</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          {/* BODY */}
          <div className="modal-body">

            {/* BASIC INFO */}
            <h6 className="text-primary">Basic Information</h6>
            <table className="table table-bordered table-sm">
              <tbody>
                <tr><th>Name</th><td>{provider.name || "N/A"}</td></tr>
                <tr><th>Email</th><td>{provider.email_id || "N/A"}</td></tr>
                <tr><th>Contact</th><td>{provider.contact_number || "N/A"}</td></tr>
                <tr><th>Alternate Contact</th><td>{provider.alternate_contact_number || "N/A"}</td></tr>
                <tr><th>Status</th><td>{provider.status || "N/A"}</td></tr>
                <tr><th>TIN</th><td>{provider.tin_number || "N/A"}</td></tr>
                <tr><th>User UID</th><td>{provider.user_uid || "N/A"}</td></tr>
                <tr><th>Created At</th><td>{provider.created_at || "N/A"}</td></tr>
                <tr><th>Bumiputera</th><td>{provider.bumiputra_status || "N/A"}</td></tr>
              </tbody>
            </table>

            {/* ADDRESS */}
            <h6 className="text-primary mt-3">Address</h6>
            <table className="table table-bordered table-sm">
              <tbody>
                <tr><th>Mailing Address</th><td>{provider.mailing_address || "N/A"}</td></tr>
                <tr><th>Billing Address</th><td>{provider.billing_address || "N/A"}</td></tr>
              </tbody>
            </table>

            {/* ✅ BANK DETAILS */}
            <h6 className="text-primary mt-3">Bank Details</h6>
            <table className="table table-bordered table-sm">
              <tbody>
                {bank ? (
                  <>
                    <tr>
                      <th>Account Holder</th>
                      <td>{bank.account_holder_name || "N/A"}</td>
                    </tr>

                    <tr>
                      <th>Bank Name</th>
                      <td>{bank.bank_name || "N/A"}</td>
                    </tr>

                    <tr>
                      <th>Account Number</th>
                      <td>{bank.bank_account_number || "N/A"}</td>
                    </tr>

                    <tr>
                      <th>Swift Code</th>
                      <td>{bank.swift_code || "N/A"}</td>
                    </tr>

                    <tr>
                      <th>Status</th>
                      <td>
                        <span
                          className={`badge ${
                            bank.status === "approved"
                              ? "bg-success"
                              : bank.status === "pending"
                              ? "bg-warning text-dark"
                              : "bg-danger"
                          }`}
                        >
                          {bank.status || "N/A"}
                        </span>
                      </td>
                    </tr>

                    <tr>
                      <th>Bank Created At</th>
                      <td>{bank.created_at || "N/A"}</td>
                    </tr>

                    <tr>
                      <th>Provider Bank ID</th>
                      <td>{bank.provider_bank_id || "N/A"}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan="2" className="text-center text-muted">
                      No Bank Details Available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* SERVICES */}
            <h6 className="text-primary mt-3">Services</h6>
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Location</th>
                  <th>Rate</th>
                </tr>
              </thead>

              <tbody>
                {provider.services?.length > 0 ? (
                  provider.services.map((s, i) => (
                    <tr key={i}>
                      <td>
                        {(s.category || s.item || s.type || s.description) ? (
                          <>
                            <div><b>Category:</b> {s.category || "N/A"}</div>
                            <div><b>Item:</b> {s.item || "N/A"}</div>
                            <div><b>Type:</b> {s.type || "N/A"}</div>
                            <div><b>Description:</b> {s.description || "N/A"}</div>
                          </>
                        ) : (
                          s.service_name || "N/A"
                        )}
                      </td>

                      <td>{s.location || "N/A"}</td>

                      <td>
  {(() => {
    const previousMatch = provider.previous_services?.find(ps =>
      ps.category_name === s.category &&
      ps.item_name === s.item &&
      ps.type_name === s.type &&
      ps.description_name === s.description &&
      ps.region === s.location?.split(",")[0]?.trim() &&
      ps.state === s.location?.split(",")[1]?.trim() &&
      ps.city === s.location?.split(",")[2]?.trim()
    );

    if (previousMatch && previousMatch.service_rate !== s.rate) {
      return (
        <>
          <span style={{ textDecoration: "line-through", color: "red" }}>
            {previousMatch.service_rate}
          </span>
          {" → "}
          <span style={{ fontWeight: "bold", color: "green" }}>
            {s.rate}
          </span>
        </>
      );
    }

    return s.rate ?? "N/A";
  })()}
</td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center">
                      No services available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

          </div>

          {/* FOOTER */}
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProviderDetailsModal;
