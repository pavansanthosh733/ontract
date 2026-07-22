import React from "react";

/*hello */

const normalizeText = (value) =>
  (value ?? "").toString().trim().replace(/\s+/g, " ");

const formatRate = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toFixed(2);
};

const parseLocation = (location) => {
  const parts = normalizeText(location)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return {
    region: parts[0] || "",
    state: parts[1] || "",
    city: parts[2] || "",
  };
};

const buildLocation = (region, state, city) =>
  [region, state, city].filter(Boolean).join(", ");

const findPreviousMatch = (currentService, previousServices = []) => {
  const currentLocation = parseLocation(currentService.location);

  return previousServices.find((ps) => {
    return (
      normalizeText(ps.category_name) === normalizeText(currentService.category) &&
      normalizeText(ps.item_name) === normalizeText(currentService.item) &&
      normalizeText(ps.type_name) === normalizeText(currentService.type) &&
      normalizeText(ps.description_name) === normalizeText(currentService.description) &&
      normalizeText(buildLocation(ps.region, ps.state, ps.city)) ===
        normalizeText(currentService.location)
    );
  });
};

const ContractorDetailsModal = ({ contractor, onClose }) => {
  if (!contractor) return null;

  const bank = contractor.bank_details;

  return (
    <div
      className="modal fade show d-block"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
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
                <tr>
                  <th>Company Name</th>
                  <td>{contractor.company_name || "N/A"}</td>
                </tr>

                <tr>
                  <th>Name</th>
                  <td>{contractor.name || "N/A"}</td>
                </tr>
                <tr>
                  <th>Mailing Address</th>
                  <td>{contractor.mailing_address || "N/A"}</td>
                </tr>
                <tr>
                  <th>Billing Address</th>
                  <td>{contractor.billing_address || "N/A"}</td>
                </tr>
                <tr>
                  <th>Contact</th>
                  <td>{contractor.contact_number || "N/A"}</td>
                </tr>
                <tr>
                  <th>BRN</th>
                  <td>{contractor.brn_number || "N/A"}</td>
                </tr>
                <tr>
                  <th>TIN NUMBER</th>
                  <td>{contractor.tin_number || "N/A"}</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>{contractor.status || "N/A"}</td>
                </tr>
                <tr>
                  <th>Company ID</th>
                  <td>{contractor.company_id || "N/A"}</td>
                </tr>
                <tr>
                  <th>Bumiputera</th>
                  <td>{contractor.bumiputra_status || "N/A"}</td>
                </tr>
              </tbody>
            </table>

            <h6 className="text-primary mt-3">Bank Details</h6>
            <table className="table table-bordered table-sm">
              <tbody>
                {bank ? (
                  <>
                    <tr>
                      <th>Account Holder</th>
                      <td>{bank.account_holder_name || bank.holder_name || "N/A"}</td>
                    </tr>
                    <tr>
                      <th>Bank Name</th>
                      <td>{bank.bank_name || "N/A"}</td>
                    </tr>
                    <tr>
                      <th>Account Number</th>
                      <td>{bank.account_number || "N/A"}</td>
                    </tr>
                    <tr>
                      <th>Swift Code</th>
                      <td>{bank.swift_code || "N/A"}</td>
                    </tr>

                    <tr>
                      <th>Bank details submitted At</th>
                      <td>{bank.created_at || "N/A"}</td>
                    </tr>
                    <tr>
                      <th>Provider Bank ID</th>
                      <td>{bank.provider_bank_id || bank.company_bank_id || "N/A"}</td>
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
            <table className="table table-bordered table-sm align-middle">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {contractor.services?.length > 0 ? (
                  contractor.services.map((s, i) => {
                    const previousMatch = findPreviousMatch(
                      s,
                      contractor.previous_services || []
                    );

                    const previousRate = previousMatch?.service_rate;
                    const currentRate = s.rate;

                    const currentRateNum =
                      currentRate === null || currentRate === undefined || currentRate === ""
                        ? null
                        : Number(currentRate);

                    const previousRateNum =
                      previousRate === null || previousRate === undefined || previousRate === ""
                        ? null
                        : Number(previousRate);

                    const hasDiff =
                      previousRateNum !== null &&
                      currentRateNum !== null &&
                      previousRateNum !== currentRateNum;

                    return (
                      <tr key={i}>
                        <td>{s.category || "N/A"}</td>
                        <td>{s.item || "N/A"}</td>
                        <td>{s.type || "N/A"}</td>
                        <td>{s.description || "N/A"}</td>
                        <td>{s.location || "N/A"}</td>
                        <td>
                          {hasDiff ? (
                            <>
                              <span style={{ textDecoration: "line-through", color: "red" }}>
                                {formatRate(previousRateNum)}
                              </span>
                              {" → "}
                              <span style={{ fontWeight: "bold", color: "green" }}>
                                {formatRate(currentRateNum)}
                              </span>
                            </>
                          ) : (
                            formatRate(currentRateNum)
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">
                      No services available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* <h6 className="text-primary mt-3">Previous Services</h6>
            <table className="table table-bordered table-sm align-middle">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Previous Rate</th>
                  <th>Backup At</th>
                </tr>
              </thead>
              <tbody>
                {contractor.previous_services?.length > 0 ? (
                  contractor.previous_services.map((ps, i) => (
                    <tr key={i}>
                      <td>{ps.category_name || "N/A"}</td>
                      <td>{ps.item_name || "N/A"}</td>
                      <td>{ps.type_name || "N/A"}</td>
                      <td>{ps.description_name || "N/A"}</td>
                      <td>
                        {buildLocation(ps.region, ps.state, ps.city) || "N/A"}
                      </td>
                      <td>{formatRate(ps.service_rate)}</td>
                      <td>{ps.backup_at || "N/A"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center">
                      No previous services available
                    </td>
                  </tr>
                )}
              </tbody>
            </table> */}
          </div>

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

export default ContractorDetailsModal;