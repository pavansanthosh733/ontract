import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./css/workorderdetails.css";
import { apiGet, apiPost } from "../../api";

const WorkOrderDetails = () => {
  const { workorder } = useParams();
  const navigate = useNavigate();

  const [details, setDetails] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    name: "",
    maxPrice: "",
  });

  /* please check the filters */

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await apiGet(`/api/workorders/code/${workorder}`);
        data.RATE = data.RATE || { total_rate: 0, type_rates: {} };
        setDetails(data);

        if (data.region_name && data.category_name) {
          const cdata = await apiGet(
            `/api/workorders/contractors/by-region-category/${data.region_name}/${data.category_name}`
          );
          console.log("Contractors fetched:", cdata);
          setContractors(cdata || []);
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDetails();
  }, [workorder]);

  const filteredContractors = useMemo(() => {
    const nameFilter = filters.name.trim().toLowerCase();
    // const locationFilter = filters.location.trim().toLowerCase();
    const maxPrice = filters.maxPrice.trim();

    return [...contractors]
      .filter((c) => {
       const searchableName = `${c.company_name || ""} ${c.full_name || ""}`.toLowerCase();
        // const serviceLocations = (c.service_locations || "").toLowerCase();
        const rateValue = parseFloat(c.rate ?? 0);

        const nameOk =
  !nameFilter || searchableName.includes(nameFilter);
        // const locationOk =
        //   !locationFilter || serviceLocations.includes(locationFilter);
        const priceOk =
          !maxPrice || (!Number.isNaN(rateValue) && rateValue <= Number(maxPrice));

        return nameOk  && priceOk;
      })
      .sort((a, b) => {
        const rateA = parseFloat(a.rate ?? 0);
        const rateB = parseFloat(b.rate ?? 0);
        return rateA - rateB;
      });
  }, [contractors, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveAssignmentAudit = async (selectedContractor, reason) => {
  const payload = {
    workorder: details.workorder,
    category: details.category_name,
    region: details.region_name,

    suggested_contractors: contractors.map((c) => ({
      contractor_id: c.provider_id,
      contractor_name: c.company_name || c.full_name,
      city: c.city,
      rate: c.rate,
      rating: c.average_rating,
    })),

    selected_contractor: {
      contractor_id: selectedContractor.provider_id,
      contractor_name:
        selectedContractor.company_name ||
        selectedContractor.full_name,
      city: selectedContractor.city,
      rate: selectedContractor.rate,
      rating: selectedContractor.average_rating,
    },

    assignment_reason: reason,
  };

  await apiPost(
    "/api/workorders/assignment-audit",
    payload
  );
};

  const handleAssignWithReason = async (contractor) => {
  const reason = window.prompt(
    "Please enter reason for assigning this contractor:"
  );

  if (!reason || !reason.trim()) {
    return;
  }

  await saveAssignmentAudit(contractor, reason);

  await handleAssignContractor(contractor);
};

  const handleAssignContractor = async (contractor) => {
    if (!details) return;

    setSavingId(contractor.provider_id);
    setError(null);

    const payload = {
      ...details,
      CONTRACTOR_NAME: contractor.full_name || "",
      CONTRACTOR_RATE: contractor.rate || "",
      CONTRACTOR_ID: contractor.provider_id || "",
      CONTRACTOR_EMAIL: contractor.email_id || "",
    };

    try {
      await apiPost(`/api/workorders/send-acceptance-mail/${workorder}`, payload);
      setDetails(payload);
      window.alert(`✅ Contractor assigned and email sent to ${contractor.full_name}!`);
    } catch (err) {
      setError(err.message);
      window.alert("❌ Error: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleCancel = () => navigate(-1);

  if (loading) return <div className="center">Loading details...</div>;
  if (error) return <div className="center error">Error: {error}</div>;
  if (!details) return <div className="center">No details found</div>;

  return (
    <div className="workorders-container">
      <div className="section-card">
        <div className="section-header left-header">
          Work Order Details - {details.workorder}
        </div>

        <div className="section-content">
          <div className="wo-header-row">
            <div>Work Order</div>
            <div>Category</div>
            <div>Item</div>
          </div>
          <div className="wo-value-row">
            <div>{details.workorder}</div>
            <div>{details.category_name}</div>
            <div>{details.item_name}</div>
          </div>

          <div className="wo-header-row">
            <div>Type</div>
            <div>Description</div>
            <div>Region</div>
          </div>
          <div className="wo-value-row">
            <div>{details.type_name}</div>
            <div>{details.description_name}</div>
            <div>{details.region_name}</div>
          </div>

          <div className="wo-header-row">
            <div>State</div>
            <div>City</div>
            <div>Address</div>
          </div>
          <div className="wo-value-row">
            <div>{details.state_name}</div>
            <div>{details.city_name}</div>
            <div>{details.address}</div>
          </div>

          <div className="wo-header-row">
            <div>Status</div>
            <div>Client</div>
            <div>Remarks</div>
          </div>
          <div className="wo-value-row">
            <div>{details.status}</div>
            <div>{details.client}</div>
            <div>{details.remarks}</div>
          </div>

          <div className="contractor-section">
            <div className="wo-header-row">
              <div>Providers</div>
            </div>

            <div className="contractor-filters">
              <input
                type="text"
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                placeholder="filter by provider name"
                className="contractor-filter-input"
              />

              <input
                type="number"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                placeholder=" filter by price"
                className="contractor-filter-input"
                min="0"
              />
            </div>

            <div className="contractor-table-wrap">
              <table className="contractor-table">
                <thead>
                  <tr>
                    <th>Provider Name</th>
                  
                    <th>Price</th>
                    <th>Rating</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContractors.length > 0 ? (
                    filteredContractors.map((c) => (
                      <tr key={c.provider_id}>
                        <td>{c.company_name ||c.full_name}</td>
                       
                        <td>
                          ₹ {Number.parseFloat(c.rate || 0).toFixed(2)}
                        </td>
                        <td>
                          ⭐ {Number.parseFloat(c.average_rating || 0).toFixed(1)}
                          ({c.total_ratings || 0})
                        </td>
                        <td>
                          <button
                            className="blue-btn small-btn"
                            onClick={() => handleAssignWithReason(c)}
                            disabled={savingId === c.provider_id}
                          >
                            {savingId === c.provider_id ? "Assigning..." : "Assign"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center" }}>
                        No contractors found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="wo-actions-center">
        <button className="blue-btn cancel" onClick={handleCancel}>
          ✖ Cancel
        </button>
      </div>
    </div>
  );
};

export default WorkOrderDetails;