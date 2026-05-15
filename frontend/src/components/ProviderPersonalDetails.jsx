import React, { useState, useEffect,useRef } from "react";
import "./css/ProviderProfile.css";
import { apiGet, apiPost, BASE_URLS } from "../api";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

function ProviderPersonalDetails() {
  const { user } = useUser();
//   console.log("User from context to edit:", user);
  const navigate = useNavigate();
  const loggedRef = useRef(false);
  if (!loggedRef.current && user) {
  console.log("USER FROM CONTEXT:", user);
  loggedRef.current = true;
}

  /* ================= STATES ================= */
  const [profile, setProfile] = useState(null);

  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [mailingPostalCode, setMailingPostalCode] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [alternateContactNumber, setAlternateContactNumber] = useState("");
  const [tinNumber, setTinNumber] = useState("");
  const [bumiputera, setBumiputera] = useState("");

  const [locationServiceList, setLocationServiceList] = useState([]);
  const [regions, setRegions] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [idTypes, setIdTypes] = useState([]);

  const [profileImage, setProfileImage] = useState(null);
  const [certificates, setCertificates] = useState([]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkedPostcodes, setCheckedPostcodes] = useState({});


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
    if (user) fetchProfile();
  }, [user]);

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
    "application/pdf",
  ];

  const maxSize = 10 * 1024 * 1024;
  const validFiles = [];

  for (const file of newFiles) {
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, certificate: "JPEG/PNG/GIF/PDF only" }));
      return;
    }

    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, certificate: "Each file must be max 10MB" }));
      return;
    }

    validFiles.push(file);
  }

  setErrors(prev => ({ ...prev, certificate: null }));
  setCertificates(prev => [...prev, ...validFiles]);
  e.target.value = "";
};


const fetchProfile = async () => {
  try {
    const data = await apiPost("/api/profile", { email: user.email_id });

    setProfile(data);

    setFullName(data.full_name || data.name || "");
    setIdType(data.id_type || "");
    setIdNumber(data.id_number || "");
// setMailingAddress((data.mailing_address || "").replace(/,\s*\d{5}$/, ""));
// setBillingAddress((data.billing_address || "").replace(/,\s*\d{5}$/, ""));
setMailingAddress(
  (data.mailing_address || "").replace(/,\s*[A-Za-z\s]+?\s*\d{5}$/, "")
);

setBillingAddress(
  (data.billing_address || "").replace(/,\s*[A-Za-z\s]+?\s*\d{5}$/, "")
);


const mailingMatch = (data.mailing_address || "").match(/(\d{5})$/);
const billingMatch = (data.billing_address || "").match(/(\d{5})$/);

setMailingPostalCode(mailingMatch ? mailingMatch[1] : "");
setBillingPostalCode(billingMatch ? billingMatch[1] : "");

    setContactNumber(data.contact_number || "");
    setAlternateContactNumber(data.alternate_contact_number || "");
    setTinNumber(data.tin_number || "");
     setBumiputera(
  String(data.bumiputra_status || "").toLowerCase()
);

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
  const found = updated.cities.find(c => c.city_name === value.name);

  updated.city = value.name;
  updated.city_id = found?.city_id || null;
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
    updated.description_name = value;
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


  /* ================= SUBMIT ================= */
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    let finalMailing = mailingAddress.trim();
   
let finalBilling = billingAddress.trim();

if (mailingPostalCode) finalMailing += `, ${mailingPostalCode}`;
if (billingPostalCode) finalBilling += `, ${billingPostalCode}`;

const newErrors = {};

if (!bumiputera) {
  newErrors.bumiputera =
    "Please select Bumiputera status";
}

if (Object.keys(newErrors).length > 0) {
  setErrors(newErrors);
  setLoading(false);
  return;
}

if (!locationServiceList.length) {
  setErrors({ services: "Add at least one service" });
  setLoading(false);
  return;
}



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
if (mailingPostalCode && mailingPostalCode.length !== 5) {
  setErrors({ mailingPostalCode: "Enter valid 5-digit postal code" });
  setLoading(false);
  return;
}

if (billingPostalCode && billingPostalCode.length !== 5) {
  setErrors({ billingPostalCode: "Enter valid 5-digit postal code" });
  setLoading(false);
  return;
}



    const formData = new FormData();
    formData.append("email", user.email_id);
    formData.append("full_name", fullName);
    formData.append("id_type", idType);
    formData.append("id_number", idNumber);
    // formData.append("mailing_address", mailingAddress);
    // formData.append("billing_address", billingAddress);
    formData.append("mailing_address", finalMailing);
formData.append("billing_address", finalBilling);

    formData.append("contact_number", contactNumber);
    formData.append("alternate_contact_number", alternateContactNumber);
    formData.append("tin_number", tinNumber);
    formData.append("bumiputra_status", bumiputera);
    formData.append("services", JSON.stringify(servicesArray));



    if (profileImage) formData.append("profile_image", profileImage);
    certificates.forEach((file) => {
  formData.append("certificate", file);
});

try {
  const response = await apiPost(
    "/api/update_profile",
    formData
  );

  await Swal.fire({
    icon: "success",
    title: "Success",
    text: "Profile updated successfully",
    confirmButtonText: "OK",
  });

  // optional redirect
  // navigate("/provider/profile");
    navigate("/provider_home/providerupdateprofile");

} catch (err) {
  console.error(err);

  Swal.fire({
    icon: "error",
    title: "Update Failed",
    text:
      err?.response?.data?.message ||
      "Profile update failed",
  });

  setErrors({
    general: "Profile update failed",
  });

} finally {
  setLoading(false);
}
  };

  if (!user) {
    return <div className="text-center text-danger">Please login</div>;
  }

  /* ================= JSX ================= */
  return (
    <div className="provider-container">
      <form onSubmit={handleProfileSubmit} className="row g-3">
          <div className="col-12 text-center mb-4"><h1>Personal Details Form</h1></div>

          <div className="col-md-6">
            <label className="form-label">Full Name <span className="required-asterisk">*</span> </label>
            <input type="text" className={`form-control ${errors.fullName ? 'is-invalid' : ''}`} value={fullName} onChange={e => setFullName(e.target.value)} />
            {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">TIN Number <span className="required-asterisk">*</span></label>
            <input type="text" className={`form-control ${errors.tinNumber ? 'is-invalid' : ''}`} value={tinNumber} onChange={e => setTinNumber(e.target.value)} />
            {errors.tinNumber && <div className="invalid-feedback">{errors.tinNumber}</div>}
          </div>

                  <div className="col-md-6">
  <label className="form-label">
    Bumiputera <span className="required-asterisk">*</span>
  </label>

  <select
    className={`form-select ${errors.bumiputera ? 'is-invalid' : ''}`}
    value={bumiputera}
    onChange={e => setBumiputera(e.target.value)}
  >
    <option value="">Select</option>
    <option value="yes">Yes</option>
    <option value="no">No</option>
  </select>

  {errors.bumiputera && (
    <div className="invalid-feedback d-block">
      {errors.bumiputera}
    </div>
  )}
</div>

          <div className="col-md-6">
            <label className="form-label">
              ID Type <span className="required-asterisk">*</span>
            </label>
            <select
              className={`form-select ${errors.idType ? 'is-invalid' : ''}`}
              value={idType}
              onChange={e => {
                setIdType(e.target.value);
                setIdNumber('');
              }}
            >
              <option value="">Select</option>
              {idTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {errors.idType && <div className="invalid-feedback">{errors.idType}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">
              {idType === 'Passport'
                ? 'Passport Number'
                : idType === 'MyPR'
                ? 'MyPR Number'
                : idType === 'MyKad'
                ? 'MyKad Number'
                : 'ID Number'}{' '}
              <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.idNumber ? 'is-invalid' : ''}`}
              value={idNumber}
              onChange={e => setIdNumber(e.target.value.toUpperCase())}
              placeholder={
                idType === 'Passport'
                  ? 'e.g., A123456'
                  : idType === 'MyPR'
                  ? 'e.g., PR78901'
                  : idType === 'MyKad'
                  ? 'e.g., 890101015678'
                  : 'Enter ID Number'
              }
            />
            {errors.idNumber && <div className="invalid-feedback">{errors.idNumber}</div>}
          </div>


          <div className="col-12">
            <label className="form-label">Mailing Postal Code </label>
            <input type="text" className={`form-control ${errors.mailingPostalCode ? 'is-invalid' : ''}`} 
              value={mailingPostalCode} 
              onChange={e => setMailingPostalCode(e.target.value.replace(/\D/g, ''))} 
              onBlur={() => fetchAndAppend('mailing', mailingPostalCode)}
              placeholder="e.g., 50450"
              maxLength={5} />
            {errors.mailingPostalCode && <div className="invalid-feedback d-block">{errors.mailingPostalCode}</div>}
          </div>

          <div className="col-12">
            <label className="form-label">Mailing Address <span className="required-asterisk">*</span></label>
            <textarea className={`form-control ${errors.mailingAddress ? 'is-invalid' : ''}`} rows="2" value={mailingAddress} onChange={e => setMailingAddress(e.target.value)} placeholder="Enter street address, etc. City/State will be auto-appended after postal code." />
            {errors.mailingAddress && <div className="invalid-feedback">{errors.mailingAddress}</div>}
          </div>

          <div className="col-12">
            <label className="form-label">Billing Postal Code</label>
            <input type="text" className={`form-control ${errors.billingPostalCode ? 'is-invalid' : ''}`} 
              value={billingPostalCode} 
              onChange={e => setBillingPostalCode(e.target.value.replace(/\D/g, ''))} 
              onBlur={() => fetchAndAppend('billing', billingPostalCode)}
              placeholder="e.g., 50450"
              maxLength={5} />
            {errors.billingPostalCode && <div className="invalid-feedback d-block">{errors.billingPostalCode}</div>}
          </div>

          <div className="col-12">
            <label className="form-label">Billing Address <span className="required-asterisk">*</span></label>
            <textarea className={`form-control ${errors.billingAddress ? 'is-invalid' : ''}`} rows="2" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} placeholder="Enter street address, etc. City/State will be auto-appended after postal code." />
            {errors.billingAddress && <div className="invalid-feedback">{errors.billingAddress}</div>}
          </div>


          <div className="col-md-6">
            <label className="form-label">Contact Number <span className="required-asterisk">*</span></label>
            <input type="tel" className={`form-control ${errors.contactNumber ? 'is-invalid' : ''}`} value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
            {errors.contactNumber && <div className="invalid-feedback">{errors.contactNumber}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Alternate Contact</label>
            <input type="tel" className={`form-control ${errors.alternateContactNumber ? 'is-invalid' : ''}`} value={alternateContactNumber} onChange={e => setAlternateContactNumber(e.target.value)} />
            {errors.alternateContactNumber && <div className="invalid-feedback">{errors.alternateContactNumber}</div>}
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
const selectedCity = item.cities.find(
  c => c.city_name === e.target.value
);

handleChange(idx, "city", {
  name: selectedCity?.city_name || ""
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
  <label className="form-label">Profile Image</label>

  <input
    type="file"
    className="form-control"
    onChange={handleProfileImageChange}
    accept="image/*"
  />

  {profile?.profile_pic && !profileImage && (
    <div className="mt-2">
      <img
        src={`${BASE_URLS.user}${profile.profile_pic}`}
        alt="Current Logo"
        style={{ width: "120px", borderRadius: "10px" }}
      />
      <small className="text-muted d-block">
        (Already uploaded — upload only if replacing)
      </small>
    </div>
  )}
</div>


<div className="col-md-6">
  <label className="form-label">Certificate</label>

  <input
    type="file"
    className="form-control"
    onChange={handleCertificateChange}
    accept="image/*,application/pdf"
    multiple
  />

  {/* Newly selected files preview */}
  {certificates.length > 0 && (
    <div className="row mt-3">
      {certificates.map((file, idx) => (
        <div className="col-md-3 mb-3" key={idx}>
          <div className="border rounded p-2 text-center position-relative">
            <button
              type="button"
              className="btn btn-danger btn-sm position-absolute top-0 end-0"
              onClick={() => {
                setCertificates(prev => prev.filter((_, i) => i !== idx));
              }}
            >
              ×
            </button>

            {file.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(file)}
                alt="certificate"
                className="img-fluid rounded"
                style={{ height: "120px", width: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                className="d-flex flex-column justify-content-center align-items-center"
                style={{ height: "120px" }}
              >
                <i
                  className="bi bi-file-earmark-pdf"
                  style={{ fontSize: "40px", color: "red" }}
                />
                <small className="mt-2 text-break">{file.name}</small>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )}

  {Array.isArray(profile?.authorized_certificate) &&
    profile.authorized_certificate.length > 0 &&
    certificates.length === 0 && (
      <div className="mt-3">
        <strong className="d-block mb-2">Uploaded Certificates</strong>
  
        <div className="row">
          {profile.authorized_certificate.map((path, idx) => {
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

export default ProviderPersonalDetails;