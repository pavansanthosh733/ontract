import React, { useEffect, useState } from "react";
import { apiGet } from "../api";
import "./css/ManualAssignedWorkorders.css";
import AuditDetailsModal from "./modals/AuditDetailsModal";

function ManualAssignedWorkorders() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);

  /* =====================================================
     FETCH AUDIT DATA
  ===================================================== */
  const fetchAuditData = async () => {
    try {
      setLoading(true);

      const res = await apiGet(
        "/api/workorders/assignment-audit"
      );

      console.log(
        "Audit Data:",
        res
      );

      setData(
        Array.isArray(res)
          ? res
          : []
      );
    } catch (err) {
      console.error(
        "Error fetching audit data:",
        err
      );

      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  /* =====================================================
     HANDLE WORKORDER CLICK
  ===================================================== */
  const handleWorkorderClick = (
    audit
  ) => {
    setSelectedAudit(audit);
    setShowModal(true);
  };

  /* =====================================================
     CLOSE MODAL
  ===================================================== */
  const closeModal = () => {
    setShowModal(false);
    setSelectedAudit(null);
  };

  /* =====================================================
     JSX
  ===================================================== */
  return (
    <div className="container-fluid my-5 px-0">

      <div className="audit-card mx-auto">

        <div className="audit-header">
          Manual Assigned Workorders Audit
        </div>

        <div className="audit-inner">

          {loading ? (
            <div className="text-center py-4">
              Loading...
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-4 text-muted">
              No audit records found
            </div>
          ) : (
            <div className="audit-table-wrapper">

              <table className="audit-table">

                <thead>
                  <tr>
                    <th>Workorder</th>
                    <th>
                      Selected Contractor
                    </th>
                    <th>Reason</th>
                    <th>
                      Suggested Count
                    </th>
                    <th>
                      Created At
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {data.map(
                    (row) => (
                      <tr
                        key={
                          row.audit_id
                        }
                      >

                        <td
                          className="workorder-link"
                          onClick={() =>
                            handleWorkorderClick(
                              row
                            )
                          }
                        >
                          {
                            row.workorder
                          }
                        </td>

                        <td>
                          {
                            row
                              .selected_contractor
                              ?.contractor_name
                          }
                        </td>

                        <td
                          className="reason-cell"
                        >
                          {
                            row.assignment_reason
                          }
                        </td>

                        <td>
                          {
                            row
                              .suggested_contractors
                              ?.length
                          }
                        </td>

                        <td>
                          {new Date(
                            row.created_at
                          ).toLocaleString()}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>

      {/* ==========================================
         MODAL
      ========================================== */}

      <AuditDetailsModal
        show={showModal}
        audit={
          selectedAudit
        }
        onClose={
          closeModal
        }
      />

    </div>
  );
}

export default ManualAssignedWorkorders;