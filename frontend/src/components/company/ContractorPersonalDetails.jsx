import React, { useState, useEffect,useRef } from "react";
import "./css/CompanyProfile.css";
import { apiGet, apiPost } from "../../api";
import { BASE_URL, BASE_URLS,  apiPut, apiDelete } from "../../api";
import { useContractor } from "../../context/ContractorContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

function ContractorPersonalDetails() {
const { contractor } = useContractor() || {};

  // console.log("User from context to edit:",contractor);
  const navigate = useNavigate();
  const loggedRef = useRef(false);
  if (!loggedRef.current && contractor) {
  // console.log("USER FROM CONTEXT:", contractor);
  loggedRef.current = true;
}

  /* ================= STATES ================= */
  const [profile, setProfile] = useState(null);
  const [servicesList, setServicesList] = useState([]);
  const [idTypes, setIdTypes] = useState([]);
  const [mailingPostalCode, setMailingPostalCode] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [locationServiceList, setLocationServiceList] = useState([]);
  const [regions, setRegions] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkedPostcodes, setCheckedPostcodes] = useState({});
  const [sameAsMailing, setSameAsMailing] = useState(false);

  /* ===== CATEGORY → ITEM → TYPE → DESCRIPTION ===== */
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [descriptions, setDescriptions] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [itemName, setItemName] = useState("");
  const [typeName, setTypeName] = useState("");
  const [descriptionName, setDescriptionName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemId, setItemId] = useState("");
  const [typeId, setTypeId] = useState("");

const [formData, setFormData] = useState({
  company_name: "",
  brn_number: "",
  tin_number: "",
  bumiputera: '', 
  mailing_address: "",
  billing_address: "",
  contact_number: "",
  alternate_contact: "",
  contact_person: "",
  email_id: "",
});




  /* ================= INITIAL LOAD ================= */

  /* ================= PREFILL FROM PROFILE API ================= */
useEffect(() => {
  apiGet("/api/category")
    .then(data => {
      setCategories(data || []);
      setServicesList(data || []);
    })
    .catch(() => {
      setCategories([]);
      setServicesList([]);
    });
}, []);

  useEffect(() => {
    if (sameAsMailing) {
      setFormData(prev => ({
        ...prev,
        billing_address: prev.mailing_address
      }));

      setBillingPostalCode(mailingPostalCode);
    }
  }, [sameAsMailing, mailingPostalCode, formData.mailing_address]);


  useEffect(() => {
    if (contractor) fetchProfile();
  }, [contractor]);

 // 🔥 Auto-load dropdowns when editing profile
useEffect(() => {
  if (!locationServiceList.length || !regions.length || !categories.length) return;

  locationServiceList.forEach(async (item, idx) => {

    /* ================= REGION → STATES ================= */
    if (
      item.region &&
      (!item.states || item.states.length === 0)
    ) {
      const reg = regions.find(r => r.region_name === item.region);

      if (reg) {
        const states = await apiGet(`/api/state/by-region/${reg.region_id}`);

        setLocationServiceList(prev => {
          const copy = [...prev];
          if (!copy[idx]) return prev;

          copy[idx].region_id = reg.region_id;
          copy[idx].states = states || [];
          return copy;
        });
      }
    }

    /* ================= STATE → CITIES ================= */
    if (
      item.region &&
      item.state &&
      (!item.cities || item.cities.length === 0)
    ) {
      const reg = regions.find(r => r.region_name === item.region);
      const st =
        item.states?.find(s => s.state_name === item.state);

      if (reg && st) {
        const cities = await apiGet(
          `/api/city/by-region-state?region_id=${reg.region_id}&state_id=${st.state_id}`
        );

        setLocationServiceList(prev => {
          const copy = [...prev];
          if (!copy[idx]) return prev;

          copy[idx].state_id = st.state_id;
          copy[idx].cities = cities || [];
          return copy;
        });
      }
    }

    /* ================= CATEGORY → ITEMS ================= */
    if (
      item.category_name &&
      (!item.items || item.items.length === 0)
    ) {
      const cat = categories.find(
        c => c.category_name === item.category_name
      );

      if (cat) {
        const items = await apiGet(`/api/items/${cat.category_id}`);

        setLocationServiceList(prev => {
          const copy = [...prev];
          if (!copy[idx]) return prev;

          copy[idx].category_id = cat.category_id;
          copy[idx].items = items || [];
          return copy;
        });
      }
    }

    /* ================= ITEM → TYPES ================= */
    if (
      item.category_name &&
      item.item_name &&
      (!item.types || item.types.length === 0)
    ) {
      const cat = categories.find(
        c => c.category_name === item.category_name
      );

      const it = item.items?.find(
        i => i.item_name === item.item_name
      );

      if (cat && it) {
        const types = await apiGet(
          `/api/types/filter?category_id=${cat.category_id}&item_id=${it.item_id}`
        );

        setLocationServiceList(prev => {
          const copy = [...prev];
          if (!copy[idx]) return prev;

          copy[idx].item_id = it.item_id;
          copy[idx].types = types || [];
          return copy;
        });
      }
    }

    /* ================= TYPE → DESCRIPTIONS ================= */
    if (
      item.category_name &&
      item.item_name &&
      item.type_name &&
      (!item.descriptions || item.descriptions.length === 0)
    ) {
      const cat = categories.find(
        c => c.category_name === item.category_name
      );

      const it = item.items?.find(
        i => i.item_name === item.item_name
      );

      const tp = item.types?.find(
        t => t.type_name === item.type_name
      );

      if (cat && it && tp) {
        const descriptions = await apiGet(
          `/api/description/filter?category_id=${cat.category_id}&item_id=${it.item_id}&type_id=${tp.type_id}`
        );

        setLocationServiceList(prev => {
          const copy = [...prev];
          if (!copy[idx]) return prev;

          copy[idx].type_id = tp.type_id;
          copy[idx].descriptions = descriptions || [];
          return copy;
        });
      }
    }
  });
}, [locationServiceList, regions, categories]);


  useEffect(() => {
    apiGet("/api/region/").then(setRegions).catch(() => setRegions([]));
    
    apiGet("/api/state/id-types").then(setIdTypes).catch(() => setIdTypes([]));
  }, []);

  /* ================= FILE HANDLERS ================= */
  const fetchItemsByCategory = async (categoryId) => {
  if (!categoryId) return setItems([]);
  const data = await apiGet(`/api/items/${categoryId}`);
  setItems(data || []);
};

const fetchTypesByCategoryItem = async (categoryId, itemId) => {
  if (!categoryId || !itemId) return setTypes([]);
  const data = await apiGet(
    `/api/types/filter?category_id=${categoryId}&item_id=${itemId}`
  );
  setTypes(data || []);
};

const fetchDescriptions = async (categoryId, itemId, typeId) => {
  if (!categoryId || !itemId || !typeId) return setDescriptions([]);
  const data = await apiGet(
    `/api/description/filter?category_id=${categoryId}&item_id=${itemId}&type_id=${typeId}`
  );
  setDescriptions(data || []);
};

const handleCategoryChange = async (e) => {
  const id = e.target.value;
  const selected = categories.find(c => c.category_id == id);

  setCategoryId(id);
  setCategoryName(selected?.category_name || "");

  setItemId(""); setItemName("");
  setTypeId(""); setTypeName("");
  setDescriptionName("");

  setItems([]); setTypes([]); setDescriptions([]);
  await fetchItemsByCategory(id);
};


const handleItemChange = async (e) => {
  const id = e.target.value;
  const selected = items.find(i => i.item_id == id);

  setItemId(id);
  setItemName(selected?.item_name || "");

  setTypeId(""); setTypeName("");
  setDescriptionName("");

  setTypes([]); setDescriptions([]);
  await fetchTypesByCategoryItem(categoryId, id);
};


const handleTypeChange = async (e) => {
  const id = e.target.value;
  const selected = types.find(t => t.type_id == id);

  setTypeId(id);
  setTypeName(selected?.type_name || "");
  setDescriptionName("");

  await fetchDescriptions(categoryId, itemId, id);
};



const handleProfileImageChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  const maxSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    setErrors(prev => ({ ...prev, profileImage: "JPEG/PNG/GIF only" }));
    return;
  }

  if (file.size > maxSize) {
    setErrors(prev => ({ ...prev, profileImage: "Max 5MB allowed" }));
    return;
  }

  setErrors(prev => ({ ...prev, profileImage: null }));
  setProfileImage(file);
};

const handleCertificateChange = (e) => {
  const newFiles = Array.from(e.target.files || []);
  if (!newFiles.length) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf"
  ];

  const maxSize = 10 * 1024 * 1024;

  const validFiles = [];

  for (const file of newFiles) {
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        certificate: "JPEG/PNG/GIF/PDF only"
      }));
      return;
    }

    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        certificate: "Each file must be max 10MB"
      }));
      return;
    }

    validFiles.push(file);
  }

  setErrors(prev => ({
    ...prev,
    certificate: null
  }));

  // 🔥 append instead of overwrite
  setCertificates(prev => [...prev, ...validFiles]);

  // 🔥 allow selecting same file again
  e.target.value = "";
};

const fetchProfile = async () => {
  try {
    const data = await apiPost("/api/contractor/company_profile", { email: contractor.email_id });
    console.log('the data from api for contractor update ',data);

    setProfile(data);

setFormData({
  company_name: data.company_name || "",
  brn_number: data.brn_number || "",
  tin_number: data.tin_number || "",
  bumiputera: data.bumiputra_status?.toLowerCase() === "yes" ? "yes" : "no",

  mailing_address: (data.mailing_address || "").replace(/,\s*\d{5}$/, ""),
  billing_address: (data.billing_address || "").replace(/,\s*\d{5}$/, ""),

  contact_number: data.contact_number || "",
  alternate_contact: data.alternate_contact_number || "",

  contact_person: data.name || "",
  email_id: data.email || contractor.email_id,
});

// extract postal codes
const mailingMatch = (data.mailing_address || "").match(/(\d{5})$/);
const billingMatch = (data.billing_address || "").match(/(\d{5})$/);

setMailingPostalCode(mailingMatch ? mailingMatch[1] : "");
setBillingPostalCode(billingMatch ? billingMatch[1] : "");



    if (Array.isArray(data.services)) {
      setLocationServiceList(
        data.services.map(s => ({
          region: s.region || "",
          region_id: s.region_id || null,

          state: s.state || "",
          state_id: s.state_id || null,

          city: s.city || "",
          city_id: s.city_id || null,

          category_id: s.category_id || "",
          category_name: s.category_name || "",

          item_id: s.item_id || "",
          item_name: s.item_name || "",

          type_id: s.type_id || "",
          type_name: s.type_name || "",

          description_id: s.description_id || "",
          description_name: s.description_name || "",

          price: s.service_rate || "",

          states: [],
          cities: [],
          items: [],
          types: [],
          descriptions: []
        }))
      );
    }
  } catch (err) {
    console.error(err);
  }
};


  useEffect(() => {
  if (!profile || !categoryName) return;

  const cat = categories.find(c => c.category_name === categoryName);
  if (!cat) return;

  setCategoryId(cat.category_id);
  fetchItemsByCategory(cat.category_id);
}, [profile, categories]);

useEffect(() => {
  if (!itemName || !items.length) return;

  const it = items.find(i => i.item_name === itemName);
  if (!it) return;

  setItemId(it.item_id);
  fetchTypesByCategoryItem(categoryId, it.item_id);
}, [items]);

useEffect(() => {
  if (!typeName || !types.length) return;

  const t = types.find(tp => tp.type_name === typeName);
  if (!t) return;

  setTypeId(t.type_id);
  fetchDescriptions(categoryId, itemId, t.type_id);
}, [types]);


  /* ================= HELPERS ================= */
  const fetchStates = async (regionId, index) => {
    try {
      const data = await apiGet(`/api/state/by-region/${regionId}`);
      setLocationServiceList(prev => {
        const updated = [...prev];
        updated[index].states = data || [];
        return updated;
      });
    } catch {
      //
    }
  };


const handleChange = async (index, field, value) => {
  const list = [...locationServiceList];
  const updated = { ...list[index] };

if (field === "region") {
  const found = regions.find(r => r.region_name === value.name);

  updated.region = value.name;
  updated.region_id = found?.region_id || null;

  updated.state = "";
  updated.state_id = null;
  updated.city = "";
  updated.city_id = null;

  updated.states = found
    ? await apiGet(`/api/state/by-region/${found.region_id}`)
    : [];

  updated.cities = [];
}


if (field === "state") {
  const found = updated.states.find(s => s.state_name === value.name);

  updated.state = value.name;
  updated.state_id = found?.state_id || null;

  updated.city = "";
  updated.city_id = null;

  updated.cities = found
    ? await fetchCitiesByRegionState(updated.region_id, found.state_id)
    : [];
}



if (field === "city") {

  updated.city = value.name;
  const selectedCity = updated.cities.find(c => c.city_name === value.name);
  updated.city_id = selectedCity?.city_id || 1;
  console.log("UPDATED CITY =>", updated);
}


  if (field === "price") updated.price = value;

  if (field === "category") {
    updated.category_id = value.id;
    updated.category_name = value.name;
    updated.items = await apiGet(`/api/items/${value.id}`);
    updated.types = [];
    updated.descriptions = [];
  }

  if (field === "item") {
    updated.item_id = value.id;
    updated.item_name = value.name;
    updated.types = await apiGet(`/api/types/filter?category_id=${updated.category_id}&item_id=${value.id}`);
  }

  if (field === "type") {
    updated.type_id = value.id;
    updated.type_name = value.name;
    updated.descriptions = await apiGet(`/api/description/filter?category_id=${updated.category_id}&item_id=${updated.item_id}&type_id=${value.id}`);
  }

if (field === "description") {
  const found = updated.descriptions.find(d => d.description_name === value);

  updated.description_name = value;
  updated.description_id = found?.description_id || found?.id || null;
}


  list[index] = updated;
  setLocationServiceList(list);
};


const handleAddLocationService = () => {
  setLocationServiceList(prev => [
    ...prev,
    {
      region: "",
      region_id: null,
      state: "",
      state_id: null,
      city: "",
      city_id: null,
      price: "",
      category_id: "",
      category_name: "",
      item_id: "",
      item_name: "",
      type_id: "",
      type_name: "",
      description_id: "",
      description_name: "",
      states: [],
      cities: [],
      items: [],
      types: [],
      descriptions: []
    }
  ]);
};

  const handleRemoveLocationService = (index) => {
    const list = [...locationServiceList];
    list.splice(index, 1);
    setLocationServiceList(list);
  };


const fetchCitiesByRegionState = async (regionId, stateId) => {
  if (!regionId || !stateId) return [];
  return await apiGet(
    `/api/city/by-region-state?region_id=${regionId}&state_id=${stateId}`
  );
};
const handleFormChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
};

const validateProfile = () => {

  const mobileRegex = /^[0-9]{10}$/;
  const addressRegex = /^[A-Za-z0-9\s,./#'’()-]{10,200}$/;
  const individualTINRegex = /^IG\d{9,11}$/;
  const companyTINRegex = /^[A-Z]\d{10,11}$/;

  // Company Name
  if (!formData.company_name?.trim()) {
    alert('Company name is required.');
    return false;
  }

  // Bumiputera
  if (!formData.bumiputera) {
    alert('Please select Bumiputera status.');
    return false;
  }

  // BRN
  if (!formData.brn_number?.trim()) {
    alert('BRN number is required.');
    return false;
  }

  // TIN
  if (!formData.tin_number) {
    alert('TIN number is required.');
    return false;
  } else {

    const formattedTIN =
      formData.tin_number.trim().toUpperCase();

    const isValidTIN =
      individualTINRegex.test(formattedTIN) ||
      companyTINRegex.test(formattedTIN);

    if (!isValidTIN) {
      alert(
        'Invalid Malaysia TIN format. Example: IG1150020000 or C1234567890'
      );
      return false;
    }
  }

  // Mailing Postal
  if (!mailingPostalCode) {
    alert('Mailing postal code is required.');
    return false;
  }

  if (!/^\d{5}$/.test(mailingPostalCode)) {
    alert('Mailing postal code must be 5 digits.');
    return false;
  }

  // Billing Postal
  if (!billingPostalCode) {
    alert('Billing postal code is required.');
    return false;
  }

  if (!/^\d{5}$/.test(billingPostalCode)) {
    alert('Billing postal code must be 5 digits.');
    return false;
  }

  // Mailing Address
  if (!formData.mailing_address?.trim()) {
    alert('Mailing address is required.');
    return false;
  }

  if (formData.mailing_address.trim().length < 10) {
    alert('Mailing address must be at least 10 characters long.');
    return false;
  }

  if (!addressRegex.test(formData.mailing_address)) {
    alert('Mailing address contains invalid characters.');
    return false;
  }

  // Billing Address
  if (!formData.billing_address?.trim()) {
    alert('Billing address is required.');
    return false;
  }

  if (formData.billing_address.trim().length < 10) {
    alert('Billing address must be at least 10 characters long.');
    return false;
  }

  if (!addressRegex.test(formData.billing_address)) {
    alert('Billing address contains invalid characters.');
    return false;
  }

  // Contact Number
  if (!mobileRegex.test(String(formData.contact_number || ''))) {
    alert('Contact number must be exactly 10 digits.');
    return false;
  }

  // Alternate Contact
  if (
    formData.alternate_contact &&
    !mobileRegex.test(String(formData.alternate_contact))
  ) {
    alert('Alternate contact must be exactly 10 digits.');
    return false;
  }

  // Alternate same as main
  if (
    formData.alternate_contact &&
    formData.alternate_contact === formData.contact_number
  ) {
    alert('Alternate contact must be different from main contact.');
    return false;
  }

  // Contact Person
  if (!formData.contact_person?.trim()) {
    alert('Contact person is required.');
    return false;
  }

  // Services
  if (locationServiceList.length === 0) {
    alert('At least one service is required.');
    return false;
  }

  for (const item of locationServiceList) {

    if (!item.region_id) {
      alert("Region is required");
      return false;
    }

    if (!item.state_id) {
      alert("State is required");
      return false;
    }

    if (!item.city?.trim()) {
      alert("City is required");
      return false;
    }

    if (!item.category_id) {
      alert("Category is required");
      return false;
    }

    if (!item.item_id) {
      alert("Item is required");
      return false;
    }

    if (!item.type_id) {
      alert("Type is required");
      return false;
    }

    if (!item.description_name?.trim()) {
      alert("Description is required");
      return false;
    }

    if (!item.price || item.price <= 0) {
      alert("Price must be greater than 0");
      return false;
    }
  }

  // Profile Image
  if (!profileImage && !profile?.logo_path) {
    alert('Company logo is required.');
    return false;
  }

  // Certificate
  if (
    certificates.length === 0 &&
    (!profile?.certificate_path ||
      profile.certificate_path.length === 0)
  ) {
    alert('Please upload at least one certificate.');
    return false;
  }

  return true;
};

  /* ================= SUBMIT ================= */
const handleProfileSubmit = async (e) => {
  e.preventDefault();
  if (!validateProfile()) return;
  setLoading(true);
let finalMailing = formData.mailing_address.trim();
let finalBilling = formData.billing_address.trim();

if (mailingPostalCode) finalMailing += `, ${mailingPostalCode}`;
if (billingPostalCode) finalBilling += `, ${billingPostalCode}`;



  const servicesArray = locationServiceList.map(item => ({
    region_id: item.region_id,
    region_name: item.region,

    state_id: item.state_id,
    state_name: item.state,

    city_id: item.city_id || null,
    city_name: item.city || null,

    category_id: item.category_id,
    category_name: item.category_name,

    item_id: item.item_id,
    item_name: item.item_name,

    type_id: item.type_id,
    type_name: item.type_name,

    description_id: item.description_id || null,
    description_name: item.description_name || null,

    price: parseFloat(item.price || 0)


  }));

  const payload = new FormData();

  payload.append("email", contractor.email_id);

  payload.append("company_name", formData.company_name);
  payload.append("brn_number", formData.brn_number);
  payload.append("tin_number", formData.tin_number);
  payload.append(
  "bumiputera",
  formData.bumiputera === "yes" ? "Yes" : "No"
  );

  // payload.append("mailing_address", formData.mailing_address);
  // payload.append("billing_address", formData.billing_address);
  payload.append('billing_address', finalBilling);
  payload.append('mailing_address', finalMailing);

  payload.append("contact_number", formData.contact_number);
  payload.append("alternate_contact", formData.alternate_contact);
  payload.append("contact_person", formData.contact_person);

  payload.append("services", JSON.stringify(servicesArray));

  if (profileImage) payload.append("company_logo", profileImage);
certificates.forEach((file) => {
  payload.append("certificate", file);
});

try {
  const response = await apiPost(
    "/api/contractor/update_company_profile",
    payload
  );

  await Swal.fire({
    icon: "success",
    title: "Success",
    text: "Contractor profile updated successfully",
    confirmButtonText: "OK",
  });

  // optional navigation
  // navigate("/contractor/home");
  navigate("/contractor/dashboard/updatecompanyprofile");

} catch (err) {
  console.error(err);

  Swal.fire({
    icon: "error",
    title: "Update Failed",
    text:
      err?.response?.data?.message ||
      "Profile update failed",
  });

  setErrors({ general: "Profile update failed" });

} finally {
  setLoading(false);
}
};


  if (!contractor) {
    return <div className="text-center text-danger">Please login</div>;
  }

  /* ================= JSX ================= */
  return (
    <div className="provider-container">
      <form onSubmit={handleProfileSubmit} className="row g-3">
          <div className="col-12"><h3>Company Details</h3></div>

          <div className="col-md-6">
            <label className="form-label">Company Name <span className="required-asterisk">*</span> </label>
            <input name="company_name" className={`form-control ${errors.company_name ? 'is-invalid' : ''}`} value={formData.company_name} onChange={handleFormChange} />
            {errors.company_name && <div className="invalid-feedback">{errors.company_name}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">BRN Number<span className="required-asterisk">*</span></label>
            <input name="brn_number" className={`form-control ${errors.brn_number ? 'is-invalid' : ''}`} value={formData.brn_number} onChange={handleFormChange} />
            {errors.brn_number && <div className="invalid-feedback">{errors.brn_number}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">TIN Number<span className="required-asterisk">*</span></label>
            <input name="tin_number" className={`form-control ${errors.tin_number ? 'is-invalid' : ''}`} value={formData.tin_number} onChange={handleFormChange} />
            {errors.tin_number && <div className="invalid-feedback">{errors.tin_number}</div>}
          </div>

          <div className="col-md-6">
  <label className="form-label">
    Bumiputera <span className="required-asterisk">*</span>
  </label>

  <select
    name="bumiputera"
    className={`form-select ${errors.bumiputera ? 'is-invalid' : ''}`}
    value={formData.bumiputera}
    onChange={handleFormChange}
  >
    <option value="">Select</option>
    <option value="yes">Yes</option>
    <option value="no">No</option>
  </select>

  {errors.bumiputera && (
    <div className="invalid-feedback">{errors.bumiputera}</div>
  )}
</div>


          {/* Mailing Postal Code + Address */}
            <div className="col-md-12">
              <label className="form-label">
                Mailing Postal Code <span className="required-asterisk">*</span>
              </label>

              <input
                type="text"
                className={`form-control ${errors.mailingPostalCode ? 'is-invalid' : ''}`}
                value={mailingPostalCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');

                  setMailingPostalCode(value);

                  if (sameAsMailing) {
                    setBillingPostalCode(value);
                  }
                }}
                placeholder="e.g., 50450"
                maxLength={5}
              />

              {errors.mailingPostalCode && (
                <div className="invalid-feedback d-block">
                  {errors.mailingPostalCode}
                </div>
              )}
            </div>

            <div className="col-md-12">
              <label className="form-label">
                Mailing Address <span className="required-asterisk">*</span>
              </label>

              <textarea
                name="mailing_address"
                className={`form-control ${errors.mailing_address ? 'is-invalid' : ''}`}
                rows="2"
                value={formData.mailing_address}
                onChange={(e) => {
                  handleFormChange(e);

                  if (sameAsMailing) {
                    setFormData(prev => ({
                      ...prev,
                      billing_address: e.target.value
                    }));
                  }
                }}
                placeholder="Enter street address; city/state auto-appends after postal code."
              />

              {errors.mailing_address && (
                <div className="invalid-feedback d-block">
                  {errors.mailing_address}
                </div>
              )}
            </div>

            {/* SAME AS MAILING CHECKBOX */}
            <div className="col-md-12">
              <div className="form-check mb-2">

                <input
                  className="form-check-input"
                  type="checkbox"
                  id="sameAddress"
                  checked={sameAsMailing}
                  onChange={(e) => {
                    const checked = e.target.checked;

                    setSameAsMailing(checked);

                    if (checked) {
                      setFormData(prev => ({
                        ...prev,
                        billing_address: prev.mailing_address
                      }));

                      setBillingPostalCode(mailingPostalCode);
                    }
                  }}
                />

                <label className="form-check-label" htmlFor="sameAddress">
                  Billing Address same as Mailing Address
                </label>

              </div>
            </div>

            {/* Billing Postal Code + Address */}
            <div className="col-md-12">
              <label className="form-label">
                Billing Postal Code <span className="required-asterisk">*</span>
              </label>

              <input
                type="text"
                className={`form-control ${errors.billingPostalCode ? 'is-invalid' : ''}`}
                value={billingPostalCode}
                disabled={sameAsMailing}
                onChange={(e) =>
                  setBillingPostalCode(e.target.value.replace(/\D/g, ''))
                }
                placeholder="e.g., 50450"
                maxLength={5}
              />

              {errors.billingPostalCode && (
                <div className="invalid-feedback d-block">
                  {errors.billingPostalCode}
                </div>
              )}
            </div>

            <div className="col-md-12">
              <label className="form-label">
                Billing Address <span className="required-asterisk">*</span>
              </label>

              <textarea
                name="billing_address"
                className={`form-control ${errors.billing_address ? 'is-invalid' : ''}`}
                rows="2"
                value={formData.billing_address}
                disabled={sameAsMailing}
                onChange={handleFormChange}
                placeholder="Enter street address; city/state auto-appends after postal code."
              />

              {errors.billing_address && (
                <div className="invalid-feedback d-block">
                  {errors.billing_address}
                </div>
              )}
            </div>


           <div className="col-md-6">
            <label className="form-label">Contact Number<span className="required-asterisk">*</span></label>
            <input name="contact_number" className={`form-control ${errors.contact_number ? 'is-invalid' : ''}`} value={formData.contact_number} onChange={handleFormChange} />
            {errors.contact_number && <div className="invalid-feedback">{errors.contact_number}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Alternate Contact</label>
            <input name="alternate_contact" className={`form-control ${errors.alternate_contact ? 'is-invalid' : ''}`} value={formData.alternate_contact} onChange={handleFormChange} />
            {errors.alternate_contact && <div className="invalid-feedback">{errors.alternate_contact}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Contact Person<span className="required-asterisk">*</span></label>
            <input name="contact_person" className={`form-control ${errors.contact_person ? 'is-invalid' : ''}`} value={formData.contact_person} onChange={handleFormChange} />
            {errors.contact_person && <div className="invalid-feedback">{errors.contact_person}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Email (read-only)</label>
            <input name="email_id" className="form-control" value={formData.email_id} onChange={handleFormChange} disabled />
          </div>


        <div className="col-12">
  <h5>Services by Location (Malaysia) <span className="required-asterisk">*</span></h5>

  {locationServiceList.map((item, idx) => (
    <div key={idx} className="border rounded p-3 mb-3">

      {/* ===== ROW 1 : LOCATION ===== */}
      <div className="row mb-2 align-items-end">

        {/* REGION */}
        <div className="col-md-3">
          <select
            className={`form-select ${errors[`region-${idx}`] ? 'is-invalid' : ''}`}
value={item.region || ""}
onChange={e =>
  handleChange(idx, "region", { name: e.target.value })
}

          >
            <option value="">Region</option>
            {regions.map(r => (
<option key={r.region_id} value={r.region_name}>
  {r.region_name}
</option>

            ))}
          </select>
        </div>

        {/* STATE */}
        <div className="col-md-3">
<select
  className={`form-select ${errors[`state-${idx}`] ? 'is-invalid' : ''}`}
  value={item.state || ""}

  onChange={e => {
const selectedState = item.states.find(
  s => s.state_name === e.target.value
);

handleChange(idx, "state", {
  name: selectedState?.state_name || ""
});

  }}
  disabled={!item.region}
>
  <option value="">State</option>
  {item.states?.map(s => (
    <option key={s.state_id} value={s.state_name}>
      {s.state_name}
    </option>
  ))}
</select>

        </div>

        {/* CITY */}
        <div className="col-md-3">
<select
    className="form-select"
    value={item.city || ""}
    onChange={e => {
    handleChange(idx, "city", {
      name: e.target.value
    });
  }}
    disabled={!item.state_id}
>
  <option value="">City</option>
  {item.cities?.map(c => (
    <option key={c.city_id} value={c.city_name}>
      {c.city_name}
    </option>
  ))}
</select>

        </div>

        {/* PRICE */}
        <div className="col-md-2">
          <input
            type="number"
            className={`form-control ${errors[`price-${idx}`] ? 'is-invalid' : ''}`}
            placeholder="Price"
            value={item.price}
            onChange={e => handleChange(idx, "price", e.target.value)}
          />
        </div>

        {/* REMOVE */}
        <div className="col-md-1">
          <button
            type="button"
            className="btn btn-danger w-100"
            onClick={() => handleRemoveLocationService(idx)}
          >
            ×
          </button>
        </div>
      </div>

      {/* ===== ROW 2 : CLASSIFICATION ===== */}
      <div className="row">

        {/* CATEGORY */}
        <div className="col-md-3">
<select
  className="form-select"
  value={item.category_id || ""}
  onChange={e =>
    handleChange(idx, "category", {
      id: e.target.value,
      name: categories.find(c => c.category_id == e.target.value)?.category_name
    })
  }
>
  <option value="">Category</option>

  {categories.map(c => (
    <option key={c.category_id} value={c.category_id}>
      {c.category_name}
    </option>
  ))}
</select>

        </div>

        {/* ITEM */}
        <div className="col-md-3">
       <select
  className="form-select"
  value={item.item_id || ""}
  onChange={e =>
    handleChange(idx, "item", {
      id: e.target.value,
      name: item.items?.find(i => i.item_id == e.target.value)?.item_name
    })
  }
  disabled={!item.items?.length}
>
  <option value="">Item</option>

  {item.items?.map(i => (
    <option key={i.item_id} value={i.item_id}>
      {i.item_name}
    </option>
  ))}
</select>

        </div>

        {/* TYPE */}
        <div className="col-md-3">
          <select
            className="form-select"
            value={item.type_id}
            onChange={e =>
              handleChange(idx, "type", {
                id: e.target.value,
                name: item.types?.find(t => t.type_id == e.target.value)?.type_name
              })
            }
            disabled={!item.types?.length}
          >
            <option value="">Type</option>
            {item.types?.map(t => (
              <option key={t.type_id} value={t.type_id}>
                {t.type_name}
              </option>
            ))}
          </select>
        </div>

        {/* DESCRIPTION */}
        <div className="col-md-3">
          <select
            className="form-select"
            value={item.description_name}
            onChange={e => handleChange(idx, "description", e.target.value)}
            disabled={!item.descriptions?.length}
          >
            <option value="">Description</option>
            {item.descriptions?.map(d => (
              <option key={d.id} value={d.description_name}>
                {d.description_name}
              </option>
            ))}
          </select>
        </div>

      </div>
    </div>
  ))}

  {errors.services && <div className="text-danger">{errors.services}</div>}

  <button
    type="button"
    className="btn btn-secondary mt-2"
    onClick={handleAddLocationService}
  >
    + Add Service
  </button>
</div>


          <div className="col-md-6">
            <label className="form-label">Profile Image <span className="required-asterisk">*</span></label>
<input
  type="file"
  className="form-control"
  onChange={handleProfileImageChange}
  accept="image/*"
/>

            {profile?.logo_path && !profileImage && (
  <div className="mt-2">
<img
  src={`${BASE_URLS.user}${profile.logo_path}`}
  alt="Current Logo"
  style={{ width: "120px", borderRadius: "10px" }}
/>
    <small className="text-muted d-block">
      (Already uploaded — choose a new file only if you want to replace)
    </small>
  </div>
)}

            {errors.profileImage && <div className="text-danger">{errors.profileImage}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Certificate <span className="required-asterisk">*</span></label>
<input
  type="file"
  className="form-control"
  onChange={handleCertificateChange}
  accept="image/*,application/pdf"
  multiple
/>
{/* Certificate Preview */}
{certificates.length > 0 && (
  <div className="row mt-3">
    {certificates.map((file, idx) => (
      <div className="col-md-3 mb-3" key={idx}>
        <div className="border rounded p-2 text-center position-relative">

          {/* Remove Button */}
          <button
            type="button"
            className="btn btn-danger btn-sm position-absolute top-0 end-0"
            onClick={() => {
              setCertificates(prev =>
                prev.filter((_, i) => i !== idx)
              );
            }}
          >
            ×
          </button>

          {/* Image Preview */}
          {file.type.startsWith("image/") ? (
            <img
              src={URL.createObjectURL(file)}
              alt="certificate"
              className="img-fluid rounded"
              style={{
                height: "120px",
                width: "100%",
                objectFit: "cover"
              }}
            />
          ) : (
            /* PDF Preview */
            <div
              className="d-flex flex-column justify-content-center align-items-center"
              style={{
                height: "120px"
              }}
            >
              <i
                className="bi bi-file-earmark-pdf"
                style={{
                  fontSize: "40px",
                  color: "red"
                }}
              />
              <small className="mt-2 text-break">
                {file.name}
              </small>
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
)}

{Array.isArray(profile?.certificate_path) &&
  profile.certificate_path.length > 0 &&
  certificates.length === 0 && (
    <div className="mt-3">
      <strong className="d-block mb-2">Uploaded Certificates</strong>

      <div className="row">
        {profile.certificate_path.map((path, idx) => {
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(path);
          const isPdf = /\.pdf$/i.test(path);

          return (
            <div className="col-md-3 mb-3" key={idx}>
              <div className="border rounded p-2 text-center">
                {isImage ? (
                  <img
                    src={`${BASE_URLS.user}${path}`}
                    alt={`Certificate ${idx + 1}`}
                    className="img-fluid rounded"
                    style={{
                      height: "120px",
                      width: "100%",
                      objectFit: "cover"
                    }}
                  />
                ) : isPdf ? (
                  <a
                    href={`${BASE_URLS.user}${path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-primary btn-sm"
                  >
                    View PDF
                  </a>
                ) : (
                  <a
                    href={`${BASE_URLS.user}${path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-secondary btn-sm"
                  >
                    Open File
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
)}

            {errors.certificate && <div className="text-danger">{errors.certificate}</div>}
          </div>

          <div className="col-12">
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Saving...' : 'Submit Profile'}
            </button>
            {/* {editMode && <button type="button" className="btn btn-secondary w-100 mt-2" onClick={() => setEditMode(false)}>Cancel</button>} */}
            {errors.general && <div className="text-danger text-center mt-2">{errors.general}</div>}
          </div>
        </form>    </div>
  );
}

export default ContractorPersonalDetails;