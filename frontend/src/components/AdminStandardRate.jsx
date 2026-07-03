import React, { useState, useEffect, useRef } from "react";
import "./css/AdminStandardRate.css";
import { apiGet, apiPost, apiPut, apiDelete, BASE_URLS } from "../api";

export default function AdminStandardRates() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // filters
  const [tradeFilter, setTradeFilter] = useState("");        // Category
  const [catFilter, setCatFilter] = useState("");            // Item
  const [typeFilter, setTypeFilter] = useState("");          // Type
  const [subTypeFilter, setSubTypeFilter] = useState("");    // Sub Type
  const [brandFilter, setBrandFilter] = useState("");        // Brand
  const [search, setSearch] = useState("");                  // Description
  const [clientFilter, setClientFilter] = useState("");      // Client


  // upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [descriptions, setDescriptions] = useState([]);

  // validations
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const cleanInput = (value = "") => value.replace(/[^A-Za-z0-9.,\-&() ]/g, "");
  const cleanNumber = (value = "") => value.replace(/[^0-9.]/g, "");

  const fetchCategories = async () => {
    try {
      const res = await apiGet("/api/category");
      setCategories(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Category fetch error", err);
    }
  };
  const fetchItems = async (categoryId) => {
    try {
      const res = await apiGet(`/api/items/${categoryId}`);
      setItems(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Items fetch error", err);
    }
  };
  const fetchTypes = async (categoryId, itemId) => {
    try {
      const res = await apiGet(
        `/api/types/filter?category_id=${categoryId}&item_id=${itemId}`
      );

      setTypes(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Types fetch error", err);
    }
  };

  const fetchDescriptions = async (
    categoryId,
    itemId,
    typeId
  ) => {
    try {
      const res = await apiGet(
        `/api/description/filter?category_id=${categoryId}&item_id=${itemId}&type_id=${typeId}`
      );

      setDescriptions(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Description fetch error", err);
    }
  };

  // form fields
  const emptyForm = {
    category: "",
    item: "",
    type: "",
    description: "",
    price_rm: "",
    client: "",
    sub_type: "",
    brand: "",
    unit: "",
    copper_pipe_price: "",
   
  };


  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  // Fetch Data
  useEffect(() => {
      fetchRates();
    }, [page,tradeFilter,catFilter,typeFilter,subTypeFilter,brandFilter,search,clientFilter,]);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const url =
      `/api/admin/standard_rates?page=${page}&limit=${limit}` +
      `&category=${tradeFilter || ""}` +
      `&item=${catFilter || ""}` +
      `&type=${typeFilter || ""}` +
      `&sub_type=${subTypeFilter || ""}` +
      `&brand=${brandFilter || ""}` +
      `&search=${search || ""}` +
      `&client=${clientFilter || ""}`;


      const res = await apiGet(url);
      setRates(Array.isArray(res.results) ? res.results : []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("Error fetching rates:", err);
      setRates([]);
      setTotal(0);
    }
    setLoading(false);
  };
  
  // ✅ DOWNLOAD CSV TEMPLATE
  const downloadCSVTemplate = () => {
    const headers = [
      "category",
      "item",
      "type",
      "sub_type",
      "brand",
      "description",
      "unit",
      "copper_pipe_price",
      "price_rm",
      "client",
    ];


    const csvContent = headers.join(",") + "\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "standard_rate_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Upload Excel
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return alert("Please select a CSV file");
      if (!uploadFile.name.toLowerCase().endsWith(".csv")) {
      alert("Only CSV files are allowed");
      setUploadFile(null);
      return;
      }
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);

      const res = await apiPost(
        `/api/admin/standard_rates/upload_excel`,
        fd
      );

      setUploadResult(res.result || res);
      alert("Upload Completed");
      setUploadFile(null);
      fetchRates();
    } catch (err) {
      alert(err.message || "Upload failed");
    }
  };
  const handleCancelUpload = () => {
    setUploadFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  // Open Add Modal
  const openAddModal = async () => {
    setForm(emptyForm);
    setIsEditing(false);
    setEditId(null);
    await fetchCategories();
    setShowModal(true);
  };

  const validateForm = () => {
    const newErrors = {};
    
      if (!form.category)
        newErrors.category = "Category is required";

      if (!form.item)
        newErrors.item = "Item is required";
      
      if (!form.type)
        newErrors.type = "Type is required";

      if (!form.description)
        newErrors.description = "Description is required";

      if (!form.client)
        newErrors.client = "Client is required";

      if (!form.price_rm || isNaN(form.price_rm))
        newErrors.price_rm = "Valid Price is required";

      setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Open Edit Modal
  const openEditModal = (row) => {
    setIsEditing(true);
    setEditId(row.id);

    setForm({
      ...emptyForm,
      ...row,

      // show actual text values
      category: row.category || "",
      item: row.item || "",
      type: row.type || "",
      description: row.description || "",
    });

    setErrors({});
    setShowModal(true);
  };


  const handleSave = async () => {
    if (!validateForm()) return;

    try {

      let res;

      const payload = {
        ...form,
        client: cleanInput(form.client),
        brand: cleanInput(form.brand),
        sub_type: cleanInput(form.sub_type),
        unit: cleanInput(form.unit),

        category:
          categories.find(
            (c) => c.category_id == form.category
          )?.category_name || form.category,

        item:
          items.find(
            (i) => i.item_id == form.item
          )?.item_name || form.item,

        type:
          types.find(
            (t) => t.type_id == form.type
          )?.type_name || form.type,

        description:
          descriptions.find(
            (d) => d.description_id == form.description
          )?.description_name || form.description,
      };

      if (isEditing) {

        res = await apiPut(
          `/api/admin/standard_rates/${editId}`,
          payload
        );

      } else {

        res = await apiPost(
          `/api/admin/standard_rates`,
          payload
        );
      }

      if (res.success) {
        alert(res.message);
        setShowModal(false);
        fetchRates();

      } else {
        alert(res.message || "Record already exists");

      }

    } catch (err) {
      alert(err.message || "Operation failed");

    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure to delete this record?")) return;
    try {
      await apiDelete(`/api/admin/standard_rates/${id}`);
      fetchRates();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-3">Standard Rate Management (SOR)</h2>
      {/* TOP ACTIONS */}
      <div className="d-flex gap-2 mb-3">
        <button
          className="btn btn-outline-primary"
          onClick={downloadCSVTemplate}
        >
          Download CSV Template
        </button>

        <button className="btn btn-success" onClick={openAddModal}>
          Add New Rate
        </button>
      </div>
      {/* Excel Upload */}
      <div className="card p-3 mb-4">
        <h5>Upload CSV</h5>

        <form onSubmit={handleUpload}>
          {/* File input */}
          <div className="mb-2">
            <input
              type="file"
              accept=".csv"
              className="form-control"
              style={{ maxWidth: "350px" }}
              ref={fileInputRef}
              onChange={(e) => setUploadFile(e.target.files[0])}
            />
          </div>

          {/* Buttons like Add New Rate */}
          <div className="d-flex gap-2 mt-3 upload-btn-group">
            <button
              type="submit"
              className="btn btn-success"
              disabled={!uploadFile}
            >
              Upload
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleCancelUpload}
              disabled={!uploadFile}
            >
              Cancel
            </button>
          </div>

        </form>
      </div>



      {/* Table */}
      <div className="card p-3">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Sub Type</th>
                  <th>Brand</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th>Copper Price</th>
                  <th>Price (RM)</th>
                  <th>Client</th>
                  <th>Actions</th>
                </tr>

                {/* ✅ COLUMN FILTER ROW (UNCHANGED) */}
                <tr>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={tradeFilter}
                      onChange={(e) => {
                        setTradeFilter(cleanInput(e.target.value));
                        setPage(1);
                      }}
                    />
                  </th>

                  {/* Item */}
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={catFilter}
                      onChange={(e) => {
                        setCatFilter(cleanInput(e.target.value));
                        setPage(1);
                      }}
                    />
                  </th>

                  {/* Type */}
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={typeFilter}
                      onChange={(e) => {
                        setTypeFilter(cleanInput(e.target.value));
                        setPage(1);
                      }}
                    />
                  </th>

                  {/* Sub Type */}
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={subTypeFilter}
                      onChange={(e) => {
                        setSubTypeFilter(cleanInput(e.target.value));
                        setPage(1);
                      }}
                    />
                  </th>

                  {/* Brand */}
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={brandFilter}
                      onChange={(e) => {
                        setBrandFilter(cleanInput(e.target.value));
                        setPage(1);
                      }}
                    />
                  </th>

                  {/* Description */}
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={search}
                      onChange={(e) => {
                        setSearch(cleanInput(e.target.value));
                        setPage(1);
                      }}
                    />
                  </th>

                  {/* Unit (no filter) */}
                  <th></th>

                  {/* Copper Price (no filter) */}
                  <th></th>

                  {/* Price RM (no filter) */}
                  <th></th>

                  {/* Client */}
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={clientFilter}
                      onChange={(e) => {
                        setClientFilter(cleanInput(e.target.value));
                        setPage(1);
                      }}
                    />
                  </th>

                  {/* Actions */}
                  <th></th>
                </tr>

              </thead>

              <tbody>
                {rates.length === 0 && !loading ? (
                  <tr>
                    <td colSpan="11" className="text-center">
                      No data
                    </td>
                  </tr>
                ) : (
                  rates.map((row) => (
                    <tr key={row.id}>
                      <td>{row.category}</td>
                      <td>{row.item}</td>
                      <td>{row.type}</td>
                      <td>{row.sub_type}</td>
                      <td>{row.brand}</td>
                      <td>{row.description}</td>
                      <td>{row.unit}</td>
                      <td>{row.copper_pipe_price}</td>
                      <td>{row.price_rm}</td>
                      <td>{row.client}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-warning me-2"
                          onClick={() => openEditModal(row)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(row.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ✅ FIXED PAGINATION */}
            <div className="d-flex justify-content-center mt-3">
              <nav>
                <ul className="pagination">
                  <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => setPage(1)}>
                      &laquo;
                    </button>
                  </li>

                  <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      &lsaquo;
                    </button>
                  </li>

                  {(() => {
                    const totalPages = Math.ceil(total / limit) || 1;
                    const pages = [];

                    let start = Math.max(1, page - 2);
                    let end = Math.min(totalPages, page + 2);

                    if (start > 1) {
                      pages.push(
                        <li key={1} className="page-item">
                          <button className="page-link" onClick={() => setPage(1)}>
                            1
                          </button>
                        </li>
                      );
                      if (start > 2) {
                        pages.push(
                          <li key="s-ellipsis" className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        );
                      }
                    }

                    for (let i = start; i <= end; i++) {
                      pages.push(
                        <li
                          key={i}
                          className={`page-item ${i === page ? "active" : ""}`}
                        >
                          <button className="page-link" onClick={() => setPage(i)}>
                            {i}
                          </button>
                        </li>
                      );
                    }

                    if (end < totalPages) {
                      if (end < totalPages - 1) {
                        pages.push(
                          <li key="e-ellipsis" className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        );
                      }
                      pages.push(
                        <li key={totalPages} className="page-item">
                          <button
                            className="page-link"
                            onClick={() => setPage(totalPages)}
                          >
                            {totalPages}
                          </button>
                        </li>
                      );
                    }

                    return pages;
                  })()}

                  <li
                    className={`page-item ${
                      page === Math.ceil(total / limit) ? "disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setPage((p) => p + 1)}
                    >
                      &rsaquo;
                    </button>
                  </li>

                  <li
                    className={`page-item ${
                      page === Math.ceil(total / limit) ? "disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setPage(Math.ceil(total / limit))}
                    >
                      &raquo;
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rate-modal-content">
              <div className="rate-modal-header">
                <h4 className="rate-modal-title">
                  {isEditing ? "EDIT STANDARD RATE" : "ADD NEW RATE"}
                </h4>

              </div>

              <div className="modal-body rate-form-grid" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {Object.keys(form).map((key) => {
                  // ❌ HIDE THESE FIELDS
                  if (key === "source_row_number" || key === "extra_col" || key === "id") {
                    return null;
                  }
                  if (
                    isEditing &&
                    ["category", "item", "type", "description"].includes(key)
                  ) {
                    return (
                      <div className="mb-3" key={key}>
                        <label className="form-label fw-semibold">
                          {{
                            category: "Category",
                            item: "Item",
                            type: "Type",
                            description: "Description",
                          }[key]}
                        </label>

                        <input
                          type="text"
                          className="form-control readonly-input"
                          value={form[key] || ""}
                          disabled
                          style={{ cursor: "not-allowed" }}
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="mb-3" key={key}>
                      <label className="form-label fw-semibold">
                        {{
                          category: "Category",
                          item: "Item",
                          type: "Type",
                        }[key] || key.replace(/_/g, " ").toUpperCase()}

                        {[
                          "category",
                          "item",
                          "type",
                          "description",
                          "price_rm",
                          "client",
                        ].includes(key) && (
                          <span className="required-star"> *</span>
                        )}
                      </label>

                      {key === "category" ? (

                        <select
                          className={`form-control ${errors[key] ? "is-invalid" : ""}`}
                          value={form.category}
                          onChange={async (e) => {
                            const value = e.target.value;

                            setForm({
                              ...form,
                              category: value,
                              item: "",
                              type: "",
                              description: "",
                            });

                            setItems([]);
                            setTypes([]);
                            setDescriptions([]);

                            if (value) {
                              await fetchItems(value);
                            }
                          }}
                        >
                          <option value="">Select Category</option>

                          {categories.map((cat) => (
                            <option
                              key={cat.category_id}
                              value={cat.category_id}
                            >
                              {cat.category_name}
                            </option>
                          ))}
                        </select>

                      ) : key === "item" ? (

                        <select
                          className={`form-control ${errors[key] ? "is-invalid" : ""}`}
                          value={form.item}
                          disabled={!form.category}
                          onChange={async (e) => {
                            const value = e.target.value;

                            setForm({
                              ...form,
                              item: value,
                              type: "",
                              description: "",
                            });

                            setTypes([]);
                            setDescriptions([]);

                            if (value) {
                              await fetchTypes(form.category, value);
                            }
                          }}
                        >
                          <option value="">Select Item</option>

                          {items.map((item) => (
                            <option
                              key={item.item_id}
                              value={item.item_id}
                            >
                              {item.item_name}
                            </option>
                          ))}
                        </select>

                      ) : key === "type" ? (

                        <select
                          className={`form-control ${errors[key] ? "is-invalid" : ""}`}
                          value={form.type}
                          disabled={!form.item}
                          onChange={async (e) => {
                            const value = e.target.value;

                            setForm({
                              ...form,
                              type: value,
                              description: "",
                            });

                            setDescriptions([]);

                            if (value) {
                              await fetchDescriptions(
                                form.category,
                                form.item,
                                value
                              );
                            }
                          }}
                        >
                          <option value="">Select Type</option>

                          {types.map((type) => (
                            <option
                              key={type.type_id}
                              value={type.type_id}
                            >
                              {type.type_name}
                            </option>
                          ))}
                        </select>

                      ) : key === "description" ? (

                        <select
                          className={`form-control ${errors[key] ? "is-invalid" : ""}`}
                          value={form.description}
                          disabled={!form.type}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              description: e.target.value,
                            })
                          }
                        >
                          <option value="">Select Description</option>

                          {descriptions.map((desc) => (
                            <option
                              key={desc.description_id}
                              value={desc.description_id}
                            >
                              {desc.description_name}
                            </option>
                          ))}
                        </select>

                      ) : (

                        <input
                          className={`form-control ${errors[key] ? "is-invalid" : ""}`}
                          value={form[key] || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            let cleaned = value;

                              if (
                                  ["client", "brand", "sub_type"].includes(key)
                              ) {
                                  cleaned = cleanInput(value);
                              }

                              if (
                                  ["price_rm", "copper_pipe_price","unit"].includes(key)
                              ) {
                                  cleaned = cleanNumber(value);
                              }

                            setForm({
                              ...form,
                              [key]: cleaned,
                            });
                          }}
                        />

                      )}

                      {errors[key] && (
                        <div className="invalid-feedback">{errors[key]}</div>
                      )}
                    </div>
                  );
                })}
              </div>


              <div className="rate-modal-footer">

                <button type="button" className="btn btn-success rate-btn"
                onClick={handleSave}>Save</button>

                <button type="button" className="btn btn-warning rate-btn"
                  onClick={() => {
                    setForm(emptyForm);
                    setErrors({});
                  }}
                >
                  Reset
                </button>

                <button type="button" className="btn btn-danger rate-btn"
                  onClick={() => {
                    setShowModal(false);
                    setForm(emptyForm);
                    setErrors({});
                  }}
                >
                  Close
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}