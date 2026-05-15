import React, { useState, useEffect } from "react";
import "./css/setuppage.css";
import { apiGet, apiPost, apiPut, apiDelete } from "../src/api.js";

const CategoryPage = () => {
  const [formData, setFormData] = useState({
    CATEGORY_NAME: "",
    STATUS: "Active",
  });

  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({
    CATEGORY_NAME: "",
    STATUS: "",
  });

  // ===============================
  // Allow Only A-Z, 0-9, Hyphen
  // ===============================
  const cleanInput = (value) => {
    return value.replace(/[^A-Za-z0-9-.& ]/g, "");
  };

  // ===============================
  // Fetch All Categories
  // ===============================
  const fetchCategories = async () => {
    try {
      const data = await apiGet("/api/category");
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ===============================
  // Handle Add Input
  // ===============================
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "CATEGORY_NAME") {
      const cleanedValue = cleanInput(value);
      setFormData((prev) => ({ ...prev, [name]: cleanedValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ===============================
  // Handle Edit Input
  // ===============================
  const handleEditChange = (e) => {
    const { name, value } = e.target;

    if (name === "CATEGORY_NAME") {
      const cleanedValue = cleanInput(value);
      setEditingData((prev) => ({ ...prev, [name]: cleanedValue }));
    } else {
      setEditingData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ===============================
  // Add Category
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await apiPost("/api/category", {
        category_name: formData.CATEGORY_NAME,
        status: formData.STATUS,
      });

      if (response?.error) {
        alert("❌ " + response.error);
        return;
      }

      setFormData({ CATEGORY_NAME: "", STATUS: "Active" });
      fetchCategories();
      alert("✅ Category added successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Failed to add category.");
    }
  };

  // ===============================
  // Start Editing
  // ===============================
  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setEditingData({
      CATEGORY_NAME: cat.category_name,
      STATUS: cat.status,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({ CATEGORY_NAME: "", STATUS: "" });
  };

  // ===============================
  // Update Category
  // ===============================
  const handleUpdate = async (id) => {
    try {
      const response = await apiPut(`/api/category/${id}`, {
        category_name: editingData.CATEGORY_NAME,
        status: editingData.STATUS,
      });

      if (response?.error) {
        alert("❌ " + response.error);
        return;
      }

      setEditingId(null);
      fetchCategories();
      alert("✅ Category updated!");
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Failed to update.");
    }
  };

  // ===============================
  // Delete Category
  // ===============================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;

    try {
      await apiDelete(`/api/category/${id}`);
      fetchCategories();
      alert("✅ Category deleted!");
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Delete failed.");
    }
  };

  // ===============================
  // UI Rendering
  // ===============================
  return (
    <div className="setup-page">
      <div className="page-container">

        {/* ===== Add New Category ===== */}
        <div className="box-section form-box">
          <h2>Add New Category</h2>

          <form onSubmit={handleSubmit} className="form-create">

            {/* Header Row */}
            <div className="form-header-row">
              <div className="form-header-cell">CATEGORY NAME</div>
              <div className="form-header-cell">STATUS</div>
            </div>

            {/* Input Row */}
            <div className="combined-body">

              {/* CATEGORY NAME */}
              <div className="input-with-star">
                <input
                  type="text"
                  name="CATEGORY_NAME"
                  value={formData.CATEGORY_NAME}
                  onChange={handleChange}
                  placeholder="Enter Category"
                  required
                />
                <span className="required-star">★</span>
              </div>

              {/* STATUS */}
              <div className="input-with-star">
                <select
                  name="STATUS"
                  value={formData.STATUS}
                  onChange={handleChange}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="required-star">★</span>
              </div>

            </div>

            {/* Buttons */}
            <div className="form-actions">
              <button type="submit" className="btn-primary">Submit</button>

              <button
                type="button"
                className="btn-reset"
                onClick={() =>
                  setFormData({ CATEGORY_NAME: "", STATUS: "Active" })
                }
              >
                Reset
              </button>
            </div>

          </form>
        </div>

        {/* ===== Existing Categories ===== */}
        <div className="box-section table-box">
          <h2>Existing Categories</h2>

          <div className="table-wrapper">
            <div className="fixed-table">
              <table className="workorder-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <tr key={cat.id}>
                        {editingId === cat.id ? (
                          <>
                            <td>
                              <input
                                type="text"
                                name="CATEGORY_NAME"
                                value={editingData.CATEGORY_NAME}
                                onChange={handleEditChange}
                              />
                            </td>

                            <td>
                              <select
                                name="STATUS"
                                value={editingData.STATUS}
                                onChange={handleEditChange}
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            </td>

                            <td>
                              <button className="btn-save" onClick={() => handleUpdate(cat.id)}>Save</button>
                              <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{cat.category_name}</td>
                            <td>{cat.status}</td>

                            <td>
                              <button className="btn-edit" onClick={() => handleEdit(cat)}>Edit</button>
                              <button className="btn-delete" onClick={() => handleDelete(cat.id)}>Delete</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: "center", color: "#666" }}>
                        No data available
                      </td>
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

export default CategoryPage;
