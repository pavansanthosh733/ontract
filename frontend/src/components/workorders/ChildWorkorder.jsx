import React, { useState, useEffect } from "react";
import Select from "react-select";
import "./css/createworkorder.css";

// Backend base URL — injected at build time from VITE_BACKEND_URL.
// Empty string = same-origin (ALB host-header rules proxy /api/*).
const BASE = import.meta.env.VITE_BACKEND_URL ?? "";

const ChildWorkOrder = () => {
  const [workorderTypes, setWorkorderTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [workorderAreas, setWorkorderAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState("");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [ticketAssignmentType, setTicketAssignmentType] = useState("auto");
  const [images, setImages] = useState({});
  const [formData, setFormData] = useState({
    REQUESTED_TIME_CLOSING: "",
    REMARKS: "",
    RATE: 0,
    STATUS: "OPEN",
  });

  // ✅ Allow letters, numbers, spaces, and hyphens (-)
  const cleanInput = (value) => {
    return value.replace(/[^A-Za-z0-9\s-]/g, "");
  };

  // ✅ Fetch setup data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [typesRes, areasRes, clientsRes] = await Promise.all([
          fetch(`${BASE}/api/workorder-type`),
          fetch(`${BASE}/api/workorder-areas`),
          fetch(`${BASE}/api/workorders/standard-rates`),
        ]);

        const [typesData, areasData, clientsData] = await Promise.all([
          typesRes.json(),
          areasRes.json(),
          clientsRes.json(),
        ]);

        setWorkorderTypes(
          typesData.map((type) => ({
            value: type.workorder_type,
            label: type.workorder_type,
          }))
        );
        setWorkorderAreas(areasData);

        const uniqueClients = Array.from(
          new Set(clientsData.map((item) => item.client))
        );
        setClients(uniqueClients);
      } catch (error) {
        console.error("Error fetching workorder setup data:", error);
      }
    };
    fetchAll();
  }, []);

  // ✅ Handle input fields (restrict special characters only)
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const cleanedValue =
      type === "text" || name === "REMARKS" ? cleanInput(value) : value;

    setFormData({
      ...formData,
      [name]: type === "number" ? parseFloat(cleanedValue) : cleanedValue,
    });
  };

  // ✅ Reset form
  const handleReset = () => {
    setFormData({
      REQUESTED_TIME_CLOSING: "",
      REMARKS: "",
      RATE: 0,
      STATUS: "OPEN",
    });
    setSelectedTypes([]);
    setSelectedArea("");
    setSelectedClient("");
    setTicketAssignmentType("auto");
    setImages({});
  };

  // ✅ Image handling
  const handleImageChange = (type, files) => {
    if (!files?.length) return;
    const newFiles = Array.from(files);
    setImages((prev) => ({
      ...prev,
      [type]: [...(prev[type] || []), ...newFiles],
    }));
  };

  const removeImage = (type, index) => {
    setImages((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  // ✅ Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedTypes.length === 0) {
      alert("⚠️ Please select a Work Order Type.");
      return;
    }

    if (!selectedArea) {
      alert("⚠️ Please select a Work Order Area.");
      return;
    }

    if (!selectedClient) {
      alert("⚠️ Please select a Client.");
      return;
    }

    try {
      const genRes = await fetch(
        `${BASE}/api/workorders/generates?workorder_type=${selectedTypes[0].value}`
      );
      const { workorder } = await genRes.json();

      const formDataToSend = new FormData();
      formDataToSend.append("WORKORDER", workorder);
      formDataToSend.append(
        "WORKORDER_TYPE",
        selectedTypes.map((t) => t.value).join(",")
      );
      formDataToSend.append("WORKORDER_AREA", selectedArea);
      formDataToSend.append("STATUS", "OPEN");
      formDataToSend.append(
        "RATE",
        JSON.stringify({
          total_rate: parseFloat(formData.RATE),
          type_rates: { default: parseFloat(formData.RATE) },
        })
      );
      formDataToSend.append(
        "REQUESTED_TIME_CLOSING",
        formData.REQUESTED_TIME_CLOSING
      );
      formDataToSend.append("REMARKS", formData.REMARKS);
      formDataToSend.append("CLIENT", selectedClient);
      formDataToSend.append("ticket_assignment_type", ticketAssignmentType);

      Object.entries(images).forEach(([type, files]) => {
        files.forEach((file) => {
          formDataToSend.append(`images[${type}][]`, file);
        });
      });

      const res = await fetch(`${BASE}/api/workorders/`, {
        method: "POST",
        body: formDataToSend,
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error);

      alert(`✅ Workorder Created Successfully!\nWorkorder Number: ${workorder}`);
      handleReset();
    } catch (err) {
      console.error("Error creating workorder:", err);
      alert(
        `❌ Error: ${err.message || "Something went wrong while creating workorder."}`
      );
    }
  };

  return (
    <div className="page-container full-page">
      <h2 className="workorder-title">CREATE CHILD WORK ORDER</h2>

      <form onSubmit={handleSubmit} className="workorder-form">
        {/* --- Work Order Type & Area --- */}
        <div className="combined-row">
          <div className="combined-header">
            <div className="header-item">Work Order Type</div>
            <div className="header-item">Work Order Area</div>
          </div>
          <div className="combined-body">
            <div className="form-group required-wrapper">
              <Select
                options={workorderTypes}
                value={selectedTypes}
                onChange={(selected) =>
                  setSelectedTypes(selected ? [selected] : [])
                }
                placeholder="Select Work Order Type..."
                classNamePrefix="react-select"
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
              />
              <div className="required-star">★</div>
            </div>

            <div className="form-group required-wrapper">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(cleanInput(e.target.value))}
                required
              >
                <option value="">Select Area</option>
                {workorderAreas.map((area) => (
                  <option key={area.id} value={area.workorder_area}>
                    {area.workorder_area}
                  </option>
                ))}
              </select>
              <div className="required-star">★</div>
            </div>
          </div>
        </div>

        {/* --- Client & Assignment --- */}
        <div className="combined-row">
          <div className="combined-header">
            <div className="header-item">Client</div>
            <div className="header-item">Assignment Type</div>
          </div>
          <div className="combined-body">
            <div className="form-group required-wrapper">
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(cleanInput(e.target.value))}
                required
              >
                <option value="">Select Client</option>
                {clients.map((c, i) => (
                  <option key={i} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="required-star">★</div>
            </div>

            <div className="form-group required-wrapper">
              <select
                value={ticketAssignmentType}
                onChange={(e) => setTicketAssignmentType(e.target.value)}
              >
                <option value="auto">Auto</option>
                <option value="manual">Manual</option>
              </select>
              <div className="required-star">★</div>
            </div>
          </div>
        </div>

        {/* --- Date & Remarks --- */}
        <div className="combined-row">
          <div className="combined-header">
            <div className="header-item">Requested Time Closing</div>
            <div className="header-item">Remarks</div>
          </div>
          <div className="combined-body">
            <div className="form-group required-wrapper">
              <input
                type="datetime-local"
                name="REQUESTED_TIME_CLOSING"
                value={formData.REQUESTED_TIME_CLOSING}
                onChange={handleChange}
                required
              />
              <div className="required-star">★</div>
            </div>

            <div className="form-group">
              <input
                type="text"
                name="REMARKS"
                value={formData.REMARKS}
                onChange={handleChange}
                placeholder="Enter remarks"
              />
            </div>
          </div>
        </div>

        {/* --- Image Upload --- */}
        {selectedTypes.length > 0 && (
          <div className="combined-row">
            <div className="combined-header single-header">
              <div className="header-item">Upload Images</div>
            </div>
            <div className="combined-body image-upload-body">
              {selectedTypes.map((type) => (
                <div key={type.value} className="rate-input">
                  <div className="type-header">
                    <span className="type-label">{type.value}</span>
                    <label className="file-label small-upload">
                      📁 Upload
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="file-input-hidden"
                        onChange={(e) =>
                          handleImageChange(type.value, e.target.files)
                        }
                      />
                    </label>
                    {images[type.value]?.length > 0 && (
                      <span className="image-count">
                        ({images[type.value].length} file(s))
                      </span>
                    )}
                  </div>

                  {/* Preview */}
                  {images[type.value]?.length > 0 && (
                    <div className="image-preview-list">
                      {images[type.value].map((file, idx) => (
                        <div key={idx} className="image-preview-item">
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="preview-thumbnail"
                          />
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => removeImage(type.value, idx)}
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- Buttons --- */}
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Create Workorder
          </button>
          <button type="button" className="btn-reset" onClick={handleReset}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChildWorkOrder;