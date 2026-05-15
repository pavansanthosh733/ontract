import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./css/workorderdetails.css";
import { apiGet, apiPost } from "../../api";

const WorkOrderDetails = () => {
  const { workorder } = useParams();
  const navigate = useNavigate();

  const [details, setDetails] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // FETCH DETAILS
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

  // HANDLE DROPDOWN
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "CONTRACTOR_NAME") {
      const selected = contractors.find((c) => c.full_name === value);

      setDetails((prev) => ({
        ...prev,
        CONTRACTOR_NAME: selected?.full_name || "",
        CONTRACTOR_RATE: selected?.rate || "",
        CONTRACTOR_ID: selected?.provider_id || "",
        CONTRACTOR_EMAIL: selected?.email_id || ""
      }));
    } else {
      setDetails((prev) => ({ ...prev, [name]: value }));
    }
  };

  // SAVE + SEND MAIL
  const handleSave = async () => {
    if (!details) return;

    if (!details.CONTRACTOR_NAME?.trim()) {
      window.alert("⚠️ Please select a contractor before assigning.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiPost(`/api/workorders/send-acceptance-mail/${workorder}`, {
        ...details
      });

      window.alert("✅ Email sent to contractor!");
    } catch (err) {
      setError(err.message);
      window.alert("❌ Error: " + err.message);
    } finally {
      setSaving(false);
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
          {/* Row 1 */}
          <div className="wo-header-row">
            <div>Work Order</div>
            <div>Category</div>
            <div>Region</div>
          </div>
          <div className="wo-value-row">
            <div>{details.workorder}</div>
            <div>{details.category_name}</div>
            <div>{details.region_name}</div>
          </div>

          {/* Row 2 */}
          <div className="wo-header-row">
            <div>Status</div>
            <div>Remarks</div>
            <div>Client</div>
          </div>
          <div className="wo-value-row">
            <div>{details.status}</div>
            <div>{details.remarks}</div>
            <div>{details.client}</div>
          </div>

          {/* Contractor List (VISIBLE BY DEFAULT) */}
          <div className="wo-header-row">
            <div>Contractor</div>
          </div>
          <div className="wo-value-row">
            <select
  name="CONTRACTOR_NAME"
  value={details.CONTRACTOR_NAME || ""}
  onChange={handleChange}
  style={{ width: "100%" }}
>
  <option value="">-- Select Contractor --</option>

  {contractors.map((c) => (
    <option key={c.provider_id} value={c.full_name}>
      {c.full_name} ({c.service_locations})
    </option>
  ))}
</select>
          </div>

        </div>
      </div>

      <div className="wo-actions-center">
        <button className="blue-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "💾 Assign Contractor"}
        </button>
        <button className="blue-btn cancel" onClick={handleCancel}>
          ✖ Cancel
        </button>
      </div>
    </div>
  );
};

export default WorkOrderDetails;