import React, { useEffect, useState } from "react";
import { apiGet } from "../api";
import "./css/ManualAssignedWorkorders.css";
import AuditDetailsModal from "./modals/AuditDetailsModal";

function ManualAssignedWorkorders() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);

  // ✅ NEW: filter state — one key per column
  const [filters, setFilters] = useState({
    workorder: "",
    contractor: "",
    reason: "",
    suggestedCount: "",
    createdAt: "",
  });

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
     HANDLE FILTER CHANGE
  ===================================================== */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  /* =====================================================
     APPLY FILTERS
  ===================================================== */
  const filteredData = data.filter((row) => {
    const workorderMatch = (row.workorder || "")
      .toString()
      .toLowerCase()
      .includes(filters.workorder.toLowerCase());

    const contractorMatch = (row.selected_contractor?.contractor_name || "")
      .toLowerCase()
      .includes(filters.contractor.toLowerCase());

    const reasonMatch = (row.assignment_reason || "")
      .toLowerCase()
      .includes(filters.reason.toLowerCase());

    const suggestedCountMatch = (row.suggested_contractors?.length ?? "")
      .toString()
      .toLowerCase()
      .includes(filters.suggestedCount.toLowerCase());

    const createdAtMatch = row.created_at
      ? new Date(row.created_at)
          .toLocaleString()
          .toLowerCase()
          .includes(filters.createdAt.toLowerCase())
      : filters.createdAt === "";

    return (
      workorderMatch &&
      contractorMatch &&
      reasonMatch &&
      suggestedCountMatch &&
      createdAtMatch
    );
  });

  /* =====================================================
     HANDLE WORKORDER CLICK  - OPEN MODAL
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
          Manual Assigned Workorders Audit section
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

                  {/* ✅ NEW: FILTER ROW */}
                  <tr>
                    <th>
                      <input
                        type="text"
                        name="workorder"
                        placeholder="Filter workorder..."
                        value={filters.workorder}
                        onChange={handleFilterChange}
                        className="audit-filter-input"
                      />
                    </th>

                    <th>
                      <input
                        type="text"
                        name="contractor"
                        placeholder="Filter contractor..."
                        value={filters.contractor}
                        onChange={handleFilterChange}
                        className="audit-filter-input"
                      />
                    </th>

                    <th>
                      <input
                        type="text"
                        name="reason"
                        placeholder="Filter reason..."
                        value={filters.reason}
                        onChange={handleFilterChange}
                        className="audit-filter-input"
                      />
                    </th>

                    <th>
                      <input
                        type="text"
                        name="suggestedCount"
                        placeholder="Filter count..."
                        value={filters.suggestedCount}
                        onChange={handleFilterChange}
                        className="audit-filter-input"
                      />
                    </th>

                    <th>
                      <input
                        type="text"
                        name="createdAt"
                        placeholder="Filter date..."
                        value={filters.createdAt}
                        onChange={handleFilterChange}
                        className="audit-filter-input"
                      />
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {filteredData.length > 0 ? (
                    filteredData.map(
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
                    )
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-3 text-muted">
                        No matching records found
                      </td>
                    </tr>
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