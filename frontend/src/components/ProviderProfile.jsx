// ProviderProfile.jsx (updated: concatenated auto-fill into address textarea)
import React, { useState, useEffect } from 'react';
import './css/ProviderProfile.css';
import { BASE_URL, BASE_URLS, apiGet, apiPost, apiPut, apiDelete } from "../api";
import { useUser } from "../context/UserContext";
import { Link, Outlet, useNavigate } from "react-router-dom";

function ProviderProfile({ user }) {

  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
  const [mailingPostalCode, setMailingPostalCode] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [alternateContactNumber, setAlternateContactNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [locationServiceList, setLocationServiceList] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [bankDetails, setBankDetails] = useState({ bankName: '', holderName: '', accountNumber: '', swift: '' });
  const [bankStatement, setBankStatement] = useState(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pollInterval, setPollInterval] = useState(null);
  const [bumiputera, setBumiputera] = useState("");
  const [regions, setRegions] = useState({});
  const [states, setStates] = useState([]);
  const [sameAsMailing, setSameAsMailing] = useState(false);
  const [mailingRegionId, setMailingRegionId] = useState("");
  const [mailingStateId, setMailingStateId] = useState("");
  const [mailingCityId, setMailingCityId] = useState("");

  const [mailingStates, setMailingStates] = useState([]);
  const [mailingCities, setMailingCities] = useState([]);


  
  const malaysianBanks = [
    'Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank',
    'AmBank', 'Standard Chartered Bank Malaysia', 'HSBC Bank Malaysia',
    'UOB Malaysia', 'OCBC Bank Malaysia'
  ];

  const [idTypes, setIdTypes] = useState([]);

  useEffect(() => {
    apiGet("/api/state/id-types")
      .then(data => {
        if (Array.isArray(data)) setIdTypes(data);
        else setIdTypes([]);
      })
      .catch(() => setIdTypes([]));
  }, []);
  useEffect(() => {
    if (sameAsMailing) {
      setBillingAddress(mailingAddress);
      setBillingPostalCode(mailingPostalCode);
    }
  }, [sameAsMailing, mailingAddress, mailingPostalCode]);

  const [servicesList, setServicesList] = useState([]);

  useEffect(() => {
    apiGet("/api/category")
      .then(data => {
        if (Array.isArray(data)) setServicesList(data);
        else setServicesList([]);
      })
      .catch(() => setServicesList([]));
  }, []);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  useEffect(() => {
    if (profile?.status === 'pending') {
      const interval = setInterval(fetchProfile, 10000);
      setPollInterval(interval);
      return () => clearInterval(interval);
    } else if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [profile?.status]);

 // Fetch Malaysia Regions
  useEffect(() => {
    apiGet("/api/region/")
      .then(data => setRegions(Array.isArray(data) ? data : []))
      .catch(() => setRegions([]));
  }, []);

  const fetchMailingStates = async (regionId) => {
  try {
    const data = await apiGet(`/api/state/by-region/${regionId}`);
    setMailingStates(Array.isArray(data) ? data : []);
  } catch {
    setMailingStates([]);
  }
};

const fetchMailingCities = async (regionId, stateId) => {
  try {
    const data = await apiGet(
      `/api/city/by-region-state?region_id=${regionId}&state_id=${stateId}`
    );
    setMailingCities(Array.isArray(data) ? data : []);
  } catch {
    setMailingCities([]);
  }
};


  const fetchStates = (regionId, index) => {
    apiGet(`/api/state/by-region/${regionId}`)
      .then(data => {
        setLocationServiceList(prev => {
          const updated = [...prev];
          updated[index].states = Array.isArray(data) ? data : [];
          return updated;
        });
      })
      .catch(() => {
        setLocationServiceList(prev => {
          const updated = [...prev];
          updated[index].states = [];
          return updated;
        });
      });
  };

  const fetchAndAppend = async (type, postalCode) => {
    if (postalCode.length !== 5) return;

    try {
      const data = await apiGet(`/api/malaysia_postcode?postcode=${postalCode}`);

      const city = data?.city || '';
      const state = data?.state || '';
      const fullAppend = `${city}, ${state} ${postalCode}`.trim();

      if (type === 'mailing') {
        setMailingAddress(prev => {
          const trimmedPrev = prev.trim();
          if (trimmedPrev.includes(fullAppend)) return trimmedPrev;

          return trimmedPrev ? `${trimmedPrev}, ${fullAppend}` : fullAppend;
        });
      } else {
        setBillingAddress(prev => {
          const trimmedPrev = prev.trim();
          if (trimmedPrev.includes(fullAppend)) return trimmedPrev;

          return trimmedPrev ? `${trimmedPrev}, ${fullAppend}` : fullAppend;
        });
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    }
  };

  const fetchProfile = async () => {
      try {
        const data = await apiPost("/api/profile", { email: user.email });

        console.log("profile data", data);

        setProfile(data);

        if (data.status === "approved" && !data.bank_details) {
          setShowBankForm(true);
        }

        if (Array.isArray(data.services)) {
          const locServ = data.services.map(s => ({
            region_id: s.region_id,
            region_name: s.region,
            state_id: s.state_id,
            state_name: s.state,
            city_id: s.city_id,
            city_name: s.city,
            category_id: s.category_id,
            category_name: s.category_name,
            item_id: s.item_id,
            item_name: s.item_name,
            type_id: s.type_id,
            type_name: s.type_name,
            description_id: s.description_id,
            description_name: s.description_name,
            price: s.service_rate,
            states: [],
            cities: [],
            items: [],
            types: [],
            descriptions: []
          }));
          setLocationServiceList(locServ);
        } else {
          setLocationServiceList([]);
        }

        setFullName(data.full_name || "");
        setIdType(data.id_type || "");
        setIdNumber(data.id_number || "");
        setMailingAddress(data.mailing_address || "");
        setBillingAddress(data.billing_address || "");
        setMailingRegionId(data.mailing_region_id || "");
setMailingStateId(data.mailing_state_id || "");
setMailingCityId(data.mailing_city_id || "");

if (data.mailing_region_id) {
    await fetchMailingStates(data.mailing_region_id);
}

if (data.mailing_region_id && data.mailing_state_id) {
    await fetchMailingCities(
        data.mailing_region_id,
        data.mailing_state_id
    );
}

        const mailingMatch = data.mailing_address?.match(/(\d{5})$/);
        if (mailingMatch) setMailingPostalCode(mailingMatch[1]);

        const billingMatch = data.billing_address?.match(/(\d{5})$/);
        if (billingMatch) setBillingPostalCode(billingMatch[1]);

        setContactNumber(data.contact_number || data.phone_number || "");
        setAlternateContactNumber(data.alternate_contact_number || "");
        setTinNumber(data.tin_number || "");
      setBumiputera(
      String(data.bumiputra_status || "").toLowerCase()
    );

      } catch (error) {
        alert(error.message || "Error fetching profile");
      }
  };


  const enterEditMode = () => setEditMode(true);

  const handleAddLocationService = () => {
    setLocationServiceList(prev => [
      ...prev,
      {
        region_id: "",
        region_name: "",
        state_id: "",
        state_name: "",
        city_id: "",
        city_name: "",
        category_id: "",
        category_name: "",
        item_id: "",
        item_name: "",
        type_id: "",
        type_name: "",
        description_id: "",
        description_name: "",
        price: "",
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

  const handleChange = async (index, field, value) => {
    setLocationServiceList(prev => {
      const list = [...prev];
      const row = { ...list[index] };

      switch (field) {

        case "region":
          row.region_id = value.id;
          row.region_name = value.name;

          row.state_id = row.city_id = "";
          row.category_id = row.item_id = row.type_id = row.description_id = "";

          row.states = [];
          row.cities = [];
          row.items = [];
          row.types = [];
          row.descriptions = [];

          apiGet(`/api/state/by-region/${value.id}`).then(data => {
            setLocationServiceList(p => {
              const copy = [...p];
              copy[index].states = data || [];
              return copy;
            });
          });
          break;

        case "state":
          row.state_id = value.id;
          row.state_name = value.name;

          row.city_id = "";
          row.cities = [];

          apiGet(`/api/city/by-region-state?region_id=${row.region_id}&state_id=${value.id}`)
            .then(data => {
              setLocationServiceList(p => {
                const copy = [...p];
                copy[index].cities = data || [];
                return copy;
              });
            });
          break;

        case "city":
          row.city_id = value.id;
          row.city_name = value.name;
          break;

        case "category":
          row.category_id = value.id;
          row.category_name = value.name;

          row.item_id = row.type_id = row.description_id = "";
          row.items = [];
          row.types = [];
          row.descriptions = [];

          apiGet(`/api/items/${value.id}`).then(data => {
            setLocationServiceList(p => {
              const copy = [...p];
              copy[index].items = data || [];
              return copy;
            });
          });
          break;

        case "item":
          row.item_id = value.id;
          row.item_name = value.name;

          row.type_id = row.description_id = "";
          row.types = [];
          row.descriptions = [];

          apiGet(`/api/types/filter?category_id=${row.category_id}&item_id=${value.id}`)
            .then(data => {
              setLocationServiceList(p => {
                const copy = [...p];
                copy[index].types = data || [];
                return copy;
              });
            });
          break;

        case "type":
          row.type_id = value.id;
          row.type_name = value.name;

          row.description_id = "";
          row.descriptions = [];

          apiGet(`/api/description/filter?category_id=${row.category_id}&item_id=${row.item_id}&type_id=${value.id}`)
            .then(data => {
              setLocationServiceList(p => {
                const copy = [...p];
                copy[index].descriptions = data || [];
                return copy;
              });
            });
          break;

        case "description":
          row.description_id = value.id;
          row.description_name = value.name;
          break;

        case "price":
          row.price = value;
          break;
      }

      list[index] = row;
      return list;
    });
  };


  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      alert("Only JPEG, PNG, or GIF files are allowed.");
      e.target.value = '';
      setProfileImage(null);
      return;
    }

    if (file.size > maxSize) {
      alert("Profile image size must be less than 5MB.");
      e.target.value = '';
      setProfileImage(null);
      return;
    }

    setErrors(prev => ({ ...prev, profileImage: null }));
    setProfileImage(file);
  };
  
 const handleCertificateChange = (e) => {
  const newFiles = Array.from(e.target.files || []);

  if (!newFiles.length) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf'
    ];

  const maxSize = 10 * 1024 * 1024;

  const validFiles = [];

  for (const file of newFiles) {

    if (!allowedTypes.includes(file.type)) {
      alert("Only JPEG, PNG, GIF, or PDF files are allowed.");
      return;
    }

    if (file.size > maxSize) {
      alert("Each certificate file must be less than 10 MB.");
      return;
    }

    // prevent same file as profile image
    if (profileImage && file.name === profileImage.name && file.size === profileImage.size) {
      alert("Certificate and profile image cannot be the same file.");
      return;
    }

    validFiles.push(file);
  }

  setErrors(prev => ({
    ...prev,
    certificate: null
  }));

  setCertificates(prev => [
    ...prev,
    ...validFiles
  ]);

  e.target.value = '';
};


  const handleBankStatementChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    const maxSize = 10 * 1024 * 1024; // 10 MB

    if (!allowedTypes.includes(file.type)) {
      alert("Only PDF, JPEG, PNG, or GIF files are allowed.");
      e.target.value = '';   
      setBankStatement(null);
      return;
    }

    if (file.size > maxSize) {
      alert("Bank statement size must be less than 10MB.");
      e.target.value = '';
      setBankStatement(null);
      return;
    }

    // Clear error and store file
    setErrors(prev => ({ ...prev, bankStatement: null }));
    setBankStatement(file);
  };


  const validateProfile = () => {
    const nameRegex = /^[A-Za-z\s\-']{1,100}$/;
    const mobileRegex = /^[0-9]{10}$/;
    const addressRegex = /^[A-Za-z0-9\s,./#'’()-]{10,200}$/;

    if (!fullName.trim()) {
      alert("Full name is required");
      return false;
    }

    if (!nameRegex.test(fullName)) {
      alert("Invalid full name");
      return false;
    }

    // CONTACT NUMBER
    if (!mobileRegex.test(contactNumber)) {
      alert("Contact number must be 10 digits");
      return false;
    }

    // ID TYPE
    if (!idType) {
      alert("ID Type is required");
      return false;
    }

    // ID NUMBER
    if (!idNumber) {
      alert("ID Number is required");
      return false;
    }

    // MAILING ADDRESS
    if (!mailingAddress.trim()) {
      alert("Mailing address is required");
      return false;
    }

    if (!addressRegex.test(mailingAddress)) {
      alert("Invalid mailing address");
      return false;
    }

    // BILLING ADDRESS
    if (!billingAddress.trim()) {
      alert("Billing address is required");
      return false;
    }

    if (!addressRegex.test(billingAddress)) {
      alert("Invalid billing address");
      return false;
    }

    // POSTAL CODES
    if (!/^\d{5}$/.test(mailingPostalCode)) {
      alert("Mailing postal code must be 5 digits");
      return false;
    }

    if (!/^\d{5}$/.test(billingPostalCode)) {
      alert("Billing postal code must be 5 digits");
      return false;
    }

    // ALTERNATE NUMBER
    if (
      alternateContactNumber &&
      !mobileRegex.test(alternateContactNumber)
    ) {
      alert("Alternate contact number must be 10 digits");
      return false;
    }

    if (
      alternateContactNumber &&
      alternateContactNumber === contactNumber
    ) {
      alert(
        "Alternate contact number must be different from Contact Number"
      );
      return false;
    }

    // TIN NUMBER
    if (!tinNumber) {
      alert("TIN Number is required");
      return false;
    }

    const formattedTIN = tinNumber.trim().toUpperCase();

    const individualTINRegex = /^IG\d{9,11}$/;
    const companyTINRegex = /^[A-Z]\d{10,11}$/;

    const isValidTIN =
      individualTINRegex.test(formattedTIN) ||
      companyTINRegex.test(formattedTIN);

    if (!isValidTIN) {
      alert(
        "Invalid Malaysia TIN format. Example: IG1150020000 or C1234567890"
      );
      return false;
    }

    // BUMIPUTERA
    if (!bumiputera) {
      alert("Please select Bumiputera status");
      return false;
    }

    // SERVICES
    if (locationServiceList.length === 0) {
      alert("At least one service is required");
      return false;
    }

    for (let item of locationServiceList) {

      if (!item.region_id) {
        alert("Region is required");
        return false;
      }

      if (!item.state_id) {
        alert("State is required");
        return false;
      }

      if (!item.city_id) {
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

      if (!item.description_id) {
        alert("Description is required");
        return false;
      }

      if (!item.price || item.price <= 0) {
        alert("Price must be greater than 0");
        return false;
      }
    }

    // PROFILE IMAGE
    if (!profileImage) {
      alert("Profile image is required");
      return false;
    }

    // CERTIFICATE
    if (certificates.length === 0) {
      alert("Certificate is required");
      return false;
    }

    return true;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;
    setLoading(true);

    let finalMailing = mailingAddress.trim();
    if (!finalMailing.endsWith(mailingPostalCode)) {
      finalMailing += finalMailing ? `, ${mailingPostalCode}` : mailingPostalCode;
    }
    let finalBilling = billingAddress.trim();
    if (!finalBilling.endsWith(billingPostalCode)) {
      finalBilling += finalBilling ? `, ${billingPostalCode}` : billingPostalCode;
    }
    
const servicesArray = locationServiceList.map(item => ({
  region_id: item.region_id,
  region_name: item.region_name,

  state_id: item.state_id,
  state_name: item.state_name,

  city_id: item.city_id,
  city_name: item.city_name,

  category_id: item.category_id,
  category_name: item.category_name,

  item_id: item.item_id,
  item_name: item.item_name,

  type_id: item.type_id,
  type_name: item.type_name,

  description_id: item.description_id,
  description_name: item.description_name,

  price: parseFloat(item.price)
}));


    const formData = new FormData();
    formData.append('email', user.email);
    formData.append('full_name', fullName);
    formData.append('id_type', idType);
    formData.append('id_number', idNumber);
    formData.append('mailing_address', finalMailing);
    formData.append('billing_address', finalBilling);
    formData.append("mailing_region_id", mailingRegionId);
    formData.append("mailing_state_id", mailingStateId);
    formData.append("mailing_city_id", mailingCityId);
    formData.append('contact_number', contactNumber);
    formData.append('alternate_contact_number', alternateContactNumber);
    formData.append('tin_number', tinNumber);
    formData.append("bumiputra_status", bumiputera);
    formData.append('services', JSON.stringify(servicesArray));
    if (profileImage) formData.append('profile_image', profileImage);
  certificates.forEach((file) => {
  formData.append('certificate', file);
});

 try {
  const data = await apiPost("/api/update_profile", formData);

  alert(data?.message ||
    "Profile has been submitted successfully. Admin will cross-check and approve your profile."
  );

  setProfile(prev => ({ ...prev, status: "pending" })); // instant UI update
  setEditMode(false);
  await fetchProfile();

} catch (error) {
  alert(error.message || "Error updating profile");
  setLoading(false);
}

  };

  const validateBankDetails = () => {
    const swiftRegex = /^([A-Z]{4}MY[A-Z0-9]{2})([A-Z0-9]{3})?$/;
    const accountRegex = /^[0-9]{9,18}$/;
    const holderNameRegex = /^[A-Za-z\s\-']{1,100}$/;

    if (!bankDetails.bankName) {
      alert("Bank is required");
      return false;
    }

    if (!holderNameRegex.test(bankDetails.holderName)) {
      alert("Invalid holder name");
      return false;
    }

    if (!accountRegex.test(bankDetails.accountNumber)) {
      alert("Account number must be 9-18 digits");
      return false;
    }

    if (!swiftRegex.test(bankDetails.swift)) {
      alert("Invalid SWIFT code");
      return false;
    }

    if (!bankStatement) {
      alert("Bank statement is required");
      return false;
    }

    return true;
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    if (!validateBankDetails()) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('email', user.email);
    formData.append('bank_name', bankDetails.bankName);
    formData.append('holder_name', bankDetails.holderName);
    formData.append('account_number', bankDetails.accountNumber);
    formData.append('swift', bankDetails.swift);
    if (bankStatement) formData.append('bank_statement', bankStatement);

try {
  const data = await apiPost("/api/update_bank", formData);

  setSuccessMessage('You can start your services. All the best!');
  setShowBankForm(false);
    // clear auth/session if needed
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // redirect to provider login
  navigate("/provider/login", { replace: true });
  fetchProfile();

} catch (error) {
  alert(error.message || "Error submitting bank details");

} finally {
  setLoading(false);  
}

  };

  if (!user) return <div className="text-center text-danger">Please login to view your dashboard.</div>;
  if (!profile) return <div className="text-center">Loading...</div>;



  const isPending = profile.status === 'pending';
    console.log(profile.status,isPending);
  const isRejected = profile.status === 'rejected';
  const isApproved = profile.status === 'approved';
  const isFilled = profile && (Array.isArray(profile.services) ? profile.services.length > 0 : (profile.services && Object.keys(profile.services).length > 0));

  console.log(!isFilled,editMode,showBankForm);

  return (
    <div className="provider-container">
      {(!isFilled || editMode) ? (
        <form onSubmit={handleProfileSubmit} className="row g-3">
          <div className="col-12 text-center mb-4"><h1>Personal Details Form</h1></div>

          <div className="col-md-6">
            <label className="form-label">Full Name <span className="required-asterisk">*</span> </label>
            <input type="text" className={`form-control ${errors.fullName ? 'is-invalid' : ''}`} value={fullName} onChange={e => setFullName(e.target.value)} />
            {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">TIN Number <span className="required-asterisk">*</span></label>
            {/* <input type="text" className={`form-control ${errors.tinNumber ? 'is-invalid' : ''}`} value={tinNumber} onChange={e => setTinNumber(e.target.value)} /> */}
<input
  type="text"
  className={`form-control ${errors.tinNumber ? 'is-invalid' : ''}`}
  value={tinNumber}
  onChange={e => setTinNumber(e.target.value.toUpperCase())}
  placeholder="e.g., IG1150020000 or C1234567890"
/>


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
            <label className="form-label">Mailing Postal Code</label>

            <input
              type="text"
              className={`form-control ${errors.mailingPostalCode ? 'is-invalid' : ''}`}
              value={mailingPostalCode}
              onChange={e => {
                const value = e.target.value.replace(/\D/g, '');

                setMailingPostalCode(value);

                // AUTO FILL IF CHECKBOX ENABLED
                if (sameAsMailing) {
                  setBillingPostalCode(value);
                }
              }}
              onBlur={() => fetchAndAppend('mailing', mailingPostalCode)}
              placeholder="e.g., 50450"
              maxLength={5}
            />

            {errors.mailingPostalCode && (
              <div className="invalid-feedback d-block">
                {errors.mailingPostalCode}
              </div>
            )}
          </div>

          <div className="col-12">
            <label className="form-label">
              Mailing Address <span className="required-asterisk">*</span>
            </label>

            <textarea
              className={`form-control ${errors.mailingAddress ? 'is-invalid' : ''}`}
              rows="2"
              value={mailingAddress}
              onChange={e => {
                const value = e.target.value;

                setMailingAddress(value);

                // AUTO FILL IF CHECKBOX ENABLED
                if (sameAsMailing) {
                  setBillingAddress(value);
                }
              }}
              placeholder="Enter street address, etc. City/State will be auto-appended after postal code."
            />

            {errors.mailingAddress && (
              <div className="invalid-feedback">
                {errors.mailingAddress}
              </div>
            )}
          </div>

          {/* SAME AS MAILING CHECKBOX */}
          <div className="col-12">
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
                    setBillingAddress(mailingAddress);
                    setBillingPostalCode(mailingPostalCode);
                  } else {
                    setBillingAddress(billingAddress);
                    setBillingPostalCode(billingPostalCode);
                  }
                }}
              />

              <label className="form-check-label" htmlFor="sameAddress">
                Billing Address same as Mailing Address
              </label>

            </div>
          </div>

          <div className="row mt-3">

  {/* Region */}
  <div className="col-12 mt-3">
  <h5 className="fw-bold text-dark">
    Location Details <span className="required-asterisk">*</span>
  </h5>
</div>
  <div className="col-md-4">
    <label className="form-label">
       Region <span className="required-asterisk">*</span>
    </label>

    <select
      className="form-select"
      value={mailingRegionId}
      onChange={async (e) => {
        const id = e.target.value;

        setMailingRegionId(id);
        setMailingStateId("");
        setMailingCityId("");

        setMailingCities([]);

        if (id) {
          const data = await apiGet(`/api/state/by-region/${id}`);
          setMailingStates(Array.isArray(data) ? data : []);
        } else {
          setMailingStates([]);
        }
      }}
    >
      <option value="">Select Region</option>

      {regions.map(region => (
        <option
          key={region.region_id}
          value={region.region_id}
        >
          {region.region_name}
        </option>
      ))}
    </select>
  </div>

  {/* State */}
  <div className="col-md-4">
    <label className="form-label">
       State <span className="required-asterisk">*</span>
    </label>

    <select
      className="form-select"
      value={mailingStateId}
      disabled={!mailingRegionId}
      onChange={async (e) => {
        const id = e.target.value;

        setMailingStateId(id);
        setMailingCityId("");

        if (id) {
          const data = await apiGet(
            `/api/city/by-region-state?region_id=${mailingRegionId}&state_id=${id}`
          );

          setMailingCities(Array.isArray(data) ? data : []);
        } else {
          setMailingCities([]);
        }
      }}
    >
      <option value="">Select State</option>

      {mailingStates.map(state => (
        <option
          key={state.state_id}
          value={state.state_id}
        >
          {state.state_name}
        </option>
      ))}
    </select>
  </div>

  {/* City */}
  <div className="col-md-4">
    <label className="form-label">
       City <span className="required-asterisk">*</span>
    </label>

    <select
      className="form-select"
      value={mailingCityId}
      disabled={!mailingStateId}
      onChange={(e) => setMailingCityId(e.target.value)}
    >
      <option value="">Select City</option>

      {mailingCities.map(city => (
        <option
          key={city.city_id}
          value={city.city_id}
        >
          {city.city_name}
        </option>
      ))}
    </select>
  </div>

</div>

          <div className="col-12">
            <label className="form-label">Billing Postal Code</label>

            <input
              type="text"
              className={`form-control ${errors.billingPostalCode ? 'is-invalid' : ''}`}
              value={billingPostalCode}
              disabled={sameAsMailing}
              onChange={e => setBillingPostalCode(e.target.value.replace(/\D/g, ''))}
              onBlur={() => fetchAndAppend('billing', billingPostalCode)}
              placeholder="e.g., 50450"
              maxLength={5}
            />

            {errors.billingPostalCode && (
              <div className="invalid-feedback d-block">
                {errors.billingPostalCode}
              </div>
            )}
          </div>

          <div className="col-12">
            <label className="form-label">
              Billing Address <span className="required-asterisk">*</span>
            </label>

            <textarea
              className={`form-control ${errors.billingAddress ? 'is-invalid' : ''}`}
              rows="2"
              value={billingAddress}
              disabled={sameAsMailing}
              onChange={e => setBillingAddress(e.target.value)}
              placeholder="Enter street address, etc. City/State will be auto-appended after postal code."
            />

            {errors.billingAddress && (
              <div className="invalid-feedback">
                {errors.billingAddress}
              </div>
            )}
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
  <h5>
    Services by Location (Malaysia) <span className="required-asterisk">*</span>
  </h5>

  {locationServiceList.map((item, idx) => (
    <div key={idx} className="border rounded p-3 mb-3">

      {/* ===== ROW 1 : LOCATION ===== */}
      <div className="row mb-2 align-items-end">

        {/* REGION */}
        <div className="col-md-3">
          <select
            className={`form-select ${errors[`region-${idx}`] ? "is-invalid" : ""}`}
            value={item.region_id || ""}
            onChange={e => {
              const region = regions.find(r => r.region_id == e.target.value);
              handleChange(idx, "region", {
                id: region.region_id,
                name: region.region_name
              });
            }}
          >
            <option value="">Region</option>
            {regions.map(r => (
              <option key={r.region_id} value={r.region_id}>
                {r.region_name}
              </option>
            ))}
          </select>
          {errors[`region-${idx}`] && (
            <div className="invalid-feedback d-block">
              {errors[`region-${idx}`]}
            </div>
          )}
        </div>

        {/* STATE */}
        <div className="col-md-3">
          <select
            className={`form-select ${errors[`state-${idx}`] ? "is-invalid" : ""}`}
            value={item.state_id || ""}
            onChange={e => {
              const state = item.states.find(s => s.state_id == e.target.value);
              handleChange(idx, "state", {
                id: state.state_id,
                name: state.state_name
              });
            }}
            disabled={!item.region_id}
          >
            <option value="">State</option>
            {item.states?.map(s => (
              <option key={s.state_id} value={s.state_id}>
                {s.state_name}
              </option>
            ))}
          </select>
          {errors[`state-${idx}`] && (
            <div className="invalid-feedback d-block">
              {errors[`state-${idx}`]}
            </div>
          )}
        </div>

        {/* CITY */}
        <div className="col-md-3">
          <select
            className={`form-select ${errors[`city-${idx}`] ? "is-invalid" : ""}`}
            value={item.city_id || ""}
            onChange={e => {
              const city = item.cities.find(c => c.city_id == e.target.value);
              handleChange(idx, "city", {
                id: city.city_id,
                name: city.city_name
              });
            }}
            disabled={!item.state_id}
          >
            <option value="">City</option>
            {item.cities?.map(c => (
              <option key={c.city_id} value={c.city_id}>
                {c.city_name}
              </option>
            ))}
          </select>
          {errors[`city-${idx}`] && (
            <div className="invalid-feedback d-block">
              {errors[`city-${idx}`]}
            </div>
          )}
        </div>

        {/* PRICE */}
        <div className="col-md-3">
          <input
            type="number"
            className={`form-control ${errors[`price-${idx}`] ? "is-invalid" : ""}`}
            placeholder="Price"
            value={item.price}
            min="1"
            step="0.01"
            onChange={e => handleChange(idx, "price", e.target.value)}
          />
          {errors[`price-${idx}`] && (
            <div className="invalid-feedback d-block">
              {errors[`price-${idx}`]}
            </div>
          )}
        </div>
      </div>

      {/* ===== ROW 2 : SERVICE CLASSIFICATION ===== */}
      <div className="row">

        {/* CATEGORY */}
        <div className="col-md-3">
          <select
            className="form-select"
            value={item.category_id || ""}
            onChange={e =>
              handleChange(idx, "category", {
                id: e.target.value,
                name: servicesList.find(c => c.category_id == e.target.value)?.category_name
              })
            }
          >
            <option value="">Category</option>
            {servicesList.map(c => (
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
                name: item.items.find(i => i.item_id == e.target.value)?.item_name
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
            value={item.type_id || ""}
            onChange={e =>
              handleChange(idx, "type", {
                id: e.target.value,
                name: item.types.find(t => t.type_id == e.target.value)?.type_name
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
            value={item.description_id || ""}
            onChange={e =>
              handleChange(idx, "description", {
                id: e.target.value,
                name: item.descriptions.find(d => d.id == e.target.value)?.description_name
              })
            }
            disabled={!item.descriptions?.length}
          >
            <option value="">Description</option>
            {item.descriptions?.map(d => (
              <option key={d.id} value={d.id}>
                {d.description_name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* REMOVE */}
      <div className="text-end mt-2">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => handleRemoveLocationService(idx)}
        >
          Remove
        </button>
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
              required
            />

            {profileImage && (
  <div className="mt-3 position-relative d-inline-block">

    <button
      type="button"
      className="btn btn-danger btn-sm position-absolute top-0 end-0"
      onClick={() => setProfileImage(null)}
    >
      ×
    </button>

    <img
      src={URL.createObjectURL(profileImage)}
      alt="Profile Preview"
      className="img-thumbnail"
      style={{
        width: "150px",
        height: "150px",
        objectFit: "cover"
      }}
    />
  </div>
)}
            {errors.profileImage && <div className="text-danger">{errors.profileImage}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Certificate <span className="required-asterisk">*</span></label>
<input
  type="file"
  className={`form-control ${
    errors.certificate ? 'is-invalid' : ''
  }`}
  onChange={handleCertificateChange}
  accept="image/*,application/pdf"
  multiple
/>
{certificates.length > 0 && (
  <div className="row mt-3">
    {certificates.map((file, idx) => (
      <div
        className="col-md-3 mb-3"
        key={idx}
      >
        <div className="border rounded p-2 text-center position-relative">

          {/* REMOVE */}
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

          {/* IMAGE */}
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
            <div
              className="d-flex flex-column justify-content-center align-items-center"
              style={{ height: "120px" }}
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
            {errors.certificate && <div className="text-danger">{errors.certificate}</div>}
          </div>

          <div className="col-12">
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Saving...' : 'Submit Profile'}
            </button>
            {editMode && <button type="button" className="btn btn-secondary w-100 mt-2" onClick={() => setEditMode(false)}>Cancel</button>}
            {errors.general && <div className="text-danger text-center mt-2">{errors.general}</div>}
          </div>
        </form>
      ) : isPending ? (
        <div className="text-center">
          <p className="text-muted mb-3">Your profile is pending admin approval.</p>
          {/* <button className="btn btn-primary" onClick={fetchProfile}>Refresh</button>
          <p className="text-muted small mt-2">Auto-refresh every 10s...</p> */}
        </div>
      ) : isRejected ? (
        <p className="text-center text-danger">Profile rejected. Contact admin.</p>
      ) : showBankForm ? (
        <form onSubmit={handleBankSubmit} className="row g-3">
          <div className="col-12 text-center mb-4"><h1>Bank Details </h1></div>
          <div className="col-md-6">
            <label className="form-label">Bank</label>
            <select className={`form-select ${errors.bankName ? 'is-invalid' : ''}`} value={bankDetails.bankName} onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}>
              <option value="">Select</option>
              {malaysianBanks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.bankName && <div className="invalid-feedback">{errors.bankName}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label">Holder Name <span className="required-asterisk">*</span></label>
            <input type="text" className={`form-control ${errors.holderName ? 'is-invalid' : ''}`} value={bankDetails.holderName} onChange={e => setBankDetails({ ...bankDetails, holderName: e.target.value })} />
            {errors.holderName && <div className="invalid-feedback">{errors.holderName}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label">Account Number <span className="required-asterisk">*</span></label>
            <input type="text" className={`form-control ${errors.accountNumber ? 'is-invalid' : ''}`} value={bankDetails.accountNumber} onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} />
            {errors.accountNumber && <div className="invalid-feedback">{errors.accountNumber}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label">SWIFT Code <span className="required-asterisk">*</span></label>
            <input type="text" className={`form-control ${errors.swift ? 'is-invalid' : ''}`} value={bankDetails.swift} onChange={e => setBankDetails({ ...bankDetails, swift: e.target.value.toUpperCase() })} />
            {errors.swift && <div className="invalid-feedback">{errors.swift}</div>}
          </div>
          <div className="col-12">
            <label className="form-label">Bank Statement <span className="required-asterisk">*</span></label>
            <input
              type="file"
              className={`form-control ${errors.bankStatement ? 'is-invalid' : ''}`}
              onChange={handleBankStatementChange}
              accept="application/pdf,image/*"
              required
            />
            {errors.bankStatement && (
              <div className="invalid-feedback d-block">{errors.bankStatement}</div>
            )}
          </div>

          <div className="col-12">
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Bank Details'}
            </button>
            {errors.general && <div className="text-danger text-center mt-2">{errors.general}</div>}
          </div>
        </form>
      ) : (
        <div className="dashboard-card">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0">Provider Profile Overview</h5>
            <button className="btn btn-outline-primary btn-sm" onClick={enterEditMode}>
              Edit
            </button>
          </div>

          {/* Profile Header Section */}
          <div className="dashboard-header mb-4">
            <img
              src={`${BASE_URLS.user}/api/get_image/${user.email}/profile`}
              alt="Profile"
              className="profile-photo"
            />
            <div className="info">
              <h4>{profile.full_name}</h4>
              <p className="text-muted">{profile.email}</p>
              <p className="text-muted">
                <strong>Status:</strong>{' '}
                <span
                  style={{
                    color:
                      profile.status === 'approved'
                        ? 'green'
                        : profile.status === 'pending'
                        ? '#f0ad4e'
                        : 'red',
                    fontWeight: '600',
                  }}
                >
                  {profile.status?.toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          {/* Full Width Details Grid */}
          <div className="profile-info-grid">
            <div className="profile-field">
              <strong>ID Type</strong>
              <span>{profile.id_type}</span>
            </div>
            <div className="profile-field">
              <strong>ID Number</strong>
              <span>{profile.id_number}</span>
            </div>
            <div className="profile-field">
              <strong>TIN Number</strong>
              <span>{profile.tin_number}</span>
            </div>
                  <div className="profile-field">
  <strong>Bumiputera</strong>
  <span>
    {profile.bumiputra_status?.toLowerCase() === "yes" ? "Yes" : "No"}
  </span>
</div>
            <div className="profile-field">
              <strong>Contact Number</strong>
              <span>{profile.contact_number}</span>
            </div>
            <div className="profile-field">
              <strong>Mailing Address</strong>
              <span>{profile.mailing_address}</span>
            </div>
            <div className="profile-field">
              <strong>Billing Address</strong>
              <span>{profile.billing_address}</span>
            </div>
          </div>

          {/* Services Section */}
          <div className="mt-4">
            <h6 className="fw-bold mb-3">Services Offered</h6>
            <div className="services-list">
              {profile.services?.map((s, i) => (
                <div key={i}>
                  <strong>{s.state}</strong> → {s.service_name} — MYR {s.service_rate}
                </div>
              ))}
            </div>
          </div>

          {/* Certificate */}
          <div className="mt-4">
            <strong>Certificate: </strong>
            {profile.authorized_certificate ? (
              <a
                href={`${BASE_URLS.user}/api/get_image/${user.email}/certificate`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Document
              </a>
            ) : (
              <span className="text-muted">Not Uploaded</span>
            )}
          </div>

          {successMessage && (
            <p className="text-success text-center mt-4">{successMessage}</p>
          )}
        </div>

      )}
    </div>
  );
}

export default ProviderProfile;