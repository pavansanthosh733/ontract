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
        Number(c.contractor_id) ===
        Number(selectedContractor.contractor_id)
    ) + 1;

  return (
    <div className="audit-details-modal-overlay">

      <div className="audit-details-modal-box audit-details-modal-xl">

        <span
          className="audit-details-modal-close"
          onClick={onClose}
        >
          ×
        </span>

        {/* ======================================
            HEADER for WORKORDER + AUDIT ID  done
        ====================================== */}

        <div className="audit-details-modal-header">
          Manual Assignment Audit
        </div>

        {/* ======================================
            AUDIT SUMMARY
        ====================================== */}

        <div className="audit-details-summary-card">

          <div className="audit-details-kv-grid">

            <div className="audit-details-kv-row">
              <span className="audit-details-kv-label">
                Audit ID
              </span>

              <span className="audit-details-kv-value">
                {audit.audit_id}
              </span>
            </div>

            <div className="audit-details-kv-row">
              <span className="audit-details-kv-label">
                Workorder
              </span>

              <span className="audit-details-kv-value audit-details-nowrap">
                {audit.workorder}
              </span>
            </div>

            <div className="audit-details-kv-row">
              <span className="audit-details-kv-label">
                Created At
              </span>

              <span className="audit-details-kv-value">
                {new Date(
                  audit.created_at
                ).toLocaleString()}
              </span>
            </div>

            <div className="audit-details-kv-row">
              <span className="audit-details-kv-label">
                Assignment Reason
              </span>

              <span className="audit-details-kv-value">
                {audit.assignment_reason}
              </span>
            </div>

            <div className="audit-details-kv-row">
              <span className="audit-details-kv-label">
                Total Suggested
              </span>

              <span className="audit-details-kv-value">
                {suggestedContractors.length} Contractors
              </span>
            </div>

            <div className="audit-details-kv-row">
              <span className="audit-details-kv-label">
                Selected Position
              </span>

              <span className="audit-details-kv-value">
                {selectedIndex} of {suggestedContractors.length}
              </span>
            </div>

          </div>

        </div>

        {/* ======================================
            SELECTED CONTRACTOR
        ====================================== */}

        <div className="audit-details-selected-card">

          <div className="audit-details-section-title">
            Selected Contractor
          </div>

          <div className="audit-details-kv-grid">

            <div className="audit-details-kv-row">
              <span className="audit-details-kv-label">
                Name
              </span>

              <span className="audit-details-kv-value">
                {selectedContractor.contractor_name}
              </span>
            </div>

            <div className="audit-details-kv-row">
              <span className="audit-details-kv-label">
                Contractor ID
              </span>

              <span className="audit-details-kv-value">
                {selectedContractor.contractor_id}
              </span>
            </div>

            <div className="audit-details-kv-row">
              <span className="audit-details-kv-label">
                City
              </span>

              <span className="audit-details-kv-value">
                {selectedContractor.city}
              </span>
            </div>

            <div className="audit-details-kv-row">
              <span className="audit-details-kv-label">
                Rate
              </span>

              <span className="audit-details-kv-value">
                ₹
                {Number(
                  selectedContractor.rate || 0
                ).toFixed(2)}
              </span>
            </div>

            <div className="audit-details-kv-row">
              <span className="audit-details-kv-label">
                Rating
              </span>

              <span className="audit-details-kv-value">
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
        ====================================== */}

        <div className="audit-details-section-title audit-details-mt-4">
          Suggested Contractors
        </div>

        <div className="audit-details-table-wrapper">

          <table className="audit-details-table">

            <thead>
              <tr>
                <th>S.No</th>
                <th>Contractor Name</th>
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
                    Number(c.contractor_id) ===
                    Number(
                      selectedContractor.contractor_id
                    );

                  return (
                    <tr
                      key={c.contractor_id}
                      className={
                        isSelected
                          ? "audit-details-selected-row"
                          : ""
                      }
                    >

                      <td>{index + 1}</td>

                      <td>
                        {c.contractor_name}
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