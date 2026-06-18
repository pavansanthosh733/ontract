import React from "react";

function AuditDetailsModal({
  show,
  audit,
  onClose,
}) {
  if (!show || !audit) return null;

  const suggestedContractors =
    audit.suggested_contractors || [];

  const selectedContractor =
    audit.selected_contractor || {};

  const selectedIndex =
    suggestedContractors.findIndex(
      (c) =>
        Number(
          c.contractor_id
        ) ===
        Number(
          selectedContractor.contractor_id
        )
    ) + 1;

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-xl">

        <span
          className="modal-close"
          onClick={onClose}
        >
          ×
        </span>

        {/* ======================================
            HEADER
        ======================================= */}

        <div className="modal-header">
          Manual Assignment Audit
        </div>

        {/* ======================================
            AUDIT SUMMARY
        ======================================= */}

        <div className="audit-summary-card">

          <div className="kv-grid">

            <div className="kv-row">
              <span className="kv-label">
                Audit ID
              </span>

              <span className="kv-value">
                {audit.audit_id}
              </span>
            </div>

            <div className="kv-row">
              <span className="kv-label">
                Workorder
              </span>

              <span className="kv-value">
                {audit.workorder}
              </span>
            </div>

            <div className="kv-row">
              <span className="kv-label">
                Created At
              </span>

              <span className="kv-value">
                {new Date(
                  audit.created_at
                ).toLocaleString()}
              </span>
            </div>

            <div className="kv-row">
              <span className="kv-label">
                Assignment Reason
              </span>

              <span className="kv-value">
                {
                  audit.assignment_reason
                }
              </span>
            </div>

            <div className="kv-row">
              <span className="kv-label">
                Total Suggested
              </span>

              <span className="kv-value">
                {
                  suggestedContractors.length
                }{" "}
                Contractors
              </span>
            </div>

            <div className="kv-row">
              <span className="kv-label">
                Selected Position
              </span>

              <span className="kv-value">
                {selectedIndex} of{" "}
                {
                  suggestedContractors.length
                }
              </span>
            </div>

          </div>

        </div>

        {/* ======================================
            SELECTED CONTRACTOR
        ======================================= */}

        <div className="selected-card">

          <div className="section-title">
            Selected Contractor
          </div>

          <div className="kv-grid">

            <div className="kv-row">
              <span className="kv-label">
                Name
              </span>

              <span className="kv-value">
                {
                  selectedContractor.contractor_name
                }
              </span>
            </div>

            <div className="kv-row">
              <span className="kv-label">
                Contractor ID
              </span>

              <span className="kv-value">
                {
                  selectedContractor.contractor_id
                }
              </span>
            </div>

            <div className="kv-row">
              <span className="kv-label">
                City
              </span>

              <span className="kv-value">
                {
                  selectedContractor.city
                }
              </span>
            </div>

            <div className="kv-row">
              <span className="kv-label">
                Rate
              </span>

              <span className="kv-value">
                ₹
                {Number(
                  selectedContractor.rate || 0
                ).toFixed(2)}
              </span>
            </div>

            <div className="kv-row">
              <span className="kv-label">
                Rating
              </span>

              <span className="kv-value">
                ⭐
                {Number(
                  selectedContractor.rating || 0
                ).toFixed(1)}
              </span>
            </div>

          </div>

        </div>

        {/* ======================================
            CONTRACTORS TABLE
        ======================================= */}

        <div className="section-title mt-4">
          Suggested Contractors
        </div>

        <div className="audit-table-wrapper">

          <table className="audit-table">

            <thead>
              <tr>
                <th>S.No</th>
                <th>
                  Contractor Name
                </th>
                <th>City</th>
                <th>Rate</th>
                <th>Rating</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {suggestedContractors.map(
                (c, index) => {

                  const isSelected =
                    Number(
                      c.contractor_id
                    ) ===
                    Number(
                      selectedContractor.contractor_id
                    );

                  return (
                    <tr
                      key={
                        c.contractor_id
                      }
                      className={
                        isSelected
                          ? "selected-row"
                          : ""
                      }
                    >

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        {
                          c.contractor_name
                        }
                      </td>

                      <td>
                        {c.city}
                      </td>

                      <td>
                        ₹
                        {Number(
                          c.rate || 0
                        ).toFixed(2)}
                      </td>

                      <td>
                        ⭐
                        {Number(
                          c.rating || 0
                        ).toFixed(1)}
                      </td>

                      <td>
                        {isSelected
                          ? "✅ Selected"
                          : "-"}
                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>

      </div>
    </div>
  );
}

export default AuditDetailsModal;