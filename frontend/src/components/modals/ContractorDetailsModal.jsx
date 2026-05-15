import React from "react";

const ContractorDetailsModal = ({ contractor, onClose }) => {
  if (!contractor) return null;

   const bank = contractor.bank_details;

  return (
    <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">

          <div className="modal-header">
            <h5 className="modal-title">Company Details</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">

            <h6 className="text-primary">Company Info</h6>
            <table className="table table-bordered table-sm">
              <tbody>
                <tr><th>Company Name</th><td>{contractor.company_name || "N/A"}</td></tr>
                <tr><th>Email</th><td>{contractor.email_id || "N/A"}</td></tr>
                <tr><th>Contact</th><td>{contractor.contact_number || "N/A"}</td></tr>
                <tr><th>BRN</th><td>{contractor.brn_number || "N/A"}</td></tr>
                <tr><th>Status</th><td>{contractor.status || "N/A"}</td></tr>
                <tr><th>Company ID</th><td>{contractor.company_id || "N/A"}</td></tr>
                <tr><th>Bumiputera</th><td>{contractor.bumiputra_status || "N/A"}</td></tr>
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
                      <th>Bank details submiited At</th>
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
                {contractor.services?.length > 0 ? (
                  contractor.services.map((s, i) => (
                    <tr key={i}>
                      <td>{s.service_name || "N/A"}</td>
                      <td>{s.service_location || "N/A"}</td>
<td>
  {(() => {

    const previousMatch = contractor.previous_services?.find(ps => {

      const [city, state, region] =
        (s.service_location || "").split(",").map(v => v?.trim());

      return (
        ps.service_name === s.service_name &&
        ps.city === city &&
        ps.state === state &&
        ps.region === region
      );
    });

    // ✅ If rate changed → show approval style
    if (
      previousMatch &&
      previousMatch.service_rate !== s.service_rate
    ) {
      return (
        <>
          <span style={{ textDecoration: "line-through", color: "red" }}>
            {previousMatch.service_rate}
          </span>
          {" → "}
          <span style={{ fontWeight: "bold", color: "green" }}>
            {s.service_rate}
          </span>
        </>
      );
    }

    return s.service_rate ?? "N/A";
  })()}
</td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center">No services available</td>
                  </tr>
                )}
              </tbody>
            </table>

          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ContractorDetailsModal;
