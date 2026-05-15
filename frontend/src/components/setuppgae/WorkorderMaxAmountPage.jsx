import React, { useState, useEffect } from "react";
import "./css/workordermaxamount.css";
import { apiGet, apiPost, apiPut, apiDelete } from "../../api";
import { useAdmin } from "../../context/AdminContext";

const WorkorderMaxAmountPage = () => {
  const { admin } = useAdmin();

  const [formData, setFormData] = useState({
    max_amount: "",
    currency_code: "INR",
    status: "Active",
  });

  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({
    max_amount: "",
    currency_code: "INR",
    status: "Active",
  });

  // ================= FETCH =================
  const fetchMaxAmount = async () => {
    try {
      const res = await apiGet("/api/workorder-max-amount");
      if (res?.success && res?.data) {
        setRecords(Array.isArray(res.data) ? res.data : [res.data]);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error(err);
      setRecords([]);
    }
  };

  useEffect(() => {
    fetchMaxAmount();
  }, []);

  // ================= HANDLERS =================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingData((p) => ({ ...p, [name]: value }));
  };

  // ================= CREATE =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiPost("/api/workorder-max-amount", {
        ...formData,
        created_by: admin?.admin_id || "SYSTEM",
      });
      alert("✅ Max amount created");
      setFormData({ max_amount: "", currency_code: "INR", status: "Active" });
      fetchMaxAmount();
    } catch {
      alert("❌ Create failed");
    }
  };

  // ================= EDIT =================
  const handleEdit = (row) => {
    setEditingId(row.id);
    setEditingData({
      max_amount: row.max_amount,
      currency_code: row.currency_code,
      status: row.status,
    });
  };

  const handleCancel = () => setEditingId(null);

  // ================= UPDATE =================
  const handleUpdate = async (id) => {
    try {
      await apiPut(`/api/workorder-max-amount/${id}`, {
        ...editingData,
        updated_by: admin?.admin_id || "SYSTEM",
      });
      alert("✅ Updated");
      setEditingId(null);
      fetchMaxAmount();
    } catch {
      alert("❌ Update failed");
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await apiDelete(`/api/workorder-max-amount/${id}`);
      alert("✅ Deleted");
      fetchMaxAmount();
    } catch {
      alert("❌ Delete failed");
    }
  };

  return (
    <div className="workorder-max-page">
      <div className="workorder-max-container">

        {/* ============ FORM ============ */}
        <div className="workorder-max-box">
          <h2>WORKORDER MAX AMOUNT SETUP</h2>

          <form className="workorder-max-form" onSubmit={handleSubmit}>
            <div className="workorder-max-header">
              <div>MAX AMOUNT</div>
              <div>CURRENCY</div>
              <div>STATUS</div>
            </div>

            <div className="workorder-max-row">
              <div className="workorder-max-field">
                <input
                  type="number"
                  name="max_amount"
                  value={formData.max_amount}
                  onChange={handleChange}
                  placeholder="Enter Max Amount"
                  required
                />
                <span className="workorder-max-star">★</span>
              </div>

              <div className="workorder-max-field">
                <select
                  name="currency_code"
                  value={formData.currency_code}
                  onChange={handleChange}
                >
                  <option value="INR">INR</option>
                  <option value="MYR">MYR</option>
                </select>
                <span className="workorder-max-star">★</span>
              </div>

              <div className="workorder-max-field">
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="workorder-max-star">★</span>
              </div>
            </div>

            <div className="workorder-max-actions">
              <button className="workorder-max-btn-primary">Submit</button>
              <button
                type="button"
                className="workorder-max-btn-reset"
                onClick={() =>
                  setFormData({ max_amount: "", currency_code: "INR", status: "Active" })
                }
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* ============ TABLE ============ */}
        <div className="workorder-max-box">
          <h2>EXISTING RECORDS</h2>

          <div className="workorder-max-table-wrapper">
            <div className="workorder-max-table-scroll">
                <table className="workorder-max-table">
                <thead>
                    <tr>
                    <th>Max Amount</th>
                    <th>Currency</th>
                    <th>Status</th>
                    <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {records.length > 0 ? (
                    records.map((row) => (
                        <tr key={row.id}>
                        {editingId === row.id ? (
                            <>
                            <td>
                                <input
                                type="number"
                                name="max_amount"
                                value={editingData.max_amount}
                                onChange={handleEditChange}
                                />
                            </td>
                            <td>
                                <select
                                name="currency_code"
                                value={editingData.currency_code}
                                onChange={handleEditChange}
                                >
                                <option value="INR">INR</option>
                                <option value="MYR">MYR</option>
                                </select>
                            </td>
                            <td>
                                <select
                                name="status"
                                value={editingData.status}
                                onChange={handleEditChange}
                                >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                </select>
                            </td>
                            <td>
                                <button
                                className="workorder-max-btn-save"
                                onClick={() => handleUpdate(row.id)}
                                >
                                Save
                                </button>
                                <button
                                className="workorder-max-btn-cancel"
                                onClick={handleCancel}
                                >
                                Cancel
                                </button>
                            </td>
                            </>
                        ) : (
                            <>
                            <td>{row.max_amount}</td>
                            <td>{row.currency_code}</td>
                            <td>{row.status}</td>
                            <td>
                                <button
                                className="workorder-max-btn-edit"
                                onClick={() => handleEdit(row)}
                                >
                                Edit
                                </button>
                                <button
                                className="workorder-max-btn-delete"
                                onClick={() => handleDelete(row.id)}
                                >
                                Delete
                                </button>
                            </td>
                            </>
                        )}
                        </tr>
                    ))
                    ) : (
                    <tr>
                        <td colSpan="4" align="center">No data available</td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WorkorderMaxAmountPage;