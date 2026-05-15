import React, { useState, useEffect } from "react";
import "./css/createworkorder.css";
import Swal from "sweetalert2";
import { apiGet, BASE_URL } from "../../api";
import { useAdmin } from "../../context/AdminContext";

const CreateWorkOrder = () => {
  const { admin } = useAdmin();
  console.log("🧠 Admin from AdminContext (CreateWorkOrder):", admin);

  // ===== CLIENT / ASSIGNMENT / REMARKS / TIME / ADDRESS / STATUS =====
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedRate, setSelectedRate] = useState(null);
  const [ticketAssignmentType, setTicketAssignmentType] = useState("auto");
  const [address, setAddress] = useState("");

  const [formData, setFormData] = useState({
    REQUESTED_TIME_CLOSING: "",
    REMARKS: "",
    STATUS: "OPEN",
  });

  // ===== CATEGORY → ITEM → TYPE → DESCRIPTION =====
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [descriptionsDrop, setDescriptionsDrop] = useState([]);
  const [detailedDescription, setDetailedDescription] = useState("");

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedDescriptionId, setSelectedDescriptionId] = useState("");

  // ===== REGION (ZONE) → STATE → CITY =====
  const [regions, setRegions] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [clientWarningShown, setClientWarningShown] = useState(false);

  // ===== IMAGES =====
  const [images, setImages] = useState([]);

  // ===============================
  // Initial load
  // ===============================
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const cat = await apiGet("/api/category");
        setCategories(Array.isArray(cat) ? cat : []);

        const regs = await apiGet("/api/region/");
        setRegions(Array.isArray(regs) ? regs : []);

        
      } catch (err) {
        console.error("Initial load error:", err);
        Swal.fire("Error", "Failed to load initial data", "error");
      }
    };

    loadInitial();
  }, []);

  const fetchClients = async (
    categoryId,
    itemId,
    typeId,
    descriptionId
  ) => {
    try {
      if (!categoryId || !itemId || !typeId || !descriptionId) {
        setClients([]);
        return;
      }

      const url =
        `/api/workorders/standard-rates?` +
        `category_id=${categoryId}&` +
        `item_id=${itemId}&` +
        `type_id=${typeId}&` +
        `description_id=${descriptionId}`;

      const dataClients = await apiGet(url);

      // 🚨 NO CLIENT CASE
      if (!dataClients || dataClients.length === 0) 
        { setClients([]); setSelectedClient(""); 
          setSelectedRate(null); 
          Swal.fire({ icon: "warning", 
            title: "No Client Found", 
            text: "There is no client for this workscope", 
          }); 
          return; 
        }

      setClients(dataClients);

    } catch (err) {
      console.error("Client fetch error:", err);
      setClients([]);
    }
  };


   useEffect(() => {
    fetchClients(
      selectedCategoryId,
      selectedItemId,
      selectedTypeId,
      selectedDescriptionId
    );
  }, [
    selectedCategoryId,
    selectedItemId,
    selectedTypeId,
    selectedDescriptionId,
  ]);

  // ===============================
  // CATEGORY → ITEM → TYPE → DESCRIPTION
  // ===============================
  const fetchItemsForCategory = async (categoryId) => {
    if (!categoryId) return setItems([]);
    const data = await apiGet(`/api/items/${categoryId}`);
    setItems(Array.isArray(data) ? data : []);
  };

  const fetchTypesForCategoryItem = async (categoryId, itemId) => {
    if (!categoryId || !itemId) return setTypes([]);
    const data = await apiGet(
      `/api/types/filter?category_id=${categoryId}&item_id=${itemId}`
    );
    setTypes(Array.isArray(data) ? data : []);
  };

  const fetchDescriptionsForCategoryItemType = async (
    categoryId,
    itemId,
    typeId
  ) => {
    if (!categoryId || !itemId || !typeId)
      return setDescriptionsDrop([]);
    const data = await apiGet(
      `/api/description/filter?category_id=${categoryId}&item_id=${itemId}&type_id=${typeId}`
    );
    setDescriptionsDrop(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (selectedCategoryId) fetchItemsForCategory(selectedCategoryId);
    else setItems([]);

    setSelectedItemId("");
    setSelectedTypeId("");
    setSelectedDescriptionId("");
    setTypes([]);
    setDescriptionsDrop([]);
    setClients([]);
    setSelectedClient(""); 
  }, [selectedCategoryId]);

  useEffect(() => {
    if (selectedItemId)
      fetchTypesForCategoryItem(selectedCategoryId, selectedItemId);
    else setTypes([]);

    setSelectedTypeId("");
    setSelectedDescriptionId("");
    setDescriptionsDrop([]);
    setClients([]);
    setSelectedClient(""); 
  }, [selectedItemId]);

  useEffect(() => {
    if (selectedTypeId)
      fetchDescriptionsForCategoryItemType(
        selectedCategoryId,
        selectedItemId,
        selectedTypeId
      );
    else setDescriptionsDrop([]);

    setSelectedDescriptionId("");
    setClients([]);
    setSelectedClient(""); 
  }, [selectedTypeId]);

  // ===============================
  // REGION → STATE → CITY
  // ===============================
  const fetchStatesForRegion = async (regionId) => {
    if (!regionId) return setStates([]);
    const data = await apiGet(`/api/state/by-region/${regionId}`);
    setStates(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (selectedRegionId) fetchStatesForRegion(selectedRegionId);
    else setStates([]);

    setSelectedStateId("");
    setSelectedCityId("");
    setCities([]);
  }, [selectedRegionId]);

  const fetchCityForRegionState = async (regionId, stateId) => {
    if (!regionId || !stateId) return setCities([]);
    const data = await apiGet(
      `/api/city/by-region-state?region_id=${regionId}&state_id=${stateId}`
    );
    setCities(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (selectedRegionId && selectedStateId)
      fetchCityForRegionState(selectedRegionId, selectedStateId);
    else setCities([]);

    setSelectedCityId("");
  }, [selectedStateId]);

  // ===============================
  // Helpers
  // ===============================
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleReset = () => window.location.reload();

  const handleImageChange = (files) => {
    if (!files?.length) return;
    setImages((prev) => [...prev, ...Array.from(files)]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // ===============================
  // SUBMIT (WITH DUPLICATE HANDLING)
  // ===============================
  const handleSubmit = async (e, ignoreDuplicate = false) => {
    e.preventDefault();

    try {
      const formDataToSend = new FormData();

      formDataToSend.append("ADMIN_ID", admin.admin_id);
      formDataToSend.append("CATEGORY_ID", selectedCategoryId);
      formDataToSend.append("ITEM_ID", selectedItemId);
      formDataToSend.append("TYPE_ID", selectedTypeId);
      formDataToSend.append("DESCRIPTION_ID", selectedDescriptionId);

      formDataToSend.append("REGION_ID", selectedRegionId);
      formDataToSend.append("STATE_ID", selectedStateId);
      formDataToSend.append("CITY_ID", selectedCityId);

      formDataToSend.append("CLIENT", selectedClient);
      formDataToSend.append( "STANDARD_RATE_ID", selectedRate?.standard_rate_id || "" );
      formDataToSend.append( "RATE_SNAPSHOT", selectedRate?.price_rm || "" );
      formDataToSend.append("ADDRESS", address);
      formDataToSend.append(
        "REQUESTED_TIME_CLOSING",
        formData.REQUESTED_TIME_CLOSING
      );
      formDataToSend.append("REMARKS", formData.REMARKS);
      formDataToSend.append("DETAILED_DESCRIPTION",detailedDescription || "");
      formDataToSend.append("STATUS", formData.STATUS);
      
      formDataToSend.append(
        "ticket_assignment_type",
        ticketAssignmentType
      );

      if (ignoreDuplicate) {
        formDataToSend.append("ignore_duplicate", "true");
      }

      images.forEach((file) => {
        formDataToSend.append("images[]", file);
      });

      const res = await fetch(`${BASE_URL}/api/workorders/`, {
        method: "POST",
        body: formDataToSend,
        headers: { "ngrok-skip-browser-warning": "true" },
      });

      const data = await res.json();

      // 🔥 DUPLICATE POPUP
      if (data?.error_type === "DUPLICATE_WORKORDER") {
        const listHtml = data.existing_workorders
          .map(
            (wo) =>
              `<li style="color:red;font-weight:bold">${wo}</li>`
          )
          .join("");

        const result = await Swal.fire({
          title: "Duplicate Workorder Found",
          html: `
            <b>Existing Open Workorders:</b>
            <ul style="margin-top:10px;text-align:left">
              ${listHtml}
            </ul>
            <br/>
            Do you still want to create a new workorder?
          `,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yeah , Okay",
          cancelButtonText: "Cancel",
        });

        if (result.isConfirmed) {
          handleSubmit(e, true);
        } else {
          window.location.reload();
        }
        return;
      }


      if (!res.ok) {
        throw new Error(data?.error || "Failed to create workorder");
      }

          const workorderNumber = data?.workorder?.workorder;

          await Swal.fire({
            title: "✅ Workorder Created",
            html: `
              <div style="font-size:14px;">
                <b>Workorder Number:</b><br/>
                <span style="color:green;font-size:18px;font-weight:bold;">
                  ${workorderNumber}
                </span>
              </div>
            `,
            icon: "success",
            confirmButtonText: "OK",
          });

      window.location.reload();
    } catch (err) {
      console.error(err);
      Swal.fire("❌ Error", err.message, "error");
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
<div className="page-container full-page create-workorder-page">

      <strong className="workorder-title">CREATE WORK ORDER</strong>

      <form onSubmit={handleSubmit} className="workorder-form">
        {/* CATEGORY - ITEM - TYPE - DESCRIPTION */}
        <div className="form-group full-width combined-row">
          <div className="combined-header">
            <div className="header-item">work Category</div>
            <div className="header-item">Work Item</div>
            <div className="header-item">Work Type</div>
            <div className="header-item">Work Description</div>
          </div>

          <div className="combined-body">
            <div className="form-group required-wrapper">
              <select
                required
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
              <span className="required-star">&#9733;</span>
            </div>

            <div className="form-group required-wrapper">
              <select
                required
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                disabled={!selectedCategoryId}
              >
                <option value="">Select Item</option>
                {items.map((it) => (
                  <option key={it.id} value={it.item_id}>
                    {it.item_name}
                  </option>
                ))}
              </select>
              <span className="required-star">★</span>
            </div>

            <div className="form-group required-wrapper">
              <select
                required
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                disabled={!selectedItemId}
              >
                <option value="">Select Type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.type_id}>
                    {t.type_name}
                  </option>
                ))}
              </select>
              <span className="required-star">★</span>
            </div>

            <div className="form-group required-wrapper">
              <select
                required
                value={selectedDescriptionId}
                onChange={(e) => setSelectedDescriptionId(e.target.value)}
                disabled={!selectedTypeId}
              >
                <option value="">Select Description</option>
                {descriptionsDrop.map((d) => (
                  <option key={d.id} value={d.description_id}>
                    {d.description_name}
                  </option>
                ))}
              </select>
              <span className="required-star">★</span>
            </div>
          </div>
        </div>

        {/* REGION / STATE / CITY / CLIENT */}
        <div className="form-group full-width combined-row">
          <div className="combined-header">
            <div className="header-item">Zone</div>
            <div className="header-item">State</div>
            <div className="header-item">City</div>
            <div className="header-item">Client</div>
          </div>

          <div className="combined-body">
            <div className="form-group required-wrapper">
              <select
                required
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value)}
              >
                <option value="">Select Zone</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.region_id}>
                    {r.region_name}
                  </option>
                ))}
              </select>
              <span className="required-star">★</span>
            </div>

            <div className="form-group required-wrapper">
              <select
                required
                value={selectedStateId}
                onChange={(e) => setSelectedStateId(e.target.value)}
                disabled={!selectedRegionId}
              >
                <option value="">Select State</option>
                {states.map((s) => (
                  <option key={s.id} value={s.state_id}>
                    {s.state_name}
                  </option>
                ))}
              </select>
              <span className="required-star">★</span>
            </div>

            <div className="form-group required-wrapper">
              <select
                required
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)}
                disabled={!selectedStateId}
              >
                <option value="">Select City</option>
                {cities.map((c) => (
                  <option key={c.city_id} value={c.city_id}>
                    {c.city_name}
                  </option>
                ))}
              </select>
              <span className="required-star">★</span>
            </div>

            <div className="form-group required-wrapper">
              <select
                required
                value={selectedClient}
                onChange={(e) => { 
                  const selected = clients.find( (c) => c.client === e.target.value );
                   setSelectedClient(e.target.value);
                    setSelectedRate(selected); 
                  }}
              >
                <option value="">Select Client</option>
                  {clients.map((cl) => ( 
                    <option key={cl.standard_rate_id} 
                      value={cl.client} 
                    > {cl.client} 
                </option> ))}
              </select>
              <span className="required-star">★</span>
            </div>
          </div>
        </div>

        {/* ADDRESS / ASSIGNMENT / TIME / REMARKS */}
        <div className="form-group full-width combined-row">
          <div className="combined-header">
            <div className="header-item">Address</div>
            <div className="header-item">Assignment Type</div>
            <div className="header-item">Requested Time Closing</div>
            <div className="header-item">Remarks</div>
          </div>

          <div className="combined-body">
            <div className="form-group required-wrapper">
              <input
                type="text"
                placeholder="Enter Address"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <span className="required-star">★</span>
            </div>

            <div className="form-group required-wrapper">
              <select
                required
                value={ticketAssignmentType}
                onChange={(e) => setTicketAssignmentType(e.target.value)}
              >
                <option value="auto">Auto</option>
                <option value="manual">Manual</option>
              </select>
              <span className="required-star">★</span>
            </div>

            <div className="form-group required-wrapper">
              <input
                type="datetime-local"
                name="REQUESTED_TIME_CLOSING"
                min={getMinDateTime()}
                required
                value={formData.REQUESTED_TIME_CLOSING}
                onChange={handleChange}
              />
              <span className="required-star">★</span>
            </div>

            <div className="form-group required-wrapper">
              <input
                type="text"
                name="REMARKS"
                placeholder="Enter Remarks"
                required
                value={formData.REMARKS}
                onChange={handleChange}
              />
              <span className="required-star">★</span>
            </div>
          </div>
        </div>
        
        <div className="form-group full-width combined-row">
          <div className="combined-header single-header">
            <div className="header-item">Detailed Description</div>
          </div>

          <div className="combined-body">
            <div className="form-group">
              <textarea
                placeholder="Detailed Description"
                value={detailedDescription}
                onChange={(e) =>
                  setDetailedDescription(e.target.value)
                }
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* IMAGE UPLOAD */}
        <div className="form-group full-width combined-row">
          <div className="combined-header single-header">
            <div className="header-item">Upload Images</div>
          </div>

          <div className="combined-body image-upload-body">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageChange(e.target.files)}
              className="file-input"
            />

            {images.length > 0 && (
              <div className="image-preview-list">
                {images.map((file, idx) => (
                  <div key={idx} className="image-preview-item">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="preview-thumbnail"
                    />
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeImage(idx)}
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BUTTONS */}
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

export default CreateWorkOrder;